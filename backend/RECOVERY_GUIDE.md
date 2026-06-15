
# QuickBite System Recovery Guide

## Issue Summary
The synchronization system failed, causing data loss in MongoDB and preventing new orders from appearing in the restaurant portal.

## Root Cause Analysis
1. **Outbox sync job only handled ORDER_STATUS_CHANGED events**: New ORDER_PLACED events weren't being synced to MongoDB
2. **No comprehensive data recovery mechanism**: No way to sync historical data from Oracle to MongoDB
3. **Consistency checks were limited**: Only checked recent orders and didn't auto-recover missing data
4. **Sync interval was too long (30 seconds)**: Could cause delays in order visibility

## Steps Taken to Resolve

### 1. Created System State Check Script (`scripts/check-system-state.js`)
- Verifies Oracle and MongoDB connections
- Counts records in key tables/collections
- Checks Namal Cafe data specifically
- Shows pending outbox events

### 2. Created Comprehensive Data Recovery Script (`scripts/recover-data.js`)
- Syncs all restaurants from Oracle to MongoDB
- Syncs all riders from Oracle to MongoDB
- Syncs all orders (including order items) from Oracle to MongoDB
- Clears pending outbox events after recovery

### 3. Enhanced Outbox Sync Job (`jobs/outboxSync.js`)
- Added support for ORDER_PLACED events
- Syncs full order details from Oracle for every event
- Emits socket events for both new orders and status updates
- Reduced sync interval from 30s to 10s

### 4. Enhanced Monitoring & Consistency Checks (`utils/monitoring.js`)
- Now checks and recovers all restaurants
- Now checks and recovers all riders
- Now checks and recovers all orders (not just recent ones)
- Auto-fixes status mismatches
- Logs all activities for auditing

### 5. Created Test Order Script (`scripts/test-create-order.js`)
- Creates a test order in Oracle
- Adds order items, payment record, and outbox event
- Verifies the full flow works

## How to Use the Recovery Tools

### 1. Check System State
```bash
cd backend
node scripts/check-system-state.js
```

### 2. Run Full Data Recovery
```bash
cd backend
node scripts/recover-data.js
```

### 3. Create a Test Order
```bash
cd backend
node scripts/test-create-order.js
```

## Preventive Measures Implemented
1. **Enhanced sync job**: Handles both ORDER_PLACED and ORDER_STATUS_CHANGED
2. **Faster sync interval**: 10 seconds instead of 30
3. **Comprehensive consistency checks**: Runs every 15 minutes and auto-recovers data
4. **Detailed logging**: All sync and recovery activities are logged
5. **Error monitoring**: Critical errors trigger alerts

## Verification Steps
1. Run `check-system-state.js` to verify all data is present
2. Start the backend server: `npm start`
3. Run `test-create-order.js` to create a test order
4. Verify the order appears in the restaurant portal within 10 seconds
5. Check the server logs to confirm the sync job processed the order

## Files Modified/Added
- Modified: `backend/jobs/outboxSync.js`
- Modified: `backend/utils/monitoring.js`
- Added: `backend/scripts/check-system-state.js`
- Added: `backend/scripts/recover-data.js`
- Added: `backend/scripts/test-create-order.js`
- Added: `backend/RECOVERY_GUIDE.md`
