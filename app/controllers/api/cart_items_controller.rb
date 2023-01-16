class Api::CartItemsController < ApplicationController
  skip_before_action :authorize, only: [:destroy, :index]
  before_action :cart_item, only: [:destroy]

  def index 
    render json: CartItem.all
  end

  def destroy
    cart_item.destroy
    render json: { message: "Item removed from cart." }
  end

  private

  def cart_item
    cart_item = CartItem.find(params[:id])
  end
end
