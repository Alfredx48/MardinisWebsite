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

  # def self.from_omniauth(auth)
  #   where(email: auth.info.email).first_or_initialize do |user|
  #     user.user_name = auth.info.name
  #     user.email = auth.info.email
  #     user.password = SecureRandom.hex
  #   end
  # end
end
