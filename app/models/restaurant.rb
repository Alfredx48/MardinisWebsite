class Restaurant < ApplicationRecord
  has_many :carts, dependent: :destroy
  has_many :menu_items, dependent: :destroy
  has_many :orders, dependent: :destroy 
  has_many :order_items, through: :orders
  accepts_nested_attributes_for :orders

end
