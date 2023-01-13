class IngredientSerializer < ActiveModel::Serializer
  attributes :id, :name, :image, :price
end
