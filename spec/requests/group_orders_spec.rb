require "rails_helper"

RSpec.describe "Group orders", type: :request do
  let!(:restaurant) { create_restaurant }
  let!(:wrap) { create_item(restaurant, name: "Falafel Wrap", price: 10.00) }
  let!(:plate) { create_item(restaurant, name: "Kabob Plate", price: 20.50) }

  around { |ex| travel_to(lunchtime) { ex.run } }

  def start(attrs = {})
    post "/api/group_orders", params: { host_name: "Dana", host_email: "dana@example.com" }.merge(attrs), as: :json
    expect(response).to have_http_status(:created), response.body
    json
  end

  def headers_for(host: nil, key: nil)
    { "X-Group-Host" => host, "X-Group-Key" => key }.compact
  end

  def join(token, name)
    post "/api/group_orders/#{token}/join", params: { name: name }, as: :json
    json["participant_key"]
  end

  def add(token, key, item, quantity: 1)
    post "/api/group_orders/#{token}/items", params: { menu_item_id: item.id, quantity: quantity }, headers: headers_for(key: key), as: :json
  end

  let(:started) { start }
  let(:token) { started.dig("group", "token") }
  let(:host_key) { started["host_key"] }
  let(:host_participant) { started["participant_key"] }

  it "lets people join and add items under their name, and shows everyone's items" do
    sarah = join(token, "Sarah")
    add(token, sarah, wrap, quantity: 2)
    expect(response).to have_http_status(:ok), response.body

    get "/api/group_orders/#{token}"
    people = json["participants"].map { |p| [p["name"], p["items"].sum { |i| i["quantity"] }] }
    expect(people).to eq([["Dana", 0], ["Sarah", 2]])
    expect(json).not_to include("host_email", "order")
    expect(json["is_host"]).to be(false)
  end

  it "lets people say they're done, and changing their items makes them choose again" do
    sarah = join(token, "Sarah")
    add(token, sarah, wrap)
    post "/api/group_orders/#{token}/done", headers: headers_for(key: sarah), as: :json
    expect(json["participants"].find { |p| p["name"] == "Sarah" }["done"]).to be(true)

    # The organizer removing her item doesn't undo it...
    item_id = GroupOrderItem.last.id
    patch "/api/group_orders/#{token}/items/#{item_id}", params: { quantity: 2 }, headers: headers_for(host: host_key), as: :json
    expect(json["participants"].find { |p| p["name"] == "Sarah" }["done"]).to be(true)

    # ...but her own change does.
    add(token, sarah, plate)
    expect(json["participants"].find { |p| p["name"] == "Sarah" }["done"]).to be(false)

    post "/api/group_orders/#{token}/done", params: { done: false }, as: :json
    expect(response).to have_http_status(:forbidden)
  end

  it "keeps catering items out of group orders" do
    trays = restaurant.categories.create!(name: "Party Trays", catering: true)
    tray = create_item(restaurant, category: trays, name: "Hummus Tray", price: 45)
    add(token, join(token, "Sarah"), tray)
    expect(json["errors"]).to eq(["Catering items can't go in a group order. The organizer can order catering separately."])
  end

  it "keeps names unique within a group" do
    join(token, "Sarah")
    post "/api/group_orders/#{token}/join", params: { name: " sarah " }, as: :json
    expect(json["errors"].first).to include("Someone named sarah already joined")
  end

  it "holds each person to the per-person limit, but not the organizer" do
    limited = start(per_person_limit: "25")
    t = limited.dig("group", "token")
    sarah = join(t, "Sarah")

    add(t, sarah, wrap, quantity: 2)
    expect(response).to have_http_status(:ok)
    add(t, sarah, wrap)
    expect(json["errors"]).to eq(["That would go over the $25.00 limit per person. You have $5.00 left."])

    add(t, limited["participant_key"], plate, quantity: 3)
    expect(response).to have_http_status(:ok)
  end

  it "only lets people change their own items; the organizer can change anyone's" do
    sarah = join(token, "Sarah")
    mike = join(token, "Mike")
    add(token, sarah, wrap)
    item_id = GroupOrderItem.last.id

    delete "/api/group_orders/#{token}/items/#{item_id}", headers: headers_for(key: mike)
    expect(response).to have_http_status(:forbidden)
    patch "/api/group_orders/#{token}/items/#{item_id}", params: { quantity: 3 }, headers: headers_for(key: sarah), as: :json
    expect(GroupOrderItem.find(item_id).quantity).to eq(3)
    delete "/api/group_orders/#{token}/items/#{item_id}", headers: headers_for(host: host_key)
    expect(GroupOrderItem.exists?(item_id)).to be(false)
  end

  it "stops joining and adding after the deadline" do
    timed = start(deadline_at: (lunchtime + 1.hour).iso8601)
    t = timed.dig("group", "token")
    sarah = join(t, "Sarah")

    add(t, sarah, wrap)
    expect(response).to have_http_status(:ok)

    GroupOrder.find_by(token: t).update_columns(deadline_at: lunchtime - 1.minute) # the deadline passed
    add(t, sarah, wrap)
    expect(json["errors"]).to eq(["Ordering closed at 12:29 PM."])
    post "/api/group_orders/#{t}/join", params: { name: "Late" }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "lets only the organizer close ordering" do
    mike = join(token, "Mike")
    patch "/api/group_orders/#{token}", params: { open: false }, headers: headers_for(key: mike), as: :json
    expect(response).to have_http_status(:forbidden)

    patch "/api/group_orders/#{token}", params: { open: false }, headers: headers_for(host: host_key), as: :json
    add(token, mike, wrap)
    expect(json["errors"]).to eq(["Dana closed ordering for this group."])
  end

  it "checks out as one order with each person's name on their items" do
    sarah = join(token, "Sarah")
    mike = join(token, "Mike")
    add(token, sarah, wrap, quantity: 2)
    add(token, mike, plate)
    add(token, host_participant, wrap)

    checkout = { payment_method: "in_store", customer: { name: "Dana", phone: "650-555-0101" } }
    post "/api/group_orders/#{token}/checkout", params: checkout, headers: headers_for(key: sarah), as: :json
    expect(response).to have_http_status(:forbidden)

    post "/api/group_orders/#{token}/checkout", params: checkout, headers: headers_for(host: host_key), as: :json
    expect(response).to have_http_status(:created), response.body
    order = Order.last
    expect(order.status).to eq("new")
    expect(order.subtotal).to eq(50.50)
    expect(order.order_items.order(:id).map { |i| [i.item_name, i.quantity, i.label] })
      .to eq([["Falafel Wrap", 2, "Sarah"], ["Kabob Plate", 1, "Mike"], ["Falafel Wrap", 1, "Dana"]])

    get "/api/group_orders/#{token}", headers: headers_for(host: host_key)
    expect(json).to include("placed" => true, "accepting_items" => false, "order_number" => order.number)
    expect(json.dig("order", "token")).to eq(order.token)

    add(token, sarah, wrap)
    expect(json["errors"]).to eq(["This group order was already placed."])
  end

  it "doesn't check out an empty group order" do
    post "/api/group_orders/#{token}/checkout", params: { payment_method: "in_store", customer: { name: "Dana", phone: "1" } },
                                                headers: headers_for(host: host_key), as: :json
    expect(json["errors"]).to eq(["Nobody has added anything yet"])
  end
end
