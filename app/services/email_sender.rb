require "net/http"

# Sends email through Resend's HTTP API (https://resend.com). Needs RESEND_API_KEY
# and MAIL_FROM, e.g. "Mardini's Deli Cafe <no-reply@mardinismenlopark.com>", on
# the server. In development without a key, messages are written to the log.
module EmailSender
  class Error < StandardError; end

  API_URL = URI("https://api.resend.com/emails")

  module_function

  def configured?
    live? || Rails.env.development?
  end

  def live?
    ENV["RESEND_API_KEY"].present? && ENV["MAIL_FROM"].present?
  end

  def deliver!(to:, subject:, text:, html: nil)
    unless live?
      raise Error, "Email isn't set up. Add RESEND_API_KEY and MAIL_FROM on the server." unless Rails.env.development?

      Rails.logger.info("[EmailSender] To #{to}: #{subject}\n#{text}")
      return
    end

    request = Net::HTTP::Post.new(API_URL, "Authorization" => "Bearer #{ENV['RESEND_API_KEY']}", "Content-Type" => "application/json")
    request.body = { from: ENV["MAIL_FROM"], to: [to], subject: subject, text: text, html: html }.compact.to_json
    response = Net::HTTP.start(API_URL.host, API_URL.port, use_ssl: true, open_timeout: 5, read_timeout: 10) { |http| http.request(request) }
    raise Error, "Resend HTTP #{response.code}: #{response.body.to_s.first(300)}" unless response.is_a?(Net::HTTPSuccess)
  end
end
