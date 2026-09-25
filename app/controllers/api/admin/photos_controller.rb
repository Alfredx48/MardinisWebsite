class Api::Admin::PhotosController < Api::Admin::BaseController
  # POST multipart { photo: <file> } -> { url }. The editor then saves the URL
  # on the menu item through the normal update, so cancelling the edit is harmless.
  def create
    file = params.require(:photo)
    return render_errors("Please choose a photo.") unless file.respond_to?(:read)

    render json: { url: PhotoStorage.upload!(file) }, status: :created
  rescue PhotoStorage::Error => e
    render_errors e.message, PhotoStorage.configured? ? :unprocessable_content : :service_unavailable
  end
end
