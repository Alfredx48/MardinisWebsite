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

ActiveRecord::Schema[8.1].define(version: 2026_10_02_000005) do
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
    t.boolean "catering", default: false, null: false
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

  create_table "group_order_items", force: :cascade do |t|
    t.bigint "group_order_participant_id", null: false
    t.bigint "menu_item_id", null: false
    t.string "size"
    t.jsonb "modifiers", default: [], null: false
    t.integer "quantity", default: 1, null: false
    t.string "special_request"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["group_order_participant_id"], name: "index_group_order_items_on_group_order_participant_id"
    t.index ["menu_item_id"], name: "index_group_order_items_on_menu_item_id"
  end

  create_table "group_order_participants", force: :cascade do |t|
    t.bigint "group_order_id", null: false
    t.string "name", null: false
    t.string "key", null: false
    t.boolean "host", default: false, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.datetime "done_at"
    t.index ["group_order_id"], name: "index_group_order_participants_on_group_order_id"
    t.index ["key"], name: "index_group_order_participants_on_key", unique: true
  end

  create_table "group_orders", force: :cascade do |t|
    t.bigint "restaurant_id", null: false
    t.bigint "order_id"
    t.string "token", null: false
    t.string "host_token", null: false
    t.string "host_name", null: false
    t.string "host_email", null: false
    t.string "host_phone"
    t.string "note"
    t.datetime "deadline_at"
    t.decimal "per_person_limit", precision: 10, scale: 2
    t.boolean "open", default: true, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["order_id"], name: "index_group_orders_on_order_id"
    t.index ["restaurant_id"], name: "index_group_orders_on_restaurant_id"
    t.index ["token"], name: "index_group_orders_on_token", unique: true
  end

  create_table "menu_item_modifier_groups", force: :cascade do |t|
    t.bigint "menu_item_id", null: false
    t.bigint "modifier_group_id", null: false
    t.integer "position", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["menu_item_id", "modifier_group_id"], name: "index_menu_item_modifier_groups_unique", unique: true
    t.index ["menu_item_id"], name: "index_menu_item_modifier_groups_on_menu_item_id"
    t.index ["modifier_group_id"], name: "index_menu_item_modifier_groups_on_modifier_group_id"
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
    t.jsonb "sizes", default: [], null: false
    t.index ["category_id"], name: "index_menu_items_on_category_id"
    t.index ["restaurant_id"], name: "index_menu_items_on_restaurant_id"
  end

  create_table "modifier_groups", force: :cascade do |t|
    t.bigint "restaurant_id", null: false
    t.string "name", null: false
    t.integer "min_select", default: 0, null: false
    t.integer "max_select"
    t.jsonb "options", default: [], null: false
    t.integer "position", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["restaurant_id"], name: "index_modifier_groups_on_restaurant_id"
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
    t.string "size"
    t.jsonb "modifiers", default: [], null: false
    t.string "label"
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
    t.decimal "refunded_amount", precision: 10, scale: 2, default: "0.0", null: false
    t.datetime "confirmation_sent_at"
    t.boolean "catering", default: false, null: false
    t.datetime "reminder_3_days_seen_at"
    t.datetime "reminder_1_day_seen_at"
    t.index ["placed_at"], name: "index_orders_on_placed_at"
    t.index ["status"], name: "index_orders_on_status"
    t.index ["token"], name: "index_orders_on_token", unique: true
    t.index ["user_id"], name: "index_orders_on_user_id"
  end

  create_table "refunds", force: :cascade do |t|
    t.bigint "order_id", null: false
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.string "reason"
    t.text "note"
    t.string "source", default: "admin", null: false
    t.bigint "refunded_by_id"
    t.string "stripe_refund_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["order_id"], name: "index_refunds_on_order_id"
    t.index ["refunded_by_id"], name: "index_refunds_on_refunded_by_id"
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

  create_table "sent_emails", force: :cascade do |t|
    t.string "kind", null: false
    t.datetime "created_at", null: false
    t.index ["created_at"], name: "index_sent_emails_on_created_at"
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
    t.boolean "kitchen", default: false, null: false
    t.index "lower((email)::text)", name: "index_users_on_lower_email"
  end

  add_foreign_key "categories", "restaurants"
  add_foreign_key "catering_inquiries", "restaurants"
  add_foreign_key "group_order_items", "group_order_participants"
  add_foreign_key "group_order_items", "menu_items"
  add_foreign_key "group_order_participants", "group_orders"
  add_foreign_key "group_orders", "orders"
  add_foreign_key "group_orders", "restaurants"
  add_foreign_key "menu_item_modifier_groups", "menu_items"
  add_foreign_key "menu_item_modifier_groups", "modifier_groups"
  add_foreign_key "menu_items", "categories"
  add_foreign_key "menu_items", "restaurants"
  add_foreign_key "modifier_groups", "restaurants"
  add_foreign_key "order_items", "menu_items"
  add_foreign_key "order_items", "orders"
  add_foreign_key "refunds", "orders"
  add_foreign_key "refunds", "users", column: "refunded_by_id"
end
