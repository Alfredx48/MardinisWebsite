require "rails_helper"

RSpec.describe "Customer cancellation", type: :request do
  let!(:restaurant) { create_restaurant }
  let!(:item) { create_item(restaurant, price: 10) }

  around { |ex| travel_to(lunchtime) { ex.run } }
  before do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("STRIPE_SECRET_KEY").and_return("sk_test_x")
  end

  def place(payment_method: "in_store")
    order = Checkout.new(restaurant: restaurant, user: nil, params: {
      payment_method: payment_method, customer: { name: "Robin", phone: "555" },
      items: [{ menu_item_id: item.id, quantity: 2 }],
    }).call
    order.save!
    order
  end

  def cancel(order)
    post "/api/orders/#{order.token}/cancel", as: :json
  end

  it "cancels a pay-at-pickup order without touching Stripe" do
    order = place.tap(&:mark_placed!)
    expect(Stripe::Refund).not_to receive(:create)
    cancel(order)
    expect(response).to have_http_status(:ok)
    expect(json).to include("status" => "cancelled", "cancel_reason" => "Cancelled by customer", "can_cancel" => false)
  end

  it "refunds a paid card order in full" do
    order = place(payment_method: "card")
    order.update!(payment_intent_id: "pi_1")
    order.mark_paid!("pi_1")
    expect(Stripe::Refund).to receive(:create)
      .with(hash_including(payment_intent: "pi_1", amount: 2190), anything).and_return(double(id: "re_1"))

    cancel(order)
    expect(json).to include("status" => "cancelled", "payment_status" => "refunded", "refunded_amount" => "21.90")
    expect(order.refunds.last).to have_attributes(source: "customer", refunded_by: nil)
  end

  it "stops an unfinished card payment instead of refunding" do
    order = place(payment_method: "card")
    order.update!(payment_intent_id: "pi_2")
    allow(Stripe::PaymentIntent).to receive(:retrieve)
      .and_return(double(id: "pi_2", status: "requires_payment_method", amount_received: 0, metadata: {}))
    expect(Stripe::PaymentIntent).to receive(:cancel).with("pi_2")
    expect(Stripe::Refund).not_to receive(:create)

    cancel(order)
    expect(json).to include("status" => "cancelled", "payment_status" => "unpaid")
  end

  it "refunds instead if the card payment went through at the last second" do
    order = place(payment_method: "card")
    order.update!(payment_intent_id: "pi_3")
    allow(Stripe::PaymentIntent).to receive(:retrieve)
      .and_return(double(id: "pi_3", status: "succeeded", amount_received: 2190, metadata: { "order_token" => order.token }))
    expect(Stripe::Refund).to receive(:create).and_return(double(id: "re_3"))

    cancel(order)
    expect(json).to include("status" => "cancelled", "payment_status" => "refunded")
  end

  it "refuses once the kitchen has started" do
    order = place.tap(&:mark_placed!)
    order.advance_to!("preparing")
    cancel(order)
    expect(response).to have_http_status(:unprocessable_content)
    expect(json["errors"].first).to include("already started")
    expect(order.reload.status).to eq("preparing")
  end

  it "keeps the order if the refund fails" do
    order = place(payment_method: "card")
    order.update!(payment_intent_id: "pi_4")
    order.mark_paid!("pi_4")
    allow(Stripe::Refund).to receive(:create).and_raise(Stripe::APIConnectionError.new("down"))

    cancel(order)
    expect(response).to have_http_status(:bad_gateway)
    expect(order.reload).to have_attributes(status: "new", payment_status: "paid", refunded_amount: 0)
  end

  it "tells the tracking page whether cancelling is possible" do
    order = place.tap(&:mark_placed!)
    get "/api/orders/#{order.token}"
    expect(json["can_cancel"]).to be(true)
    order.advance_to!("preparing")
    get "/api/orders/#{order.token}"
    expect(json["can_cancel"]).to be(false)
  end
end
