# One person in a group order. Their name goes on each of their items.
class GroupOrderParticipant < ApplicationRecord
  belongs_to :group_order
  has_many :items, -> { order(:id) }, class_name: "GroupOrderItem", dependent: :destroy

  validates :name, presence: true, length: { maximum: OrderItem::LABEL_MAX }
  validate :name_not_taken

  before_validation { self.name = name.to_s.squish }
  before_validation(on: :create) { self.key ||= SecureRandom.urlsafe_base64(18) }

  private

  def name_not_taken
    return if name.blank?

    taken = group_order.participants.where.not(id: id).where("LOWER(name) = ?", name.downcase).exists?
    errors.add(:base, "Someone named #{name} already joined. Try adding a last initial.") if taken
  end
end
