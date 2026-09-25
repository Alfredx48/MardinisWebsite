class Api::SessionsController < ApplicationController
  skip_before_action :authorize, only: [:create]

  def create
    user = User.find_by("LOWER(email) = ?", params[:email].to_s.strip.downcase)
    if user&.authenticate(params[:password].to_s)
      reset_session
      session[:user_id] = user.id
      render json: Presenters.user(user), status: :created
    else
      render_errors "Invalid email or password", :unauthorized
    end
  end

  def destroy
    reset_session
    head :no_content
  end
end
