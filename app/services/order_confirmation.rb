# The "we got your order" email. Sent once per order, when it reaches the kitchen,
# to customers who gave an email at checkout. Never raises: a missing or failed
# email must not affect the order.
module OrderConfirmation
  module_function

  def deliver(order)
    return if order.customer_email.blank? || !EmailSender.configured?
    return unless EmailSender.room_for?("order_confirmation")
    # Claim the email atomically so two requests confirming one payment send it once.
    return unless Order.where(id: order.id, confirmation_sent_at: nil).update_all(confirmation_sent_at: Time.current) == 1

    restaurant = order.restaurant
    assigns = {
      order: order,
      items: order.order_items.includes(:menu_item).to_a,
      restaurant: restaurant,
      pickup: pickup_label(order, restaurant),
      tracking_url: "#{EmailSender.app_url}/order/#{order.token}",
    }
    EmailSender.deliver!(
      kind: "order_confirmation",
      to: order.customer_email,
      subject: "Your #{restaurant.name.presence || "Mardini's"} order ##{order.number} is confirmed",
      text: render("text", assigns),
      html: render("html", assigns),
    )
  rescue StandardError => e
    Rails.logger.error("Order confirmation for order #{order.id} failed: #{e.class}: #{e.message}")
  end

  def pickup_label(order, restaurant)
    return "As soon as possible (about #{restaurant.prep_time_minutes} minutes)" if order.pickup_at.nil?

    time = order.pickup_at.in_time_zone
    day = if time.to_date == Time.zone.today then "Today"
          elsif time.to_date == Time.zone.tomorrow then "Tomorrow"
          else time.strftime("%A, %b %-d")
          end
    "#{day} at #{time.strftime('%-l:%M %p')}"
  end

  def render(format, assigns)
    ActionController::Base.render(template: "emails/order_confirmation", formats: [format.to_sym], layout: false, assigns: assigns)
  end
end
