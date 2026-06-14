const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../db/oracle');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT user_id, full_name, email, password_hash, role FROM USERS WHERE email = :email`,
      [email],
      { outFormat: 4002 }
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.USER_ID, role: user.ROLE }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.USER_ID, name: user.FULL_NAME, email: user.EMAIL, role: user.ROLE } });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

router.post('/register', async (req, res) => {
  const { full_name, email, password, role, phone } = req.body;
  let conn;
  try {
    conn = await getConnection();
    
    // Check if user already exists
    const existing = await conn.execute(
      `SELECT user_id FROM USERS WHERE email = :email`,
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await conn.execute(
      `INSERT INTO USERS (full_name, email, password_hash, role, phone) 
       VALUES (:full_name, :email, :password_hash, :role, :phone) 
       RETURNING user_id INTO :user_id`,
      { 
        full_name, 
        email, 
        password_hash, 
        role: role || 'CUSTOMER', 
        phone: phone || null,
        user_id: { type: require('oracledb').NUMBER, dir: require('oracledb').BIND_OUT }
      },
      { autoCommit: true }
    );

    const userId = result.outBinds[0][0];
    
    // If registering as restaurant, create a restaurant entry
    if (role === 'RESTAURANT') {
      await conn.execute(
        `INSERT INTO RESTAURANTS (owner_id, name, city_zone, is_active) 
         VALUES (:user_id, :name, 'Mianwali-Central', 1)`,
        { user_id: userId, name: full_name + "'s Restaurant" },
        { autoCommit: true }
      );
    }

    res.json({ success: true, user_id: userId });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
