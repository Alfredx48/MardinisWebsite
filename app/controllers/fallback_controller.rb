# Serves the React app for every non-API page (e.g. refreshing /menu or /admin),
# so React Router can take over in the browser.
class FallbackController < ActionController::Base
  def index
    render file: Rails.public_path.join("index.html"), layout: false
  end
end
