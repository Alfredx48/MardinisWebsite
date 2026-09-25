require "rails_helper"

RSpec.describe "Admin portal API", type: :request do
  let!(:restaurant) { create_restaurant }
  let!(:item) { create_item(restaurant, price: 12) }
  let(:admin) { create_user(admin: true) }

  around { |ex| travel_to(lunchtime) { ex.run } }
  before { log_in(admin) }

  def place_order(payment_method: "in_store")
    order = Checkout.new(restaurant: restaurant, user: nil, params: {
      payment_method: payment_method, customer: { name: "Kim", phone: "555" }, items: [{ menu_item_id: item.id, quantity: 1 }],
    }).call
    order.save!
    order.mark_placed! if payment_method == "in_store"
    order
  end

  describe "orders" do
    it "walks an order through the kitchen and marks pay-at-pickup orders paid on completion" do
      order = place_order
      %w[preparing ready completed].each do |status|
        patch "/api/admin/orders/#{order.id}", params: { status: status }, as: :json
        expect(response).to have_http_status(:ok)
      end
      expect(order.reload).to have_attributes(status: "completed", payment_status: "paid")
      expect(order.ready_at).to be_present
    end

    it "keeps unpaid card orders off the kitchen board" do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("STRIPE_SECRET_KEY").and_return("sk_test")
      unpaid = place_order(payment_method: "card")
      placed = place_order

      get "/api/admin/orders", params: { scope: "active" }
      expect(json["orders"].map { |o| o["id"] }).to eq([placed.id])

      patch "/api/admin/orders/#{unpaid.id}", params: { status: "preparing" }, as: :json
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "cancels with a reason and saves notes" do
      order = place_order
      patch "/api/admin/orders/#{order.id}", params: { status: "cancelled", cancel_reason: "Out of lamb", admin_notes: "Called customer" }, as: :json
      expect(order.reload).to have_attributes(status: "cancelled", cancel_reason: "Out of lamb", admin_notes: "Called customer")
    end

    it "searches order history" do
      order = place_order
      get "/api/admin/orders", params: { q: "kim" }
      expect(json["orders"].map { |o| o["id"] }).to eq([order.id])
      get "/api/admin/orders", params: { q: "##{order.number}" }
      expect(json["total_count"]).to eq(1)
      get "/api/admin/orders", params: { q: "nobody" }
      expect(json["total_count"]).to eq(0)
    end

    it "refunds paid card orders through Stripe" do
      order = place_order
      order.update!(payment_method: "card", payment_status: "paid", payment_intent_id: "pi_1")
      expect(Stripe::Refund).to receive(:create).with({ payment_intent: "pi_1" }, anything)
      post "/api/admin/orders/#{order.id}/refund", as: :json
      expect(order.reload).to have_attributes(payment_status: "refunded", status: "cancelled")
    end
  end

  describe "stats" do
    it "summarizes sales, excluding cancelled and unpaid orders" do
      place_order
      place_order.advance_to!("cancelled")
      get "/api/admin/stats"
      expect(json.dig("today", "orders")).to eq(1)
      expect(json.dig("today", "revenue")).to eq("13.14")
      expect(json["trend"].last).to include("date" => "2026-09-23", "orders" => 1)
      expect(json["top_items"].first).to include("name" => "Falafel Wrap", "quantity" => 1)
    end
  end

  describe "menu management" do
    it "creates, edits, hides and reorders items" do
      category = item.category
      post "/api/admin/menu_items", params: { name: "Baklava", price: "4.50", category_id: category.id, vegetarian: true }, as: :json
      expect(response).to have_http_status(:created)
      baklava_id = json["id"]

      patch "/api/admin/menu_items/#{baklava_id}", params: { available: false, price: "5.00" }, as: :json
      expect(json).to include("available" => false, "price" => "5.00")

      patch "/api/admin/menu_items/reorder", params: { category_id: category.id, ids: [baklava_id, item.id] }, as: :json
      expect(category.menu_items.reload.map(&:id)).to eq([baklava_id, item.id])

      get "/api/menu"
      names = json.first["items"].map { |i| i["name"] }
      expect(names).to eq(["Baklava", "Falafel Wrap"]) # sold-out items still show, marked unavailable
    end

    it "won't delete items that appear on past orders" do
      place_order
      delete "/api/admin/menu_items/#{item.id}"
      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"].first).to include("unavailable")
    end

    it "hides whole categories from the public menu" do
      patch "/api/admin/categories/#{item.category_id}", params: { active: false }, as: :json
      get "/api/menu"
      expect(json).to eq([])
    end
  end

  describe "settings" do
    it "updates hours, tax and ordering switches" do
      hours = Restaurant::DAYS.index_with { { open: "08:00", close: "20:00", closed: false } }
      hours["sun"] = { open: "", close: "", closed: true }
      patch "/api/admin/restaurant", params: { hours: hours, tax_rate: "0.09375", accepting_orders: false, announcement: "Closed Monday for Labor Day" }, as: :json
      expect(response).to have_http_status(:ok)
      restaurant.reload
      expect(restaurant.hours["sun"]["closed"]).to be(true)
      expect(restaurant.tax_rate).to eq(BigDecimal("0.09375"))
      expect(restaurant.accepting_orders).to be(false)
    end

    it "rejects malformed hours" do
      hours = Restaurant::DAYS.index_with { { open: "9am", close: "20:00", closed: false } }
      patch "/api/admin/restaurant", params: { hours: hours }, as: :json
      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "users" do
    it "promotes customers but won't let admins demote themselves" do
      customer = create_user
      patch "/api/admin/users/#{customer.id}", params: { admin: true }, as: :json
      expect(customer.reload.admin).to be(true)

      patch "/api/admin/users/#{admin.id}", params: { admin: false }, as: :json
      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "catering" do
    it "receives public inquiries and lets admins track them" do
      delete "/api/logout"
      post "/api/catering_inquiries", params: { name: "Office party", phone: "555", guest_count: 40, event_date: "2026-10-10" }, as: :json
      expect(response).to have_http_status(:created)

      log_in(admin)
      get "/api/admin/catering_inquiries"
      inquiry = json.first
      patch "/api/admin/catering_inquiries/#{inquiry['id']}", params: { status: "booked" }, as: :json
      expect(json["status"]).to eq("booked")
    end
  end
end
