class OrderItemSerializer < ActiveModel::Serializer
  attributes :id, :quantity, :special_request
  has_one :order
  has_one :menu_item
end
