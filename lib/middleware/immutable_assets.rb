# Vite gives everything under /assets a content hash in its file name, so those
# files never change and browsers may keep them for a year. Every other public
# file (icons, manifest) keeps the shorter default from public_file_server.
class ImmutableAssets
  def initialize(app)
    @app = app
  end

  def call(env)
    status, headers, body = @app.call(env)
    headers["cache-control"] = "public, max-age=31536000, immutable" if status == 200 && env["PATH_INFO"].start_with?("/assets/")
    [status, headers, body]
  end
end
