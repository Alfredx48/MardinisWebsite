class ApplicationController < ActionController::API
  include ActionController::Cookies
  rescue_from ActiveRecord::RecordInvalid, with: :rescue_invalid
  rescue_from ActiveRecord::RecordNotFound, with: :rescue_not_found
  before_action :authorize

  def current_user
    User.find_by(id: session[:user_id]) 
    # || current_cart
  end

  def current_cart
    Cart.find_by(id: session[:cart_id])
  end

  # def create_guest_cart
  #   unless current_user || current_cart
  #     cart = Cart.create!
  #     session[:cart_id] = cart.id
  #   end
  # end

  # def add_item_to_cart(menu_item_id, quantity)
  #   cart = current_cart
  #   item = cart.cart_items.find_or_initialize_by(menu_item_id: menu_item_id)
  #   item.quantity += quantity
  #   item.save!
  # end

  # def checkout(params)
  #   cart = current_cart
  #   # Use Stripe API to handle the payment
  #   Stripe::Charge.create(
  #     amount: cart.total_cost,
  #     currency: 'usd',
  #     source: params[:stripeToken],
  #     description: 'Example charge'
  #   )
  #   # Clear the cart after successful payment
  #   session.delete(:cart_id)
  # end

  private

  def authorize
    render json: { errors: ["Not Authorized"] }, status: :unauthorized unless current_user
  end

  def rescue_invalid(invalid)
    render json: { errors: invalid.record.errors.full_messages }, status: :unprocessable_entity
  end

  def rescue_not_found(error)
    render json: { errors: { error.model => "Not Found" } }, status: :not_found
  end
end
