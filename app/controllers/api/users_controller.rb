class Api::UsersController < ApplicationController
  skip_before_action :authorize, only: [:show, :create]

  # Returns null for guests so the browser can check login state without a 401.
  def show
    render json: current_user && Presenters.user(current_user)
  end

  def create
    # `admin` is deliberately not permitted; admins are promoted from the admin portal.
    user = User.create!(params.permit(:email, :password, :password_confirmation, :name, :address, :phone))
    reset_session
    session[:user_id] = user.id
    render json: Presenters.user(user), status: :created
  end

  def update
    attrs = params.permit(:name, :email, :phone, :address, :password, :password_confirmation)
    if attrs[:password].present? || attrs[:email].to_s.strip.downcase != current_user.email
      unless current_user.authenticate(params[:current_password].to_s)
        return render_errors "Current password is incorrect"
      end
    end
    attrs.delete(:password) if attrs[:password].blank?
    attrs.delete(:password_confirmation) if attrs[:password].blank?
    current_user.update!(attrs)
    render json: Presenters.user(current_user)
  end
end
