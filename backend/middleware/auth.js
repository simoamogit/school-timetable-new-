const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'school_super_secret_2024';

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token mancante' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token mancante' });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token non valido o scaduto' });
  }
};