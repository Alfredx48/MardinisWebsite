class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :menu_item

  validates :quantity, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 50 }
  validates :special_request, length: { maximum: 200 }

  def name
    item_name.presence || menu_item.name
  end

  def line_total
    (unit_price || 0) * quantity
  end
end
