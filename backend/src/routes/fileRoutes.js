import express from 'express';
import {
  uploadFiles,
  getFiles,
  getFileById,
  downloadFile,
  previewFile,
  renameFile,
  moveFiles,
  copyFiles,
  deleteFiles,
  toggleFavorite,
  bulkDownload,
  bulkRename
} from '../controllers/fileController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Preview and download support optionalAuth (enables browser <img>, <iframe>, direct download links)
router.get('/:id/download', optionalAuth, downloadFile);
router.get('/:id/preview', optionalAuth, previewFile);

// All other file operations require strict authentication
router.use(authenticate);

// Support both /upload and root POST /, and support both single and multiple file fields
const uploadFlexible = upload.any();
router.post('/upload', uploadFlexible, uploadFiles);
router.post('/', uploadFlexible, uploadFiles);
router.get('/', getFiles);
router.get('/:id', getFileById);
router.put('/:id/rename', renameFile);
router.post('/move', moveFiles);
router.post('/copy', copyFiles);
router.post('/delete', deleteFiles);
router.put('/:id/favorite', toggleFavorite);
router.post('/bulk-download', bulkDownload);
router.post('/bulk-rename', bulkRename);

export default router;

