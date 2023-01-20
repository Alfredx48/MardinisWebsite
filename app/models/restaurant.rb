class Restaurant < ApplicationRecord
  has_many :carts, dependent: :destroy
  has_many :menu_items, dependent: :destroy
  has_many :orders, dependent: :destroy 
end
