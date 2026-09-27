class MenuItemModifierGroup < ApplicationRecord
  belongs_to :menu_item
  belongs_to :modifier_group

  validate :same_restaurant

  private

  def same_restaurant
    return unless menu_item && modifier_group

    errors.add(:modifier_group, "is not part of this restaurant") if menu_item.restaurant_id != modifier_group.restaurant_id
  end
end
