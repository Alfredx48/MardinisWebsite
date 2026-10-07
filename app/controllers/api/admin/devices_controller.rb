# The Android Kitchen app registers its push token here after a staff sign-in, and again on
# each launch (which keeps last_seen_at fresh), and removes it on sign-out. See KitchenPush.
class Api::Admin::DevicesController < Api::Admin::BaseController
  skip_before_action :require_admin
  before_action :require_staff

  rate_limit to: 30, within: 10.minutes, name: "devices",
             with: -> { render_errors "Too many requests. Please try again in a few minutes.", :too_many_requests }

  # POST { token, platform: "android" }. A token moves to whoever signed in last on that device.
  def create
    retried = false
    begin
      device = DeviceToken.find_or_initialize_by(token: token_param)
      device.assign_attributes(user: current_user, platform: params[:platform].presence || "android", last_seen_at: Time.current)
      device.save!
    rescue ActiveRecord::RecordNotUnique
      # Two registrations of a new token at once (launch + token refresh): the other one won; update it.
      raise if retried

      retried = true
      retry
    end
    render json: { registered: true }
  end

  # DELETE { token }: only your own device.
  def destroy
    removed = current_user.device_tokens.where(token: token_param).delete_all
    return render_errors("Device not found.", :not_found) if removed.zero?

    head :no_content
  end

  private

  def token_param
    params.require(:token).to_s
  end
end
