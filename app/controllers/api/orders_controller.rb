class Api::OrdersController < ApplicationController

  def create
    cart = current_cart
    order = Order.create_from_cart(cart, current_user&.id)
    session.delete(:cart_id)
    render json: { message: "Order placed successfully.", order: order }, status: :created
  end

end
