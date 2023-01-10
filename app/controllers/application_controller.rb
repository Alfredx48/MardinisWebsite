class ApplicationController < ActionController::API
  include ActionController::Cookies
  rescue_from ActiveRecord::RecordInvalid, with: :rescue_invalid
  rescue_from ActiveRecord::RecordNotFound, with: :rescue_not_found
  before_action :authorize

  def current_user
    @current_user = User.find_by(id: session[:user_id])
  end

  private

  def authorize
    render json: { errors: ["Not Authorized"] }, status: :unauthorized unless @current_user
  end

  def rescue_invalid(invalid)
    render json: { errors: invalid.record.errors.full_messages }, status: :unprocessable_entity
  end

  def rescue_not_found(error)
    render json: { errors: { error.model => "Not Found" } }, status: :not_found
  end
end
