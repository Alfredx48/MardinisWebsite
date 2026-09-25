class AddSizesToMenuItems < ActiveRecord::Migration[8.1]
  def change
    # [{ "name" => "1/2 Pint", "price" => "8.23" }, ...]; empty means one price.
    add_column :menu_items, :sizes, :jsonb, default: [], null: false
    add_column :order_items, :size, :string
  end
end
