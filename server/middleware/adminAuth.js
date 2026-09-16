// server/middleware/adminAuth.js
// ตรวจสอบรหัส Admin จาก sys_var.QUEUE_ADMIN_PASSWORD ของ HOSxP
const { hosxpDb } = require('../config/db');

async function verifyAdminPassword(req, res, next) {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'กรุณากรอกรหัสผ่าน' });
  }

  try {
    // ดึงจาก HOSxP sys_var (คอลัมน์คือ sys_name, sys_value)
    const row = await hosxpDb('sys_var')
      .where('sys_name', 'QUEUE_ADMIN_PASSWORD')
      .first();

    if (!row) {
      // ถ้าไม่มีใน sys_var ให้ใช้ fallback จาก .env (สำหรับ dev)
      const devPass = process.env.ADMIN_PASSWORD_FALLBACK;
      if (devPass && password === devPass) {
        return next();
      }
      return res.status(500).json({ error: 'ไม่พบ QUEUE_ADMIN_PASSWORD ใน sys_var' });
    }

    if (password !== row.sys_value) {
      return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }

    next();
  } catch (err) {
    console.error('[adminAuth] Error:', err.message);
    // ถ้า HOSxP DB ไม่พร้อม ให้ fallback
    const devPass = process.env.ADMIN_PASSWORD_FALLBACK;
    if (devPass && password === devPass) {
      console.warn('[adminAuth] Using fallback admin password (HOSxP DB unavailable)');
      return next();
    }
    res.status(503).json({ error: 'ไม่สามารถตรวจสอบรหัสได้ (HOSxP DB)' });
  }
}

module.exports = { verifyAdminPassword };
