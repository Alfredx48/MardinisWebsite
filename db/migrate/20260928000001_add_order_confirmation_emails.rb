class AddOrderConfirmationEmails < ActiveRecord::Migration[8.1]
  def up
    # Set when the confirmation email is claimed, so it goes out once even when
    # Stripe's webhook and the browser confirm the same payment at the same time.
    add_column :orders, :confirmation_sent_at, :datetime

    # One row per email sent (no addresses or content), to stay under the email
    # provider's daily limit. Rows older than a week are pruned as new ones arrive.
    create_table :sent_emails do |t|
      t.string :kind, null: false
      t.datetime :created_at, null: false
    end
    add_index :sent_emails, :created_at

    # Keep Supabase's Data API roles out, like every other table.
    execute "ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY"
  end

  def down
    drop_table :sent_emails
    remove_column :orders, :confirmation_sent_at
  end
end
