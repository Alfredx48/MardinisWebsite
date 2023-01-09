class UsersController < ApplicationController

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
