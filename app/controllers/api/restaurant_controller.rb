class Api::RestaurantController < ApplicationController
  skip_before_action :authorize

  def show
    render json: Presenters.restaurant(current_restaurant)
  end

  def menu
    categories = current_restaurant.categories.active.includes(:menu_items)
    render json: categories.map { |c| Presenters.category(c, items: c.menu_items) }
  end
end
