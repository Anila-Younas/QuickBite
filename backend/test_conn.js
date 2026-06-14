const oracledb = require('oracledb');

async function test(cs) {
  try {
    const conn = await oracledb.getConnection({
      user: 'quickbite',
      password: 'QB_Pass_2026',
      connectString: cs
    });
    console.log(`Success with ${cs}`);
    await conn.close();
  } catch (err) {
    console.log(`Fail with ${cs}: ${err.message}`);
  }
}

async function run() {
  await test('localhost:1521/orcl.docker.internal');
  await test('localhost:1521/orclpdb.docker.internal');
}
run();
