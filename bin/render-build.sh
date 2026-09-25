#!/usr/bin/env bash
# Render build: install gems, build the React app into public/, then migrate.
set -o errexit

bundle install

# Front end: React is compiled to static files that Rails serves from public/.
npm run build

# Seeds are idempotent: they only fill an empty database and never delete data.
bundle exec rails db:migrate
bundle exec rails db:seed
