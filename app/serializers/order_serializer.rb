class OrderSerializer < ActiveModel::Serializer
  attributes :id, :total_cost, :status, :custom_request, :placed_at, :completed_at
  has_one :user
end
