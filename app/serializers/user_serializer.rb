class UserSerializer < ActiveModel::Serializer
  attributes :id, :email, :name, :address, :phone, :admin
  has_many :carts
  has_many :cart_items
  has_many :orders
  has_many :order_items
end
