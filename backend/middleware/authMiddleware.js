// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const hasRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (requiredRoles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
};

const hasAuthority = (requiredAuthority) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (req.user.authority === requiredAuthority || req.user.authority === 'read-write') {
      return next();
    }
    
    return res.status(403).json({ message: 'Insufficient authority' });
  };
};

const hasPlan = (requiredPlans) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (requiredPlans.includes(req.user.plan)) {
      return next();
    }
    
    return res.status(403).json({ message: 'Plan upgrade required' });
  };
};

module.exports = {
  authenticate,
  hasRole,
  hasAuthority,
  hasPlan
};