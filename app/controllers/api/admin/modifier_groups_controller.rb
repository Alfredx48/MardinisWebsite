class Api::Admin::ModifierGroupsController < Api::Admin::BaseController
  def index
    groups = current_restaurant.modifier_groups.includes(:menu_item_modifier_groups)
    render json: groups.map { |g| Presenters.admin_modifier_group(g) }
  end

  def create
    group = current_restaurant.modifier_groups.create!(group_params)
    render json: Presenters.admin_modifier_group(group), status: :created
  end

  def update
    group.update!(group_params)
    render json: Presenters.admin_modifier_group(group)
  end

  # Detaches the group from its items too. Past orders keep their own copy.
  def destroy
    group.destroy!
    head :no_content
  end

  private

  def group
    @group ||= current_restaurant.modifier_groups.find(params[:id])
  end

  def group_params
    permitted = params.permit(:name, :min_select, :max_select, options: [:name, :price])
    permitted[:max_select] = nil if params.key?(:max_select) && params[:max_select].blank?
    permitted
  end
end
