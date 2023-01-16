class IngredientItemSerializer < ActiveModel::Serializer
  attributes :id
  has_one :ingredient
  has_one :menu_item
end
