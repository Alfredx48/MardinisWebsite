# Catering: categories on the catering menu (/catering) instead of the regular
# menu, and orders that include them (24 hours' notice, paid online).
class AddCateringToCategoriesAndOrders < ActiveRecord::Migration[8.1]
  def change
    add_column :categories, :catering, :boolean, null: false, default: false
    add_column :orders, :catering, :boolean, null: false, default: false
  end
end
