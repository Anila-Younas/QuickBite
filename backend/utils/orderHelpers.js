
const { mongoose } = require('../db/mongo');

// 1. Helper to update order status in Oracle, write to OUTBOX, update MongoDB, and emit socket event!
// Returns true on success, false on error
async function updateOrderStatus(
  orderId,
  newStatus,
  oracleConn,
  io,
  { restaurantId = null, riderId = null, metadata = {} } = {}
) {
  try {
    // Step 0: Try to get version, if it fails (migration not run yet) fall back to old behavior
    let checkResult;
    let hasVersionColumn = false;
    let currentVersion = null;
    
    try {
      checkResult = await oracleConn.execute(`SELECT status, rider_id, version FROM ORDERS WHERE order_id = :1`, [orderId]);
      hasVersionColumn = true;
      currentVersion = checkResult.rows[0].VERSION;
    } catch (err) {
      // If version column doesn't exist, fall back to old query
      console.log('[OrderHelper] Version column not found yet, falling back to old behavior');
      checkResult = await oracleConn.execute(`SELECT status, rider_id FROM ORDERS WHERE order_id = :1`, [orderId]);
      hasVersionColumn = false;
    }
    
    if (checkResult.rows.length === 0) throw new Error('Order not found');
    
    const currentStatus = checkResult.rows[0].STATUS;
    const currentRiderId = checkResult.rows[0].RIDER_ID;
    
    if (hasVersionColumn) {
      console.log(`[OrderHelper] Checking transition from ${currentStatus} to ${newStatus} for order ${orderId}, rider ${riderId} (current rider: ${currentRiderId}), version ${currentVersion}`);
    } else {
      console.log(`[OrderHelper] Checking transition from ${currentStatus} to ${newStatus} for order ${orderId}, rider ${riderId} (current rider: ${currentRiderId})`);
    }
    
    if (!isValidTransition(currentStatus, newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    // Step 0.5: Check if NO changes are needed—if yes, return success immediately!
    const statusSame = currentStatus === newStatus;
    const riderSame = (riderId === undefined || riderId === null) || (currentRiderId === riderId);
    if (statusSame && riderSame) {
      console.log(`[OrderHelper] Order ${orderId} already in state ${newStatus} with rider ${riderId}—no update needed!`);
      return { success: true, newStatus, noop: true };
    }

    // Step 1: Update Oracle (order status, and optional rider_id)
    let updateResult;
    if (hasVersionColumn) {
      const updateFields = [];
      const bindParams = [newStatus];

      if (riderId !== undefined && riderId !== null) {
        updateFields.push(`rider_id = :rider_id`);
        bindParams.push(riderId);
      }
      
      bindParams.push(orderId, currentVersion);

      const updateSQL = `
        UPDATE ORDERS 
        SET status = :status${updateFields.length ? ', ' + updateFields.join(', ') : ''} 
        WHERE order_id = :order_id AND version = :version
      `;
      // Let's use object binds so we don't have to worry about position!
      const bindObj = {
          status: newStatus,
          order_id: orderId,
          version: currentVersion
      };
      if (riderId !== undefined && riderId !== null) {
          bindObj.rider_id = riderId;
      }
      
      updateResult = await oracleConn.execute(updateSQL, bindObj, { autoCommit: true });
      console.log(`[OrderHelper] Oracle update result (with optimistic lock): ${updateResult.rowsAffected} row(s) affected`);
      
      if (updateResult.rowsAffected === 0) {
        throw new Error('No rows updated - order might have been modified by another user');
      }
    } else {
      const updateFields = [];

      const bindObj = {
          status: newStatus,
          order_id: orderId
      };

      if (riderId !== undefined && riderId !== null) {
        updateFields.push(`rider_id = :rider_id`);
        bindObj.rider_id = riderId;
      }

      const updateSQL = `
        UPDATE ORDERS 
        SET status = :status${updateFields.length ? ', ' + updateFields.join(', ') : ''} 
        WHERE order_id = :order_id
      `;
      updateResult = await oracleConn.execute(updateSQL, bindObj, { autoCommit: true });
      console.log(`[OrderHelper] Oracle update result (without optimistic lock): ${updateResult.rowsAffected} row(s) affected`);
    }

    // Step 2: Write Outbox Event for sync
    const payload = JSON.stringify({
      order_id: orderId,
      new_status: newStatus,
      rider_id: riderId,
      ...metadata
    });
    await oracleConn.execute(
      `INSERT INTO OUTBOX_EVENTS (aggregate_type, aggregate_id, event_type, payload, is_dispatched) 
       VALUES ('ORDER', :1, 'ORDER_STATUS_CHANGED', :2, 0)`,
      [orderId, payload],
      { autoCommit: true }
    );

    // Step 3: Update MongoDB (order status, optional rider_id, and delivered_at if needed)
    const db = mongoose.connection.db;
    const updateMongo = { status: newStatus };
    if (riderId !== undefined && riderId !== null) {
      updateMongo.rider_id = riderId;
    }
    // Add delivered_at UTC timestamp when status is DELIVERED
    if (newStatus === 'DELIVERED') {
      updateMongo.delivered_at = new Date().toUTCString();
    }
    await db.collection('orders').updateOne(
      { order_id: parseInt(orderId) },
      { $set: updateMongo },
      { upsert: true }
    );

    // Step 4: Emit real-time socket event immediately
    if (io) {
      io.to(`order_${orderId}`).emit('order_update', {
        order_id: orderId,
        new_status: newStatus,
        rider_id: riderId
      });
      if (restaurantId) {
        io.to(`restaurant_${restaurantId}`).emit('order_update', {
          order_id: orderId,
          new_status: newStatus
        });
      }
      console.log(`[OrderHelper] Emitted order_update for order ${orderId} → ${newStatus}`);
    }

    return { success: true, newStatus };
  } catch (err) {
    console.error(`[OrderHelper] Error updating order ${orderId}:`, err);
    throw err;
  }
}

// 2. Valid order status transitions (finite state machine)
const validTransitions = {
  'PLACED': ['CONFIRMED', 'CANCELLED'],
  'CONFIRMED': ['PREPARING', 'CANCELLED'],
  'PREPARING': ['PACKED', 'CANCELLED'],
  'PACKED': ['WAITING_FOR_PICKUP', 'WAITING_CONFIRM', 'CANCELLED'],
  'WAITING_FOR_PICKUP': ['WAITING_CONFIRM', 'PICKED_UP', 'CANCELLED'],
  'WAITING_CONFIRM': ['WAITING_FOR_PICKUP', 'PICKED_UP', 'CANCELLED'],
  'PICKED_UP': ['DELIVERED'],
  'DELIVERED': [],
  'CANCELLED': []
};

// Check if status transition is allowed
function isValidTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true; // No change is allowed
  const allowed = validTransitions[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

module.exports = { updateOrderStatus, isValidTransition, validTransitions };
