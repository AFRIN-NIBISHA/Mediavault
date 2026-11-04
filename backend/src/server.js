import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDb } from './database/db.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import duplicateRoutes from './routes/duplicateRoutes.js';
import versionRoutes from './routes/versionRoutes.js';
import bulkRoutes from './routes/bulkRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import recycleBinRoutes from './routes/recycleBinRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiStudioRoutes from './routes/aiStudioRoutes.js';
import photoStudioRoutes from './routes/photoStudioRoutes.js';
import conversionRoutes from './routes/conversionRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const uploadDir = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static files for direct file previews when needed
app.use('/uploads', express.static(uploadDir));

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: 'MediaVault Core v1.0.0'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/duplicates', duplicateRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiStudioRoutes);
app.use('/api/studio', photoStudioRoutes);
app.use('/api/converter', conversionRoutes);
app.use('/api/assistant', assistantRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Database initialization and server startup
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`🚀 MediaVault API Server running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/api/health`);
      console.log(`   Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Fatal: Server startup failed during database initialization:', err);
    process.exit(1);
  }
}

startServer();

export default app;

