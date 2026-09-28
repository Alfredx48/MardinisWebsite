class ApplicationController < ActionController::API
  include ActionController::Cookies
  rescue_from ActiveRecord::RecordInvalid, with: :rescue_invalid
  rescue_from ActiveRecord::RecordNotFound, with: :rescue_not_found
  rescue_from ActionController::ParameterMissing, with: :rescue_bad_request
  before_action :authorize

  def current_user
    return @current_user if defined?(@current_user)

    user = session[:user_id] && User.find_by(id: session[:user_id])
    if user && session[:auth] != user.session_fingerprint
      # Logins from before this check get stamped once; any other mismatch means
      # the password changed since this device signed in.
      if session[:auth].nil?
        session[:auth] = user.session_fingerprint
      else
        user = nil
        reset_session
      end
    end
    @current_user = user
  end

  def log_in(user)
    reset_session
    session[:user_id] = user.id
    session[:auth] = user.session_fingerprint
    @current_user = user
  end

  # Links in emails always point at the real site, never at whatever Host the
  # request claimed to be for.
  def app_url
    ENV["APP_URL"].presence || (Rails.env.production? ? "https://mardinismenlopark.com" : request.base_url)
  end

  def password_reset_url(token)
    "#{app_url}/reset-password?#{URI.encode_www_form(token: token)}"
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

  def require_staff
    render json: { errors: ["Staff only."] }, status: :forbidden unless current_user&.staff?
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
