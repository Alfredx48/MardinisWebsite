class Ingredient < ApplicationRecord
  has_many :ingredient_items
  has_many :menu_items, through: :ingredient_items
end
