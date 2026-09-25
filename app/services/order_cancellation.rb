# Cancels an order and returns any card payment in full. Used when a customer
# cancels from their tracking page and when staff choose "Refund & cancel".
module OrderCancellation
  class NotAllowed < StandardError; end

  module_function

  def call!(order, reason:, user: nil, source: "admin", customer: false)
    order.with_lock do
      # A card payment may have just gone through; record it before deciding.
      Payments.sync!(order) if order.status == "awaiting_payment"
      raise NotAllowed, "This order is already cancelled." if order.status == "cancelled"
      if customer && !order.customer_cancellable?
        raise NotAllowed, "The kitchen has already started on your order, so it can't be cancelled online. " \
                          "Please call us and we'll help."
      end

      if order.refundable_amount.positive?
        Payments.refund!(order, reason: reason, user: user, source: source)
      elsif order.status == "awaiting_payment"
        Payments.cancel_intent!(order)
      end
      order.advance_to!("cancelled", reason: reason)
    end
    order
  end
end
