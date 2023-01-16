class IngredientItem < ApplicationRecord
  belongs_to :ingredient
  belongs_to :menu_item
end
