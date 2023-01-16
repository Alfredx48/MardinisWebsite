class Cart < ApplicationRecord
  has_many :cart_items
  has_many :menu_items, through: :cart_items

  # def total_cost
  #   total = self.cart_items.map { |i| i.quantity * i.menu_item.price }.sum
  #   sprintf("$%.2f", total)
  # end

  def total_cost
    total = 0
    self.cart_items.each do |item|
      total += item.quantity * item.menu_item.price
    end
    total
    ActionController::Base.helpers.number_to_currency(total)
  end

  def total_items
    items = self.cart_items.sum(:quantity)
  end
end
