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

  def refund!(order)
    raise ArgumentError, "Only paid card orders can be refunded" unless order.payment_method == "card" && order.payment_status == "paid"

    Stripe::Refund.create({ payment_intent: order.payment_intent_id }, { idempotency_key: "refund-#{order.token}" })
    order.update!(payment_status: "refunded")
  end
end
