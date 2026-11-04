import express from 'express';
import {
  getCollections,
  getCollectionById,
  createCollection,
  addFilesToCollection,
  removeFileFromCollection,
  deleteCollection
} from '../controllers/collectionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getCollections);
router.get('/:id', getCollectionById);
router.post('/', createCollection);
router.post('/:id/files', addFilesToCollection);
router.delete('/:id/files/:fileId', removeFileFromCollection);
router.delete('/:id', deleteCollection);

export default router;

