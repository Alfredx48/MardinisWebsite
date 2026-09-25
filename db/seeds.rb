# Safe to run repeatedly (the Render build runs it on every deploy): it only
# fills in what's missing and never deletes or overwrites existing data.

restaurant = Restaurant.first || Restaurant.create!(
  name: "Mardini's Deli Cafe",
  tagline: "Mediterranean & American favorites in Menlo Park",
  address: "408 Willow Rd, Menlo Park, CA 94025",
  phone: "(650) 324-4316",
  hero_image: "https://i.imgur.com/SobZND4.jpg",
  logo_image: "https://i.imgur.com/Scnc7hH.png",
  description: "Mardini's Deli Cafe is a family-run Mediterranean and American eatery serving falafel, kabobs and lamb gyros alongside burgers, sandwiches and fresh salads. Come for the food, stay for the warm, friendly service.",
)

MENU = {
  "Wraps" => [
    { name: "Chicken Shawarma Wrap", price: 17.50, description: "Hummus, cucumbers, tomatoes, onions, pickles, tahini sauce & garlic sauce. Served on lavash bread.", image: "https://i.imgur.com/lypIHOa.jpg" },
    { name: "Falafel Wrap", price: 14.75, description: "Vegetarian. Hummus, cucumbers, tomatoes, onions, pickles & tahini sauce. Served on lavash bread.", image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/f4c56adf-203b-43bd-aa73-cf85958a5de2-retina-large.JPG" },
    { name: "Lamb and Beef Gyro Wrap", price: 16.25, description: "Tzatziki sauce, lettuce, tomatoes and onions.", image: "https://s3-media0.fl.yelpcdn.com/bphoto/-yKYMrCbJcmSrdf-Depflg/o.jpg" },
    { name: "Chicken Gyro Wrap", price: 17.50, description: "Tzatziki sauce, lettuce, tomatoes & onions. Served on lavash bread.", image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/1ab6f457-1be1-42f4-bf43-25e48d40e01d-retina-large.JPG" },
    { name: "Falafel Deluxe Wrap", price: 16.25, description: "Vegetarian. Hummus, cucumbers, tomatoes, onions, pickles, tahini sauce, fried eggplant & potatoes. Served on lavash bread.", image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/aa0f5392-92bb-4907-8f31-2273e7e7d246-retina-large.JPG" },
    { name: "Kufta Wrap", price: 17.50, description: "Hummus, cucumbers, tomatoes, onions, pickles & tahini sauce. Served on lavash bread.", image: "https://popmenucloud.com/cdn-cgi/image/width%3D1200%2Cheight%3D1200%2Cfit%3Dscale-down%2Cformat%3Dauto%2Cquality%3D60/qbpnelod/66e4385d-1148-4a8b-be24-6ff529222d99.JPG" },
    { name: "Hummus Wrap", price: 14.75, description: "Vegetarian. Cucumbers, tomatoes, onions, pickles & parsley. Served on lavash bread.", image: "https://s3-media0.fl.yelpcdn.com/bphoto/-8Smg_FZxkqqZxzkJ95s8g/348s.jpg" },
    { name: "Dolmas Wrap", price: 14.75, description: "Hummus, cucumbers, tomatoes, onions, pickles, tahini sauce & feta cheese. Served on lavash bread.", image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/d64dd8b0-bf6e-4e34-b875-0ce84c238ec7-retina-large.JPG" },
  ],
  "Plates" => [
    { name: "Lamb & Beef Gyro Plate", price: 20.75, description: "Plates come with side of hummus, house salad, rice & pita bread.", image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/5fff8497-90c2-4a4f-9fc7-c06d79ec1016-retina-large.jpg" },
    { name: "Chicken Shawerma Plate", price: 20.75, description: "Plates come with side of hummus, house salad, rice & pita bread.", image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/4571368f-9e1c-4bbb-814b-1c02e0129e3a-retina-large.jpg" },
    { name: "Vegetarian Combo Plate", price: 18.75, description: "Hummus, tabbouleh, cabbage, baba ganoush, house salad, two dolmas and two falafels.", image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/f54fca12-8ab9-4c19-a263-dc7c0a03a901-retina-large.jpg" },
    { name: "Combo Kabob Plate", price: 20.75, description: "Plates come with side of hummus, house salad, rice & pita bread.", image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/c6ac08ec-40b0-49f2-a2a7-17af618213e6-retina-large.jpg" },
    { name: "Chicken Kabob Plate", price: 20.75, description: "Plates come with side of hummus, house salad, rice & pita bread.", image: "https://s3-media0.fl.yelpcdn.com/bphoto/Y7pf5ye79pac1cFi97ySXA/348s.jpg" },
    { name: "Falafel Plate", price: 17.75, description: "Plates come with side of hummus, house salad, rice & pita bread.", image: "https://img.cdn4dd.com/p/fit=cover,width=150,height=150,format=auto,quality=50/media/photos/a23e54e5-7c29-4c40-9086-618651843e3b-retina-large.jpg" },
    { name: "Combo Shawerma Plate", price: 20.75, description: "Plates come with side of hummus, house salad, rice & pita bread.", image: "https://s3-media0.fl.yelpcdn.com/bphoto/Z5nSpVISVnET1Pk6u8cWKQ/348s.jpg" },
    { name: "Beef Kabob Plate", price: 20.75, description: "Plates come with side of hummus, house salad, rice & pita bread.", image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/2c275272-98e5-4757-94e6-3ad790ffb5d0-retina-large.JPG" },
    { name: "Kufta Kabob Plate", price: 20.75, description: "Plates come with side of hummus, house salad, rice & pita bread.", image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/80e47ea7-5e75-48e4-b2d9-71d0167a4964-retina-large.JPG" },
    { name: "Lamb Kabob Plate", price: 22.75, description: "Plates come with side of hummus, house salad, rice & pita bread.", image: "https://s3-media0.fl.yelpcdn.com/bphoto/-zioqQjQ3eH_snUOE1HJtg/348s.jpg" },
  ],
  "Salads" => [
    { name: "Greek Salad", price: 15.99, description: "Vegetarian. Romaine lettuce, tomatoes, red onions, cucumbers, bell peppers, feta cheese, kalamata olives & balsamic vinaigrette." },
    { name: "Chef Salad", price: 17.25, description: "Romaine lettuce, tomatoes, red onions, cucumbers, bell peppers, eggs, parmesan cheese, bacon & ranch dressing." },
    { name: "Fatoush Salad", price: 14.25, description: "Vegetarian. Romaine lettuce, tomatoes, red onions, cucumbers, bell peppers, mints, baked pita bread & special dressing." },
    { name: "Caesar Salad", price: 15.25, description: "Vegetarian. Romaine lettuce, shredded parmesan cheese, croutons & house caesar dressing." },
    { name: "House Special Salad", price: 13.50, description: "Vegetarian. Romaine lettuce, tomatoes, bell peppers, cucumbers & house dressing." },
  ],
  "Burgers" => [
    { name: "Double Cheese Burger", price: 15.50 },
    { name: "Bacon Cheese Burger", price: 15.50 },
    { name: "Cheese Burger", price: 14.25 },
    { name: "Hamburger", price: 12.75 },
    { name: "Turkey Burger", price: 13.75 },
    { name: "California Burger", price: 16.25 },
    { name: "Mushroom Cheese Burger", price: 15.50 },
    { name: "Garden Burger", price: 13.75 },
    { name: "Double Burger", price: 15.50 },
    { name: "Chicken Burger", price: 13.75 },
  ],
  "Grilled Sandwiches" => [
    { name: "Philly Cheese Steak Sandwich", price: 17.75 },
    { name: "Turkey Melt Sandwich", price: 17.50 },
    { name: "Tuna Melt Sandwich", price: 17.50 },
    { name: "BBQ Chicken Sandwich", price: 17.50 },
    { name: "Hot Pastrami Sandwich", price: 17.50 },
    { name: "Pesto Chicken Sandwich", price: 17.50 },
    { name: "Cajun Chicken Sandwich", price: 17.50 },
    { name: "Reuben Sandwich", price: 17.50 },
    { name: "BLT Sandwich", price: 16.50 },
    { name: "Honey Pineapple Chicken Sandwich", price: 17.50 },
    { name: "Chicken Club Sandwich", price: 17.50 },
    { name: "Veggie Sandwich", price: 17.50, description: "Vegetarian. With eggplant, onions, tomatoes & balsamic vinegar." },
  ],
  "Cold Sandwiches" => [
    { name: "Club Sandwich", price: 14.75, description: "Turkey, avocado, bacon and cheese. Sandwiches come with mayonnaise, mustard, lettuce, tomatoes, onions pickles & pepperoncini." },
    { name: "Turkey Sandwich", price: 14.75 },
    { name: "Roast Beef Sandwich", price: 14.75 },
    { name: "Italian Sub Sandwich", price: 15.25 },
    { name: "Egg Salad Sandwich", price: 14.75 },
    { name: "Tuna Salad Sandwich", price: 14.75 },
    { name: "Pastrami Sandwich", price: 14.75 },
    { name: "Veggie Sandwich", price: 14.75 },
    { name: "Ham Sandwich", price: 14.75 },
  ],
}.freeze

if restaurant.categories.none?
  MENU.each_with_index do |(category_name, items), index|
    category = restaurant.categories.create!(name: category_name, position: index)
    items.each_with_index do |attrs, position|
      category.menu_items.create!(
        attrs.merge(
          restaurant: restaurant,
          position: position + 1,
          vegetarian: attrs[:description].to_s.start_with?("Vegetarian"),
        ),
      )
    end
  end
  puts "Seeded #{restaurant.menu_items.count} menu items in #{restaurant.categories.count} categories."
end

# Bootstrap the first admin from environment variables. In development a
# throwaway login is created if none is provided.
admin_email = ENV["ADMIN_EMAIL"].presence || ("admin@example.com" if Rails.env.development?)
admin_password = ENV["ADMIN_PASSWORD"].presence || ("password123" if Rails.env.development?)
if admin_email && admin_password && !User.exists?(admin: true)
  User.find_or_initialize_by(email: admin_email.downcase).tap do |u|
    u.name = u.name.presence || "Admin"
    u.phone = u.phone.presence || restaurant.phone
    u.password = admin_password
    u.admin = true
    u.save!
  end
  puts "Admin account ready: #{admin_email}"
end
