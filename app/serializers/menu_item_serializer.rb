class MenuItemSerializer < ActiveModel::Serializer
  include ActionView::Helpers::NumberHelper
  attributes :id, :name, :description, :image, :formatted_price
  has_one :restaurant

  def formatted_price
    number_to_currency(object.price)
  end
end
