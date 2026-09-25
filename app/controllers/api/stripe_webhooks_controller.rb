# Backup path for marking orders paid in case the customer closes the tab
# before the browser calls confirm_payment. Needs STRIPE_WEBHOOK_SECRET.
class Api::StripeWebhooksController < ApplicationController
  skip_before_action :authorize

  def create
    secret = ENV["STRIPE_WEBHOOK_SECRET"]
    return head :not_found if secret.blank?

    event = Stripe::Webhook.construct_event(request.raw_post, request.headers["Stripe-Signature"], secret)
    if event.type == "payment_intent.succeeded"
      order = Order.find_by(payment_intent_id: event.data.object.id)
      Payments.sync!(order) if order
    end
    head :ok
  rescue JSON::ParserError, Stripe::SignatureVerificationError
    head :bad_request
  end
end
