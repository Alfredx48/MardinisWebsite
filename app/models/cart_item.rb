class CartItem < ApplicationRecord
  belongs_to :cart
  belongs_to :menu_item


  def item_name
    dish = self.menu_item.name
  end

  def price
    dish = self.menu_item.price
  end

  def item_total
    quantity = self.quantity
    if quantity < 1
      return price
    else total = price * quantity     end
    # ActionController::Base.helpers.number_to_currency(total)
  end

  def cart_total
    self.cart.total_cost
  end

    
  def cart_items
    self.cart.total_items
  end


end
