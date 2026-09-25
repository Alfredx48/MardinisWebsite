# Supabase exposes every table in the public schema through its auto-generated
# Data API, using the `anon` and `authenticated` roles. This app only reads and
# writes the database through Rails, so shut those roles out completely:
#
# - Row level security on every table, with no policies: the API roles can see
#   nothing. Rails connects as the tables' owner, which RLS does not apply to.
# - Revoke the API roles' privileges on existing and future tables.
#
# On plain Postgres (e.g. local development) the API roles don't exist, so only
# the RLS step runs, which is harmless for the owner.
class LockDownSupabaseApiAccess < ActiveRecord::Migration[6.1]
  API_ROLES = %w[anon authenticated].freeze

  def up
    connection.tables.each do |table|
      execute "ALTER TABLE #{quote_table_name(table)} ENABLE ROW LEVEL SECURITY"
    end

    roles = API_ROLES.select { |role| select_value("SELECT 1 FROM pg_roles WHERE rolname = #{connection.quote(role)}") }
    return if roles.empty?

    list = roles.join(", ")
    execute "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM #{list}"
    execute "REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM #{list}"
    execute "ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM #{list}"
    execute "ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM #{list}"
  end

  def down
    connection.tables.each do |table|
      execute "ALTER TABLE #{quote_table_name(table)} DISABLE ROW LEVEL SECURITY"
    end
  end
end
