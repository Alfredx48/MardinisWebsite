class Api::OrdersController < ApplicationController
  
  skip_before_action :authorize

  def index
    render json: Order.all.reverse
  end

  def create
    cart = current_cart || current_user.carts.first
    user_id = current_user&.id
    order = Order.create_from_cart(cart, user_id, order_params[:status], order_params[:custom_request], order_params[:payment_intent_id], order_params[:total_cost])
    order.restaurant_id = Restaurant.first.id
    order.save!
    payment_intent = order.create_payment_intent
  
    order.payment_intent_id = payment_intent.id
    order.save!
    
    session.delete(:cart_id)
    render json: { message: "Order placed successfully.", order: order }, status: :created
  end
  
  def update 
    order = Order.find_by(id: params[:id])
    order.update(order_params)
    render json: order, status: :accepted 
  end

  def create_payment_intent
    amount = (order_params[:total_cost].to_f * 100).to_i
    payment_intent = Stripe::PaymentIntent.create(
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card'],
    )
  
    render json: { client_secret: payment_intent.client_secret }
  end
  

  private

  def order_params
    params.require(:order).permit(:status, :custom_request, :total_cost, :user_id, :restaurant_id, :payment_method_id)
  end
end
