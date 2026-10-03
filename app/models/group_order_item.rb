# Something a person added to a group order. Priced at checkout, like a cart line.
class GroupOrderItem < ApplicationRecord
  belongs_to :participant, class_name: "GroupOrderParticipant", foreign_key: :group_order_participant_id
  belongs_to :menu_item

  validates :quantity, numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: Checkout::MAX_QUANTITY }
  validates :special_request, length: { maximum: 200 }

  # The line as Checkout expects it, with the person's name to write on it.
  def to_checkout_line
    {
      menu_item_id: menu_item_id,
      size: size,
      modifiers: modifiers,
      quantity: quantity,
      special_request: special_request,
      label: participant.name,
    }.with_indifferent_access
  end
end
