source "https://rubygems.org"

ruby file: ".ruby-version"

gem "rails", "~> 8.1.4"
gem "pg", "~> 1.6"
gem "puma", ">= 6.0"
gem "bcrypt", "~> 3.1.20"
gem "bootsnap", require: false
gem "stripe", "~> 19.6"

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem "tzinfo-data", platforms: %i[windows jruby]

group :development, :test do
  gem "debug", platforms: %i[mri windows], require: "debug/prelude"
  # Loads a local .env file. In production, Render provides real environment variables.
  gem "dotenv", "~> 3.2"
  gem "rspec-rails", "~> 8.0"
end
