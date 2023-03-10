class Api::SessionsController < ApplicationController
  skip_before_action :authorize, only: [:create]

  def create
    user = User.find_by(email: params[:email])
    if user&.authenticate(params[:password])
      session[:user_id] = user.id
      render json: user, status: :created
    else
      render json: { errors: ["Invalid Email or Password"] }, status: :unauthorized
    end
  end

  def destroy
    reset_session
    session.delete(:user_id)
    session.delete(:cart_id)
    head :no_content
  end
end
