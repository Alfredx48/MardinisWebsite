class CreateOrders < ActiveRecord::Migration[6.1]
  def change
    create_table :orders do |t|
      t.float :total_cost
      t.string :status
      t.string :custom_request
      t.datetime :placed_at
      t.datetime :completed_at
      t.integer :user_id
      t.belongs_to :restaurant, null: false, foreign_key: true
      t.timestamps
    end
  end
end
