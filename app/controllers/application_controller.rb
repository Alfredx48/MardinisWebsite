class ApplicationController < ActionController::API
  include ActionController::Cookies
  rescue_from ActiveRecord::RecordInvalid, with: :rescue_invalid
  rescue_from ActiveRecord::RecordNotFound, with: :rescue_not_found
  rescue_from ActionController::ParameterMissing, with: :rescue_bad_request
  before_action :authorize

  def current_user
    return @current_user if defined?(@current_user)

    @current_user = session[:user_id] && User.find_by(id: session[:user_id])
  end

  def current_restaurant
    @current_restaurant ||= Restaurant.current
  end

  private

  def authorize
    render json: { errors: ["Please log in to continue."] }, status: :unauthorized unless current_user
  end

  def require_admin
    render json: { errors: ["Admins only."] }, status: :forbidden unless current_user&.admin
  end

  def render_errors(errors, status = :unprocessable_content)
    render json: { errors: Array(errors) }, status: status
  end

  def rescue_invalid(invalid)
    render_errors invalid.record.errors.full_messages
  end

  def rescue_not_found(error)
    render_errors "#{error.model || 'Record'} not found", :not_found
  end

  def rescue_bad_request(error)
    render_errors error.message, :bad_request
  end
end
