# Set when a person taps "I'm done" in a group order; cleared if they change their items.
class AddDoneAtToGroupOrderParticipants < ActiveRecord::Migration[8.1]
  def change
    add_column :group_order_participants, :done_at, :datetime
  end
end
