# When kitchen staff tapped "Got it" on an order's reminders (3 days and 1 day
# before pickup), so they don't show again on any device.
class AddRemindersToOrders < ActiveRecord::Migration[8.1]
  def change
    add_column :orders, :reminder_3_days_seen_at, :datetime
    add_column :orders, :reminder_1_day_seen_at, :datetime
  end
end
