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
    cart = nil
    if current_user
      cart = current_user.carts.first_or_create
    elsif session[:cart_id]
      cart = Cart.find_by(id: session[:cart_id])
    end
    if !cart
      cart = Cart.create
      if current_user
        cart.user_id = current_user.id
        cart.save!
      end
      if Restaurant.first
        cart.restaurant_id = Restaurant.first.id
      end
      cart.save!
      session[:cart_id] = cart.id
    end
    cart_item = cart.cart_items.create(cart_items_params)
    render json: { cart_id: cart.id, cart: cart, menu_items: cart.menu_items, cart_items: cart.cart_items }
  end

  def destroy
    cart = nil
    if current_user
      cart = current_user.carts.first
      cart.cart_items.destroy_all
    else
      cart = current_cart
      cart.cart_items.destroy_all
      session.delete(:cart_id)
      render json: { message: "Cart has been cleared." }
    end
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
