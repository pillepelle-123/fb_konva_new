const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    // Sicherstellen, dass id immer Integer ist (verhindert integer=text Fehler in DB-Abfragen)
    req.user = {
      ...user,
      id: typeof user.id === 'number' ? user.id : parseInt(user.id, 10)
    };
    next();
  });
};

module.exports = { authenticateToken };