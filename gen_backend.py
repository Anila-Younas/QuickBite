import os

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Define file contents
env_content = """ORACLE_USER=quickbite
ORACLE_PASSWORD=QB_Pass_2026
ORACLE_CONNECTSTRING=localhost:1521/XEPDB1
MONGO_URI=mongodb://localhost:27017,localhost:27018,localhost:27019/quickbite?replicaSet=rs0
JWT_SECRET=supersecret123
PORT=5000
SYNC_INTERVAL_MS=30000
"""

oracle_js_content = """const oracledb = require('oracledb');
require('dotenv').config();

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

async function getConnection() {
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTSTRING
  });
}

module.exports = { getConnection };
"""

mongo_js_content = """const mongoose = require('mongoose');
require('dotenv').config();

async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

module.exports = { connectMongo, mongoose };
"""

# Base structures
create_file('backend/.env', env_content)
create_file('backend/.env.example', env_content)
create_file('backend/db/oracle.js', oracle_js_content)
create_file('backend/db/mongo.js', mongo_js_content)

print("Generated backend configs and DB connections.")
