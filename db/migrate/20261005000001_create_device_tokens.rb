# Push tokens of the Android Kitchen app, so new orders ring the tablet even when the app is
# closed (KitchenPush). A token belongs to whoever last signed in on that device.
class CreateDeviceTokens < ActiveRecord::Migration[8.1]
  def up
    create_table :device_tokens do |t|
      t.references :user, null: false, foreign_key: true
      t.string :token, null: false
      t.string :platform, null: false, default: "android"
      t.datetime :last_seen_at, null: false
      t.timestamps
    end
    add_index :device_tokens, :token, unique: true

    # Keep Supabase's Data API roles out, like every other table.
    execute "ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY"
  end

  def down
    drop_table :device_tokens
  end
end
