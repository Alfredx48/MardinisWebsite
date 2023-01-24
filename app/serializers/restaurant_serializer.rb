class RestaurantSerializer < ActiveModel::Serializer
  attributes :id, :name, :hours_of_operation, :description, :address, :phone, :orders
  # has_many :orders
  has_many :carts
  has_many :menu_items

  def orders
    ActiveModel::SerializableResource.new(object.orders.order(created_at: :desc))
end
end