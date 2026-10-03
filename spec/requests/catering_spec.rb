require "rails_helper"

RSpec.describe "Catering orders", type: :request do
  let!(:restaurant) do
    hours = Restaurant::DAYS.index_with { { "open" => "09:00", "close" => "21:00", "closed" => false } }
    create_restaurant(hours: hours, card_payments_enabled: true)
  end
  let!(:wrap) { create_item(restaurant, name: "Falafel Wrap", price: 10.00) }
  let!(:trays) { restaurant.categories.create!(name: "Party Trays", catering: true) }
  let!(:hummus_tray) do
    create_item(restaurant, category: trays, name: "Hummus", price: 45,
                            sizes: [{ name: "Shallow Tray", price: "45" }, { name: "Full Tray", price: "100" }])
  end

  around { |ex| travel_to(lunchtime) { ex.run } }

  before do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("STRIPE_SECRET_KEY").and_return("sk_test")
    allow(Stripe::PaymentIntent).to receive(:create).and_return(double(id: "pi_1", client_secret: "secret"))
  end

  def place(pickup_at:, payment_method: "card", items: [{ menu_item_id: hummus_tray.id, size: "Full Tray", quantity: 1 }])
    post "/api/orders", params: {
      payment_method: payment_method, pickup_at: pickup_at, items: items,
      customer: { name: "Dana", phone: "650-555-0101" },
    }, as: :json
  end

  it "takes catering orders a day or more ahead, paid by card, and marks them as catering" do
    place(pickup_at: (lunchtime + 2.days).change(hour: 11).iso8601)

    expect(response).to have_http_status(:created), response.body
    order = Order.last
    expect(order.catering).to be(true)
    expect(order.subtotal).to eq(100)
    expect(json.dig("order", "catering")).to be(true)
  end

  it "needs 24 hours' notice and a time during opening hours" do
    place(pickup_at: "asap")
    expect(json["errors"].first).to start_with("Catering orders need at least 24 hours' notice")
    place(pickup_at: (lunchtime + 3.hours).iso8601)
    expect(response).to have_http_status(:unprocessable_content)
    place(pickup_at: (lunchtime + 2.days).change(hour: 22).iso8601) # after closing
    expect(response).to have_http_status(:unprocessable_content)
    place(pickup_at: (lunchtime + 40.days).change(hour: 12).iso8601) # too far ahead
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "is paid online, and follows the catering rules even with regular items in the cart" do
    items = [{ menu_item_id: wrap.id, quantity: 2 }, { menu_item_id: hummus_tray.id, size: "Shallow Tray", quantity: 1 }]
    place(pickup_at: (lunchtime + 2.days).change(hour: 11).iso8601, payment_method: "in_store", items: items)
    expect(json["errors"]).to eq(["Catering orders are paid online when you order"])

    place(pickup_at: (lunchtime + 2.days).change(hour: 11).iso8601, items: items)
    expect(response).to have_http_status(:created)
    expect(Order.last.catering).to be(true)
  end

  it "asks people to call when card payments are off" do
    restaurant.update!(card_payments_enabled: false)
    place(pickup_at: (lunchtime + 2.days).change(hour: 11).iso8601)
    expect(json["errors"]).to eq(["Online catering orders are unavailable right now. Please call us to order catering."])
  end

  it "leaves regular orders alone" do
    place(pickup_at: "asap", payment_method: "in_store", items: [{ menu_item_id: wrap.id, quantity: 1 }])
    expect(response).to have_http_status(:created), response.body
    expect(Order.last.catering).to be(false)
  end

  it "lists catering categories in the menu with their flag" do
    get "/api/menu"
    expect(json.map { |c| [c["name"], c["catering"]] }).to eq([["Wraps", false], ["Party Trays", true]])
  end
end
