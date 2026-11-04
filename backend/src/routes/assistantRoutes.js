import express from 'express';
import { handleAssistantChat } from '../controllers/assistantController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.use(authenticate);

// AI Copilot Chat Endpoint: handles message + optional file upload
router.post('/chat', uploadSingle, handleAssistantChat);

export default router;

