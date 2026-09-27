# Turns a browser cart into a priced Order. Prices, tax and totals are always
# computed here from the database; the client only sends ids, sizes and quantities.
class Checkout
  class Error < StandardError
    attr_reader :messages

    def initialize(messages)
      @messages = Array(messages)
      super(@messages.join(", "))
    end
  end

  MAX_LINES = 50
  MAX_QUANTITY = 50

  def initialize(restaurant:, user:, params:, now: Time.zone.now)
    @restaurant = restaurant
    @user = user
    @params = params
    @now = now
  end

  def call
    validate_ordering_open!
    lines = priced_lines
    subtotal = lines.sum { |l| l[:unit_price] * l[:quantity] }
    tax = (subtotal * @restaurant.tax_rate).round(2)
    tip = tip_amount(subtotal)

    order = @restaurant.orders.new(
      user: @user,
      customer_name: customer[:name].to_s.strip.presence || @user&.name,
      customer_phone: customer[:phone].to_s.strip.presence || @user&.phone,
      customer_email: (customer[:email].to_s.strip.presence || @user&.email)&.downcase,
      custom_request: @params[:custom_request].to_s.strip.presence,
      pickup_at: pickup_time,
      payment_method: payment_method,
      payment_status: "unpaid",
      status: "awaiting_payment",
      subtotal: subtotal,
      tax: tax,
      tip: tip,
      total_cost: subtotal + tax + tip,
      total_items: lines.sum { |l| l[:quantity] },
    )
    lines.each do |l|
      order.order_items.build(
        menu_item: l[:menu_item],
        item_name: l[:size] ? "#{l[:menu_item].name} (#{l[:size]})" : l[:menu_item].name,
        size: l[:size],
        modifiers: l[:modifiers],
        unit_price: l[:unit_price],
        quantity: l[:quantity],
        special_request: l[:special_request],
      )
    end
    raise Error, order.errors.full_messages unless order.valid?

    order
  end

  private

  def customer
    @params[:customer] || {}
  end

  def payment_method
    method = @params[:payment_method].to_s
    case method
    when "card"
      raise Error, "Card payments are not available right now" unless Payments.card_available?(@restaurant)
    when "in_store"
      raise Error, "Pay-at-pickup is not available right now" unless @restaurant.pay_in_store_enabled
    else
      raise Error, "Choose a payment method"
    end
    method
  end

  def validate_ordering_open!
    raise Error, "Online ordering is paused right now. Please call us to order." unless @restaurant.accepting_orders
  end

  def pickup_time
    raw = @params[:pickup_at].to_s
    if raw.blank? || raw == "asap"
      raise Error, "We're closed right now. Please schedule a pickup time." unless @restaurant.accepting_asap_orders?(@now)

      return nil
    end

    time = Time.zone.parse(raw) rescue nil
    raise Error, "That pickup time isn't available" unless time && @restaurant.valid_pickup_time?(time, @now)

    time
  end

  def tip_amount(subtotal)
    return 0 unless @restaurant.tips_enabled

    tip = BigDecimal(@params[:tip].presence || "0", exception: false)
    raise Error, "Invalid tip amount" if tip.nil? || tip.negative? || tip > [subtotal, 100].max

    tip.round(2)
  end

  # Checks the customer's choices against each of the item's option groups and
  # returns them as priced snapshots: [{ "group_id", "group", "option", "price" }].
  def chosen_modifiers(item, raw)
    picks = Array(raw).each_with_object({}) do |sel, h|
      h[sel[:group_id].to_i] = Array(sel[:options]).map(&:to_s).map(&:strip).reject(&:empty?)
    end

    chosen = item.modifier_groups.flat_map do |group|
      names = picks.delete(group.id) || []
      raise Error, "Please choose each option once for #{item.name}" unless names.uniq.size == names.size
      if names.size < group.min_select
        raise Error, "Please choose #{group.min_select == 1 ? 'an option' : "#{group.min_select} options"} for #{group.name} (#{item.name})"
      end
      if group.max_select && names.size > group.max_select
        raise Error, "Choose up to #{group.max_select} for #{group.name} (#{item.name})"
      end

      names.map do |name|
        option = group.option_named(name)
        raise Error, "#{name} is no longer an option for #{item.name}. Please update your cart." unless option

        { "group_id" => group.id, "group" => group.name, "option" => option["name"], "price" => option["price"] }
      end
    end
    raise Error, "The options for #{item.name} have changed. Please update your cart." if picks.values.any?(&:present?)

    chosen
  end

  def priced_lines
    raw = Array(@params[:items]).first(MAX_LINES + 1)
    raise Error, "Your cart is empty" if raw.empty?
    raise Error, "Too many different items in one order" if raw.size > MAX_LINES

    ids = raw.map { |i| i[:menu_item_id].to_i }
    items = @restaurant.menu_items.includes(:category, :modifier_groups).where(id: ids).index_by(&:id)

    raw.map do |line|
      item = items[line[:menu_item_id].to_i]
      raise Error, "An item in your cart is no longer on the menu" unless item
      unless item.available && item.category.active
        raise Error, "Sorry, #{item.name} is sold out. Please remove it from your cart."
      end

      quantity = line[:quantity].to_i
      raise Error, "Quantity for #{item.name} must be between 1 and #{MAX_QUANTITY}" unless quantity.between?(1, MAX_QUANTITY)

      size = nil
      unit_price = item.price
      if item.sized?
        size = item.size_named(line[:size])
        raise Error, "Please choose a size for #{item.name}" unless size

        unit_price = size["price"].to_d
      end
      modifiers = chosen_modifiers(item, line[:modifiers])
      unit_price += modifiers.sum { |m| m["price"].to_d }

      {
        menu_item: item,
        size: size && size["name"],
        unit_price: unit_price,
        modifiers: modifiers,
        quantity: quantity,
        special_request: line[:special_request].to_s.strip.first(200).presence,
      }
    end
  end
end
