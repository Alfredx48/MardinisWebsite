class UserSerializer < ActiveModel::Serializer
  attributes :id, :email, :name, :address, :phone, :admin
  has_many :carts
  has_many :orders
end
