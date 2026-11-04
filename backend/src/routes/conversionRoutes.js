import express from 'express';
import {
  handleUniversalConvert,
  handleOcr,
  handleCompression,
  getToolsCatalog,
  handleCreateArchive,
  handleExtractArchive
} from '../controllers/conversionController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.js';

const router = express.Router();

// Public / tools discovery
router.get('/catalog', getToolsCatalog);

// Protected routes
router.use(authenticate);

router.post('/convert', uploadSingle, handleUniversalConvert);
router.post('/ocr', uploadSingle, handleOcr);
router.post('/compress', uploadSingle, handleCompression);
router.post('/archive/create', uploadMultiple, handleCreateArchive);
router.post('/archive/extract', uploadSingle, handleExtractArchive);

export default router;

