class CreateMenuItems < ActiveRecord::Migration[6.1]
  def change
    create_table :menu_items do |t|
      t.string :name
      t.text :description
      t.float :price
      t.string :image
      t.string :tag
      t.belongs_to :restaurant, null: false, foreign_key: true

      t.timestamps
    end
  end
end
