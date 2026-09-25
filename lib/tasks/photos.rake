namespace :photos do
  desc "Create the public Supabase Storage bucket for menu photos (safe to re-run)"
  task setup_bucket: :environment do
    result = PhotoStorage.ensure_bucket!
    puts "Bucket #{PhotoStorage.bucket}: #{result}"
  end
end
