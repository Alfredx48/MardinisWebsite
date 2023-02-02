class CreateOrders < ActiveRecord::Migration[6.1]
  def change
    create_table :orders do |t|
      t.float :total_cost
      t.integer :total_items
      t.string :status
      t.string :custom_request
      t.integer :user_id
      t.integer :restaurant_id
      
      t.timestamps
    end
  end
end
