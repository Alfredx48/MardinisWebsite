class CartItemSerializer < ActiveModel::Serializer
  attributes :id, :quantity, :item_name, :special_request, :item_total, :cart_total, :cart_items
  has_one :cart
  has_one :menu_item



end
