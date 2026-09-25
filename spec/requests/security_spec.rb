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

  it "lets admins in" do
    log_in(admin)
    get "/api/admin/stats"
    expect(response).to have_http_status(:ok)
  end

  it "requires the current password to change a password" do
    log_in(customer)
    patch "/api/me", params: { password: "newpassword1" }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
    patch "/api/me", params: { password: "newpassword1", current_password: "password123" }, as: :json
    expect(response).to have_http_status(:ok)
  end
end
