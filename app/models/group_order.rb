# A shared cart: the organizer (host) shares a link, people add their own items
# under their name, and the host checks out and pays for everything at once.
# Each person's name is written on their items, like the per-item names in a
# normal cart.
class GroupOrder < ApplicationRecord
  EXPIRES_AFTER = 7.days
  MAX_PEOPLE = 100
  MAX_LINES = 200

  belongs_to :restaurant
  belongs_to :order, optional: true
  has_many :participants, -> { order(:id) }, class_name: "GroupOrderParticipant", dependent: :destroy
  has_many :items, through: :participants

  validates :host_name, presence: true, length: { maximum: OrderItem::LABEL_MAX }
  validates :host_email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :host_phone, length: { maximum: 30 }
  validates :note, length: { maximum: 200 }
  validates :per_person_limit, numericality: { greater_than: 0, less_than: 1000 }, allow_nil: true
  validate :deadline_in_the_future, on: :create

  before_validation do
    self.host_name = host_name.to_s.squish
    self.host_email = host_email.to_s.strip.downcase
    self.host_phone = host_phone.to_s.strip.presence
    self.note = note.to_s.squish.presence
  end
  before_validation(on: :create) do
    self.token ||= SecureRandom.urlsafe_base64(12)
    self.host_token ||= SecureRandom.urlsafe_base64(18)
  end

  def host?(key)
    key.present? && ActiveSupport::SecurityUtils.secure_compare(key.to_s, host_token)
  end

  def placed?
    order.present? && order.placed?
  end

  def expired?(now = Time.current)
    created_at < now - EXPIRES_AFTER
  end

  def past_deadline?(now = Time.current)
    deadline_at.present? && now >= deadline_at
  end

  # Whether people (other than the host) can still join and change their items.
  def accepting_items?(now = Time.current)
    open && !placed? && !expired?(now) && !past_deadline?(now)
  end

  private

  def deadline_in_the_future
    errors.add(:deadline_at, "must be in the future") if deadline_at && deadline_at <= Time.current
  end
end
