class User < ApplicationRecord
  has_many :orders, -> { order(created_at: :desc) }, dependent: :nullify
  has_many :device_tokens, dependent: :destroy

  # Emailed "Forgot password?" links work for 30 minutes. Like every reset link,
  # they stop working once the password changes, so each can be used only once.
  has_secure_password reset_token: { expires_in: 30.minutes }

  # Links an admin makes in Admin → Customers and texts to someone last a day.
  STAFF_RESET_EXPIRES_IN = 24.hours
  generates_token_for :staff_password_reset, expires_in: STAFF_RESET_EXPIRES_IN do
    password_salt&.last(10)
  end

  def self.find_by_any_reset_token(token)
    find_by_password_reset_token(token) || find_by_token_for(:staff_password_reset, token)
  end

  before_validation { self.email = email&.strip&.downcase }

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validate :email_is_unique
  validates :password, length: { minimum: 8 }, allow_nil: true
  validates :name, presence: true
  validates :phone, presence: true

  ROLES = %w[customer kitchen admin].freeze

  def role
    if admin then "admin"
    elsif kitchen then "kitchen"
    else "customer"
    end
  end

  # Admins and kitchen staff both use the kitchen screen.
  def staff?
    admin || kitchen
  end

  # Kept in the session at login. A new password changes it, which signs the
  # account out everywhere else.
  def session_fingerprint
    password_salt&.last(10)
  end

  private

  def email_is_unique
    return if email.blank?

    taken = User.where("LOWER(email) = ?", email).where.not(id: id).exists?
    errors.add(:email, "is already registered") if taken
  end
end
