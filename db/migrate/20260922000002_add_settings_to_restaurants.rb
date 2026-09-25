class AddSettingsToRestaurants < ActiveRecord::Migration[6.1]
  DEFAULT_HOURS = {
    "mon" => { "open" => "09:00", "close" => "21:00", "closed" => false },
    "tue" => { "open" => "09:00", "close" => "21:00", "closed" => false },
    "wed" => { "open" => "09:00", "close" => "21:00", "closed" => false },
    "thu" => { "open" => "09:00", "close" => "21:00", "closed" => false },
    "fri" => { "open" => "09:00", "close" => "21:00", "closed" => false },
    "sat" => { "open" => "09:00", "close" => "21:00", "closed" => false },
    "sun" => { "open" => "10:00", "close" => "20:00", "closed" => false },
  }.freeze

  def change
    change_table :restaurants do |t|
      t.string :email
      t.string :tagline
      t.jsonb :hours, null: false, default: DEFAULT_HOURS
      t.decimal :tax_rate, precision: 6, scale: 5, null: false, default: 0.095
      t.boolean :accepting_orders, null: false, default: true
      t.integer :prep_time_minutes, null: false, default: 20
      t.boolean :card_payments_enabled, null: false, default: true
      t.boolean :pay_in_store_enabled, null: false, default: true
      t.boolean :tips_enabled, null: false, default: true
      t.string :announcement
      t.string :hero_image
      t.string :logo_image
    end

    # Carry over the images the old site hard-coded in its CSS/components.
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          UPDATE restaurants SET hero_image = 'https://i.imgur.com/SobZND4.jpg',
                                 logo_image = 'https://i.imgur.com/Scnc7hH.png'
        SQL
      end
    end
  end
end
