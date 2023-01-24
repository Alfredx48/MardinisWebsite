class Api::RestaurantsController < ApplicationController
  skip_before_action :authorize, only: [:index, :show]

  def index
    render json: Restaurant.all
  end

  def show
    @rest = Restaurant.find(params[:id])
    render json: @rest
  end

end
