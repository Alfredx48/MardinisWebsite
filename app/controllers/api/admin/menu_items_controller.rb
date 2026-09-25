class Api::Admin::MenuItemsController < Api::Admin::BaseController
  def create
    item = current_restaurant.menu_items.create!(item_params)
    render json: Presenters.menu_item(item), status: :created
  end

  def update
    moving = item_params.key?(:category_id) && item_params[:category_id].to_i != item.category_id
    item.assign_attributes(item_params)
    item.position = (item.category.menu_items.maximum(:position) || 0) + 1 if moving
    item.save!
    render json: Presenters.menu_item(item)
  end

  def destroy
    if item.destroy
      head :no_content
    else
      render_errors "#{item.name} is on past orders, so it can't be deleted. Mark it unavailable or move it to a hidden category instead."
    end
  end

  # PATCH { category_id: 3, ids: [...] }
  def reorder
    category = current_restaurant.categories.find(params.require(:category_id))
    reorder!(category.menu_items)
    head :no_content
  end

  private

  def item
    @item ||= current_restaurant.menu_items.find(params[:id])
  end

  def item_params
    params.permit(:name, :description, :price, :image, :category_id, :available, :featured, :vegetarian, :spicy)
  end
end
