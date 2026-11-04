import express from 'express';
import {
  scanDuplicates,
  deleteSelectedDuplicates
} from '../controllers/duplicateController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/scan', scanDuplicates);
router.post('/delete', deleteSelectedDuplicates);

export default router;

