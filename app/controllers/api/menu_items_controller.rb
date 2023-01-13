class Api::MenuItemsController < ApplicationController
  skip_before_action :authorize, only: [:index, :show]

  def index 
    render json: MenuItem.all
  end

end
