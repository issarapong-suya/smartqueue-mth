// server/init-db.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initDb() {
  const host = process.env.SQ_DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.SQ_DB_PORT || '3306');
  const user = process.env.SQ_DB_USER || 'root';
  const password = process.env.SQ_DB_PASS || '';

  console.log(`[Init DB] Connecting to MySQL at ${host}:${port} as user '${user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });
    console.log('[Init DB] Connected to MySQL successfully.');
  } catch (err) {
    console.error('[Init DB] Connection failed:', err.message);
    process.exit(1);
  }

  try {
    const sqlPath = path.join(__dirname, '../sql/smartqueue_init.sql');
    console.log(`[Init DB] Reading SQL script from: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('[Init DB] Executing smartqueue_init.sql...');
    await connection.query(sql);

    console.log('✅ [Init DB] Successfully initialized `smartqueue` database and tables!');
  } catch (err) {
    console.error('[Init DB] Error executing SQL script:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDb();
