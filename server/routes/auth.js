// server/routes/auth.js
// Login / Token สำหรับ Caller App + Admin verify
const express = require('express');
const jwt = require('jsonwebtoken');
const { sqDb } = require('../config/db');
const { verifyAdminPassword } = require('../middleware/adminAuth');
const router = express.Router();

// ── POST /api/auth/login ─────────────────────────────────────────────────
// Login ด้วย username/password ของ sq_users → ได้ JWT token
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอก username และ password' });
  }

  try {
    const user = await sqDb('sq_users')
      .where({ username, is_active: true })
      .first();

    if (!user) {
      return res.status(401).json({ error: 'ไม่พบผู้ใช้งาน' });
    }

    // TODO: เปลี่ยนเป็น bcrypt.compare เมื่อ production
    // ตอนนี้ใช้ plain text เพื่อ dev ง่าย
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }

    // อัปเดต last_login
    await sqDb('sq_users').where('id', user.id).update({ last_login: sqDb.fn.now() });

    // ออก JWT token
    const token = jwt.sign(
      {
        id:       user.id,
        username: user.username,
        name:     user.display_name,
        role:     user.role,
        station:  user.default_station,
      },
      process.env.JWT_SECRET,
      { expiresIn: `${process.env.SESSION_EXPIRE_HOURS || 8}h` }
    );

    res.json({
      token,
      user: {
        username:       user.username,
        displayName:    user.display_name,
        role:           user.role,
        defaultStation: user.default_station,
      }
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ── POST /api/auth/verify-admin ──────────────────────────────────────────
// ตรวจรหัส Admin จาก QUEUE_ADMIN_PASSWORD ใน sys_var
// ใช้สำหรับ: เข้าหน้า Setup ของ Caller App + Admin Panel
router.post('/verify-admin', verifyAdminPassword, (req, res) => {
  res.json({ valid: true, message: 'รหัสถูกต้อง' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
// ตรวจสอบ token ปัจจุบัน
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'ไม่มี token' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'token หมดอายุ' });
    res.json({ user });
  });
});

module.exports = router;
