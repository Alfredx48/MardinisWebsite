class SessionsController < ApplicationController

  def create 
    user = User.find_by(email: params[:email])
    if user&.authenticate(params[:password])
      session[:user_id] = user.id
      render json :user, status: :created
    end
  else 
    render json: { errors: ["Invalid Username or Password"] }, status: :unauthorized
  end

  def destroy
    session.delete :user_id
    head :no_content
  end
end
