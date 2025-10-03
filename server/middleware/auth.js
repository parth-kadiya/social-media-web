const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ','');
  if (!token) return res.status(401).json({ message: 'Auth token missing' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
