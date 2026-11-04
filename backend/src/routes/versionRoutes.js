import express from 'express';
import {
  getFileVersions,
  restoreVersion
} from '../controllers/versionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/:fileId', getFileVersions);
router.post('/:fileId/restore/:versionNumber', restoreVersion);

export default router;

