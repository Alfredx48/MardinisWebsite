class Api::Admin::StatsController < Api::Admin::BaseController
  TREND_DAYS = 14

  def show
    orders = current_restaurant.orders.revenue
    today = Time.zone.today
    placed_on = Arel.sql("DATE(COALESCE(orders.placed_at, orders.created_at) AT TIME ZONE 'UTC' AT TIME ZONE '#{tz}')")

    by_day = between(orders, (today - (TREND_DAYS - 1)).beginning_of_day, today.end_of_day)
                   .group(placed_on).pluck(placed_on, Arel.sql("COUNT(*)"), Arel.sql("SUM(total_cost - refunded_amount)"))
                   .to_h { |date, count, sum| [date.to_date, [count, sum]] }
    trend = (0...TREND_DAYS).map do |i|
      date = today - (TREND_DAYS - 1 - i)
      count, sum = by_day[date]
      { date: date.iso8601, orders: count.to_i, revenue: Presenters.money(sum || 0) }
    end

    todays = between(orders, today.beginning_of_day, today.end_of_day)
    month = between(orders, 30.days.ago, Time.current)

    top_items = OrderItem.joins(:order).merge(month)
                         .group(Arel.sql("COALESCE(order_items.item_name, '')"))
                         .order(Arel.sql("SUM(order_items.quantity) DESC")).limit(8)
                         .pluck(Arel.sql("COALESCE(order_items.item_name, '')"), Arel.sql("SUM(order_items.quantity)"),
                                Arel.sql("SUM(order_items.quantity * COALESCE(order_items.unit_price, 0))"))
                         .map { |name, qty, sales| { name: name, quantity: qty.to_i, sales: Presenters.money(sales || 0) } }

    render json: {
      today: summary(todays),
      last_30_days: summary(month),
      active_orders: current_restaurant.orders.active.count,
      new_orders: current_restaurant.orders.where(status: "new").count,
      new_catering_inquiries: current_restaurant.catering_inquiries.where(status: "new").count,
      trend: trend,
      top_items: top_items,
      payment_mix: month.group(:payment_method).count,
    }
  end

  private

  def between(scope, from, to)
    scope.where("COALESCE(orders.placed_at, orders.created_at) BETWEEN ? AND ?", from, to)
  end

  def tz
    Time.zone.tzinfo.name
  end

  def summary(scope)
    count = scope.count
    # Net of refunds, so partial refunds on completed orders come off revenue.
    revenue = scope.sum(:total_cost) - scope.sum(:refunded_amount)
    {
      orders: count,
      revenue: Presenters.money(revenue),
      tips: Presenters.money(scope.sum(:tip)),
      average_order: Presenters.money(count.zero? ? 0 : revenue / count),
    }
  end
end
