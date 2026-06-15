
require('dotenv').config();
const { getConnection } = require('./db/oracle');
const { connectMongo } = require('./db/mongo');

async function checkTestRestaurant() {
  let conn;
  try {
    console.log('Connecting to Oracle...');
    conn = await getConnection();
    console.log('Checking Oracle for "test" restaurant...');
    const oracleResult = await conn.execute(`
      SELECT r.*, u.full_name as owner_name 
      FROM RESTAURANTS r 
      JOIN USERS u ON r.owner_id = u.user_id 
      WHERE LOWER(r.name) LIKE '%test%'
    `);
    console.log('Oracle result:', oracleResult.rows);

    console.log('\nConnecting to MongoDB...');
    await connectMongo();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    console.log('Checking MongoDB for "test" restaurant...');
    const mongoResult = await db.collection('restaurants').find({ name: { $regex: /test/i } }).toArray();
    console.log('MongoDB result:', mongoResult);
  } catch (err) {
    console.error('Error checking test restaurant:', err);
  } finally {
    if (conn) await conn.close();
    const mongoose = require('mongoose');
    mongoose.connection.close();
  }
}

checkTestRestaurant();
