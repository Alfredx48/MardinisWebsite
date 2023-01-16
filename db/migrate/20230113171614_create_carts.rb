class CreateCarts < ActiveRecord::Migration[6.1]
  def change
    create_table :carts do |t|
      t.integer :user_id
      t.belongs_to :restaurant, null: false, foreign_key: true
      t.timestamps
    end
  end
end
