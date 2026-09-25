class Category < ApplicationRecord
  belongs_to :restaurant
  has_many :menu_items, -> { order(:position, :id) }, dependent: :restrict_with_error

  validates :name, presence: true, length: { maximum: 60 }

  scope :active, -> { where(active: true) }
  scope :ordered, -> { order(:position, :id) }

  before_create :append_to_end

  private

  def append_to_end
    self.position = (restaurant.categories.maximum(:position) || -1) + 1 if position.to_i.zero? && restaurant.categories.exists?
  end
end
