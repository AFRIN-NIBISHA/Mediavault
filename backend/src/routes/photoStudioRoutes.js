import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as studioCtrl from '../controllers/photoStudioController.js';

const router = express.Router();

router.use(authenticate);

// 1. Projects CRUD
router.post('/projects', studioCtrl.saveProject);
router.get('/projects', studioCtrl.getProjects);
router.get('/projects/:id', studioCtrl.getProjectById);
router.delete('/projects/:id', studioCtrl.deleteProject);

// 2. Templates
router.get('/templates', studioCtrl.getTemplates);

// 3. Composition Tools (Merge & Collage)
router.post('/compose/merge', studioCtrl.mergeImages);
router.post('/compose/collage', studioCtrl.createCollage);

// 4. Export Studio Design (PNG, JPG, WebP, PDF)
router.post('/export', studioCtrl.exportStudioDesign);

export default router;

