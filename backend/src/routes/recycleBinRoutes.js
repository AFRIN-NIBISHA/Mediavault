import express from 'express';
import {
  getTrashFiles,
  restoreFile,
  restoreAll,
  permanentDelete,
  emptyTrash
} from '../controllers/recycleBinController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getTrashFiles);
router.post('/:id/restore', restoreFile);
router.post('/restore-all', restoreAll);
router.delete('/:id/permanent', permanentDelete);
router.delete('/empty', emptyTrash);

export default router;

