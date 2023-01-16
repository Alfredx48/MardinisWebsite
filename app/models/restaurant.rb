class Restaurant < ApplicationRecord
  has_many :menu_items
  has_many :orders
  has_many :ingredients
  # validates :name, presence: true
  # validates :hours_of_operation, presence: true
  # validates :description, presence: true
  # validates :address, presence: true
  # validates :phone, presence: true
end
