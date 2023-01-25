class CartSerializer < ActiveModel::Serializer
  attributes :id, :total_items, :sub_total, :restaurant_id, :total_with_tax
  has_many :cart_items
  has_many :menu_items
end
