class Api::CateringInquiriesController < ApplicationController
  skip_before_action :authorize

  def create
    current_restaurant.catering_inquiries.create!(
      params.permit(:name, :email, :phone, :event_date, :guest_count, :message),
    )
    render json: { message: "Thanks! We'll be in touch soon." }, status: :created
  end
end
