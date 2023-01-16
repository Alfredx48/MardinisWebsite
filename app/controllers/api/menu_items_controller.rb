class Api::MenuItemsController < ApplicationController
  skip_before_action :authorize, only: [:index, :show]

  def index 
    render json: MenuItem.all
  end

  def show
    menu_item = MenuItem.find(params[:id])
    render json: menu_item
  end

end
