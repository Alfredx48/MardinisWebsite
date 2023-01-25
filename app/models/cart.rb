class Cart < ApplicationRecord
  has_many :cart_items, dependent: :destroy
  has_many :menu_items, through: :cart_items

  def total_cost
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
end
