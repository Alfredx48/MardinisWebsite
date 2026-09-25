class Api::Admin::BaseController < ApplicationController
  before_action :require_admin

  private

  # Accepts `{ ids: [3, 1, 2] }` and stores that order in the `position` column.
  def reorder!(scope)
    ids = Array(params.require(:ids)).map(&:to_i)
    ActiveRecord::Base.transaction do
      ids.each_with_index { |id, index| scope.find(id).update_columns(position: index + 1, updated_at: Time.current) }
    end
  end
end
