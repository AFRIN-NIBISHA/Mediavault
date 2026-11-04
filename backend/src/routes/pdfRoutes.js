import express from 'express';
import {
  merge,
  split,
  extract,
  reorder,
  rotate,
  convertImagesToPdf
} from '../controllers/pdfController.js';
import { uploadFiles } from '../controllers/fileController.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();
router.use(authenticate);

// Direct PDF upload helper
router.post('/upload', upload.any(), uploadFiles);

router.post('/merge', merge);
router.post('/:id/split', split);
router.post('/:id/extract', extract);
router.post('/:id/reorder', reorder);
router.post('/:id/rotate', rotate);
router.post('/images-to-pdf', convertImagesToPdf);

export default router;

