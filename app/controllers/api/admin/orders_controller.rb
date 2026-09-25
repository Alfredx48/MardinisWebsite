class Api::Admin::OrdersController < Api::Admin::BaseController
  PER_PAGE = 30

  rescue_from Stripe::StripeError, with: ->(e) { render_errors "Stripe error: #{e.message}", :bad_gateway }

  # Kitchen board: GET /api/admin/orders?scope=active
  # History:       GET /api/admin/orders?status=completed&from=2026-09-01&to=2026-09-22&q=smith&page=2
  def index
    orders = current_restaurant.orders.includes(:order_items, refunds: :refunded_by)
    orders = params[:include_unpaid] == "true" ? orders : orders.placed

    if params[:scope] == "active"
      orders = orders.active.order(Arel.sql("COALESCE(pickup_at, placed_at) ASC"))
      return render json: { orders: orders.map { |o| Presenters.admin_order(o) }, server_time: Time.current }
    end

    orders = orders.where(status: params[:status]) if Order::STATUSES.include?(params[:status])
    orders = orders.where(payment_method: params[:payment_method]) if Order::PAYMENT_METHODS.include?(params[:payment_method])
    if (from = parse_date(params[:from]))
      orders = orders.where("COALESCE(orders.placed_at, orders.created_at) >= ?", from.beginning_of_day)
    end
    if (to = parse_date(params[:to]))
      orders = orders.where("COALESCE(orders.placed_at, orders.created_at) <= ?", to.end_of_day)
    end
    if params[:q].present?
      q = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].strip)}%"
      orders = orders.where(
        "orders.customer_name ILIKE :q OR orders.customer_phone ILIKE :q OR orders.customer_email ILIKE :q OR CAST(orders.id AS TEXT) = :id",
        q: q, id: params[:q].strip.delete("#").sub(/\A0+/, ""),
      )
    end

    page = [params[:page].to_i, 1].max
    total = orders.count
    orders = orders.recent_first.offset((page - 1) * PER_PAGE).limit(PER_PAGE)
    render json: {
      orders: orders.map { |o| Presenters.admin_order(o) },
      page: page,
      total_pages: (total / PER_PAGE.to_f).ceil,
      total_count: total,
    }
  end

  def show
    render json: Presenters.admin_order(order)
  end

  # PATCH { status: "preparing" } or { admin_notes: "..." } or { status: "cancelled", cancel_reason: "..." }
  def update
    if params.key?(:admin_notes)
      order.update!(admin_notes: params[:admin_notes].to_s.first(1000))
    end
    if params[:status].present? && params[:status] != order.status
      order.advance_to!(params[:status], reason: params[:cancel_reason].presence)
    end
    render json: Presenters.admin_order(order)
  rescue ArgumentError => e
    render_errors e.message
  end

  # POST { amount: "4.25", reason: "Missing item", note: "...", cancel: false }
  # Leave out `amount` to refund everything still refundable. `cancel: true`
  # refunds in full and cancels the order.
  def refund
    reason = params[:reason].to_s.strip.first(120).presence
    if ActiveModel::Type::Boolean.new.cast(params[:cancel])
      OrderCancellation.call!(order, reason: reason || "Refunded", user: current_user)
    else
      amount = params[:amount].presence
      if amount && BigDecimal(amount.to_s, exception: false).nil?
        return render_errors "Enter a valid refund amount"
      end

      Payments.refund!(order, amount: amount, reason: reason, note: params[:note].to_s.strip.first(1000),
                              user: current_user)
    end
    render json: Presenters.admin_order(order.reload)
  rescue ArgumentError, OrderCancellation::NotAllowed => e
    render_errors e.message
  end

  private

  def order
    @order ||= current_restaurant.orders.includes(:order_items, refunds: :refunded_by).find(params[:id])
  end

  def parse_date(value)
    Date.iso8601(value.to_s)
  rescue ArgumentError
    nil
  end
end
