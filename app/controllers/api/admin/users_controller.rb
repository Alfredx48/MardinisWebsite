class Api::Admin::UsersController < Api::Admin::BaseController
  def index
    users = User.left_joins(:orders).group(:id).select("users.*, COUNT(orders.id) AS orders_count").order(:name)
    if params[:q].present?
      q = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].strip)}%"
      users = users.where("users.name ILIKE :q OR users.email ILIKE :q OR users.phone ILIKE :q", q: q)
    end
    users = users.where(admin: true) if params[:admins] == "true"
    render json: users.limit(200).map { |u| Presenters.admin_user(u) }
  end

  # Only the admin flag is editable here; customers manage their own profiles.
  def update
    user = User.find(params[:id])
    if user == current_user && params[:admin].to_s == "false"
      return render_errors "You can't remove your own admin access."
    end

    user.update!(admin: ActiveModel::Type::Boolean.new.cast(params.require(:admin)))
    render json: Presenters.admin_user(user)
  end
end
