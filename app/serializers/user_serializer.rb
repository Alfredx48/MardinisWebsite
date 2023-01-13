class UserSerializer < ActiveModel::Serializer
  attributes :id, :email, :name, :address, :phone, :admin
end
