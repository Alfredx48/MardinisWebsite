class Cart < ApplicationRecord
  TAX_RATE = 0.095
  has_many :cart_items, dependent: :destroy
  has_many :menu_items, through: :cart_items

  def sub_total
    total = 0
    self.cart_items.each do |i|
      if i.quantity != nil
        total += i.quantity * i.menu_item.price
      end
    end
    total
  end

  def total_items
    items = self.cart_items.sum(:quantity)
  end

  def total_with_tax
    (sub_total * (1 + TAX_RATE)).round(2)
  end
end
