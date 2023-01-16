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
    cart = current_user || current_cart || Cart.create!
    cart_item = cart.cart_items.create(menu_item_id: params[:menu_item_id], quantity: params[:quantity], special_request: params[:special_request])
    session[:cart_id] = cart.id
    render json: { cart_id: cart.id, cart: cart, menu_items: cart.menu_items, cart_items: cart.cart_items}
  end

 def destroy
    cart = current_cart
    cart.cart_items.destroy_all
    session.delete(:cart_id)
    render json: { message: "Cart has been cleared." }
  end
end
