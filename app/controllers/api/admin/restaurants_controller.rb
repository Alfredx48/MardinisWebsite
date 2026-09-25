class Api::Admin::RestaurantsController < Api::Admin::BaseController
  def show
    render json: Presenters.restaurant(current_restaurant, admin: true)
  end

  def update
    attrs = params.permit(
      :name, :tagline, :description, :address, :phone, :email, :announcement, :hero_image, :logo_image,
      :tax_rate, :prep_time_minutes, :accepting_orders, :card_payments_enabled, :pay_in_store_enabled, :tips_enabled,
      hours: Restaurant::DAYS.index_with { %i[open close closed] },
    )
    attrs[:hours] = normalize_hours(attrs[:hours]) if attrs.key?(:hours)
    current_restaurant.update!(attrs)
    render json: Presenters.restaurant(current_restaurant, admin: true)
  end

  private

  def normalize_hours(hours)
    Restaurant::DAYS.index_with do |day|
      h = hours[day] || {}
      { "open" => h[:open].to_s, "close" => h[:close].to_s, "closed" => ActiveModel::Type::Boolean.new.cast(h[:closed]) || false }
    end
  end
end
