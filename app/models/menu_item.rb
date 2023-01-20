class MenuItem < ApplicationRecord
  belongs_to :restaurant
  has_many :cart_items, dependent: :destroy
end
