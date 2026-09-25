require "net/http"

# Stores menu photos in a public Supabase Storage bucket and returns their
# permanent URLs. Talks to the Storage REST API with the project's secret key,
# which stays on the server; the browser only ever sees the public URL.
module PhotoStorage
  class Error < StandardError; end

  MAX_BYTES = 5.megabytes
  CONTENT_TYPES = { "jpg" => "image/jpeg", "png" => "image/png", "webp" => "image/webp" }.freeze

  module_function

  def configured?
    base_url.present? && secret_key.present?
  end

  def bucket
    ENV.fetch("SUPABASE_PHOTO_BUCKET", "menu-photos")
  end

  # Returns the public URL of the stored photo.
  def upload!(io)
    raise Error, "Photo uploads aren't set up yet. Add SUPABASE_URL and SUPABASE_SECRET_KEY on the server." unless configured?

    data = io.read(MAX_BYTES + 1)
    raise Error, "Please choose a photo." if data.blank?
    raise Error, "That photo is too large (5 MB max)." if data.bytesize > MAX_BYTES

    ext = detect_extension(data)
    raise Error, "Please upload a JPG, PNG or WebP image." unless ext

    path = "items/#{Time.current.strftime('%Y%m%d')}-#{SecureRandom.hex(8)}.#{ext}"
    response = request(Net::HTTP::Post, "/storage/v1/object/#{bucket}/#{path}", data, CONTENT_TYPES[ext],
      "Cache-Control" => "max-age=31536000", "x-upsert" => "false")
    raise Error, "Couldn't save the photo. Please try again." unless response.is_a?(Net::HTTPSuccess)

    public_url(path)
  end

  def public_url(path)
    "#{base_url}/storage/v1/object/public/#{bucket}/#{path}"
  end

  # One-time setup: creates the public bucket (safe to run again).
  def ensure_bucket!
    raise Error, "Set SUPABASE_URL and SUPABASE_SECRET_KEY first." unless configured?

    body = { id: bucket, name: bucket, public: true, file_size_limit: MAX_BYTES, allowed_mime_types: CONTENT_TYPES.values }.to_json
    response = request(Net::HTTP::Post, "/storage/v1/bucket", body, "application/json")
    return :created if response.is_a?(Net::HTTPSuccess)
    return :exists if response.body.to_s.match?(/already exists|Duplicate/i)

    raise Error, "Couldn't create bucket #{bucket}: HTTP #{response.code} #{response.body}"
  end

  # Trusts the file's first bytes, not the browser-supplied content type.
  def detect_extension(data)
    head = data.byteslice(0, 12).b
    if head.start_with?("\xFF\xD8\xFF".b) then "jpg"
    elsif head.start_with?("\x89PNG\r\n\x1A\n".b) then "png"
    elsif head.start_with?("RIFF".b) && head.byteslice(8, 4) == "WEBP".b then "webp"
    end
  end

  def request(klass, path, body, content_type, headers = {})
    uri = URI("#{base_url}#{path}")
    req = klass.new(uri)
    # The key goes in both headers: legacy service_role JWTs need the Bearer,
    # and new sb_secret_ keys are accepted there only when it matches apikey.
    req["apikey"] = secret_key
    req["Authorization"] = "Bearer #{secret_key}"
    req["Content-Type"] = content_type
    headers.each { |k, v| req[k] = v }
    req.body = body
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https", open_timeout: 10, read_timeout: 30) do |http|
      http.request(req)
    end
  rescue Net::OpenTimeout, Net::ReadTimeout, SocketError, SystemCallError, OpenSSL::SSL::SSLError
    raise Error, "Couldn't reach photo storage. Please try again."
  end

  def base_url
    ENV["SUPABASE_URL"].to_s.chomp("/")
  end

  def secret_key
    ENV["SUPABASE_SECRET_KEY"]
  end
end
