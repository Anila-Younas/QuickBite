# QuickBite — Polyglot Database Full-Stack Implementation

## Prerequisites
- Oracle XE 21c running locally (port 1521)
- MongoDB 7.x Replica Set running locally (`rs0` on ports 27017, 27018, 27019)
- Node.js 18+ and npm

## Setup Instructions

### 1. Database Initialization
Run the initialization script to bootstrap Oracle and MongoDB schemas, tables, and sample data.
```bash
cd backend
npm run init-db
```
*Note: This executes `System_Admin.sql` (requires `sysdba` privileges) and `QuickBite_Dev.sql`, and initiates the MongoDB replica set `rs0`.*

### 2. Backend Setup
```bash
cd backend
npm install
npm start
```
The backend will run on `http://localhost:5000`. Ensure the `.env` file matches your local setup. The sync job automatically starts and checks the Oracle outbox every 30 seconds.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will start on Vite's default port (usually `http://localhost:5173`).

## Testing the System
1. Go to the frontend URL.
2. Login as `anila@quickbite.pk` (CUSTOMER), `shehr@quickbite.pk` (RIDER), `cafe@quickbite.pk` (RESTAURANT), or ADMIN (to be created manually or simulate).
3. The Admin dashboard contains the **Simulation & Automation Panel**.
4. You can place orders, view them in real-time as a restaurant, accept them as a rider, and view the synchronization between Oracle and MongoDB.
