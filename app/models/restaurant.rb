class Restaurant < ApplicationRecord
  has_many :menu_items, dependent: :destroy
  has_many :orders, dependent: :destroy 
  has_many :ingredients. dependent: :destroy
  # validates :name, presence: true
  # validates :hours_of_operation, presence: true
  # validates :description, presence: true
  # validates :address, presence: true
  # validates :phone, presence: true
end
