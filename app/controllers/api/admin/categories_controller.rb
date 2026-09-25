class Api::Admin::CategoriesController < Api::Admin::BaseController
  # Full menu, including hidden categories and sold-out items.
  def index
    categories = current_restaurant.categories.includes(:menu_items)
    render json: categories.map { |c| Presenters.category(c, items: c.menu_items) }
  end

  def create
    category = current_restaurant.categories.create!(category_params)
    render json: Presenters.category(category, items: []), status: :created
  end

  def update
    category.update!(category_params)
    render json: Presenters.category(category)
  end

  def destroy
    if category.destroy
      head :no_content
    else
      render_errors "Move or delete the items in #{category.name} first."
    end
  end

  def reorder
    reorder!(current_restaurant.categories)
    head :no_content
  end

  private

  def category
    @category ||= current_restaurant.categories.find(params[:id])
  end

  def category_params
    params.permit(:name, :description, :active)
  end
end
