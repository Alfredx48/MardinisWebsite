module SpecHelpers
  # A Wednesday at 12:30pm Pacific, when the restaurant is open.
  def lunchtime
    Time.zone.parse("2026-09-23 12:30")
  end

  def create_restaurant(attrs = {})
    Restaurant.create!({ name: "Mardini's", phone: "(650) 324-4316", tax_rate: 0.095 }.merge(attrs))
  end

  def create_item(restaurant, attrs = {})
    category = attrs.delete(:category) || restaurant.categories.first || restaurant.categories.create!(name: "Wraps")
    category.menu_items.create!({ restaurant: restaurant, name: "Falafel Wrap", price: 10.00 }.merge(attrs))
  end

  def create_user(attrs = {})
    User.create!({ name: "Sam", email: "sam#{SecureRandom.hex(3)}@example.com", phone: "555-0100", password: "password123" }.merge(attrs))
  end

  def log_in(user, password: "password123")
    post "/api/login", params: { email: user.email, password: password }, as: :json
    expect(response).to have_http_status(:created)
  end

  def json
    JSON.parse(response.body)
  end
end
