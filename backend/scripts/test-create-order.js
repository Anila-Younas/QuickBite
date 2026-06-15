
require('dotenv').config();
const { getConnection } = require('../db/oracle');

async function testCreateOrder() {
  console.log('=== Test Order Creation ===\n');
  let conn;
  
  try {
    conn = await getConnection();
    console.log('✓ Connected to Oracle\n');

    // Step 1: Create a test order
    console.log('Step 1: Creating test order...');
    const orderSql = `INSERT INTO ORDERS (customer_id, restaurant_id, status, total_amount, delivery_address) 
                      VALUES (:1, :2, 'PLACED', :3, '123 Test Street, Test City') 
                      RETURNING order_id INTO :4`;
    
    const orderResult = await conn.execute(
      orderSql,
      [2, 1, 350, { type: require('oracledb').NUMBER, dir: require('oracledb').BIND_OUT }],
      { autoCommit: false }
    );
    const orderId = orderResult.outBinds[0][0];
    console.log(`✓ Created order #${orderId}\n`);

    // Step 2: Add order items
    console.log('Step 2: Adding order items...');
    await conn.execute(
      `INSERT INTO ORDER_ITEMS (order_id, item_name, quantity, price) VALUES (:1, :2, :3, :4)`,
      [orderId, 'Biryani', 1, 350],
      { autoCommit: false }
    );
    console.log('✓ Added order items\n');

    // Step 3: Add payment record
    console.log('Step 3: Adding payment record...');
    await conn.execute(
      `INSERT INTO PAYMENTS (order_id, amount, payment_method, status) VALUES (:1, :2, 'CASH', 'PENDING')`,
      [orderId, 350],
      { autoCommit: false }
    );
    console.log('✓ Added payment record\n');

    // Step 4: Add outbox event
    console.log('Step 4: Adding outbox event...');
    await conn.execute(
      `INSERT INTO OUTBOX_EVENTS (aggregate_type, aggregate_id, event_type, payload, is_dispatched) 
       VALUES ('ORDER', :1, 'ORDER_PLACED', :2, 0)`,
      [orderId, JSON.stringify({ order_id: orderId, status: 'PLACED', total: 350 })],
      { autoCommit: false }
    );
    console.log('✓ Added outbox event\n');

    // Commit everything
    await conn.commit();
    console.log('✓ Transaction committed\n');

    console.log('=== Test Complete ===');
    console.log(`Order #${orderId} created successfully!`);
    console.log('Check the restaurant portal to verify it appears!');

  } catch (err) {
    if (conn) await conn.rollback();
    console.error('❌ Error creating test order:', err);
    throw err;
  } finally {
    if (conn) await conn.close();
  }
}

testCreateOrder();
