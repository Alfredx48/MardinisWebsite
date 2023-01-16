class MenuItem < ApplicationRecord
  belongs_to :restaurant
  has_many :ingredient_items, dependent: :destroy
  has_many :ingredients, through: :ingredient_items



  
end
