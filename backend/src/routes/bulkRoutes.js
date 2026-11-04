import express from 'express';
import {
  processBulkJob,
  getJobs
} from '../controllers/bulkController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.post('/jobs', processBulkJob);
router.get('/jobs', getJobs);

export default router;

