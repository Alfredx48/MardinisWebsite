class RestauarantAllSerializer < ActiveModel::Serializer
  attributes :id, :name, :hours_of_operation, :description, :address, :phone
  has_many :orders
end
