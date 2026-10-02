# A name to write on an item, for group and office orders ("Sarah", "Table 3").
class AddLabelToOrderItems < ActiveRecord::Migration[8.1]
  def change
    add_column :order_items, :label, :string
  end
end
