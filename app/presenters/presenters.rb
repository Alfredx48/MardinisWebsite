# Explicit JSON shapes for the API. Every field that leaves the server is listed
# here, so customer data can't leak through an association by accident.
module Presenters
  module_function

  def money(value)
    format("%.2f", value.to_d.round(2))
  end

  def restaurant(r, admin: false)
    data = {
      id: r.id,
      name: r.name,
      tagline: r.tagline,
      description: r.description,
      address: r.address,
      phone: r.phone,
      email: r.email,
      hours: r.hours,
      announcement: r.announcement,
      hero_image: r.hero_image,
      logo_image: r.logo_image,
      tax_rate: r.tax_rate.to_f,
      prep_time_minutes: r.prep_time_minutes,
      tips_enabled: r.tips_enabled,
      accepting_orders: r.accepting_orders,
      open_now: r.open_now?,
      accepting_asap: r.accepting_asap_orders?,
      pickup_slots: r.pickup_slots,
      payments: {
        card: Payments.card_available?(r),
        in_store: r.pay_in_store_enabled,
        stripe_publishable_key: Payments.publishable_key,
      },
    }
    if admin
      data[:card_payments_enabled] = r.card_payments_enabled
      data[:pay_in_store_enabled] = r.pay_in_store_enabled
      data[:stripe_configured] = Payments.configured?
    end
    data
  end

  def category(c, items: nil)
    data = { id: c.id, name: c.name, description: c.description, position: c.position, active: c.active }
    data[:items] = items.map { |i| menu_item(i) } if items
    data
  end

  def menu_item(i)
    {
      id: i.id,
      category_id: i.category_id,
      name: i.name,
      description: i.description,
      price: money(i.price),
      image: i.image,
      available: i.available,
      featured: i.featured,
      vegetarian: i.vegetarian,
      spicy: i.spicy,
      position: i.position,
    }
  end

  def user(u)
    { id: u.id, name: u.name, email: u.email, phone: u.phone, address: u.address, admin: u.admin }
  end

  def admin_user(u)
    user(u).merge(created_at: u.created_at, orders_count: u.attributes["orders_count"].to_i)
  end

  # What a customer (or anyone holding the tracking link) may see.
  def order(o)
    {
      id: o.id,
      number: o.number,
      token: o.token,
      status: o.status,
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      customer_name: o.customer_name,
      pickup_at: o.pickup_at,
      placed_at: o.placed_at,
      ready_at: o.ready_at,
      completed_at: o.completed_at,
      created_at: o.created_at,
      subtotal: money(o.subtotal),
      tax: money(o.tax),
      tip: money(o.tip),
      total: money(o.total_cost),
      total_items: o.total_items,
      custom_request: o.custom_request,
      cancel_reason: o.cancel_reason,
      items: o.order_items.map { |oi| order_item(oi) },
    }
  end

  def admin_order(o)
    order(o).merge(
      customer_phone: o.customer_phone,
      customer_email: o.customer_email,
      user_id: o.user_id,
      admin_notes: o.admin_notes,
      payment_intent_id: o.payment_intent_id,
    )
  end

  def order_item(oi)
    {
      id: oi.id,
      menu_item_id: oi.menu_item_id,
      name: oi.name,
      quantity: oi.quantity,
      unit_price: money(oi.unit_price || 0),
      line_total: money(oi.line_total),
      special_request: oi.special_request,
    }
  end

  def catering_inquiry(c)
    c.slice(:id, :name, :email, :phone, :event_date, :guest_count, :message, :status, :admin_notes, :created_at)
  end
end
