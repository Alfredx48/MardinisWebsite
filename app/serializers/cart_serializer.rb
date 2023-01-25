class CartSerializer < ActiveModel::Serializer
  attributes :id, :total_items, :total_cost, :restaurant_id
  has_many :cart_items
  has_many :menu_items
end
