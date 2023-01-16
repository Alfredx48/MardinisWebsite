class Api::CartsController < ApplicationController
  skip_before_action :authorize

  def index
    render json: Cart.all
  end

  def show
    cart = Cart.find(params[:id])
    render json: cart
  end

  def create
    if !current_user
      cart = current_cart || Cart.create
      cart_item = cart.cart_items.create(cart_items_params)
      session[:cart_id] = cart.id
      session[:expiration_time] = Time.now + 10.minutes
    else
      cart = current_user.carts.first || current_user.carts.create
      cart_item = cart.cart_items.create(cart_items_params)
    end
    render json: { cart_id: cart.id, cart: cart, menu_items: cart.menu_items, cart_items: cart.cart_items }
  end
  def destroy
    cart = current_cart
    cart.cart_items.destroy_all
    session.delete(:cart_id)
    render json: { message: "Cart has been cleared." }
  end

  def remove_item
    cart = current_cart
    cart_item = cart.cart_items.find(params[:item_id])
    cart_item.destroy
    render json: { message: "Item removed from cart." }
  end

  private

  def cart_items_params
    params.permit(:menu_item_id, :quantity, :special_request)
  end
end
