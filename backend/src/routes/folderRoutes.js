import express from 'express';
import {
  createFolder,
  getFolders,
  renameFolder,
  deleteFolder
} from '../controllers/folderController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.post('/', createFolder);
router.get('/', getFolders);
router.put('/:id', renameFolder);
router.delete('/:id', deleteFolder);

export default router;

