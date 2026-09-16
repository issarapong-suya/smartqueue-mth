// server/middleware/auth.js
// JWT verify middleware สำหรับ Caller App
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'ไม่มี token กรุณาเข้าสู่ระบบ' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'token ไม่ถูกต้องหรือหมดอายุ' });
    }
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };
