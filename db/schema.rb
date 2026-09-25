# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_25_000001) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "categories", force: :cascade do |t|
    t.bigint "restaurant_id", null: false
    t.string "name", null: false
    t.text "description"
    t.integer "position", default: 0, null: false
    t.boolean "active", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["restaurant_id"], name: "index_categories_on_restaurant_id"
  end

  create_table "catering_inquiries", force: :cascade do |t|
    t.bigint "restaurant_id", null: false
    t.string "name", null: false
    t.string "email"
    t.string "phone", null: false
    t.date "event_date"
    t.integer "guest_count"
    t.text "message"
    t.string "status", default: "new", null: false
    t.text "admin_notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["restaurant_id"], name: "index_catering_inquiries_on_restaurant_id"
    t.index ["status"], name: "index_catering_inquiries_on_status"
  end

  create_table "menu_items", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.decimal "price", precision: 8, scale: 2
    t.string "image"
    t.string "tag"
    t.bigint "restaurant_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "category_id"
    t.boolean "available", default: true, null: false
    t.boolean "featured", default: false, null: false
    t.boolean "vegetarian", default: false, null: false
    t.boolean "spicy", default: false, null: false
    t.integer "position", default: 0, null: false
    t.index ["category_id"], name: "index_menu_items_on_category_id"
    t.index ["restaurant_id"], name: "index_menu_items_on_restaurant_id"
  end

  create_table "order_items", force: :cascade do |t|
    t.integer "quantity"
    t.text "special_request"
    t.boolean "hot_sauce"
    t.bigint "order_id", null: false
    t.bigint "menu_item_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "item_name"
    t.decimal "unit_price", precision: 8, scale: 2
    t.index ["menu_item_id"], name: "index_order_items_on_menu_item_id"
    t.index ["order_id"], name: "index_order_items_on_order_id"
  end

  create_table "orders", force: :cascade do |t|
    t.decimal "total_cost", precision: 10, scale: 2
    t.integer "total_items"
    t.string "status"
    t.string "custom_request"
    t.integer "user_id"
    t.integer "restaurant_id"
    t.string "payment_intent_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "subtotal", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "tax", precision: 10, scale: 2, default: "0.0", null: false
    t.decimal "tip", precision: 10, scale: 2, default: "0.0", null: false
    t.string "customer_name"
    t.string "customer_email"
    t.string "customer_phone"
    t.string "payment_method", default: "card", null: false
    t.string "payment_status", default: "unpaid", null: false
    t.datetime "pickup_at", precision: nil
    t.string "token"
    t.text "admin_notes"
    t.string "cancel_reason"
    t.datetime "placed_at", precision: nil
    t.datetime "ready_at", precision: nil
    t.datetime "completed_at", precision: nil
    t.index ["placed_at"], name: "index_orders_on_placed_at"
    t.index ["status"], name: "index_orders_on_status"
    t.index ["token"], name: "index_orders_on_token", unique: true
    t.index ["user_id"], name: "index_orders_on_user_id"
  end

  create_table "restaurants", force: :cascade do |t|
    t.string "name"
    t.string "hours_of_operation"
    t.text "description"
    t.string "address"
    t.string "phone"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "email"
    t.string "tagline"
    t.jsonb "hours", default: {"fri" => {"open" => "09:00", "close" => "21:00", "closed" => false}, "mon" => {"open" => "09:00", "close" => "21:00", "closed" => false}, "sat" => {"open" => "09:00", "close" => "21:00", "closed" => false}, "sun" => {"open" => "10:00", "close" => "20:00", "closed" => false}, "thu" => {"open" => "09:00", "close" => "21:00", "closed" => false}, "tue" => {"open" => "09:00", "close" => "21:00", "closed" => false}, "wed" => {"open" => "09:00", "close" => "21:00", "closed" => false}}, null: false
    t.decimal "tax_rate", precision: 6, scale: 5, default: "0.095", null: false
    t.boolean "accepting_orders", default: true, null: false
    t.integer "prep_time_minutes", default: 20, null: false
    t.boolean "card_payments_enabled", default: true, null: false
    t.boolean "pay_in_store_enabled", default: true, null: false
    t.boolean "tips_enabled", default: true, null: false
    t.string "announcement"
    t.string "hero_image"
    t.string "logo_image"
  end

  create_table "users", force: :cascade do |t|
    t.string "email"
    t.string "password_digest"
    t.string "name"
    t.string "address"
    t.string "phone"
    t.boolean "admin", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index "lower((email)::text)", name: "index_users_on_lower_email"
  end

  add_foreign_key "categories", "restaurants"
  add_foreign_key "catering_inquiries", "restaurants"
  add_foreign_key "menu_items", "categories"
  add_foreign_key "menu_items", "restaurants"
  add_foreign_key "order_items", "menu_items"
  add_foreign_key "order_items", "orders"
end
