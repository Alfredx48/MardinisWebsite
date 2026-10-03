# Emails the organizer their links once, so they can get back to the group order
# from another device. Never raises: the group order works without it.
module GroupOrderEmail
  module_function

  def deliver_host_link(group)
    return unless EmailSender.configured? && EmailSender.room_for?("group_order")

    restaurant = group.restaurant
    share_url = "#{EmailSender.app_url}/group/#{group.token}"
    assigns = {
      group: group,
      restaurant: restaurant,
      share_url: share_url,
      manage_url: "#{share_url}?#{URI.encode_www_form(host: group.host_token)}",
    }
    EmailSender.deliver!(
      kind: "group_order",
      to: group.host_email,
      subject: "Your group order at #{restaurant.name.presence || "Mardini's"}",
      text: render("text", assigns),
      html: render("html", assigns),
    )
  rescue StandardError => e
    Rails.logger.error("Group order email for group #{group.id} failed: #{e.class}: #{e.message}")
  end

  def render(format, assigns)
    ActionController::Base.render(template: "emails/group_order_host", formats: [format.to_sym], layout: false, assigns: assigns)
  end
end
