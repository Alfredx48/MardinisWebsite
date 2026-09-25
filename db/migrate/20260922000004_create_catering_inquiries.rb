class CreateCateringInquiries < ActiveRecord::Migration[6.1]
  def change
    create_table :catering_inquiries do |t|
      t.references :restaurant, null: false, foreign_key: true
      t.string :name, null: false
      t.string :email
      t.string :phone, null: false
      t.date :event_date
      t.integer :guest_count
      t.text :message
      t.string :status, null: false, default: "new"
      t.text :admin_notes
      t.timestamps
    end
    add_index :catering_inquiries, :status

    change_column_null :users, :admin, false, false
    change_column_default :users, :admin, from: nil, to: false
    reversible do |dir|
      dir.up { execute "CREATE INDEX index_users_on_lower_email ON users (LOWER(email))" }
      dir.down { execute "DROP INDEX IF EXISTS index_users_on_lower_email" }
    end
  end
end
