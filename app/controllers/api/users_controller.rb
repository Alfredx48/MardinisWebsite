class Api::UsersController < ApplicationController
  skip_before_action :authorize, only: [:create, :show]

  def index
    render json: User.all
  end

  def show
    render json: current_user
  end

  def create
    user = User.create!(user_params)
    session[:user_id] = user.id
    render json: user, status: :created
  end

  private

  def user_params
    params.permit(:email, :password, :password_confirmation, :name, :address, :phone, :admin)
  end
end
