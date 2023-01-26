# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
User.destroy_all
MenuItem.destroy_all
Restaurant.destroy_all

#Admin
a = User.create!(name: "Alfred", email: "hello@alfred.com", password: "123456", password_confirmation: "123456", address: "123 hello way", phone: "(123)456-7890", admin: true)

#Users

#Restaurant
r = Restaurant.create!(name: "Mardinis", hours_of_operation: "9am - 9pm", address: "408 Willow Rd, Menlo Park, CA 94025", phone: "(650)324-4316", description: "Mardini's Deli Cafe, a Mediterranean and American eatery, excels in providing a vast selection of dishes, such as falafels, kabobs and lamb gyro, along with scrumptious options of burgers, sandwiches, salads and more. The restaurant boasts a warm and welcoming ambiance and is renowned for its friendly and professional service. On Google, it has received an impressive rating of 4.4 stars.")

# {restaurant: r,name: "", description: "", price: ,tag: ""},
MenuItem.create!([
  #Wraps
  { restaurant: r, name: "Lamb and Beef Gyro Wrap", description: "Tzatziki sauce, lettuce, tomatoes and onions.", price: 16.25, image: "https://s3-media0.fl.yelpcdn.com/bphoto/-yKYMrCbJcmSrdf-Depflg/o.jpg", tag: "wrap" },
  { restaurant: r, name: "Chicken Shawarma Wrap", description: "Hummus, cucumbers, tomatoes, onions, pickles, tahini sauce & garlic sauce. Served on lavash bread.", price: 17.50, image: "https://i.imgur.com/lypIHOa.jpg", tag: "wrap" },
  { restaurant: r, name: "Falafel Wrap", description: "Vegetarian. Hummus, cucumbers, tomatoes, onions, pickles & tahini sauce. Served on lavash bread.", price: 14.75, image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/f4c56adf-203b-43bd-aa73-cf85958a5de2-retina-large.JPG", tag: "wrap" },
  { restaurant: r, name: "Chicken Gyro Wrap", description: "Tzatziki sauce, lettuce, tomatoes & onions. Served on lavash bread.", price: 17.50, image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/1ab6f457-1be1-42f4-bf43-25e48d40e01d-retina-large.JPG", tag: "wrap" },
  { restaurant: r, name: "Falafel Deluxe Wrap", description: "Vegetarian. Hummus, cucumbers, tomatoes, onions, pickles, tahini sauce, fried eggplant & potatoes. Served on lavash bread.", price: 16.25, image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/aa0f5392-92bb-4907-8f31-2273e7e7d246-retina-large.JPG", tag: "wrap" },
  { restaurant: r, name: "Kufta Wrap", description: "Hummus, cucumbers, tomatoes, onions, pickles & tahini sauce. Served on lavash bread.", price: 17.50, image: "https://popmenucloud.com/cdn-cgi/image/width%3D1200%2Cheight%3D1200%2Cfit%3Dscale-down%2Cformat%3Dauto%2Cquality%3D60/qbpnelod/66e4385d-1148-4a8b-be24-6ff529222d99.JPG", tag: "wrap" },
  { restaurant: r, name: "Hummus Wrap", description: "Vegetarian. Cucumbers, tomatoes, onions, pickles & parsley. Served on lavash bread.", price: 14.75, image: "https://s3-media0.fl.yelpcdn.com/bphoto/-8Smg_FZxkqqZxzkJ95s8g/348s.jpg", tag: "wrap" },
  { restaurant: r, name: "Dolmas Wrap", description: "Hummus, cucumbers, tomatoes, onions, pickles, tahini sauce & feta cheese. Served on lavash bread. Served on lavash bread.", price: 14.75, image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/d64dd8b0-bf6e-4e34-b875-0ce84c238ec7-retina-large.JPG", tag: "wrap" },
  #plates
  { restaurant: r, name: "Lamb & Beef Gyro Plate", description: "Plate come with side of hummus, house salad, rice & pita bread.", price: 20.75, image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/5fff8497-90c2-4a4f-9fc7-c06d79ec1016-retina-large.jpg", tag: "plate" },
  { restaurant: r, name: "Chicken Shawerma Plate", description: "Plate come with side of hummus, house salad, rice & pita bread.", price: 20.75, image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/4571368f-9e1c-4bbb-814b-1c02e0129e3a-retina-large.jpg", tag: "plate" },
  { restaurant: r, name: "Vegetarian Combo Plate", description: "Hummus, tabboleh, cabbage, baba ganoush, house salad, two dolmas and two falafels.", price: 18.75, image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/f54fca12-8ab9-4c19-a263-dc7c0a03a901-retina-large.jpg", tag: "plate" },
  { restaurant: r, name: "Combo Kabob Plate", description: "Plate come with side of hummus, house salad, rice & pita bread.", price: 20.75, image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photos/c6ac08ec-40b0-49f2-a2a7-17af618213e6-retina-large.jpg", tag: "plate" },
  { restaurant: r, name: "Chicken Kabob Plate", description: "Plate come with side of hummus, house salad, rice & pita bread.", price: 20.75, image: "https://s3-media0.fl.yelpcdn.com/bphoto/Y7pf5ye79pac1cFi97ySXA/348s.jpg", tag: "plate" },
  { restaurant: r, name: "Falafel Plate", description: "Plate come with side of hummus, house salad, rice & pita bread.", price: 17.75, image: "https://img.cdn4dd.com/p/fit=cover,width=150,height=150,format=auto,quality=50/media/photos/a23e54e5-7c29-4c40-9086-618651843e3b-retina-large.jpg", tag: "plate" },
  { restaurant: r, name: "Combo Shawerma Plate", description: "Plate come with side of hummus, house salad, rice & pita bread.", price: 20.75, image: "https://s3-media0.fl.yelpcdn.com/bphoto/Z5nSpVISVnET1Pk6u8cWKQ/348s.jpg", tag: "plate" },
  { restaurant: r, name: "Beef Kabob Plate", description: "Plate come with side of hummus, house salad, rice & pita bread.", price: 20.75, image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/2c275272-98e5-4757-94e6-3ad790ffb5d0-retina-large.JPG", tag: "plate" },
  { restaurant: r, name: "Kufta Kabob Plate", description: "Plate come with side of hummus, house salad, rice & pita bread.", price: 20.75, image: "https://img.cdn4dd.com/p/fit=cover,width=600,format=auto,quality=50/media/photosV2/80e47ea7-5e75-48e4-b2d9-71d0167a4964-retina-large.JPG", tag: "plate" },
  { restaurant: r, name: "Lam Kabob Plate", description: "Plate come with side of hummus, house salad, rice & pita bread.", price: 22.75, image: "https://s3-media0.fl.yelpcdn.com/bphoto/-zioqQjQ3eH_snUOE1HJtg/348s.jpg", tag: "plate" },
  # salads
  { restaurant: r, name: "Greek Salad", description: "Vegetarian. Romaine lettuce, tomatoes, red onions, cucumbers, bell peppers, feta cheese, kalamata olives & balsamic vinaigrette.", price: 15.99, tag: "salad" },
  { restaurant: r, name: "Chef Salad", description: "Romaine lettuce, tomatoes, red onions, cucumbers, bell peppers, eggs, parmesan cheese, bacon & ranch dressing.", price: 17.25, tag: "salad" },
  { restaurant: r, name: "Fatoush Salad", description: "Vegetarian. Romaine lettuce, tomatoes, red onions, cucumbers, bell peppers, mints, baked pita bread & special dressing.", price: 14.25, tag: "salad" },
  { restaurant: r, name: " Caesar Salad", description: "Vegetarian. Romaine lettuce, shredded parmesan cheese, croutons & house caesar dressing.", price: 15.25, tag: "salad" },
  { restaurant: r, name: "House Special Salad", description: "Vegetarian. Romaine lettuce, tomatoes, bell peppers, cucumbers & house dressing.", price: 13.50, tag: "salad" },
  #burger
  { restaurant: r, name: "Double Cheese Burger", description: "", price: 15.50, tag: "burger" },
  { restaurant: r, name: "Bacon Cheese Burger", description: "", price: 15.50, tag: "burger" },
  { restaurant: r, name: "Cheese Burger", description: "", price: 14.25, tag: "burger" },
  { restaurant: r, name: "Hamburger", description: "", price: 12.75, tag: "burger" },
  { restaurant: r, name: "Turkey Burger", description: "", price: 13.75, tag: "burger" },
  { restaurant: r, name: "California Burger", description: "", price: 16.25, tag: "burger" },
  { restaurant: r, name: "Mushroom Cheese Burger", description: "", price: 15.50, tag: "burger" },
  { restaurant: r, name: "Garden Burger", description: "", price: 13.75, tag: "burger" },
  { restaurant: r, name: "Double Burger", description: "", price: 15.50, tag: "burger" },
  { restaurant: r, name: "Chicken Burger", description: "", price: 13.75, tag: "burger" },
  #grilled sandwich
  { restaurant: r, name: "Philly Cheese Steak Sandwich", description: "", price: 17.75, tag: "grilled sandwich" },
  { restaurant: r, name: "Turkey Melt Sandwich", description: "", price: 17.50, tag: "grilled sandwich" },
  { restaurant: r, name: "Tuna Melt Sandwich", description: "", price: 17.50, tag: "grilled sandwich" },
  { restaurant: r, name: "BBQ Chicken Sandwich", description: "", price: 17.50, tag: "grilled sandwich" },
  { restaurant: r, name: "Hot Pastrami Sandwich", description: "", price: 17.50, tag: "grilled sandwich" },
  { restaurant: r, name: "Pesto Chicken Sandwich", description: "", price: 17.50, tag: "grilled sandwich" },
  { restaurant: r, name: "Cajun Chicken Sandwich", description: "", price: 17.50, tag: "grilled sandwich" },
  { restaurant: r, name: "Reuben Sandwich", description: "", price: 17.50, tag: "grilled sandwich" },
  { restaurant: r, name: "BLT Sandwich", description: "", price: 16.50, tag: "grilled sandwich" },
  { restaurant: r, name: "Honey Pineapple Chicken Sandwich", description: "", price: 17.50, tag: "grilled sandwich" },
  { restaurant: r, name: "Chicken Club Sandwich", description: "", price: 17.50, tag: "grilled sandwich" },
  { restaurant: r, name: "Veggie Sandwich", description: "Vegetarian. With eggplant, onions, tomatoes & balsamic vinegar.", price: 17.50, tag: "grilled sandwich" },
  #cold sandwiches
  { restaurant: r, name: "Club Sandwich", description: "Turkey, avocado, bacon and cheese. Sandwiches come with mayonnaise, mustard, lettuce, tomatoes, onions pickles & pepperoncini.", price: 14.75, tag: "cold sandwich" },
  { restaurant: r, name: "Turkey Sandwich", description: "", price: 14.75, tag: "cold sandwich" },
  { restaurant: r, name: "Roast Beef Sandwich", description: "", price: 14.75, tag: "cold sandwich" },
  { restaurant: r, name: "Italian Sub Sandwich", description: "", price: 15.25, tag: "cold sandwich" },
  { restaurant: r, name: "Egg Salad Sandwich", description: "", price: 14.75, tag: "cold sandwich" },
  { restaurant: r, name: " Tuna Salad Sandwich", description: "", price: 14.75, tag: "cold sandwich" },
  { restaurant: r, name: "Pastrami Sandwich", description: "", price: 14.75, tag: "cold sandwich" },
  { restaurant: r, name: "Veggie Sandwich", description: "", price: 14.75, tag: "cold sandwich" },
  { restaurant: r, name: "Ham Sandwich", description: "", price: 14.75, tag: "cold sandwich" },

])

c = Cart.create(user_id: a.id)
# c1 = Cart.create()

# CartItem.create!(cart: c, menu_item: MenuItem.all.sample, quantity: rand(1..15))
# CartItem.create!(cart: c1, menu_item: MenuItem.all.sample, quantity: rand(1..15))
# CartItem.create!(cart: c, menu_item: MenuItem.all.sample, quantity: rand(1..15))
# CartItem.create!(cart: c1, menu_item: MenuItem.all.sample, quantity: rand(1..15))
# CartItem.create!(cart: c, menu_item: MenuItem.all.sample, quantity: rand(1..15))
# CartItem.create!(cart: c1, menu_item: MenuItem.all.sample, quantity: rand(1..15))
# CartItem.create!(cart: c, menu_item: MenuItem.all.sample, quantity: rand(1..15))
# CartItem.create!(cart: c1, menu_item: MenuItem.all.sample, quantity: rand(1..15))
# CartItem.create!(cart: c, menu_item: MenuItem.all.sample, quantity: rand(1..15))
# CartItem.create!(cart: c1, menu_item: MenuItem.all.sample, quantity: rand(1..15))
