class OrderSerializer < ActiveModel::Serializer
  attributes :id, :total_cost, :total_items, :status, :custom_request, :created_at, :user_id, :restaurant_id
  has_many :order_items

end
