// server/config/db.js
// Connection pool สำหรับทั้ง 2 ฐานข้อมูล
require('dotenv').config();
const knex = require('knex');

// ── SmartQueue DB (ตาราง sq_*) ──────────────────────────────────────────
const sqDb = knex({
  client: 'mysql2',
  connection: {
    host:     process.env.SQ_DB_HOST     || '127.0.0.1',
    port:     parseInt(process.env.SQ_DB_PORT || '3306'),
    database: process.env.SQ_DB_NAME     || 'smartqueue',
    user:     process.env.SQ_DB_USER     || 'root',
    password: process.env.SQ_DB_PASS     || '',
    charset:  'utf8mb4',
  },
  pool: {
    min: 2,
    max: 10,
    afterCreate: (conn, done) => {
      conn.query("SET NAMES utf8mb4", err => done(err, conn));
    }
  },
  debug: false,
});

// ── HOSxP DB (maetha) — SELECT + UPDATE บางตาราง ───────────────────────
const hosxpDb = knex({
  client: 'mysql2',
  connection: {
    host:     process.env.HOSXP_DB_HOST || '192.168.100.3',
    port:     parseInt(process.env.HOSXP_DB_PORT || '3306'),
    database: process.env.HOSXP_DB_NAME || 'maetha',
    user:     process.env.HOSXP_DB_USER || '',
    password: process.env.HOSXP_DB_PASS || '',
    charset:  'utf8',
    connectTimeout: 10000,
  },
  pool: {
    min: 0,
    max: 10,
    afterCreate: (conn, done) => {
      conn.query("SET NAMES utf8", err => done(err, conn));
    }
  },
  debug: false,
});

// ── Test connections ────────────────────────────────────────────────────
async function testConnections() {
  // Test SmartQueue DB
  try {
    await sqDb.raw('SELECT 1');
    console.log('[DB] ✅ SmartQueue DB connected:', process.env.SQ_DB_NAME);
  } catch (err) {
    console.error('[DB] ❌ SmartQueue DB failed:', err.message);
  }

  // Test HOSxP DB (optional — อาจไม่ได้เชื่อมตอนพัฒนา)
  if (process.env.HOSXP_DB_USER) {
    try {
      await hosxpDb.raw('SELECT 1');
      console.log('[DB] ✅ HOSxP DB connected:', process.env.HOSXP_DB_NAME);
    } catch (err) {
      console.warn('[DB] ⚠️  HOSxP DB not available (ระบบยังทำงานได้ แต่ไม่มีข้อมูลผู้ป่วย):', err.message);
    }
  } else {
    console.warn('[DB] ⚠️  HOSxP DB: ยังไม่ได้ตั้งค่า HOSXP_DB_USER ใน .env');
  }
}

module.exports = { sqDb, hosxpDb, testConnections };
