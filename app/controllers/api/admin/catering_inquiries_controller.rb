class Api::Admin::CateringInquiriesController < Api::Admin::BaseController
  def index
    inquiries = current_restaurant.catering_inquiries
    inquiries = inquiries.where(status: params[:status]) if CateringInquiry::STATUSES.include?(params[:status])
    render json: inquiries.limit(200).map { |c| Presenters.catering_inquiry(c) }
  end

  def update
    inquiry.update!(params.permit(:status, :admin_notes))
    render json: Presenters.catering_inquiry(inquiry)
  end

  def destroy
    inquiry.destroy!
    head :no_content
  end

  private

  def inquiry
    @inquiry ||= current_restaurant.catering_inquiries.find(params[:id])
  end
end
