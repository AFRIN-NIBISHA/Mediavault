import express from 'express';
import { getStorageAnalytics } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/storage', getStorageAnalytics);

export default router;

