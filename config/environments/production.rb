require "active_support/core_ext/integer/time"
require_relative "../../lib/middleware/immutable_assets"

Rails.application.configure do
  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot for better performance and memory savings (ignored by Rake tasks).
  config.eager_load = true

  # Full error reports are disabled.
  config.consider_all_requests_local = false

  # The React build in public/ is served by Rails. Hashed files in assets/ are
  # cached for a year (see ImmutableAssets); icons and the manifest for an hour.
  config.public_file_server.headers = { "cache-control" => "public, max-age=#{1.hour.to_i}" }
  config.middleware.insert_before ActionDispatch::Static, ImmutableAssets
  # Never serve index.html as a static file: it names the current asset files,
  # so a cached copy would break after the next deploy. "/" goes through
  # FallbackController instead, which makes browsers revalidate it.
  config.public_file_server.index_name = "no-static-index"

  # Render terminates SSL at its proxy; trust it and redirect plain HTTP to HTTPS.
  config.assume_ssl = true
  config.force_ssl = true
  # Render's health checks call /up over plain HTTP inside its network.
  config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/up" } } }

  # Log to STDOUT with the current request id as a default log tag.
  config.log_tags = [ :request_id ]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)

  # Change to "debug" to log everything (including potentially personally-identifiable information!).
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Prevent health checks from clogging up the logs.
  config.silence_healthcheck_path = "/up"

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Do not dump schema after migrations.
  config.active_record.dump_schema_after_migration = false

  # Only use :id for inspections in production.
  config.active_record.attributes_for_inspect = [ :id ]
end
