const { execSync } = require('child_process');
const path = require('path');

function runCommand(cmd, cwd) {
  try {
    console.log(`Running: ${cmd}`);
    execSync(cmd, { stdio: 'inherit', cwd });
  } catch (err) {
    console.error(`Error running ${cmd}: ${err.message}`);
  }
}

async function init() {
  const rootDir = path.resolve(__dirname, '../../');
  
  // 1. Oracle Init
  console.log('--- Initializing Oracle ---');
  // Assume running as administrator or oracle user
  runCommand('sqlplus / as sysdba @System_Admin.sql', rootDir);
  runCommand('sqlplus quickbite/QB_Pass_2026 @QuickBite_Dev.sql', rootDir);

  // 2. Mongo Init
  console.log('--- Initializing MongoDB ---');
  // Initiate replica set
  runCommand('mongosh --eval "rs.initiate({_id: \'rs0\', members: [{_id: 0, host: \'localhost:27017\'}, {_id: 1, host: \'localhost:27018\'}, {_id: 2, host: \'localhost:27019\'}]})"', rootDir);
  
  // Wait for replica set to elect primary
  console.log('Waiting for MongoDB Replica Set to initialize...');
  await new Promise(r => setTimeout(r, 5000));
  
  // Setup Mongo Users & Data (simplified for demo)
  const mongoScript = `
    use quickbite;
    db.createCollection("restaurants");
    db.restaurants.createIndex({ location: "2dsphere" });
    db.createCollection("riderlocations");
    db.riderlocations.createIndex({ location: "2dsphere" });
    
    db.restaurants.insertOne({
      oracle_rest_id: 1,
      name: "Namal Cafe",
      city_zone: "Mianwali-Central",
      location: { type: "Point", coordinates: [71.8234, 32.5967] },
      menu: [{ item_name: "Biryani", price: 350, is_available: true }]
    });
  `;
  runCommand(`mongosh "mongodb://localhost:27017/quickbite?replicaSet=rs0" --eval '${mongoScript}'`, rootDir);
  
  console.log('Initialization Complete.');
}

init();
