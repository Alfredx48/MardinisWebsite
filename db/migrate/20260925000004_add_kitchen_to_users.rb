class AddKitchenToUsers < ActiveRecord::Migration[8.1]
  def change
    # Kitchen staff can see and move orders on the kitchen screen, nothing else.
    add_column :users, :kitchen, :boolean, default: false, null: false
  end
end
