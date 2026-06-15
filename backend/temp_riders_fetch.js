const axios = require('axios');
async function run() {
  try {
    const res = await axios.get('http://localhost:5000/restaurant/riders', {
      headers: { 'x-user-id': '6', 'x-restaurant-id': '1' }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
