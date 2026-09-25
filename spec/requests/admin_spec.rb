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

    describe "refunds" do
      let(:order) do
        place_order.tap { |o| o.update!(payment_method: "card", payment_status: "paid", payment_intent_id: "pi_1") }
      end

      it "refunds in full and cancels" do
        expect(Stripe::Refund).to receive(:create)
          .with(hash_including(payment_intent: "pi_1", amount: 1314), hash_including(:idempotency_key))
          .and_return(double(id: "re_1"))
        post "/api/admin/orders/#{order.id}/refund", params: { cancel: true, reason: "Out of lamb" }, as: :json
        expect(order.reload).to have_attributes(payment_status: "refunded", status: "cancelled",
                                                refunded_amount: 13.14, cancel_reason: "Out of lamb")
        expect(json["refunds"].first).to include("amount" => "13.14", "reason" => "Out of lamb", "source" => "admin")
      end

      it "supports partial refunds without cancelling, and records who did it" do
        allow(Stripe::Refund).to receive(:create).and_return(double(id: "re_1"), double(id: "re_2"))
        post "/api/admin/orders/#{order.id}/refund", params: { amount: "4.00", reason: "Missing item", note: "No hummus" }, as: :json
        expect(order.reload).to have_attributes(payment_status: "partially_refunded", status: "new", refunded_amount: 4.00)
        expect(json).to include("refundable_amount" => "9.14")
        expect(json["refunds"].first).to include("reason" => "Missing item", "note" => "No hummus", "refunded_by" => admin.name)

        post "/api/admin/orders/#{order.id}/refund", params: { amount: "9.14" }, as: :json
        expect(order.reload).to have_attributes(payment_status: "refunded", refunded_amount: 13.14)
        expect(order.refunds.count).to eq(2)
      end

      it "gives every refund its own idempotency key" do
        keys = []
        allow(Stripe::Refund).to receive(:create) { |_, opts| keys << opts[:idempotency_key]; double(id: "re_x") }
        2.times { post "/api/admin/orders/#{order.id}/refund", params: { amount: "1.00" }, as: :json }
        expect(keys.uniq.size).to eq(2)
      end

      it "refuses to refund more than was paid" do
        allow(Stripe::Refund).to receive(:create).and_return(double(id: "re_1"))
        post "/api/admin/orders/#{order.id}/refund", params: { amount: "20.00" }, as: :json
        expect(response).to have_http_status(:unprocessable_content)
        expect(json["errors"].first).to include("at most $13.14")
        expect(order.reload.refunded_amount).to eq(0)
      end

      it "rejects nonsense amounts" do
        post "/api/admin/orders/#{order.id}/refund", params: { amount: "abc" }, as: :json
        expect(response).to have_http_status(:unprocessable_content)
        post "/api/admin/orders/#{order.id}/refund", params: { amount: "0" }, as: :json
        expect(response).to have_http_status(:unprocessable_content)
      end

      it "leaves nothing behind if Stripe fails" do
        allow(Stripe::Refund).to receive(:create).and_raise(Stripe::APIConnectionError.new("down"))
        post "/api/admin/orders/#{order.id}/refund", params: { amount: "4.00" }, as: :json
        expect(response).to have_http_status(:bad_gateway)
        expect(order.reload).to have_attributes(refunded_amount: 0, payment_status: "paid")
        expect(order.refunds).to be_empty
      end

      it "won't refund pay-at-pickup orders through Stripe" do
        cash = place_order
        post "/api/admin/orders/#{cash.id}/refund", params: { amount: "1.00" }, as: :json
        expect(response).to have_http_status(:unprocessable_content)
      end

      it "counts partial refunds against revenue" do
        allow(Stripe::Refund).to receive(:create).and_return(double(id: "re_1"))
        post "/api/admin/orders/#{order.id}/refund", params: { amount: "3.14" }, as: :json
        get "/api/admin/stats"
        expect(json.dig("today", "revenue")).to eq("10.00")
      end
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

  describe "menu item sizes" do
    it "saves sizes, shows the lowest as the price, and clears them" do
      patch "/api/admin/menu_items/#{item.id}", params: { sizes: [{ name: " Small ", price: "7.23" }, { name: "Large", price: "9.78" }] }, as: :json
      expect(json["price"]).to eq("7.23")
      expect(json["sizes"]).to eq([{ "name" => "Small", "price" => "7.23" }, { "name" => "Large", "price" => "9.78" }])

      get "/api/menu"
      expect(json.flat_map { |c| c["items"] }.first["sizes"].size).to eq(2)

      patch "/api/admin/menu_items/#{item.id}", params: { sizes: [], price: "8.00" }, as: :json
      expect(json).to include("sizes" => [], "price" => "8.00")
    end

    it "rejects duplicate, unnamed or unpriced sizes" do
      [[{ name: "Small", price: "1" }, { name: "small", price: "2" }], [{ name: "", price: "1" }], [{ name: "Small", price: "" }]].each do |sizes|
        patch "/api/admin/menu_items/#{item.id}", params: { sizes: sizes }, as: :json
        expect(response).to have_http_status(:unprocessable_content)
      end
      expect(item.reload.sizes).to eq([])
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

  describe "photos" do
    def photo(bytes)
      file = Tempfile.new(["photo", ".jpg"])
      file.binmode
      file.write(bytes)
      file.rewind
      Rack::Test::UploadedFile.new(file.path, "image/jpeg")
    end

    let(:jpeg) { "\xFF\xD8\xFF\xE0".b + ("x" * 100) }

    before do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("SUPABASE_URL").and_return("https://example.supabase.co/")
      allow(ENV).to receive(:[]).with("SUPABASE_SECRET_KEY").and_return("sb_secret_test")
    end

    it "stores the photo in Supabase and returns its public URL" do
      allow(PhotoStorage).to receive(:request).and_return(Net::HTTPCreated.new("1.1", "201", "Created"))
      post "/api/admin/photos", params: { photo: photo(jpeg) }

      expect(response).to have_http_status(:created)
      expect(json["url"]).to match(%r{\Ahttps://example\.supabase\.co/storage/v1/object/public/menu-photos/items/\d{8}-\h{16}\.jpg\z})
      expect(PhotoStorage).to have_received(:request)
        .with(Net::HTTP::Post, %r{\A/storage/v1/object/menu-photos/items/.+\.jpg\z}, jpeg, "image/jpeg", anything)
    end

    it "rejects files that aren't images, whatever their content type says" do
      allow(PhotoStorage).to receive(:request)
      post "/api/admin/photos", params: { photo: photo("<html>not a photo</html>") }

      expect(response).to have_http_status(:unprocessable_content)
      expect(json["errors"]).to eq(["Please upload a JPG, PNG or WebP image."])
      expect(PhotoStorage).not_to have_received(:request)
    end

    it "explains when storage isn't configured" do
      allow(ENV).to receive(:[]).with("SUPABASE_SECRET_KEY").and_return(nil)
      post "/api/admin/photos", params: { photo: photo(jpeg) }

      expect(response).to have_http_status(:service_unavailable)
      expect(json["errors"].first).to include("aren't set up yet")
    end
  end
end
