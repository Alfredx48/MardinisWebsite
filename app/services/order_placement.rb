# Saves a priced order from Checkout. Pay-at-pickup orders go to the kitchen
# right away; card orders get a Stripe PaymentIntent and wait for payment.
# Returns the PaymentIntent's client secret for card orders, nil otherwise.
module OrderPlacement
  module_function

  def start!(order)
    order.save!
    if order.payment_method == "in_store"
      order.mark_placed!
      return nil
    end

    begin
      intent = Payments.create_intent!(order)
    rescue Stripe::StripeError
      order.destroy
      raise
    end
    order.update!(payment_intent_id: intent.id)
    intent.client_secret
  end
end
