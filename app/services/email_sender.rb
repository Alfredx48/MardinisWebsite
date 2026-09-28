require "net/http"

# Sends email through Resend's HTTP API (https://resend.com). Needs RESEND_API_KEY
# and MAIL_FROM, e.g. "Mardini's Deli Cafe <no-reply@mardinismenlopark.com>", on
# the server. In development without a key, messages are written to the log.
#
# Daily budget: Resend's free plan sends at most 100 emails a day. Order
# confirmations stop RESERVED_FOR_ESSENTIAL emails short of the limit, so
# password resets always get through. EMAIL_DAILY_LIMIT overrides the limit
# (set it to 0 for no limit, e.g. on Resend's Pro plan).
module EmailSender
  class Error < StandardError; end
  class OverDailyLimit < Error; end

  API_URL = URI("https://api.resend.com/emails")
  DEFAULT_DAILY_LIMIT = 100
  RESERVED_FOR_ESSENTIAL = 20
  ESSENTIAL_KINDS = %w[password_reset].freeze

  module_function

  def configured?
    live? || Rails.env.development?
  end

  def live?
    ENV["RESEND_API_KEY"].present? && ENV["MAIL_FROM"].present?
  end

  # nil means no limit.
  def daily_limit
    limit = ENV.fetch("EMAIL_DAILY_LIMIT", DEFAULT_DAILY_LIMIT).to_i
    limit.positive? ? limit : nil
  end

  def room_for?(kind)
    limit = daily_limit
    return true unless limit

    ceiling = ESSENTIAL_KINDS.include?(kind.to_s) ? limit : limit - RESERVED_FOR_ESSENTIAL
    SentEmail.last_24_hours.count < ceiling
  end

  def app_url
    ENV["APP_URL"].presence || (Rails.env.production? ? "https://mardinismenlopark.com" : "http://localhost:4000")
  end

  def deliver!(kind:, to:, subject:, text:, html: nil)
    raise OverDailyLimit, "Daily email limit reached; skipped #{kind}" unless room_for?(kind)

    if live?
      post!(to: to, subject: subject, text: text, html: html)
    elsif Rails.env.development?
      Rails.logger.info("[EmailSender] To #{to}: #{subject}\n#{text}")
    else
      raise Error, "Email isn't set up. Add RESEND_API_KEY and MAIL_FROM on the server."
    end
    SentEmail.record!(kind.to_s)
  end

  def post!(to:, subject:, text:, html:)
    request = Net::HTTP::Post.new(API_URL, "Authorization" => "Bearer #{ENV['RESEND_API_KEY']}", "Content-Type" => "application/json")
    request.body = { from: ENV["MAIL_FROM"], to: [to], subject: subject, text: text, html: html }.compact.to_json
    response = Net::HTTP.start(API_URL.host, API_URL.port, use_ssl: true, open_timeout: 5, read_timeout: 10) { |http| http.request(request) }
    raise Error, "Resend HTTP #{response.code}: #{response.body.to_s.first(300)}" unless response.is_a?(Net::HTTPSuccess)
  end
end
