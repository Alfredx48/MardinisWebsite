class CreateRefunds < ActiveRecord::Migration[6.1]
  def up
    create_table :refunds do |t|
      t.references :order, null: false, foreign_key: true
      t.decimal :amount, precision: 10, scale: 2, null: false
      t.string :reason
      t.text :note
      t.string :source, null: false, default: "admin" # admin | customer
      t.references :refunded_by, foreign_key: { to_table: :users }
      t.string :stripe_refund_id
      t.timestamps
    end

    add_column :orders, :refunded_amount, :decimal, precision: 10, scale: 2, null: false, default: 0
    execute "UPDATE orders SET refunded_amount = total_cost WHERE payment_status = 'refunded'"

    # Keep Supabase's Data API roles out, like every other table.
    execute "ALTER TABLE refunds ENABLE ROW LEVEL SECURITY"
  end

  def down
    remove_column :orders, :refunded_amount
    drop_table :refunds
  end
end
