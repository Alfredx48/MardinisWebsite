# "Forgot password?" by email, and setting a new password from a reset link
# (emailed, or made by an admin in Admin → Customers).
class Api::PasswordsController < ApplicationController
  skip_before_action :authorize
  rate_limit to: 5, within: 15.minutes, only: :forgot,
             with: -> { render_errors "Too many requests. Please wait a few minutes and try again.", :too_many_requests }
  rate_limit to: 20, within: 15.minutes, only: :reset,
             with: -> { render_errors "Too many tries. Please wait a few minutes and try again.", :too_many_requests }

  EXPIRED_LINK = "This reset link has expired. Please ask for a new one.".freeze
  USED_LINK = "This reset link was already used, or the password was changed since it was sent. " \
              "If you still need to reset your password, please ask for a new link.".freeze
  BAD_LINK = "This reset link isn't valid. Please ask for a new one.".freeze

  # POST { email }. Answers the same whether or not the account exists, so it
  # can't be used to find out who has one.
  def forgot
    return render json: { email_enabled: false } unless EmailSender.configured?

    user = User.find_by("LOWER(email) = ?", params[:email].to_s.strip.downcase)
    send_reset_email(user) if user
    render json: { email_enabled: true }
  end

  # GET ?token=... lets the reset page say up front when a link is dead.
  def check
    user = User.find_by_any_reset_token(params[:token].to_s)
    return render_errors invalid_link_message(params[:token]) unless user

    render json: { name: user.name.to_s.split.first }
  end

  # POST { token, password, password_confirmation }: sets the password, signs
  # out every other device and signs in here.
  def reset
    user = User.find_by_any_reset_token(params[:token].to_s)
    return render_errors invalid_link_message(params[:token]) unless user
    return render_errors "Enter a new password" if params[:password].blank?

    user.update!(password: params[:password], password_confirmation: params[:password_confirmation].to_s)
    log_in(user)
    render json: Presenters.user(user)
  end

  private

  # Why a link didn't work, for the message only. The token's expiry is readable
  # without the key; nothing here trusts it for anything else. A link that hasn't
  # expired but no longer matches was used (or the password changed another way).
  def invalid_link_message(token)
    payload = JSON.parse(Base64.decode64(token.to_s.split("--").first.to_s))
    expires_at = Time.iso8601(payload.dig("_rails", "exp"))
    expires_at.past? ? EXPIRED_LINK : USED_LINK
  rescue JSON::ParserError, ArgumentError, TypeError, NoMethodError
    BAD_LINK
  end

  def send_reset_email(user)
    url = password_reset_url(user.password_reset_token)
    name = user.name.to_s.split.first.presence || "there"
    EmailSender.deliver!(
      kind: "password_reset",
      to: user.email,
      subject: "Reset your Mardini's password",
      text: <<~TEXT,
        Hi #{name},

        Someone (hopefully you) asked to reset the password for your Mardini's Deli Cafe account.
        Choose a new password here (the link works for 30 minutes):

        #{url}

        If you didn't ask for this, you can ignore this email. Your password won't change.

        Mardini's Deli Cafe · 408 Willow Rd, Menlo Park
      TEXT
      html: <<~HTML,
        <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#231d17;max-width:480px">
          <p>Hi #{ERB::Util.h(name)},</p>
          <p>Someone (hopefully you) asked to reset the password for your Mardini's Deli Cafe account.</p>
          <p><a href="#{ERB::Util.h(url)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#b4452c;color:#fff;text-decoration:none;font-weight:bold">Choose a new password</a></p>
          <p style="color:#5b5147;font-size:14px">The link works for 30 minutes. If you didn't ask for this, you can ignore this email; your password won't change.</p>
          <p style="color:#8d8276;font-size:13px">Mardini's Deli Cafe · 408 Willow Rd, Menlo Park</p>
        </div>
      HTML
    )
  rescue EmailSender::Error => e
    # The answer stays the same either way; the log tells us sending failed.
    Rails.logger.error("Password reset email to user #{user.id} failed: #{e.message}")
  end
end
