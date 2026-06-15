const express = require('express');
const { getConnection } = require('../db/oracle');
const { mongoose } = require('../db/mongo');
const { updateOrderStatus, isValidTransition } = require('../utils/orderHelpers');
const router = express.Router();

const getUserId = (req) => req.headers['x-user-id'] || 6; 
const getRestaurantId = (req) => req.headers['x-restaurant-id'] || 1; 

// Retry wrapper function
async function withRetry(fn, maxRetries = 2, delayMs = 300) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err.message.includes('No rows updated') && i < maxRetries) {
        console.log(`[Retry] Attempt ${i + 1} failed, retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

// Dashboard Stats
router.get('/dashboard', async (req, res) => {
  const restId = getRestaurantId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT 
        COUNT(*) as total_orders,
        NVL(SUM(total_amount), 0) as revenue_today,
        COUNT(CASE WHEN status IN ('PLACED', 'CONFIRMED', 'PREPARING', 'PACKED', 'WAITING_FOR_PICKUP', 'PICKED_UP') THEN 1 END) as active_orders,
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_orders
      FROM ORDERS WHERE restaurant_id = :1 AND TRUNC(created_at) = TRUNC(SYSDATE)
    `, [restId]);

    const weekly = await conn.execute(`
      SELECT NVL(SUM(total_amount), 0) as revenue_week
      FROM ORDERS WHERE restaurant_id = :1 AND created_at >= TRUNC(SYSDATE) - 7
    `, [restId]);

    const monthly = await conn.execute(`
      SELECT NVL(SUM(total_amount), 0) as revenue_month
      FROM ORDERS WHERE restaurant_id = :1 AND created_at >= TRUNC(SYSDATE) - 30
    `, [restId]);

    const db = mongoose.connection.db;
    const rest = await db.collection('restaurants').findOne({ oracle_restaurant_id: parseInt(restId) });
    
    res.json({
      ...result.rows[0],
      REVENUE_WEEK: weekly.rows[0].REVENUE_WEEK,
      REVENUE_MONTH: monthly.rows[0].REVENUE_MONTH,
      avg_rating: rest?.avg_rating || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Live Orders
router.get('/orders', async (req, res) => {
  const restId = getRestaurantId(req);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`
      SELECT o.*, u.full_name as customer_name, u.phone
      FROM ORDERS o
      JOIN USERS u ON o.customer_id = u.user_id
      WHERE o.restaurant_id = :1
      ORDER BY o.order_id DESC
    `, [restId]);

    // Attach items for each order
    for (let i=0; i<result.rows.length; i++) {
        const items = await conn.execute(`SELECT * FROM ORDER_ITEMS WHERE order_id = :1`, [result.rows[i].ORDER_ID]);
        result.rows[i].ITEMS = items.rows;
    }

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Update Order Status
router.put('/order/status/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const restId = getRestaurantId(req);
  let conn;
  try {
    conn = await getConnection();
      
    // Check if order exists and belongs to restaurant
    const verifyOrder = await conn.execute(`SELECT status FROM ORDERS WHERE order_id = :1 AND restaurant_id = :2`, [id, restId]);
    if (verifyOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const currentStatus = verifyOrder.rows[0].STATUS;
      
    if (!isValidTransition(currentStatus, status)) {
      return res.status(400).json({ 
        error: `Invalid status transition from ${currentStatus} to ${status}` 
      });
    }

    await withRetry(async () => {
      const io = req.app.get('io');
      await updateOrderStatus(id, status, conn, io, { restaurantId: restId });
    });
      
    res.json({ success: true, status });
  } catch (err) {
    console.error('[Restaurant] Status update error:', err);
    if (err.message.includes('No rows updated')) {
      return res.status(409).json({ 
        error: 'Order was modified by another user. Please refresh the page and try again.' 
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Restaurant marks order as picked up
router.post('/order/:id/picked-up', async (req, res) => {
  const { id } = req.params;
  const restId = getRestaurantId(req);
  console.log(`[Restaurant] /order/${id}/picked-up called, restId: ${restId}`);
  let conn;
  try {
    conn = await getConnection();
      
    // Verify order belongs to this restaurant
    const verifyOrder = await conn.execute(`SELECT status, rider_id FROM ORDERS WHERE order_id = :1 AND restaurant_id = :2`, [id, restId]);
    if (verifyOrder.rows.length === 0) {
      console.log('[Restaurant] Order not found');
      return res.status(404).json({ error: 'Order not found' });
    }
      
    const currentStatus = verifyOrder.rows[0].STATUS;
    const riderId = verifyOrder.rows[0].RIDER_ID;
    console.log('[Restaurant] Order found:', { currentStatus, riderId });
    if (!riderId) {
      console.log('[Restaurant] No rider assigned');
      return res.status(400).json({ error: 'Must assign a rider first' });
    }
    if (['WAITING_FOR_PICKUP', 'PACKED', 'WAITING_CONFIRM'].indexOf(currentStatus) === -1) {
      console.log('[Restaurant] Invalid status');
      return res.status(400).json({ error: 'Order must be waiting for pickup first' });
    }
      
    await withRetry(async () => {
      const io = req.app.get('io');
      console.log('[Restaurant] Calling updateOrderStatus to PICKED_UP');
      await updateOrderStatus(id, 'PICKED_UP', conn, io, { 
        restaurantId: restId, 
        riderId: riderId 
      });
    });
      
    console.log('[Restaurant] /order/:id/picked-up success');
    res.json({ success: true, status: 'PICKED_UP' });
  } catch (err) {
    console.error('[Restaurant] Pick up error:', err);
    if (err.message.includes('No rows updated')) {
      return res.status(409).json({ 
        error: 'Order was modified by another user. Please refresh the page and try again.' 
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Assign Rider
router.post('/order/assign/:id', async (req, res) => {
  const { id } = req.params;
  const { rider_id } = req.body;
  const restId = getRestaurantId(req);
  console.log(`[Restaurant] /order/assign/${id} called, rider_id: ${rider_id}, restId: ${restId}`);
  let conn;
  let riderCheckResult;
  try {
    // Do all the checks first outside of withRetry to avoid sending responses inside retries
    conn = await getConnection();
    
    // First check current status and order exists
    const checkResult = await conn.execute(`SELECT status, rider_id FROM ORDERS WHERE order_id = :1 AND restaurant_id = :2`, [id, restId]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const currentStatus = checkResult.rows[0].STATUS;
    const existingRiderId = checkResult.rows[0].RIDER_ID;

    // If order already has the correct rider and is in WAITING_CONFIRM, return success!
    if (existingRiderId === parseInt(rider_id) && currentStatus === 'WAITING_CONFIRM') {
      console.log('[Restaurant] Order already assigned to this rider');
      riderCheckResult = await conn.execute(`SELECT FULL_NAME FROM USERS WHERE USER_ID = :1`, [rider_id]);
      return res.json({ success: true, rider_name: riderCheckResult.rows[0].FULL_NAME });
    }

    // Check if order is in allowed status for assignment
    const allowedStatuses = ['PACKED', 'WAITING_FOR_PICKUP'];
    if (!allowedStatuses.includes(currentStatus)) {
      return res.status(400).json({ error: `Cannot assign rider to order in status: ${currentStatus}` });
    }

    // Check if rider exists in Oracle and is a RIDER
    riderCheckResult = await conn.execute(`SELECT USER_ID, FULL_NAME, ROLE FROM USERS WHERE USER_ID = :1`, [rider_id]);
    if (riderCheckResult.rows.length === 0 || riderCheckResult.rows[0].ROLE !== 'RIDER') {
      return res.status(400).json({ error: 'Invalid rider selected' });
    }

    // Check rider's availability from MongoDB
    const db = mongoose.connection.db;
    const riderLoc = await db.collection('riderlocations').findOne({ oracle_rider_id: parseInt(rider_id) });
    if (!riderLoc || riderLoc.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'Selected rider is not available' });
    }

    // Check if rider is already assigned to another active order
    const activeOrderCheck = await conn.execute(
      `SELECT ORDER_ID FROM ORDERS WHERE rider_id = :1 AND status IN ('WAITING_CONFIRM', 'WAITING_FOR_PICKUP', 'PICKED_UP')`,
      [rider_id]
    );
    if (activeOrderCheck.rows.length > 0 && activeOrderCheck.rows[0].ORDER_ID !== parseInt(id)) {
      return res.status(400).json({ error: 'Selected rider is already assigned to an active order' });
    }

    // Now do the update with retry!
    await withRetry(async () => {
      // Need to get a fresh connection for each retry?
      // Or just re-run the update part
      const io = req.app.get('io');
      await updateOrderStatus(id, 'WAITING_CONFIRM', conn, io, { restaurantId: restId, riderId: rider_id });
    });
    
    res.json({ success: true, rider_name: riderCheckResult.rows[0].FULL_NAME });
  } catch (err) {
    console.error('[Restaurant] Assign rider error:', err);
    if (err.message.includes('No rows updated')) {
      return res.status(409).json({ 
        error: 'Order was modified by another user. Please refresh the page and try again.' 
      });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Menu Management
router.get('/menu', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  try {
    const db = mongoose.connection.db;
    const rest = await db.collection('restaurants').findOne({ oracle_restaurant_id: restId });
    res.json(rest ? rest.menu : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/menu/item', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  // Map frontend's 'image' to 'image_url'
  const { image, ...itemData } = req.body; 
  const item = { ...itemData, image_url: image || null };
  try {
    const db = mongoose.connection.db;
    await db.collection('restaurants').updateOne(
      { oracle_restaurant_id: restId },
      { $push: { menu: item } },
      { upsert: true }
    );
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/menu/item/:name', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const { name } = req.params;
  const updateFields = {};
  for (let key in req.body) {
    // Map 'image' to 'image_url' for consistency
    if (key === 'image') {
      updateFields['menu.$.image_url'] = req.body[key];
    } else {
      updateFields[`menu.$.${key}`] = req.body[key];
    }
  }
  try {
    const db = mongoose.connection.db;
    await db.collection('restaurants').updateOne(
      { oracle_restaurant_id: restId, "menu.name": name },
      { $set: updateFields }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/menu/item/:name', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const { name } = req.params;
  try {
    const db = mongoose.connection.db;
    await db.collection('restaurants').updateOne(
      { oracle_restaurant_id: restId },
      { $pull: { menu: { name } } }
    );
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Offers
router.get('/offers', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  try {
    const db = mongoose.connection.db;
    const offers = await db.collection('offers').find({ 
      restaurant_id: restId,
      $or: [{ is_deleted: false }, { is_deleted: { $exists: false } }]
    }).toArray();
    res.json(offers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/offers', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const offer = { ...req.body, restaurant_id: restId, is_active: true };
  try {
    const db = mongoose.connection.db;
    await db.collection('offers').insertOne(offer);
    res.json({ success: true, offer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/offers/:id', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    await db.collection('offers').updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: { is_active: req.body.is_active } }
    );
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Offer deletion (soft delete with audit)
router.delete('/offers/:id', async (req, res) => {
  try {
    const restId = parseInt(getRestaurantId(req));
    const db = mongoose.connection.db;
    
    // Verify the offer belongs to this restaurant
    const offer = await db.collection('offers').findOne({ 
      _id: new mongoose.Types.ObjectId(req.params.id),
      restaurant_id: restId
    });
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found or unauthorized' });
    }

    // Soft delete
    await db.collection('offers').updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { 
        $set: { 
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: parseInt(getUserId(req))
        } 
      }
    );

    // Log audit to error_logs for now (we can use audit_log table too but let's stick to existing collections)
    await db.collection('error_logs').insertOne({
      severity: 'info',
      message: 'Offer deleted',
      timestamp: new Date(),
      metadata: {
        offer_id: req.params.id,
        restaurant_id: restId,
        user_id: parseInt(getUserId(req))
      }
    });

    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Reviews endpoints
router.get('/reviews', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const { status = 'all', sort_by = 'created_at', sort_order = 'desc', page = 1, limit = 10 } = req.query;
  
  try {
    const db = mongoose.connection.db;
    
    // Build filter
    let filter = { restaurant_id: restId };
    if (status !== 'all') {
      filter.status = status;
    }

    // Sort options
    let sort = {};
    sort[sort_by] = sort_order === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get reviews
    const reviews = await db.collection('reviews')
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Get customer names from Oracle (mask for privacy: show first name + last initial only)
    let conn;
    try {
      conn = await getConnection();
      const userIds = [...new Set(reviews.map(r => r.customer_id))];
      
      if (userIds.length > 0) {
        const userResults = await conn.execute(
          `SELECT user_id, full_name FROM USERS WHERE user_id IN (${userIds.map(() => '?').join(',')})`,
          userIds
        );
        
        const userMap = {};
        userResults.rows.forEach(row => {
          const fullName = row.FULL_NAME;
          const parts = fullName.split(' ');
          const maskedName = parts[0] + (parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '');
          userMap[row.USER_ID] = maskedName;
        });
        
        reviews.forEach(review => {
          review.customer_name = userMap[review.customer_id] || 'Anonymous';
        });
      }
    } finally {
      if (conn) await conn.close();
    }

    // Get total count
    const total = await db.collection('reviews').countDocuments(filter);

    res.json({
      reviews,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(total / parseInt(limit))
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Mark review as read/responded
router.put('/reviews/:id/status', async (req, res) => {
  try {
    const restId = parseInt(getRestaurantId(req));
    const { status } = req.body; // 'read' or 'responded'
    const db = mongoose.connection.db;
    
    await db.collection('reviews').updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id), restaurant_id: restId },
      { $set: { status: status, updated_at: new Date() } }
    );

    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get restaurant by owner ID
router.get('/my-restaurant', async (req, res) => {
  const userId = parseInt(getUserId(req));
  console.log(`[Restaurant] my-restaurant called with user ID: ${userId}`);
  let conn;
  try {
    // First get restaurant from Oracle
    conn = await getConnection();
    const oracleResult = await conn.execute(
      `SELECT restaurant_id, name, city_zone, is_active FROM RESTAURANTS WHERE owner_id = :owner_id`,
      [userId],
      { outFormat: 4002 }
    );
    
    if (oracleResult.rows.length === 0) {
      console.log(`[Restaurant] No restaurant found in Oracle for user ${userId}`);
      return res.status(404).json({ error: 'Restaurant not found for this user' });
    }
    
    const oracleRest = oracleResult.rows[0];
    const restaurantId = oracleRest.RESTAURANT_ID;
    console.log(`[Restaurant] Found Oracle restaurant: ID ${restaurantId}, Name ${oracleRest.NAME}`);
    
    // Then get additional details from MongoDB
    const db = mongoose.connection.db;
    let mongoRest = await db.collection('restaurants').findOne({ oracle_restaurant_id: restaurantId });
    
    // If no MongoDB record exists, create a default one
    if (!mongoRest) {
      console.log(`[Restaurant] No MongoDB record for restaurant ${restaurantId}, creating default...`);
      mongoRest = {
        oracle_restaurant_id: restaurantId,
        name: oracleRest.NAME,
        city_zone: oracleRest.CITY_ZONE || 'Default-Zone',
        is_active: oracleRest.IS_ACTIVE === 1,
        location: {
          type: 'Point',
          coordinates: restaurantId === 1 ? [71.5241, 32.5837] : [71.8100, 32.5900]
        },
        menu: [],
        cuisine: ['Pakistani'],
        avg_rating: 4.5,
        delivery_fee: 50,
        created_at: new Date()
      };
      await db.collection('restaurants').insertOne(mongoRest);
    } else {
      console.log(`[Restaurant] Found MongoDB restaurant: Name ${mongoRest.name}`);
    }
    
    // Combine data
    const restaurant = {
      ...oracleRest,
      ...mongoRest,
      oracle_restaurant_id: restaurantId
    };
    
    console.log(`[Restaurant] Returning restaurant: Name ${restaurant.name}`);
    res.json(restaurant);
  } catch (err) {
    console.error('[Restaurant] Error fetching my restaurant:', err);
    // Log error to MongoDB
    try {
      const db = mongoose.connection.db;
      await db.collection('error_logs').insertOne({
        type: 'REST_MY_RESTAURANT_ERROR',
        user_id: userId,
        error: err.message,
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('[Restaurant] Failed to log error:', logErr);
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Get restaurant profile
router.get('/profile', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  try {
    const db = mongoose.connection.db;
    const rest = await db.collection('restaurants').findOne({ oracle_restaurant_id: restId });
    res.json(rest || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update restaurant profile image
router.put('/profile/image', async (req, res) => {
  const restId = parseInt(getRestaurantId(req));
  const { image_url } = req.body;
  try {
    const db = mongoose.connection.db;
    await db.collection('restaurants').updateOne(
      { oracle_restaurant_id: restId },
      { $set: { image_url: image_url } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Riders: Get all riders
router.get('/riders', async (req, res) => {
  let conn;
  try {
    // Get riders from Oracle
    conn = await getConnection();
    const oracleRiders = await conn.execute(`
      SELECT user_id, full_name, phone, email, created_at
      FROM USERS 
      WHERE role = 'RIDER'
    `);

    // Get rider locations from MongoDB
    const db = mongoose.connection.db;
    const mongoRiders = await db.collection('riderlocations').find({}).toArray();
    const mongoRidersMap = new Map(
      mongoRiders.map(r => [r.oracle_rider_id, r])
    );

    // Combine data
    const riders = oracleRiders.rows.map(oracleRider => {
      const mongoRider = mongoRidersMap.get(oracleRider.USER_ID);
      return {
        ...oracleRider,
        location: mongoRider?.location,
        last_updated: mongoRider?.last_updated,
        status: mongoRider?.status || 'AVAILABLE'
      };
    });

    res.json(riders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Nearby Riders: Get riders within max distance (meters) and with status filter
router.get('/nearby-riders', async (req, res) => {
  const { lat, lng, maxDistance = 5000, status = 'AVAILABLE' } = req.query;
  let conn;
  try {
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    // Get riders from Oracle
    conn = await getConnection();
    const oracleRiders = await conn.execute(`
      SELECT user_id, full_name, phone, email, created_at
      FROM USERS 
      WHERE role = 'RIDER'
    `);

    // Get nearby rider locations from MongoDB using 2dsphere
    const db = mongoose.connection.db;
    const mongoRiders = await db.collection('riderlocations').find({
      status: status,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).toArray();

    const mongoRidersMap = new Map(
      mongoRiders.map(r => [r.oracle_rider_id, r])
    );

    // Helper to calculate distance between two points (Haversine)
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
    }

    // Combine data
    const riders = oracleRiders.rows
      .filter(oracleRider => mongoRidersMap.has(oracleRider.USER_ID))
      .map(oracleRider => {
        const mongoRider = mongoRidersMap.get(oracleRider.USER_ID);
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          mongoRider.location.coordinates[1],
          mongoRider.location.coordinates[0]
        );
        return {
          ...oracleRider,
          location: mongoRider.location,
          last_updated: mongoRider.last_updated,
          status: mongoRider.status,
          distance: distance
        };
      })
      .sort((a, b) => a.distance - b.distance);

    res.json(riders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// Helper function to calculate final item price based on offers
const calculateItemFinalPrice = (item, offers, restaurantId) => {
  let finalPrice = item.price;
  let appliedOffer = null;

  const activeOffers = offers.filter(
    offer => offer.is_active && offer.restaurant_id === restaurantId
  );

  // Handle both new (type/discount_type/value) and old (discount_pct) offers
  let matchingOffer = null;
  
  for (let offer of activeOffers) {
    // Check if it's an old-style offer (discount_pct)
    if (offer.discount_pct !== undefined) {
      matchingOffer = offer;
      finalPrice = item.price * (1 - (offer.discount_pct / 100));
      break;
    }
    
    // Check new-style offers
    let isApplicable = false;
    
    if (offer.type === 'ITEM_SPECIFIC') {
      if (offer.applicable_items?.includes(item.name)) {
        isApplicable = true;
      }
    } else if (offer.type === 'SITE_WIDE' || !offer.type) { // also allow no type (default site-wide)
      isApplicable = true;
    }
    
    if (isApplicable) {
      matchingOffer = offer;
      
      switch (offer.discount_type) {
        case 'PERCENTAGE':
          finalPrice = item.price * (1 - (offer.value / 100));
          break;
        case 'FIXED_AMOUNT':
          finalPrice = Math.max(item.price - offer.value, 0);
          break;
        case 'BOGO':
          // Just keep original price for display (actual logic would be in cart)
          finalPrice = item.price;
          break;
        default:
          // If no discount_type, maybe assume percentage?
          if (offer.value) {
            finalPrice = item.price * (1 - (offer.value / 100));
          }
          break;
      }
      break;
    }
  }

  appliedOffer = matchingOffer;

  return { finalPrice, appliedOffer };
};

module.exports = router;
module.exports.calculateItemFinalPrice = calculateItemFinalPrice;
