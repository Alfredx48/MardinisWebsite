class Refund < ApplicationRecord
  SOURCES = %w[admin customer].freeze

  belongs_to :order
  belongs_to :refunded_by, class_name: "User", optional: true

  validates :amount, numericality: { greater_than: 0 }
  validates :source, inclusion: { in: SOURCES }
  validates :reason, length: { maximum: 120 }
  validates :note, length: { maximum: 1000 }
end
