require "rails_helper"

RSpec.describe "Kitchen push alerts", type: :request do
  let(:restaurant) { create_restaurant }
  let!(:item) { create_item(restaurant) }
  let(:cook) { create_user(kitchen: true) }
  let(:admin) { create_user(admin: true) }
  let(:customer) { create_user }
  let(:sent) { [] }
  let(:fcm_reply) { [200, {}] }

  around { |ex| travel_to(lunchtime) { ex.run } }

  before do
    stub_const("ENV", ENV.to_h.merge("FIREBASE_SERVICE_ACCOUNT_JSON" => { project_id: "mardinis-kitchen" }.to_json))
    allow(KitchenPush).to receive(:access_token).and_return("oauth-token")
    allow(KitchenPush).to receive(:post_message) do |body|
      sent << body
      fcm_reply.is_a?(Proc) ? fcm_reply.call(body) : fcm_reply
    end
  end

  def new_order
    order = Checkout.new(restaurant: restaurant, user: nil, params: {
      payment_method: "in_store", customer: { name: "Kim", phone: "555" }, items: [{ menu_item_id: item.id, quantity: 1 }],
    }).call
    order.save!
    order
  end

  def register(user, token)
    log_in(user)
    post "/api/admin/devices", params: { token: token, platform: "android" }, as: :json
  end

  describe "device endpoint" do
    it "lets kitchen staff and admins register, and nobody else" do
      post "/api/admin/devices", params: { token: "t0" }, as: :json
      expect(response).to have_http_status(:unauthorized)

      register(customer, "t1")
      expect(response).to have_http_status(:forbidden)

      register(cook, "t2")
      expect(response).to have_http_status(:ok)
      register(admin, "t3")
      expect(response).to have_http_status(:ok)
      expect(DeviceToken.pluck(:token)).to contain_exactly("t2", "t3")
    end

    it "moves a token to whoever signed in last, and refreshes last_seen_at" do
      register(cook, "tablet")
      first_seen = DeviceToken.find_by(token: "tablet").last_seen_at
      travel 1.hour
      register(admin, "tablet")
      device = DeviceToken.find_by(token: "tablet")
      expect(device.user).to eq(admin)
      expect(device.last_seen_at).to be > first_seen
      expect(DeviceToken.count).to eq(1)
    end

    it "only deletes your own token" do
      register(cook, "cook-tablet")
      register(admin, "admin-phone")
      delete "/api/admin/devices", params: { token: "cook-tablet" }, as: :json
      expect(response).to have_http_status(:not_found)
      expect(DeviceToken.exists?(token: "cook-tablet")).to be(true)

      delete "/api/admin/devices", params: { token: "admin-phone" }, as: :json
      expect(response).to have_http_status(:no_content)
      expect(DeviceToken.exists?(token: "admin-phone")).to be(false)
    end
  end

  describe "sending" do
    before do
      cook.device_tokens.create!(token: "cook-tablet", last_seen_at: Time.current)
      admin.device_tokens.create!(token: "admin-phone", last_seen_at: Time.current)
    end

    it "rings every kitchen and admin device once when an order is placed" do
      order = new_order
      expect(sent).to be_empty # not placed yet (e.g. a card order waiting for payment)

      order.mark_placed!
      expect(sent.map { |b| b.dig(:message, :token) }).to contain_exactly("cook-tablet", "admin-phone")
      message = sent.first[:message]
      expect(message[:data]).to eq(type: "new_order", order_id: order.id.to_s, number: order.number)
      expect(message[:android]).to eq(priority: "high", ttl: "600s")
    end

    it "doesn't ring for any other status change" do
      order = new_order
      order.mark_placed!
      sent.clear
      order.advance_to!("preparing")
      order.advance_to!("ready")
      order.update!(admin_notes: "extra napkins")
      expect(sent).to be_empty
    end

    it "rings a paid card order once, when the payment comes in" do
      order = new_order
      order.update!(payment_method: "card", status: "awaiting_payment")
      order.mark_paid!("pi_123")
      order.mark_paid!("pi_123")
      expect(sent.size).to eq(2) # two devices, one message each
    end

    it "stops ringing a device whose user is no longer staff" do
      cook.update!(kitchen: false)
      new_order.mark_placed!
      expect(sent.map { |b| b.dig(:message, :token) }).to eq(["admin-phone"])
    end

    it "sends nothing when Firebase isn't configured" do
      stub_const("ENV", ENV.to_h.except("FIREBASE_SERVICE_ACCOUNT_JSON"))
      order = new_order
      order.mark_placed!
      expect(sent).to be_empty
      expect(order.reload.status).to eq("new")
    end

    it "removes tokens FCM reports as unregistered or from another project, and keeps the rest" do
      replies = {
        "cook-tablet" => [404, { "error" => { "status" => "NOT_FOUND", "message" => "Requested entity was not found.",
                                                "details" => [{ "errorCode" => "UNREGISTERED" }] } }],
        "admin-phone" => [200, {}],
      }
      allow(KitchenPush).to receive(:post_message) { |body| replies.fetch(body.dig(:message, :token)) }
      new_order.mark_placed!
      expect(DeviceToken.pluck(:token)).to eq(["admin-phone"])

      allow(KitchenPush).to receive(:post_message).and_return(
        [403, { "error" => { "status" => "PERMISSION_DENIED", "details" => [{ "errorCode" => "SENDER_ID_MISMATCH" }] } }],
      )
      new_order.mark_placed!
      expect(DeviceToken.count).to eq(0)
    end

    it "keeps tokens on a plain 404 (e.g. a wrong project id) and on other errors" do
      allow(KitchenPush).to receive(:post_message).and_return([404, { "error" => { "status" => "NOT_FOUND" } }])
      new_order.mark_placed!
      allow(KitchenPush).to receive(:post_message).and_return([403, { "error" => { "status" => "PERMISSION_DENIED" } }])
      new_order.mark_placed!
      expect(DeviceToken.count).to eq(2)
    end

    it "retries once on a temporary error" do
      calls = Hash.new(0)
      allow(KitchenPush).to receive(:post_message) do |body|
        token = body.dig(:message, :token)
        calls[token] += 1
        calls[token] == 1 ? [503, nil] : [200, {}]
      end
      new_order.mark_placed!
      expect(calls).to eq("cook-tablet" => 2, "admin-phone" => 2)
    end

    it "still rings the other devices when one fails" do
      allow(KitchenPush).to receive(:post_message) do |body|
        raise RuntimeError, "boom" if body.dig(:message, :token) == "cook-tablet"

        sent << body
        [200, {}]
      end
      new_order.mark_placed!
      expect(sent.map { |b| b.dig(:message, :token) }).to eq(["admin-phone"])
    end

    it "never breaks placing an order when FCM fails" do
      allow(KitchenPush).to receive(:post_message).and_raise(RuntimeError, "boom")
      order = new_order
      expect { order.mark_placed! }.not_to raise_error
      expect(order.reload.status).to eq("new")
      expect(DeviceToken.count).to eq(2)
    end

    it "places the order through checkout and rings" do
      log_in(customer)
      post "/api/orders", params: {
        payment_method: "in_store", customer: { name: "Kim", phone: "555" }, items: [{ menu_item_id: item.id, quantity: 1 }],
      }, as: :json
      expect(response).to have_http_status(:created).or have_http_status(:ok)
      expect(sent.size).to eq(2)
    end
  end
end
