require "rails_helper"

RSpec.describe "Order confirmation emails", type: :request do
  let!(:restaurant) { create_restaurant(address: "408 Willow Rd, Menlo Park, CA 94025") }
  let!(:item) { create_item(restaurant, name: "Falafel Wrap", price: 10) }
  let(:sent) { [] }

  around { |ex| travel_to(lunchtime) { ex.run } }

  # Real rendering and budget checks; only the HTTP call to Resend is faked.
  before do
    allow(EmailSender).to receive(:live?).and_return(true)
    allow(EmailSender).to receive(:post!) { |**mail| sent << mail }
  end

  def checkout(email: "kim@example.com", payment_method: "in_store", request: nil)
    post "/api/orders", params: {
      payment_method: payment_method,
      customer: { name: "Kim Lee", phone: "555-0100", email: email },
      items: [{ menu_item_id: item.id, quantity: 2, special_request: request }],
    }, as: :json
    Order.last
  end

  it "emails pay-at-pickup orders as soon as they're placed" do
    order = checkout
    expect(response).to have_http_status(:created)
    expect(sent.size).to eq(1)
    mail = sent.first
    expect(mail[:to]).to eq("kim@example.com")
    expect(mail[:subject]).to eq("Your Mardini's order ##{order.number} is confirmed")
    expect(mail[:text]).to include("Hi Kim", "2 × Falafel Wrap", "As soon as possible (about 20 minutes)", "Pay when you pick up",
                                   "http://localhost:4000/order/#{order.token}")
    expect(mail[:html]).to include("Order ##{order.number}", "Falafel Wrap", "/order/#{order.token}")
    expect(order.reload.confirmation_sent_at).to be_present
    expect(SentEmail.where(kind: "order_confirmation").count).to eq(1)
  end

  it "escapes what customers type" do
    checkout(request: "<script>alert(1)</script>")
    expect(sent.first[:html]).not_to include("<script>")
    expect(sent.first[:html]).to include("&lt;script&gt;")
  end

  it "skips orders without an email" do
    checkout(email: "")
    expect(response).to have_http_status(:created)
    expect(sent).to be_empty
  end

  it "waits for card payments to clear, then sends once even if confirmed twice" do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("STRIPE_SECRET_KEY").and_return("sk_test")
    allow(Stripe::PaymentIntent).to receive(:create).and_return(double(id: "pi_1", client_secret: "secret"))
    order = checkout(payment_method: "card")
    expect(order.status).to eq("awaiting_payment")
    expect(sent).to be_empty

    order.mark_paid!("pi_1")
    Order.find(order.id).mark_paid!("pi_1") # e.g. Stripe's webhook arriving too
    expect(sent.size).to eq(1)
    expect(sent.first[:text]).to include("Paid online")
  end

  it "never lets a failed email break checkout" do
    allow(EmailSender).to receive(:post!).and_raise(EmailSender::Error, "Resend HTTP 500")
    checkout
    expect(response).to have_http_status(:created)
    expect(Order.last.status).to eq("new")
  end

  describe "daily budget" do
    def already_sent(count, at: 1.hour.ago)
      SentEmail.insert_all(Array.new(count) { { kind: "order_confirmation", created_at: at } })
    end

    it "stops order confirmations 20 short of the limit but still sends password resets" do
      already_sent(80)
      checkout
      expect(sent).to be_empty
      expect(Order.last.confirmation_sent_at).to be_nil

      user = create_user
      post "/api/password/forgot", params: { email: user.email }, as: :json
      expect(sent.map { |m| m[:subject] }).to eq(["Reset your Mardini's password"])
    end

    it "stops everything at the limit" do
      already_sent(100)
      post "/api/password/forgot", params: { email: create_user.email }, as: :json
      expect(response).to have_http_status(:ok)
      expect(sent).to be_empty
    end

    it "only counts the last 24 hours" do
      already_sent(100, at: 25.hours.ago)
      checkout
      expect(sent.size).to eq(1)
    end

    it "can be lifted for a paid plan" do
      allow(ENV).to receive(:fetch).and_call_original
      allow(ENV).to receive(:fetch).with("EMAIL_DAILY_LIMIT", 100).and_return("0")
      already_sent(500)
      checkout
      expect(sent.size).to eq(1)
    end
  end
end
