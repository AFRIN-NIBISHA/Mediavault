import express from 'express';
import {
  getPhotos,
  processPhoto,
  getAlbums,
  createAlbum,
  addPhotosToAlbum,
  removePhotoFromAlbum,
  deleteAlbum
} from '../controllers/photoController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getPhotos);
router.post('/:id/process', processPhoto);

// Albums
router.get('/albums', getAlbums);
router.post('/albums', createAlbum);
router.post('/albums/:id/photos', addPhotosToAlbum);
router.delete('/albums/:id/photos/:fileId', removePhotoFromAlbum);
router.delete('/albums/:id', deleteAlbum);

export default router;

