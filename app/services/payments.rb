# Thin wrapper around Stripe so controllers never trust client-side amounts.
module Payments
  module_function

  def configured?
    ENV["STRIPE_SECRET_KEY"].present?
  end

  def card_available?(restaurant)
    configured? && restaurant.card_payments_enabled
  end

  def publishable_key
    ENV["STRIPE_PUBLISHABLE_KEY"]
  end

  def create_intent!(order)
    Stripe::PaymentIntent.create(
      {
        amount: order.amount_cents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        description: "#{order.restaurant.name} order ##{order.number}",
        receipt_email: order.customer_email.presence,
        metadata: { order_id: order.id, order_token: order.token },
      },
      { idempotency_key: "order-#{order.token}" },
    )
  end

  def retrieve_intent(id)
    Stripe::PaymentIntent.retrieve(id)
  end

  # Marks the order paid if Stripe says the intent succeeded for the right amount.
  def sync!(order)
    return order if order.payment_status == "paid" || order.payment_intent_id.blank?

    intent = retrieve_intent(order.payment_intent_id)
    if intent.status == "succeeded" && intent.amount_received.to_i == order.amount_cents &&
       intent.metadata["order_token"] == order.token
      order.mark_paid!(intent.id)
    end
    order
  end

  # Refunds `amount` (default: everything still refundable) back to the card.
  # Each refund gets its own row, so its id makes a safe idempotency key, and
  # the row lock stops two refunds from racing past the order total.
  def refund!(order, amount: nil, reason: nil, note: nil, user: nil, source: "admin")
    order.with_lock do
      available = order.refundable_amount
      raise ArgumentError, "Only card orders that were paid online can be refunded" unless available.positive?

      amount = amount.nil? ? available : BigDecimal(amount.to_s).round(2)
      raise ArgumentError, "Refund amount must be more than $0.00" unless amount.positive?
      if amount > available
        raise ArgumentError, "You can refund at most $#{format('%.2f', available)} on this order"
      end

      refund = order.refunds.create!(amount: amount, reason: reason.presence, note: note.presence,
                                     refunded_by: user, source: source)
      stripe_refund = Stripe::Refund.create(
        {
          payment_intent: order.payment_intent_id,
          amount: (amount * 100).round.to_i,
          metadata: { order_id: order.id, refund_id: refund.id, reason: reason.to_s.first(100) },
        },
        { idempotency_key: "refund-#{refund.id}" },
      )
      refund.update!(stripe_refund_id: stripe_refund.id)

      refunded = order.refunded_amount + amount
      order.update!(refunded_amount: refunded,
                    payment_status: refunded >= order.total_cost ? "refunded" : "partially_refunded")
      refund
    end
  end

  # Stops an unfinished card payment so it can't go through after a cancel.
  def cancel_intent!(order)
    return if order.payment_intent_id.blank?

    Stripe::PaymentIntent.cancel(order.payment_intent_id)
  rescue Stripe::InvalidRequestError
    # Already cancelled or otherwise finished; nothing left to stop.
    nil
  end
end
