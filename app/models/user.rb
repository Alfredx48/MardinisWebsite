class User < ApplicationRecord
  has_many :orders, dependent: :destroy
  has_many :order_items, through: :orders
  has_many :carts, dependent: :destroy
  has_many :cart_items, through: :carts

  has_secure_password

  validates :email, presence: true, uniqueness: true
  validates :password, presence: true, length: { minimum: 6 }
  validates :name, presence: true
  validates :address, presence: true
  validates :phone, presence: true
  accepts_nested_attributes_for :orders
end
