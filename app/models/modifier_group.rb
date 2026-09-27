# A set of choices customers make for an item, such as "Bread Choice" (pick 1)
# or "Extras" (pick any, some cost more). One group can be attached to many
# items, so the owner edits the bread list once for every sandwich.
class ModifierGroup < ApplicationRecord
  MAX_OPTIONS = 30

  belongs_to :restaurant
  has_many :menu_item_modifier_groups, dependent: :destroy
  has_many :menu_items, through: :menu_item_modifier_groups

  validates :name, presence: true, length: { maximum: 40 }
  validates :min_select, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :max_select, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validate :options_are_valid
  validate :limits_make_sense

  before_validation :normalize
  before_create :append_to_end

  scope :ordered, -> { order(:position, :id) }

  def option_named(name)
    options.find { |o| o["name"] == name.to_s.strip }
  end

  private

  def normalize
    self.name = name&.strip
    self.max_select = nil if max_select.to_s.strip.empty?
    self.options = Array(options).map do |o|
      o = o.to_h.stringify_keys
      price = BigDecimal(o["price"].presence || "0", exception: false)
      { "name" => o["name"].to_s.strip, "price" => price && format("%.2f", price.round(2)) }
    end
  end

  def options_are_valid
    errors.add(:base, "Add at least one option") if options.empty?
    errors.add(:base, "A group can have at most #{MAX_OPTIONS} options") if options.size > MAX_OPTIONS
    errors.add(:base, "Every option needs a name (up to 40 characters)") unless options.all? { |o| o["name"].present? && o["name"].length <= 40 }
    errors.add(:base, "Option names must be different") unless options.map { |o| o["name"].downcase }.uniq.size == options.size
    unless options.all? { |o| o["price"] && o["price"].to_d >= 0 && o["price"].to_d < 1000 }
      errors.add(:base, "Option prices must be between $0.00 and $999.99")
    end
  end

  def limits_make_sense
    return if min_select.nil? || options.empty?

    errors.add(:base, "Customers can't be required to pick more options than there are") if min_select > options.size
    errors.add(:base, "The most a customer can pick must be at least the minimum") if max_select && max_select < min_select
  end

  def append_to_end
    self.position = (restaurant.modifier_groups.maximum(:position) || 0) + 1 if position.to_i.zero?
  end
end
