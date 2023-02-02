class Api::OrdersController < ApplicationController
  skip_before_action :authorize

  def index
    render json: Order.all.reverse
  end

  def create
    cart = current_cart || current_user.carts.first
    user_id = current_user&.id
    order = Order.create_from_cart(cart, user_id, order_params[:status], order_params[:custom_request])
    order.restaurant_id = Restaurant.first.id
    order.save!
    session.delete(:cart_id)
    render json: { message: "Order placed successfully.", order: order }, status: :created
  end

  def update 
    order = Order.find_by(id: params[:id])
    order.update(order_params)
    render json: order, status: :accepted 
  end

  private

  def order_params
    params.require(:order).permit(:status, :custom_request, :total_cost, :user_id, :restaurant_id)
  end
end
