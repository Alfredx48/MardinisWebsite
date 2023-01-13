class MenuItemSerializer < ActiveModel::Serializer
  attributes :id, :name, :description, :price, :image
  has_one :restaurant
end
