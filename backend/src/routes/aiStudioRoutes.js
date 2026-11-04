import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import * as aiCtrl from '../controllers/aiStudioController.js';

const router = express.Router();

router.use(authenticate);

// 1. AI Background Removal
router.post('/remove-bg', uploadSingle, aiCtrl.removeBackground);

// 2. AI Background Generator & Composite
router.post('/generate-bg', aiCtrl.generateBackground);

// 3. AI Text-to-Image Generation
router.post('/generate-image', aiCtrl.generateImage);

// 4. AI Image-to-Image Style Transformation
router.post('/transform-image', uploadSingle, aiCtrl.transformImage);

// 5. AI Object Removal / Inpainting
router.post('/remove-object', uploadSingle, aiCtrl.removeObject);

// 6. AI Image Enhancement (Upscale, Denoise, Sharpen, Restore)
router.post('/enhance', uploadSingle, aiCtrl.enhanceImage);

// 7. AI Smart Photo Analysis
router.post('/analyze', uploadSingle, aiCtrl.analyzePhoto);
router.get('/analyze/:fileId', (req, res, next) => {
  req.body.fileId = req.params.fileId;
  aiCtrl.analyzePhoto(req, res, next);
});

// 8. AI Smart Editing Assistant
router.post('/smart-edit', uploadSingle, aiCtrl.smartEdit);

// 9. AI History & Jobs
router.get('/history', aiCtrl.getAiHistory);

export default router;

