class CateringInquiry < ApplicationRecord
  STATUSES = %w[new contacted booked closed].freeze

  belongs_to :restaurant

  validates :name, :phone, presence: true
  validates :email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  validates :guest_count, numericality: { only_integer: true, greater_than: 0, less_than: 10_000 }, allow_nil: true
  validates :message, length: { maximum: 2000 }
  validates :status, inclusion: { in: STATUSES }

  default_scope { order(created_at: :desc) }
end
