# Group orders: an organizer shares a link, coworkers add their own items under
# their name, and the organizer checks out and pays once.
class CreateGroupOrders < ActiveRecord::Migration[8.1]
  def up
    create_table :group_orders do |t|
      t.references :restaurant, null: false, foreign_key: true
      t.references :order, foreign_key: true # set when the organizer checks out
      t.string :token, null: false, index: { unique: true } # the share link
      t.string :host_token, null: false # the organizer's private link
      t.string :host_name, null: false
      t.string :host_email, null: false
      t.string :host_phone
      t.string :note
      t.datetime :deadline_at
      t.decimal :per_person_limit, precision: 10, scale: 2
      t.boolean :open, null: false, default: true
      t.timestamps
    end

    create_table :group_order_participants do |t|
      t.references :group_order, null: false, foreign_key: true
      t.string :name, null: false
      t.string :key, null: false, index: { unique: true } # kept in the person's browser
      t.boolean :host, null: false, default: false
      t.timestamps
    end

    create_table :group_order_items do |t|
      t.references :group_order_participant, null: false, foreign_key: true
      t.references :menu_item, null: false, foreign_key: true
      t.string :size
      t.jsonb :modifiers, null: false, default: [] # [{ group_id, options: [name] }]
      t.integer :quantity, null: false, default: 1
      t.string :special_request
      t.timestamps
    end

    # Keep Supabase's Data API roles out, like every other table.
    %w[group_orders group_order_participants group_order_items].each do |table|
      execute "ALTER TABLE #{table} ENABLE ROW LEVEL SECURITY"
    end
  end

  def down
    drop_table :group_order_items
    drop_table :group_order_participants
    drop_table :group_orders
  end
end
