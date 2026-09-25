class MenuItem < ApplicationRecord
  belongs_to :restaurant
  belongs_to :category
  has_many :order_items, dependent: :restrict_with_error

  validates :name, presence: true, length: { maximum: 80 }
  validates :price, presence: true, numericality: { greater_than: 0, less_than: 1000 }
  validates :image, format: { with: %r{\Ahttps?://\S+\z}, message: "must be a full http(s) URL" }, allow_blank: true
  validate :category_belongs_to_restaurant

  before_validation { self.name = name&.strip }
  before_create :append_to_end

  scope :ordered, -> { order(:position, :id) }
  scope :available, -> { where(available: true) }

  private

  def category_belongs_to_restaurant
    errors.add(:category, "is not part of this restaurant") if category && category.restaurant_id != restaurant_id
  end

  def append_to_end
    return unless position.to_i.zero? && category

    self.position = (category.menu_items.maximum(:position) || 0) + 1
  end
end
