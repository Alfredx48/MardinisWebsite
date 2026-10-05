require "net/http"

# Rings the kitchen tablets (the Android Kitchen app) for a new order through Firebase Cloud
# Messaging, so it wakes up even when the app is closed or the screen is off. Sends a
# high-priority data message to every kitchen/admin device (DeviceToken.for_kitchen).
#
# Does nothing until FIREBASE_SERVICE_ACCOUNT_JSON (the Firebase service account key, as JSON)
# is set, and never raises into order placement: the kitchen screen still polls every 10s.
# Sends on a background thread; specs set `KitchenPush.inline = true`.
module KitchenPush
  SCOPE = "https://www.googleapis.com/auth/firebase.messaging".freeze
  TIMEOUT = 5 # seconds, for each request to Google
  # A tablet that can't be reached within 10 minutes doesn't need the alert any more.
  TTL = "600s".freeze
  # FCM errors that mean the token is dead (app uninstalled, or from another Firebase project).
  DEAD_TOKEN_ERRORS = %w[UNREGISTERED SENDER_ID_MISMATCH].freeze

  mattr_accessor :inline, default: false

  @lock = Mutex.new

  module_function

  def configured?
    ENV["FIREBASE_SERVICE_ACCOUNT_JSON"].present?
  end

  def new_order(order)
    return unless configured?

    order_id = order.id
    run { send_new_order(order_id) }
  rescue StandardError => e
    log_error("couldn't start for order #{order&.id}", e)
  end

  def send_new_order(order_id)
    order = Order.find_by(id: order_id)
    return unless order

    data = { type: "new_order", order_id: order.id.to_s, number: order.number }
    DeviceToken.for_kitchen.find_each do |device|
      deliver(device, data)
    rescue StandardError => e
      log_error("failed for user #{device.user_id}'s device, order #{order_id}", e) # the other devices still get theirs
    end
  rescue StandardError => e
    log_error("failed for order #{order_id}", e)
  end

  def run(&block)
    return block.call if inline

    Thread.new { Rails.application.executor.wrap(&block) }
  end

  # One message to one device, retried once on a temporary error or an expired OAuth token.
  def deliver(device, data, retried: false)
    body = { message: { token: device.token, data: data, android: { priority: "high", ttl: TTL } } }
    status, response = post_message(body)
    return if status == 200

    error = response.is_a?(Hash) ? response["error"] || {} : {}
    codes = [error["status"], *Array(error["details"]).map { |d| d["errorCode"] if d.is_a?(Hash) }].compact
    # Only FCM's explicit answers: a wrong project id also gives a 404, and mustn't wipe every token.
    if (codes & DEAD_TOKEN_ERRORS).any? || (status == 400 && error["message"].to_s.match?(/registration token/i))
      device.destroy
      Rails.logger.info("[kitchen_push] removed a dead device token (user #{device.user_id}): #{codes.join(', ')}")
    elsif !retried && (status == 401 || status == 429 || status >= 500)
      reset_access_token if status == 401
      sleep(1) unless inline
      deliver(device, data, retried: true)
    else
      Rails.logger.error("[kitchen_push] FCM #{status} for user #{device.user_id}'s device: #{error['message']}")
    end
  end

  # [HTTP status, parsed JSON body]. Network errors count as a 503, so they're retried once.
  def post_message(body)
    uri = URI("https://fcm.googleapis.com/v1/projects/#{project_id}/messages:send")
    request = Net::HTTP::Post.new(uri, "Authorization" => "Bearer #{access_token}", "Content-Type" => "application/json")
    request.body = body.to_json
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: TIMEOUT, read_timeout: TIMEOUT,
                                                   write_timeout: TIMEOUT) { |http| http.request(request) }
    [response.code.to_i, (JSON.parse(response.body) rescue nil)]
  rescue Net::OpenTimeout, Net::ReadTimeout, Net::WriteTimeout, SocketError, SystemCallError, OpenSSL::SSL::SSLError => e
    log_error("network error", e)
    [503, nil]
  end

  def project_id
    service_account.fetch("project_id")
  end

  # Google OAuth tokens last an hour; one is shared by all threads and renewed a few minutes early.
  def access_token
    @lock.synchronize do
      @credentials ||= Google::Auth::ServiceAccountCredentials.make_creds(
        json_key_io: StringIO.new(ENV.fetch("FIREBASE_SERVICE_ACCOUNT_JSON")), scope: SCOPE,
      )
      @credentials.fetch_access_token! if @credentials.access_token.nil? || @credentials.expires_within?(300)
      @credentials.access_token
    end
  end

  def reset_access_token
    @lock.synchronize { @credentials = nil }
  end

  def service_account
    JSON.parse(ENV.fetch("FIREBASE_SERVICE_ACCOUNT_JSON"))
  end

  def log_error(what, error)
    Rails.logger.error("[kitchen_push] #{what}: #{error.class}: #{error.message}")
  end
end
