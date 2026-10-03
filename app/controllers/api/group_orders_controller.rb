# Group orders, no account needed. Anyone with the share link can see the group
# and join with their name; each browser then gets a private participant key
# (X-Group-Key header) for its own items. The organizer's private host key
# (X-Group-Host) can change any item, close ordering and check out.
class Api::GroupOrdersController < ApplicationController
  skip_before_action :authorize
  before_action :load_group, except: :create
  before_action :require_host, only: [:update, :checkout]
  rescue_from Checkout::Error, with: ->(e) { render_errors e.messages }
  rescue_from Stripe::StripeError, with: :rescue_stripe

  TOO_MANY = -> { render_errors "Too many requests. Please wait a few minutes and try again.", :too_many_requests }
  # Each limit needs its own name, or they all share one counter.
  rate_limit to: 10, within: 1.hour, only: :create, name: "start", with: TOO_MANY
  rate_limit to: 30, within: 15.minutes, only: :join, name: "join", with: TOO_MANY
  rate_limit to: 300, within: 15.minutes, only: [:add_item, :update_item, :remove_item], name: "items", with: TOO_MANY

  def create
    unless current_restaurant.accepting_orders
      raise Checkout::Error, "Online ordering is paused right now. Please call us to order."
    end

    group = current_restaurant.group_orders.new(group_params)
    GroupOrder.transaction do
      group.save!
      @me = group.participants.create!(name: group.host_name, host: true)
    end
    GroupOrderEmail.deliver_host_link(group)
    @group = group
    @host = true
    render json: { group: group_json, host_key: group.host_token, participant_key: @me.key }, status: :created
  end

  def show
    render json: group_json
  end

  def join
    return render_errors(closed_message) unless @group.accepting_items?
    return render_errors("This group order is full.") if @group.participants.count >= GroupOrder::MAX_PEOPLE

    @me = @group.participants.create!(name: params.require(:name))
    render json: { group: group_json, participant_key: @me.key }, status: :created
  end

  def add_item
    return render_errors("Please add your name first.", :forbidden) unless @me
    return render_errors(closed_message) unless can_change?(@me)
    return render_errors("This group order has too many items.") if @group.items.count >= GroupOrder::MAX_LINES

    item = @me.items.new(params.permit(:menu_item_id, :size, :quantity, :special_request))
    item.modifiers = modifier_params
    check_item!(item)
    item.save!
    render json: group_json
  end

  def update_item
    item = editable_item or return
    item.quantity = params.require(:quantity)
    check_item!(item)
    item.save!
    render json: group_json
  end

  def remove_item
    item = editable_item or return
    item.destroy!
    render json: group_json
  end

  # Host only: close or reopen ordering, or change the deadline, limit or note.
  def update
    return render_errors("This group order was already placed.") if @group.placed?

    @group.update!(params.permit(:open, :deadline_at, :per_person_limit, :note))
    render json: group_json
  end

  # Host only: everyone's items become one order, each with its person's name.
  # Ordering closes so nothing changes while the host pays.
  def checkout
    return render_errors("This group order was already placed.") if @group.placed?

    lines = @group.items.includes(:participant).order(:id).map(&:to_checkout_line)
    raise Checkout::Error, "Nobody has added anything yet" if lines.empty?

    order = Checkout.new(
      restaurant: current_restaurant, user: current_user, max_lines: GroupOrder::MAX_LINES,
      params: checkout_params.to_h.merge(items: lines),
    ).call
    client_secret = OrderPlacement.start!(order)
    @group.update!(order: order, open: false)
    render json: { order: Presenters.order(order), client_secret: client_secret }.compact, status: :created
  end

  private

  def load_group
    @group = current_restaurant.group_orders.find_by!(token: params[:token].to_s)
    @host = @group.host?(request.headers["X-Group-Host"])
    key = request.headers["X-Group-Key"].to_s
    @me = (@group.participants.find_by(key: key) if key.present?)
    @me ||= @group.participants.find_by(host: true) if @host
  end

  def require_host
    render_errors("Only the organizer can do that.", :forbidden) unless @host
  end

  def group_json
    group = GroupOrder.includes(:order, participants: :items).find(@group.id)
    Presenters.group_order(group, host: @host, me: @me)
  end

  # The host can change anything until the order is placed; everyone else only
  # their own items, while the group is open.
  def can_change?(participant)
    return !@group.placed? && !@group.expired? if @host

    participant == @me && @group.accepting_items?
  end

  # The item to change, or nil after rendering why it can't be changed.
  def editable_item
    item = @group.items.find_by(id: params[:item_id])
    if item.nil?
      render_errors("That item isn't in this group order.", :not_found)
    elsif !can_change?(item.participant)
      render_errors(item.participant == @me || @host ? closed_message : "You can only change your own items.", :forbidden)
    else
      return item
    end
    nil
  end

  # Prices the item against the live menu (sold out, options, sizes) and keeps
  # the person within the per-person limit. The organizer has no limit.
  def check_item!(item)
    price = line_price(item.to_checkout_line)
    limit = @group.per_person_limit
    return if limit.nil? || item.participant.host

    others = item.participant.items.where.not(id: item.id).sum do |other|
      line_price(other.to_checkout_line)
    rescue Checkout::Error
      0
    end
    return if others + price <= limit

    left = [limit - others, 0].max
    raise Checkout::Error, "That would go over the #{money(limit)} limit per person. You have #{money(left)} left."
  end

  def line_price(line)
    priced = Checkout.new(restaurant: current_restaurant, user: nil, params: { items: [line] }).priced_lines.first
    priced[:unit_price] * priced[:quantity]
  end

  def money(value)
    "$#{Presenters.money(value)}"
  end

  def closed_message
    if @group.placed? then "This group order was already placed."
    elsif @group.expired? then "This group order link has expired."
    elsif @group.past_deadline? then "Ordering closed at #{@group.deadline_at.in_time_zone.strftime('%-l:%M %p')}."
    else "#{@group.host_name} closed ordering for this group."
    end
  end

  def group_params
    params.permit(:host_name, :host_email, :host_phone, :note, :deadline_at, :per_person_limit)
  end

  def modifier_params
    Array(params.permit(modifiers: [:group_id, { options: [] }])[:modifiers]).map do |m|
      { "group_id" => m[:group_id].to_i, "options" => Array(m[:options]).map(&:to_s) }
    end
  end

  def checkout_params
    params.permit(:payment_method, :pickup_at, :tip, :custom_request, customer: %i[name phone email])
  end

  def rescue_stripe(error)
    Rails.logger.error("[stripe] #{error.class}: #{error.message}")
    render_errors "Our payment processor had a problem: #{error.message}", :bad_gateway
  end
end
