class User < ApplicationRecord
  has_secure_password
  has_many :orders

  validates :name, presence: true
  validates :address, presence: true
  validates :email, presence: true, uniqueness: true
  validates :phone, presence: true, uniqueness: true


  def self.from_omniauth(auth)
    where(email: auth.info.email).first_or_initialize do |user|
      user.user_name = auth.info.name
      user.email = auth.info.email
      user.password = SecureRandom.hex
    end
  end
end
