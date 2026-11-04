import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';

export async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mediavault_super_secure_jwt_secret_key_2026_dev_prod');

    // Fetch user from DB to verify active status
    const userRes = await query('SELECT id, email, username, role, is_active FROM users WHERE id = $1', [decoded.id]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact an administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mediavault_super_secure_jwt_secret_key_2026_dev_prod');
      const userRes = await query('SELECT id, email, username, role, is_active FROM users WHERE id = $1', [decoded.id]);
      if (userRes.rows.length > 0 && userRes.rows[0].is_active) {
        req.user = userRes.rows[0];
      }
    }
  } catch (err) {
    // Ignore invalid optional tokens
  }
  next();
}

