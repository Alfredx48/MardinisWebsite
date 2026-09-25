require "rails_helper"

RSpec.describe "Checkout", type: :request do
  let!(:restaurant) { create_restaurant }
  let!(:wrap) { create_item(restaurant, name: "Falafel Wrap", price: 10.00) }
  let!(:plate) { create_item(restaurant, name: "Kabob Plate", price: 20.50) }
  let(:customer) { { name: "Dana", phone: "650-555-0101", email: "dana@example.com" } }

  let(:now) { lunchtime }
  around { |ex| travel_to(now) { ex.run } }

  def place(overrides = {})
    post "/api/orders", params: {
      payment_method: "in_store",
      customer: customer,
      items: [{ menu_item_id: wrap.id, quantity: 2 }, { menu_item_id: plate.id, quantity: 1, special_request: "extra garlic" }],
    }.merge(overrides), as: :json
  end

  it "prices the order on the server and ignores client-supplied totals" do
    place(total_cost: "0.01", subtotal: "0.01", tip: "3.00")

    expect(response).to have_http_status(:created)
    order = Order.last
    expect(order.subtotal).to eq(40.50)
    expect(order.tax).to eq(3.85) # 40.50 * 9.5%, rounded
    expect(order.tip).to eq(3.00)
    expect(order.total_cost).to eq(47.35)
    expect(order.status).to eq("new")
    expect(order.order_items.map(&:item_name)).to contain_exactly("Falafel Wrap", "Kabob Plate")
    expect(json.dig("order", "token")).to eq(order.token)
  end

  it "snapshots item prices so later menu edits don't rewrite history" do
    place
    wrap.update!(price: 99)
    expect(Order.last.order_items.find_by(menu_item: wrap).unit_price).to eq(10.00)
  end

  it "rejects sold-out items" do
    wrap.update!(available: false)
    place
    expect(response).to have_http_status(:unprocessable_content)
    expect(json["errors"].first).to include("sold out")
  end

  it "rejects items from hidden categories" do
    wrap.category.update!(active: false)
    place
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "rejects silly quantities" do
    place(items: [{ menu_item_id: wrap.id, quantity: 500 }])
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "requires contact details for guests" do
    place(customer: { name: "", phone: "" })
    expect(response).to have_http_status(:unprocessable_content)
    expect(json["errors"]).to include("Customer name can't be blank")
  end

  it "fills contact details from the signed-in user" do
    user = create_user(name: "Lee", phone: "555-0199")
    log_in(user)
    place(customer: {})
    expect(Order.last).to have_attributes(user_id: user.id, customer_name: "Lee", customer_phone: "555-0199")
  end

  it "refuses orders while online ordering is paused" do
    restaurant.update!(accepting_orders: false)
    place
    expect(json["errors"].first).to include("paused")
  end

  it "refuses pay-at-pickup when the owner has turned it off" do
    restaurant.update!(pay_in_store_enabled: false)
    place
    expect(response).to have_http_status(:unprocessable_content)
  end

  describe "pickup times" do
    context "after closing" do
      let(:now) { Time.zone.parse("2026-09-23 22:00") }

      it "refuses ASAP orders but allows scheduling for tomorrow" do
        place
        expect(json["errors"].first).to include("closed")

        place(pickup_at: Time.zone.parse("2026-09-24 12:00").iso8601)
        expect(response).to have_http_status(:created)
        expect(Order.last.pickup_at).to eq(Time.zone.parse("2026-09-24 12:00"))
      end
    end

    it "rejects times outside opening hours or sooner than prep time" do
      place(pickup_at: Time.zone.parse("2026-09-23 23:30").iso8601)
      expect(response).to have_http_status(:unprocessable_content)
      place(pickup_at: Time.zone.parse("2026-09-23 12:35").iso8601)
      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "card payments" do
    let(:intent) { double(id: "pi_123", client_secret: "pi_123_secret") }

    before { allow(ENV).to receive(:[]).and_call_original }
    before { allow(ENV).to receive(:[]).with("STRIPE_SECRET_KEY").and_return("sk_test_x") }

    it "is unavailable when Stripe isn't configured" do
      allow(ENV).to receive(:[]).with("STRIPE_SECRET_KEY").and_return(nil)
      place(payment_method: "card")
      expect(json["errors"].first).to include("Card payments are not available")
    end

    it "charges the server-computed amount and keeps the order out of the kitchen until paid" do
      expect(Stripe::PaymentIntent).to receive(:create) do |args, _opts|
        expect(args[:amount]).to eq(4435) # 40.50 + 3.85 tax
        intent
      end
      place(payment_method: "card")

      expect(response).to have_http_status(:created)
      expect(json["client_secret"]).to eq("pi_123_secret")
      order = Order.last
      expect(order).to have_attributes(status: "awaiting_payment", payment_status: "unpaid", payment_intent_id: "pi_123")
    end

    it "only marks the order paid once Stripe confirms the full amount" do
      allow(Stripe::PaymentIntent).to receive(:create).and_return(intent)
      place(payment_method: "card")
      order = Order.last

      underpaid = double(id: "pi_123", status: "succeeded", amount_received: 100, metadata: { "order_token" => order.token })
      allow(Stripe::PaymentIntent).to receive(:retrieve).and_return(underpaid)
      post "/api/orders/#{order.token}/confirm_payment", as: :json
      expect(response).to have_http_status(:payment_required)
      expect(order.reload.status).to eq("awaiting_payment")

      paid = double(id: "pi_123", status: "succeeded", amount_received: 4435, metadata: { "order_token" => order.token })
      allow(Stripe::PaymentIntent).to receive(:retrieve).and_return(paid)
      post "/api/orders/#{order.token}/confirm_payment", as: :json
      expect(response).to have_http_status(:ok)
      expect(order.reload).to have_attributes(status: "new", payment_status: "paid")
      expect(order.placed_at).to be_present
    end

    it "cleans up the order if Stripe errors" do
      allow(Stripe::PaymentIntent).to receive(:create).and_raise(Stripe::APIConnectionError.new("down"))
      expect { place(payment_method: "card") }.not_to change(Order, :count)
      expect(response).to have_http_status(:bad_gateway)
    end
  end

  describe "tracking" do
    it "shows an order by its token without exposing contact details" do
      place
      token = json.dig("order", "token")
      get "/api/orders/#{token}"
      expect(response).to have_http_status(:ok)
      expect(json).to include("status" => "new", "total" => "44.35")
      expect(json).not_to have_key("customer_phone")
    end

    it "404s on unknown tokens" do
      get "/api/orders/nope"
      expect(response).to have_http_status(:not_found)
    end
  end
end
