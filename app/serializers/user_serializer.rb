class UserSerializer < ActiveModel::Serializer
  attributes :id, :email, :name, :address, :phone, :admin, :orders
  has_many :carts
  has_many :cart_items
  # has_many :orders
  # has_many :order_items

  def orders
    ActiveModel::SerializableResource.new(object.orders.order(created_at: :desc))
  end
end
