class Api::CartItemsController < ApplicationController
  skip_before_action :authorize, only: [:destroy]
    before_action :set_cart_item, only: [:destroy]
  def destroy
    @cart_item.destroy
    render json: { message: "Item removed from cart." }
  end

  private

  def set_cart_item
    @cart_item = CartItem.find(params[:id])
  end
end
