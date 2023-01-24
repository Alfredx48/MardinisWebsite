class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :menu_item

  def name 
    self.menu_item.name
  end
end
