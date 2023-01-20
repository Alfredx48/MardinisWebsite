class Api::UsersController < ApplicationController
  skip_before_action :authorize

  def index
    render json: User.all
  end

  def show
    render json: current_user
  end
  
  def create
    user = User.create!(user_params)
    restaurant_id = Restaurant.first.try(:id)
    cart = current_cart || Cart.create(restaurant_id: restaurant_id)
    user.carts << cart
    user.save!
    session[:user_id] = user.id
    session[:cart_id] = cart.id
    render json: user, status: :created
  end

  private

  def user_params
    params.permit(:email, :password, :password_confirmation, :name, :address, :phone, :admin)
  end
end
