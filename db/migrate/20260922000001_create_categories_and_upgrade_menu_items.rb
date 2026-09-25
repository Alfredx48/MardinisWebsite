class CreateCategoriesAndUpgradeMenuItems < ActiveRecord::Migration[6.1]
  # Human-friendly names for the legacy `menu_items.tag` values, in menu order.
  LEGACY_TAGS = {
    "wrap" => "Wraps",
    "plate" => "Plates",
    "salad" => "Salads",
    "burger" => "Burgers",
    "grilled" => "Grilled Sandwiches",
    "cold" => "Cold Sandwiches",
  }.freeze

  def up
    create_table :categories do |t|
      t.references :restaurant, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.integer :position, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps
    end

    add_reference :menu_items, :category, foreign_key: true
    add_column :menu_items, :available, :boolean, null: false, default: true
    add_column :menu_items, :featured, :boolean, null: false, default: false
    add_column :menu_items, :vegetarian, :boolean, null: false, default: false
    add_column :menu_items, :spicy, :boolean, null: false, default: false
    add_column :menu_items, :position, :integer, null: false, default: 0
    change_column :menu_items, :price, :decimal, precision: 8, scale: 2

    execute "UPDATE menu_items SET name = TRIM(name)"
    execute "UPDATE menu_items SET vegetarian = TRUE WHERE description ILIKE 'vegetarian%'"

    # Turn each distinct legacy tag into a category and attach its items.
    select_rows("SELECT DISTINCT restaurant_id, LOWER(tag) FROM menu_items WHERE tag IS NOT NULL").each do |restaurant_id, tag|
      name = LEGACY_TAGS[tag] || tag.titleize
      position = LEGACY_TAGS.keys.index(tag) || LEGACY_TAGS.size
      category_id = select_value(<<~SQL.squish)
        INSERT INTO categories (restaurant_id, name, position, active, created_at, updated_at)
        VALUES (#{restaurant_id.to_i}, #{quote(name)}, #{position}, TRUE, NOW(), NOW())
        RETURNING id
      SQL
      execute <<~SQL.squish
        UPDATE menu_items SET category_id = #{category_id.to_i}
        WHERE restaurant_id = #{restaurant_id.to_i} AND LOWER(tag) = #{quote(tag)}
      SQL
    end

    # Preserve the original ordering within each category.
    execute <<~SQL.squish
      UPDATE menu_items SET position = ranked.pos
      FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY id) AS pos FROM menu_items) ranked
      WHERE menu_items.id = ranked.id
    SQL
  end

  def down
    change_column :menu_items, :price, :float
    remove_column :menu_items, :position
    remove_column :menu_items, :spicy
    remove_column :menu_items, :vegetarian
    remove_column :menu_items, :featured
    remove_column :menu_items, :available
    remove_reference :menu_items, :category, foreign_key: true
    drop_table :categories
  end

  private

  def quote(value)
    connection.quote(value)
  end
end
