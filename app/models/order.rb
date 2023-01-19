class Order < ApplicationRecord
  belongs_to :restaurant
  has_many :order_items, dependent: :destroy
  has_many :menu_items, through: :order_items


  def self.create_from_cart(cart, user_id)
    order = Order.create(
      user_id: user_id,
      total_cost: cart.total_cost,
      total_items: cart.total_items,
      special_request: cart.special_request
    )

    cart.cart_items.each do |cart_item|
      order.order_items.create(
        menu_item_id: cart_item.menu_item_id,
        quantity: cart_item.quantity
      )
    end
    order
  end

end
