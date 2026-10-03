require "rails_helper"

RSpec.describe "Access control", type: :request do
  let!(:restaurant) { create_restaurant }
  let(:admin) { create_user(admin: true) }
  let(:customer) { create_user }

  it "never lets a new signup make themselves an admin" do
    post "/api/signup", params: { name: "Mallory", email: "m@example.com", phone: "1", password: "password123",
                                  password_confirmation: "password123", admin: true }, as: :json
    expect(response).to have_http_status(:created)
    expect(User.find_by(email: "m@example.com").admin).to be(false)
  end

  it "treats emails case-insensitively" do
    customer
    post "/api/login", params: { email: customer.email.upcase, password: "password123" }, as: :json
    expect(response).to have_http_status(:created)

    post "/api/signup", params: { name: "Dup", email: customer.email.upcase, phone: "1", password: "password123" }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "doesn't leak orders or customers through public endpoints" do
    get "/api/restaurant"
    expect(json).not_to have_key("orders")
    get "/api/users"
    expect(response).to have_http_status(:not_found)
  end

  %w[/api/admin/orders /api/admin/stats /api/admin/users /api/admin/categories /api/admin/restaurant /api/admin/catering_inquiries].each do |path|
    it "blocks #{path} for guests and customers" do
      get path
      expect(response).to have_http_status(:unauthorized)
      log_in(customer)
      get path
      expect(response).to have_http_status(:forbidden)
    end
  end

  it "blocks photo uploads for guests and customers" do
    post "/api/admin/photos"
    expect(response).to have_http_status(:unauthorized)
    log_in(customer)
    post "/api/admin/photos"
    expect(response).to have_http_status(:forbidden)
  end

  it "keeps option groups admin-only, including for kitchen staff" do
    get "/api/admin/modifier_groups"
    expect(response).to have_http_status(:unauthorized)
    log_in(customer)
    get "/api/admin/modifier_groups"
    expect(response).to have_http_status(:forbidden)
    cook = create_user(kitchen: true)
    log_in(cook)
    post "/api/admin/modifier_groups", params: { name: "X", options: [{ name: "Y" }] }, as: :json
    expect(response).to have_http_status(:forbidden)
  end

  it "lets admins in" do
    log_in(admin)
    get "/api/admin/stats"
    expect(response).to have_http_status(:ok)
  end

  describe "kitchen staff" do
    let(:cook) { create_user(kitchen: true) }
    let!(:item) { create_item(restaurant) }

    around { |ex| travel_to(lunchtime) { ex.run } }
    before { log_in(cook) }

    def place_order(**attrs)
      order = Checkout.new(restaurant: restaurant, user: nil, params: {
        payment_method: "in_store", customer: { name: "Kim", phone: "555" }, items: [{ menu_item_id: item.id, quantity: 1 }],
      }).call
      order.save!
      order.mark_placed!
      order.update!(attrs) if attrs.any?
      order
    end

    it "marks an order's reminders as seen, once, for every kitchen screen" do
      order = place_order
      post "/api/admin/orders/#{order.id}/reminder", params: { days: 3 }, as: :json
      expect(response).to have_http_status(:ok)
      seen = order.reload.reminder_3_days_seen_at
      expect(seen).to be_present
      expect(json.dig("reminders_seen", "3")).to be_present
      expect(json.dig("reminders_seen", "1")).to be_nil

      earlier = seen - 1.hour
      order.update_columns(reminder_3_days_seen_at: earlier) # seen on another tablet first
      post "/api/admin/orders/#{order.id}/reminder", params: { days: 3 }, as: :json
      expect(order.reload.reminder_3_days_seen_at).to eq(earlier)
      post "/api/admin/orders/#{order.id}/reminder", params: { days: 2 }, as: :json
      expect(json["errors"]).to eq(["Unknown reminder"])
    end

    it "sees the live board and moves orders along" do
      order = place_order
      get "/api/admin/orders", params: { scope: "active" }
      expect(json["orders"].map { |o| o["id"] }).to eq([order.id])

      get "/api/admin/orders/#{order.id}"
      expect(response).to have_http_status(:ok)

      patch "/api/admin/orders/#{order.id}", params: { status: "preparing" }, as: :json
      expect(order.reload.status).to eq("preparing")
    end

    it "can cancel pay-at-pickup orders but not orders paid online" do
      in_store = place_order
      patch "/api/admin/orders/#{in_store.id}", params: { status: "cancelled", cancel_reason: "Sold out" }, as: :json
      expect(in_store.reload.status).to eq("cancelled")

      paid = place_order(payment_method: "card", payment_status: "paid", payment_intent_id: "pi_1")
      patch "/api/admin/orders/#{paid.id}", params: { status: "cancelled" }, as: :json
      expect(response).to have_http_status(:forbidden)
      expect(paid.reload.status).to eq("new")
    end

    it "can't refund, browse order history or reach the rest of the admin" do
      order = place_order(payment_method: "card", payment_status: "paid", payment_intent_id: "pi_1")
      expect(Stripe::Refund).not_to receive(:create)
      post "/api/admin/orders/#{order.id}/refund", params: { cancel: true }, as: :json
      expect(response).to have_http_status(:forbidden)

      get "/api/admin/orders", params: { q: "kim" }
      expect(response).to have_http_status(:forbidden)

      %w[/api/admin/stats /api/admin/users /api/admin/categories /api/admin/restaurant /api/admin/catering_inquiries].each do |path|
        get path
        expect(response).to have_http_status(:forbidden), path
      end
      patch "/api/admin/users/#{cook.id}", params: { role: "admin" }, as: :json
      expect(response).to have_http_status(:forbidden)
      expect(cook.reload.admin).to be(false)
    end
  end

  it "keeps people logged in for 30 days of inactivity" do
    log_in(customer)
    expect(response.headers["set-cookie"]).to match(/_mardinis_session=.*expires=/i)
  end

  it "requires the current password to change a password" do
    log_in(customer)
    patch "/api/me", params: { password: "newpassword1" }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
    patch "/api/me", params: { password: "newpassword1", current_password: "password123" }, as: :json
    expect(response).to have_http_status(:ok)
  end
end
