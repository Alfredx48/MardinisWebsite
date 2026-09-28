# A record that an email went out (its kind and when), used by EmailSender to
# stay under the provider's daily limit.
class SentEmail < ApplicationRecord
  KINDS = %w[password_reset order_confirmation].freeze

  validates :kind, inclusion: { in: KINDS }

  scope :last_24_hours, -> { where("created_at > ?", 24.hours.ago) }

  def self.record!(kind)
    create!(kind: kind)
    where("created_at < ?", 7.days.ago).delete_all if rand < 0.05
  end
end
