class CreateRestaurants < ActiveRecord::Migration[6.1]
  def change
    create_table :restaurants do |t|
      t.string :name
      t.string :hours_of_operation
      t.text :description
      t.string :address
      t.string :phone

      t.timestamps
    end
  end
end
