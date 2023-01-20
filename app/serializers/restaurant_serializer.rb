class RestaurantSerializer < ActiveModel::Serializer
  attributes :id, :name, :hours_of_operation, :description, :address, :phone
  has_many :orders
  has_many :carts
  has_many :menu_items
end
