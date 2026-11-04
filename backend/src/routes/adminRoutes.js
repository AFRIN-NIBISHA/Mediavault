import express from 'express';
import {
  getAdminStats,
  getAllUsers,
  toggleUserStatus,
  updateUserQuota,
  getAllSharedLinks,
  getSystemLogs
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/stats', getAdminStats);
router.get('/users', getAllUsers);
router.put('/users/:id/status', toggleUserStatus);
router.put('/users/:id/quota', updateUserQuota);
router.get('/shares', getAllSharedLinks);
router.get('/logs', getSystemLogs);

export default router;

