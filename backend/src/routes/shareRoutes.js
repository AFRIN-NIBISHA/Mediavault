import express from 'express';
import {
  createShare,
  getUserShares,
  revokeShare,
  getPublicSharedFile,
  downloadPublicSharedFile
} from '../controllers/shareController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes for recipients
router.get('/public/:token', getPublicSharedFile);
router.get('/public/:token/download', downloadPublicSharedFile);

// Authenticated management routes
router.post('/', authenticate, createShare);
router.get('/', authenticate, getUserShares);
router.delete('/:id', authenticate, revokeShare);

export default router;

