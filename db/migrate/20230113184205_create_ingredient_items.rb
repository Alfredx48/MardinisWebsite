class CreateIngredientItems < ActiveRecord::Migration[6.1]
  def change
    create_table :ingredient_items do |t|
      t.belongs_to :ingredient, null: false, foreign_key: true
      t.belongs_to :menu_item, null: false, foreign_key: true

      t.timestamps
    end
  end
end
