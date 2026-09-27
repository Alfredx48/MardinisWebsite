class CreateModifierGroups < ActiveRecord::Migration[8.1]
  def change
    # Reusable option groups (e.g. "Bread Choice"), attached to many items.
    create_table :modifier_groups do |t|
      t.references :restaurant, null: false, foreign_key: true
      t.string :name, null: false
      t.integer :min_select, null: false, default: 0
      t.integer :max_select # nil means no limit
      t.jsonb :options, null: false, default: [] # [{ "name" => "Swiss", "price" => "0.00" }]
      t.integer :position, null: false, default: 0
      t.timestamps
    end

    create_table :menu_item_modifier_groups do |t|
      t.references :menu_item, null: false, foreign_key: true
      t.references :modifier_group, null: false, foreign_key: true
      t.integer :position, null: false, default: 0
      t.timestamps
    end
    add_index :menu_item_modifier_groups, [:menu_item_id, :modifier_group_id], unique: true, name: "index_menu_item_modifier_groups_unique"

    # What the customer chose: [{ "group_id", "group", "option", "price" }]
    add_column :order_items, :modifiers, :jsonb, null: false, default: []

    # Keep Supabase's Data API roles out, like every other table.
    reversible do |dir|
      dir.up do
        execute "ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY"
        execute "ALTER TABLE menu_item_modifier_groups ENABLE ROW LEVEL SECURITY"
      end
    end
  end
end
