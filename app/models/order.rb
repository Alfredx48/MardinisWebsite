class Order < ApplicationRecord
  has_many :order_items, dependent: :destroy
  has_many :menu_items, through: :order_items

  def self.create_from_cart(cart, user_id, status, custom_request)
    if cart.total_items == 0 || cart.total_cost == 0
    raise "Order can't be submitted with 0 items or cost"
    end
    order = Order.create(
      user_id: user_id,
      total_cost: cart.total_cost,
      restaurant_id: cart.restaurant_id,
      total_items: cart.total_items,
      status: status,
      custom_request: custom_request
    )
    cart.save!
    cart.cart_items.each do |cart_item|
      order.order_items.create(
        special_request: cart_item.special_request,
        menu_item_id: cart_item.menu_item_id,
        quantity: cart_item.quantity
      )
    end
    order
  end
end
