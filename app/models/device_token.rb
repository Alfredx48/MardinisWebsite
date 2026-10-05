# A Kitchen app install that gets new-order pushes. See KitchenPush.
class DeviceToken < ApplicationRecord
  PLATFORMS = %w[android].freeze

  belongs_to :user

  validates :token, presence: true, length: { maximum: 4096 }, uniqueness: true
  validates :platform, inclusion: { in: PLATFORMS }

  # Devices that ring for new orders: signed in as kitchen staff or an admin right now, so
  # taking someone's role away stops their pushes.
  scope :for_kitchen, -> { joins(:user).merge(User.where(admin: true).or(User.where(kitchen: true))) }
end
