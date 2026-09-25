class User < ApplicationRecord
  has_many :orders, -> { order(created_at: :desc) }, dependent: :nullify

  has_secure_password

  before_validation { self.email = email&.strip&.downcase }

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validate :email_is_unique
  validates :password, length: { minimum: 8 }, allow_nil: true
  validates :name, presence: true
  validates :phone, presence: true

  private

  def email_is_unique
    return if email.blank?

    taken = User.where("LOWER(email) = ?", email).where.not(id: id).exists?
    errors.add(:email, "is already registered") if taken
  end
end
