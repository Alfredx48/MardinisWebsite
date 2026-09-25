class MenuItem < ApplicationRecord
  belongs_to :restaurant
  belongs_to :category
  has_many :order_items, dependent: :restrict_with_error

  validates :name, presence: true, length: { maximum: 80 }
  validates :price, presence: true, numericality: { greater_than: 0, less_than: 1000 }
  validates :image, format: { with: %r{\Ahttps?://\S+\z}, message: "must be a full http(s) URL" }, allow_blank: true
  validate :category_belongs_to_restaurant
  validate :sizes_are_valid

  MAX_SIZES = 8

  before_validation { self.name = name&.strip }
  before_validation :normalize_sizes
  before_create :append_to_end

  scope :ordered, -> { order(:position, :id) }
  scope :available, -> { where(available: true) }

  def sized?
    sizes.present?
  end

  def size_named(name)
    sizes.find { |s| s["name"] == name.to_s.strip }
  end

  private

  # Sized items keep `price` in sync with their cheapest size, so lists can
  # show "from $X" and sort/filter on a single number.
  def normalize_sizes
    self.sizes = Array(sizes).map do |s|
      s = s.to_h.stringify_keys
      price = BigDecimal(s["price"].to_s, exception: false)
      { "name" => s["name"].to_s.strip, "price" => price && format("%.2f", price.round(2)) }
    end
    self.price = sizes.filter_map { |s| s["price"]&.to_d }.min if sizes.any? && sizes.all? { |s| s["price"] }
  end

  def sizes_are_valid
    return if sizes.empty?

    errors.add(:base, "An item can have at most #{MAX_SIZES} sizes") if sizes.size > MAX_SIZES
    errors.add(:base, "Every size needs a name (up to 30 characters)") unless sizes.all? { |s| s["name"].present? && s["name"].length <= 30 }
    errors.add(:base, "Size names must be different") unless sizes.map { |s| s["name"].downcase }.uniq.size == sizes.size
    unless sizes.all? { |s| s["price"] && s["price"].to_d.positive? && s["price"].to_d < 1000 }
      errors.add(:base, "Every size needs a price between $0.01 and $999.99")
    end
  end

  def category_belongs_to_restaurant
    errors.add(:category, "is not part of this restaurant") if category && category.restaurant_id != restaurant_id
  end

  def append_to_end
    return unless position.to_i.zero? && category

    self.position = (category.menu_items.maximum(:position) || 0) + 1
  end
end
