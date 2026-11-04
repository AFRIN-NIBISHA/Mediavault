import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate clean unique filename: timestamp_random_sanitizedname
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}_${safeBase}`);
  }
});

const maxMb = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10);

export const upload = multer({
  storage,
  limits: {
    fileSize: maxMb * 1024 * 1024
  }
});

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 50);


