class Order < ApplicationRecord
  belongs_to :user
  has_many :order_items, through: :menu_items
  has_many :menu_items, through: :order_items
end
