// server/routes/admin.js
// จัดการ Station, Announcements, Settings และ Users (Admin Panel API)
const express = require('express');
const router = express.Router();
const { sqDb } = require('../config/db');
const { verifyAdminPassword } = require('../middleware/adminAuth');

// ตรวจสอบสิทธิ์ Admin ผ่าน password ใน header หรือ body
// หมายเหตุ: หน้า Admin สามารถส่งรหัส QUEUE_ADMIN_PASSWORD มายืนยันได้

// ── GET /api/admin/stations ─────────────────────────────────────────────────
router.get('/stations', async (req, res) => {
  try {
    const stations = await sqDb('sq_stations').orderBy('sort_order', 'asc');
    res.json({ stations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/stations ────────────────────────────────────────────────
router.post('/stations', verifyAdminPassword, async (req, res) => {
  const { id, name, depcodes, layout, slots, time_per_queue, dep_station, work_start, is_active, sort_order } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'ต้องระบุ id และ name ของจุดบริการ' });
  }

  try {
    await sqDb('sq_stations').insert({
      id,
      name,
      depcodes: depcodes || '',
      layout: layout || 'default',
      slots: slots || 1,
      time_per_queue: time_per_queue || 10,
      dep_station: dep_station || 1,
      work_start: work_start || '08:00:00',
      is_active: is_active !== undefined ? is_active : true,
      sort_order: sort_order || 0
    });
    res.json({ success: true, message: 'สร้างจุดบริการสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/stations/:id ─────────────────────────────────────────────
router.put('/stations/:id', verifyAdminPassword, async (req, res) => {
  const { name, depcodes, layout, slots, time_per_queue, dep_station, work_start, is_active, sort_order } = req.body;
  try {
    await sqDb('sq_stations').where('id', req.params.id).update({
      name,
      depcodes,
      layout,
      slots,
      time_per_queue,
      dep_station,
      work_start,
      is_active,
      sort_order
    });
    res.json({ success: true, message: 'อัปเดตจุดบริการสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/stations/:id ──────────────────────────────────────────
router.delete('/stations/:id', verifyAdminPassword, async (req, res) => {
  try {
    await sqDb('sq_stations').where('id', req.params.id).del();
    res.json({ success: true, message: 'ลบจุดบริการสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Announcements CRUD ──────────────────────────────────────────────────────
router.post('/announcements', verifyAdminPassword, async (req, res) => {
  const { content, priority, is_active } = req.body;
  if (!content) return res.status(400).json({ error: 'ต้องระบุข้อความ' });
  try {
    await sqDb('sq_announcements').insert({
      content,
      priority: priority || 0,
      is_active: is_active !== undefined ? is_active : true
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/announcements/:id', verifyAdminPassword, async (req, res) => {
  try {
    await sqDb('sq_announcements').where('id', req.params.id).del();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Settings CRUD ───────────────────────────────────────────────────────────
router.put('/settings', verifyAdminPassword, async (req, res) => {
  const { settings } = req.body; // { key_name: value }
  if (!settings) return res.status(400).json({ error: 'ไม่พบข้อมูลการตั้งค่า' });

  try {
    for (const [key, val] of Object.entries(settings)) {
      await sqDb('sq_settings')
        .insert({ key_name: key, value: String(val) })
        .onConflict('key_name')
        .merge();
    }
    res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
