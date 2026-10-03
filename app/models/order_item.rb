class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :menu_item

  LABEL_MAX = 40

  validates :quantity, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: Checkout::CATERING_MAX_QUANTITY }
  validates :special_request, length: { maximum: 200 }
  validates :label, length: { maximum: LABEL_MAX }

  def name
    item_name.presence || menu_item.name
  end

  def line_total
    (unit_price || 0) * quantity
  end
end
