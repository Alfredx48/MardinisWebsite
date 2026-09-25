class Api::OrdersController < ApplicationController
  skip_before_action :authorize, except: [:index]
  rescue_from Checkout::Error, with: ->(e) { render_errors e.messages }
  rescue_from Stripe::StripeError, with: :rescue_stripe

  # The signed-in customer's order history.
  def index
    orders = current_user.orders.placed.includes(:order_items).limit(50)
    render json: orders.map { |o| Presenters.order(o) }
  end

  # Anyone with the order's unguessable token can follow its status.
  def show
    order = find_by_token
    Payments.sync!(order) if order.payment_method == "card" && !order.placed?
    render json: Presenters.order(order)
  end

  def create
    order = Checkout.new(restaurant: current_restaurant, user: current_user, params: checkout_params).call

    if order.payment_method == "in_store"
      order.save!
      order.mark_placed!
      return render json: { order: Presenters.order(order) }, status: :created
    end

    order.save!
    begin
      intent = Payments.create_intent!(order)
    rescue Stripe::StripeError
      order.destroy
      raise
    end
    order.update!(payment_intent_id: intent.id)
    render json: { order: Presenters.order(order), client_secret: intent.client_secret }, status: :created
  end

  # Called by the browser after Stripe confirms the card; we re-check with Stripe.
  def confirm_payment
    order = Payments.sync!(find_by_token)
    if order.payment_status == "paid"
      render json: Presenters.order(order)
    else
      render_errors "We couldn't confirm your payment yet. If you were charged, please call us.", :payment_required
    end
  end

  private

  def find_by_token
    Order.includes(:order_items).find_by!(token: params[:token].to_s)
  end

  def checkout_params
    params.permit(
      :payment_method, :pickup_at, :tip, :custom_request,
      customer: %i[name phone email],
      items: %i[menu_item_id quantity special_request],
    )
  end

  def rescue_stripe(error)
    Rails.logger.error("[stripe] #{error.class}: #{error.message}")
    render_errors "Our payment processor had a problem: #{error.message}", :bad_gateway
  end
end
