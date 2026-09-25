class Order < ApplicationRecord
  # awaiting_payment orders are card orders that haven't cleared yet; they stay
  # hidden from the kitchen until Stripe confirms the charge.
  STATUSES = %w[awaiting_payment new preparing ready completed cancelled].freeze
  ACTIVE_STATUSES = %w[new preparing ready].freeze
  KITCHEN_FLOW = { "new" => "preparing", "preparing" => "ready", "ready" => "completed" }.freeze
  PAYMENT_METHODS = %w[card in_store].freeze
  PAYMENT_STATUSES = %w[unpaid paid refunded].freeze

  belongs_to :user, optional: true
  belongs_to :restaurant
  has_many :order_items, dependent: :destroy
  has_many :menu_items, through: :order_items

  validates :status, inclusion: { in: STATUSES }
  validates :payment_method, inclusion: { in: PAYMENT_METHODS }
  validates :payment_status, inclusion: { in: PAYMENT_STATUSES }
  validates :customer_name, :customer_phone, presence: true
  validates :customer_email, format: { with: URI::MailTo::EMAIL_REGEXP }, allow_blank: true
  validates :custom_request, length: { maximum: 500 }
  validates :token, presence: true, uniqueness: true

  before_validation(on: :create) { self.token ||= SecureRandom.urlsafe_base64(18) }

  scope :recent_first, -> { order(Arel.sql("COALESCE(placed_at, created_at) DESC")) }
  scope :placed, -> { where.not(status: "awaiting_payment") }
  scope :active, -> { where(status: ACTIVE_STATUSES) }
  scope :revenue, -> { placed.where.not(status: "cancelled") }

  def number
    id.to_s.rjust(4, "0")
  end

  def amount_cents
    (total_cost * 100).round.to_i
  end

  def asap?
    pickup_at.nil?
  end

  def placed?
    status != "awaiting_payment"
  end

  def mark_placed!
    update!(status: "new", placed_at: Time.current)
  end

  def mark_paid!(payment_intent_id)
    with_lock do
      return self if payment_status == "paid"

      update!(payment_status: "paid", payment_intent_id: payment_intent_id)
      mark_placed! unless placed?
    end
    self
  end

  def advance_to!(new_status, reason: nil)
    raise ArgumentError, "Unknown status" unless STATUSES.include?(new_status)
    raise ArgumentError, "Unpaid card orders can't be sent to the kitchen" if !placed? && new_status != "cancelled"

    attrs = { status: new_status }
    attrs[:ready_at] = Time.current if new_status == "ready"
    attrs[:completed_at] = Time.current if new_status == "completed"
    if new_status == "completed" && payment_method == "in_store"
      attrs[:payment_status] = "paid"
    end
    attrs[:cancel_reason] = reason if new_status == "cancelled"
    update!(attrs)
  end
end
