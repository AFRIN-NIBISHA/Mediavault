import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { logActivity, recalculateUserStorage } from '../services/storageService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mediavault_super_secure_jwt_secret_key_2026_dev_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function register(req, res) {
  try {
    const { email, username, password, fullName } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ success: false, message: 'Email, username, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check existing email or username
    const existing = await query(
      'SELECT id, email, username FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase().trim(), username.trim()]
    );
    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      if (match.email.toLowerCase() === email.toLowerCase().trim()) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRes = await query(
      `INSERT INTO users (email, username, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'user', true) RETURNING id, email, username, role, created_at`,
      [email.toLowerCase().trim(), username.trim(), passwordHash]
    );
    console.log('INSERT USER RESULT:', JSON.stringify(userRes));
    const newUser = userRes.rows[0];

    // Create profile
    await query(
      `INSERT INTO user_profiles (user_id, full_name, bio, storage_limit_bytes, theme_preference)
       VALUES ($1, $2, $3, $4, 'light')`,
      [newUser.id, fullName || username, '', 10737418240] // 10 GB
    );

    // Initialize storage usage
    await query(`INSERT INTO storage_usage (user_id) VALUES ($1)`, [newUser.id]);

    // Create default folders
    await query(`INSERT INTO folders (user_id, name, color) VALUES ($1, 'Photos', '#0c87eb')`, [newUser.id]);
    await query(`INSERT INTO folders (user_id, name, color) VALUES ($1, 'Documents', '#10b981')`, [newUser.id]);

    await logActivity(newUser.id, 'register', 'user', newUser.id, { username: newUser.username });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        fullName: fullName || username,
        storageLimit: 10737418240,
        themePreference: 'light'
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
}

export async function login(req, res) {
  try {
    const loginInput = req.body.login || req.body.email || req.body.username;
    const { password } = req.body;
    if (!loginInput || !password) {
      return res.status(400).json({ success: false, message: 'Email/username and password are required.' });
    }

    const userRes = await query(
      `SELECT u.id, u.email, u.username, u.password_hash, u.role, u.is_active,
              p.full_name, p.avatar_url, p.bio, p.storage_limit_bytes, p.theme_preference
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1) OR u.username = $1`,
      [loginInput.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await logActivity(user.id, 'login', 'user', user.id, { username: user.username }, req.ip);

    const liveStorage = await recalculateUserStorage(user.id);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        fullName: user.full_name || user.username,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        storageLimit: user.storage_limit_bytes || 53687091200,
        themePreference: user.theme_preference || 'light',
        profile: {
          fullName: user.full_name || user.username,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          storageLimit: user.storage_limit_bytes || 53687091200,
          themePreference: user.theme_preference || 'light'
        },
        storage: {
          total: liveStorage?.total || 0,
          photos: liveStorage?.photos || 0,
          videos: liveStorage?.videos || 0,
          documents: liveStorage?.documents || 0,
          pdfs: liveStorage?.pdfs || 0,
          archives: liveStorage?.archives || 0,
          audio: liveStorage?.audio || 0,
          other: liveStorage?.other || 0
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
}

export async function getMe(req, res) {
  try {
    // Recalculate up to date storage usage
    const liveStorage = await recalculateUserStorage(req.user.id);

    const userRes = await query(
      `SELECT u.id, u.email, u.username, u.role, u.is_active, u.created_at,
              p.full_name, p.avatar_url, p.bio, p.storage_limit_bytes, p.theme_preference, p.auto_empty_trash_days,
              s.total_bytes, s.photos_bytes, s.videos_bytes, s.documents_bytes, s.pdfs_bytes, s.archives_bytes, s.audio_bytes, s.other_bytes
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN storage_usage s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const row = userRes.rows[0];
    return res.json({
      success: true,
      user: {
        id: row.id,
        email: row.email,
        username: row.username,
        role: row.role,
        createdAt: row.created_at,
        profile: {
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
          bio: row.bio,
          storageLimit: row.storage_limit_bytes || 53687091200,
          themePreference: row.theme_preference,
          autoEmptyTrashDays: row.auto_empty_trash_days
        },
        storage: {
          total: liveStorage?.total ?? (row.total_bytes || 0),
          photos: liveStorage?.photos ?? (row.photos_bytes || 0),
          videos: liveStorage?.videos ?? (row.videos_bytes || 0),
          documents: liveStorage?.documents ?? (row.documents_bytes || 0),
          pdfs: liveStorage?.pdfs ?? (row.pdfs_bytes || 0),
          archives: liveStorage?.archives ?? (row.archives_bytes || 0),
          audio: liveStorage?.audio ?? (row.audio_bytes || 0),
          other: liveStorage?.other ?? (row.other_bytes || 0)
        }
      }
    });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
}

export async function updateProfile(req, res) {
  try {
    const { fullName, bio, avatarUrl, themePreference, autoEmptyTrashDays } = req.body;
    await query(
      `UPDATE user_profiles
       SET full_name = COALESCE($1, full_name),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url),
           theme_preference = COALESCE($4, theme_preference),
           auto_empty_trash_days = COALESCE($5, auto_empty_trash_days),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $6`,
      [fullName, bio, avatarUrl, themePreference, autoEmptyTrashDays, req.user.id]
    );

    await logActivity(req.user.id, 'edit', 'user_profile', req.user.id, { updated: true });

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const uRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, uRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, req.user.id]);

    await logActivity(req.user.id, 'edit', 'password', req.user.id, { changed: true });

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('changePassword error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const userRes = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (userRes.rows.length === 0) {
      // Do not reveal email absence for security
      return res.json({ success: true, message: 'If an account exists, password reset instructions have been generated.' });
    }

    const resetToken = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    await query(
      `UPDATE users
       SET reset_password_token = $1, reset_password_expires = CURRENT_TIMESTAMP + INTERVAL '1 hour'
       WHERE id = $2`,
      [resetToken, userRes.rows[0].id]
    );

    return res.json({
      success: true,
      message: 'Reset token generated (for demo purposes token is returned directly).',
      resetToken
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process forgot password request.' });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
    }

    const userRes = await query(
      `SELECT id FROM users
       WHERE reset_password_token = $1 AND reset_password_expires > CURRENT_TIMESTAMP`,
      [token]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await query(
      `UPDATE users
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newHash, userRes.rows[0].id]
    );

    return res.json({ success: true, message: 'Password has been successfully reset. You can now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
}

