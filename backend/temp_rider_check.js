const { getConnection } = require('./db/oracle');
const { mongoose, connectMongo } = require('./db/mongo');
async function run() {
  const c = await getConnection();
  const r = await c.execute(`SELECT user_id, role, full_name FROM USERS WHERE role = 'RIDER'`);
  console.log('Oracle Riders:', r.rows);
  await c.close();
  
  await connectMongo();
  const db = mongoose.connection.db;
  const locs = await db.collection('riderlocations').find({}).toArray();
  console.log('Mongo Riders:', locs);
  process.exit(0);
}
run();
