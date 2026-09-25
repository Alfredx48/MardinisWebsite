class UpgradeOrdersForCheckout < ActiveRecord::Migration[6.1]
  def up
    change_column :orders, :total_cost, :decimal, precision: 10, scale: 2
    add_column :orders, :subtotal, :decimal, precision: 10, scale: 2, null: false, default: 0
    add_column :orders, :tax, :decimal, precision: 10, scale: 2, null: false, default: 0
    add_column :orders, :tip, :decimal, precision: 10, scale: 2, null: false, default: 0
    add_column :orders, :customer_name, :string
    add_column :orders, :customer_email, :string
    add_column :orders, :customer_phone, :string
    add_column :orders, :payment_method, :string, null: false, default: "card"
    add_column :orders, :payment_status, :string, null: false, default: "unpaid"
    add_column :orders, :pickup_at, :datetime
    add_column :orders, :token, :string
    add_column :orders, :admin_notes, :text
    add_column :orders, :cancel_reason, :string
    add_column :orders, :placed_at, :datetime
    add_column :orders, :ready_at, :datetime
    add_column :orders, :completed_at, :datetime

    add_column :order_items, :item_name, :string
    add_column :order_items, :unit_price, :decimal, precision: 8, scale: 2

    # Snapshot names/prices so later menu edits never rewrite order history.
    execute <<~SQL.squish
      UPDATE order_items SET item_name = TRIM(menu_items.name), unit_price = menu_items.price
      FROM menu_items WHERE order_items.menu_item_id = menu_items.id
    SQL

    # Legacy orders were only ever created after a successful card payment.
    execute "UPDATE orders SET status = 'completed', completed_at = updated_at WHERE LOWER(status) = 'complete'"
    execute "UPDATE orders SET status = 'new' WHERE status IS NULL OR LOWER(status) = 'pending'"
    execute "UPDATE orders SET payment_status = 'paid', placed_at = created_at, subtotal = total_cost, token = md5(random()::text || id::text)"
    execute <<~SQL.squish
      UPDATE orders SET customer_name = users.name, customer_email = users.email, customer_phone = users.phone
      FROM users WHERE orders.user_id = users.id
    SQL

    add_index :orders, :token, unique: true
    add_index :orders, :status
    add_index :orders, :placed_at
    add_index :orders, :user_id

    # The cart now lives in the browser and is re-priced by the server at checkout.
    drop_table :cart_items
    drop_table :carts
  end

  def down
    create_table :carts do |t|
      t.integer :user_id
      t.integer :restaurant_id
      t.timestamps
    end
    create_table :cart_items do |t|
      t.integer :quantity
      t.text :special_request
      t.references :cart, null: false, foreign_key: true
      t.references :menu_item, null: false, foreign_key: true
      t.timestamps
    end
    remove_index :orders, :user_id
    remove_index :orders, :placed_at
    remove_index :orders, :status
    remove_index :orders, :token
    remove_column :order_items, :unit_price
    remove_column :order_items, :item_name
    %i[completed_at ready_at placed_at cancel_reason admin_notes token pickup_at payment_status
       payment_method customer_phone customer_email customer_name tip tax subtotal].each do |col|
      remove_column :orders, col
    end
    change_column :orders, :total_cost, :float
  end
end
