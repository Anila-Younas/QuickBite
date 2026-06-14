const { connectMongo } = require('../db/mongo');
const mongoose = require('mongoose');

async function initMongo() {
  await connectMongo();
  const db = mongoose.connection.db;
  console.log('MongoDB Connected for Initialization');

  const restaurants = db.collection('restaurants');
  await restaurants.deleteMany({});
  
  await restaurants.insertMany([
    {
      oracle_rest_id: 1,
      name: 'Namal Cafe',
      city_zone: 'Mianwali-Central',
      location: { type: 'Point', coordinates: [71.8234, 32.5967] }, // Lng, Lat
      menu: [
        { name: 'Biryani', price: 350, category: 'Main', available: true },
        { name: 'Chai', price: 60, category: 'Drinks', available: true },
        { name: 'Paratha', price: 80, category: 'Breakfast', available: true },
        { name: 'Karahi', price: 550, category: 'Main', available: true }
      ],
      is_active: 1
    },
    {
      oracle_rest_id: 2,
      name: 'Pizza Corner',
      city_zone: 'Mianwali-Central',
      location: { type: 'Point', coordinates: [71.8100, 32.5900] },
      menu: [
        { name: 'Margherita', price: 800, category: 'Main', available: true },
        { name: 'Pepsi', price: 80, category: 'Drinks', available: true },
        { name: 'Garlic Bread', price: 150, category: 'Sides', available: true }
      ],
      is_active: 1
    },
    {
      oracle_rest_id: 3,
      name: 'Bundu Khan',
      city_zone: 'Lahore-Gulberg',
      location: { type: 'Point', coordinates: [74.3587, 31.5122] },
      menu: [
        { name: 'Seekh Kebab', price: 450, category: 'Main', available: true },
        { name: 'Naan', price: 30, category: 'Sides', available: true },
        { name: 'Lassi', price: 120, category: 'Drinks', available: true }
      ],
      is_active: 1
    },
    {
      oracle_rest_id: 4,
      name: 'Rahat Bakers',
      city_zone: 'Lahore-DHA',
      location: { type: 'Point', coordinates: [74.4138, 31.4754] },
      menu: [
        { name: 'Pastry', price: 180, category: 'Dessert', available: true },
        { name: 'Sandwich', price: 250, category: 'Snack', available: true },
        { name: 'Coffee', price: 200, category: 'Drinks', available: true }
      ],
      is_active: 1
    },
    {
      oracle_rest_id: 5,
      name: 'Monal',
      city_zone: 'Islamabad-F7',
      location: { type: 'Point', coordinates: [73.0552, 33.7270] },
      menu: [
        { name: 'Chicken Karahi', price: 1200, category: 'Main', available: true },
        { name: 'BBQ Platter', price: 1800, category: 'Main', available: true },
        { name: 'Naan', price: 40, category: 'Sides', available: true }
      ],
      is_active: 1
    }
  ]);
  
  await restaurants.createIndex({ location: '2dsphere' });
  console.log('Inserted Restaurants and created 2dsphere index');

  const riders = db.collection('riderlocations');
  await riders.deleteMany({});
  await riders.insertMany([
    {
      oracle_rider_id: 4,
      status: 'AVAILABLE',
      location: { type: 'Point', coordinates: [71.8250, 32.5980] }, // Near Mianwali-Central
      last_updated: new Date()
    },
    {
      oracle_rider_id: 5,
      status: 'AVAILABLE',
      location: { type: 'Point', coordinates: [71.8200, 32.5950] },
      last_updated: new Date()
    }
  ]);
  await riders.createIndex({ location: '2dsphere' });
  console.log('Inserted Riders and created 2dsphere index');
  
  // Create chats and notifications collections
  await db.createCollection('chats');
  const chats = db.collection('chats');
  await chats.createIndex({ order_id: 1 });
  
  await db.createCollection('notifications');
  const notifications = db.collection('notifications');
  await notifications.createIndex({ user_id: 1, is_read: 1 });

  await db.createCollection('reviews');
  const reviews = db.collection('reviews');
  await reviews.createIndex({ restaurant_id: 1 });

  console.log('Created new collections for chats, notifications, and reviews');
  process.exit(0);
}

initMongo().catch(console.error);
