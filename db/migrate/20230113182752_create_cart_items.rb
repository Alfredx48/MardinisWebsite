class CreateCartItems < ActiveRecord::Migration[6.1]
  def change
    create_table :cart_items do |t|
      t.integer :quantity
      t.text :special_request
      t.belongs_to :cart, null: false, foreign_key: true
      t.belongs_to :menu_item, null: false, foreign_key: true

      t.timestamps
    end
  end
end
