class Api::Admin::UsersController < Api::Admin::BaseController
  def index
    users = User.left_joins(:orders).group(:id).select("users.*, COUNT(orders.id) AS orders_count").order(:name)
    if params[:q].present?
      q = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].strip)}%"
      users = users.where("users.name ILIKE :q OR users.email ILIKE :q OR users.phone ILIKE :q", q: q)
    end
    users = users.where("users.admin OR users.kitchen") if params[:staff] == "true"
    render json: users.limit(200).map { |u| Presenters.admin_user(u) }
  end

  # Only the role is editable here; customers manage their own profiles.
  # PATCH { role: "customer" | "kitchen" | "admin" }
  def update
    user = User.find(params[:id])
    role = params.require(:role).to_s
    return render_errors "Unknown role" unless User::ROLES.include?(role)
    if user == current_user && role != "admin"
      return render_errors "You can't remove your own admin access."
    end

    user.update!(admin: role == "admin", kitchen: role == "kitchen")
    render json: Presenters.admin_user(user)
  end

  # POST: a one-time link the admin can text to someone who forgot their password.
  def reset_link
    user = User.find(params[:id])
    render json: {
      url: password_reset_url(user.generate_token_for(:staff_password_reset)),
      expires_at: User::STAFF_RESET_EXPIRES_IN.from_now,
    }
  end
end
