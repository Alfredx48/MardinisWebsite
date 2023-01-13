class MenuItem < ApplicationRecord
  belongs_to :restaurant
  has_many :order_items
  has_many :ingredients, through: :order_items
end
