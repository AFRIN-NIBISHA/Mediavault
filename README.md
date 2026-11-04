# MediaVault – Unified Digital Asset & File Management Platform

> **Final Year Engineering Project**: A full-stack, enterprise-grade Digital Asset Management (DAM) and file processing platform unifying an interactive Photo Studio, comprehensive PDF & Document Utilities, cryptographic and perceptual duplicate detection, file revision version control, time-limited password-protected asset sharing, and administrative governance.

---

## 🌟 Executive Summary

Traditional digital storage services (Google Drive, Dropbox) often function primarily as storage lockers, requiring third-party tools for image processing, document transformations, and visual deduplication. Conversely, online media suites (Canva, ILovePDF) rarely offer private, unified file workspace management.

**MediaVault** eliminates this fragmentation by providing:
1. **Interactive Photo Toolkit**: Sharp-powered visual image editor with dynamic cropping, brightness/contrast/saturation tuning, artistic filters, watermark embedding, format conversions (JPG, PNG, WebP), and side-by-side before/after preview.
2. **File Toolkit & PDF Suite**: In-memory PDF merging, document splitting, page extraction, custom sequence reordering, page rotation, and image-to-PDF compilation.
3. **Advanced Dual-Engine Duplicate Detection**: Cryptographic SHA-256 exact byte matching paired with 64-bit difference perceptual hashing (`dHash`) for visually similar image detection across varying resolutions or compression levels.
4. **Automated Version Control**: File revisions recorded immutably on every edit or overwrite, enabling one-click rollbacks to any historical state.
5. **Secure Asset Sharing**: Time-limited cryptographic share tokens, optional bcrypt password protection, and live download tracking.
6. **Storage Analytics & Recycle Bin**: Real-time quota breakdown, largest asset inspection, and 30-day soft deletion safeguards.
7. **Role-Based Admin Console**: System-wide quota control, account governance, shared link monitoring, and audit activity logging.

---

## 🏗️ Architecture & Technology Stack

```
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|               React 18  •  Vite  •  Tailwind CSS  •  Lucide Icons               |
|            React Router DOM v6  •  Axios  •  Dark / Light SaaS Theme            |
+----------------------------------------+----------------------------------------+
                                         | REST APIs (JSON / Multipart)
                                         v
+---------------------------------------------------------------------------------+
|                                APPLICATION TIER                                 |
|                       Node.js v22  •  Express.js 4.19                           |
|       JWT Authentication  •  Multer Uploads  •  Role-Based Access Control       |
|                                                                                 |
|   +-------------------+  +-------------------+  +----------------------------+  |
|   |   Sharp Engine    |  |  pdf-lib Engine   |  |     Perceptual Hashing     |  |
|   | Image Processing  |  |  PDF Manipulation |  |  64-bit dHash & SHA-256    |  |
|   +-------------------+  +-------------------+  +----------------------------+  |
+----------------------------------------+----------------------------------------+
                                         | SQL Queries / Connection Pool
                                         v
+---------------------------------------------------------------------------------+
|                                 DATABASE TIER                                   |
|                             PostgreSQL Database                                 |
|          PGlite Embedded Fallback / Standard pg Pool • Foreign Keys & Triggers   |
+---------------------------------------------------------------------------------+
```

### Stack Components:
- **Frontend**: React 18, Vite, Tailwind CSS 3, Lucide React, Axios, React Router 6.
- **Backend**: Node.js 22, Express.js, REST APIs, JSON Web Tokens (JWT), Bcrypt password hashing.
- **Database**: PostgreSQL (with automated schema verification and embedded PGlite persistent engine fallback for zero-configuration local runs).
- **Media Engines**:
  - `sharp`: C++ `libvips` bindings for fast, low-memory image editing, filtering, and transcoding.
  - `pdf-lib`: Native PDF reading, page manipulation, vector drawing, and merging.
  - `jszip`: In-memory ZIP archive generation and streaming.
  - `crypto`: Hardware-accelerated SHA-256 checksum generation.

---

## 🗄️ Database Design (PostgreSQL Schema)

MediaVault features 17 normalized PostgreSQL tables with foreign key cascades, unique constraints, and indexes:

| Table | Purpose |
|---|---|
| `users` | Accounts, email, username, bcrypt password hash, role (`user`/`admin`), active status |
| `user_profiles` | Full name, avatar URL, bio, storage limit in bytes, theme preference, purge days |
| `folders` | Nested folder hierarchy with custom color tags |
| `files` | Master asset registry: paths, sizes, categories, SHA-256 hash, perceptual dHash |
| `file_metadata` | Dimensional properties (width, height, page count, EXIF, format) |
| `file_versions` | Revisions history with delta summary, timestamp, and author |
| `file_shares` | Unique cryptographic tokens, view/download mode, password hash, expiration |
| `file_favorites` | Starred items bookmarks |
| `albums` & `album_files` | Custom photo showcase galleries |
| `collections` & `collection_files` | Virtual cross-folder asset groupings |
| `recycle_bin` | Soft-deleted items pending 30-day purge |
| `storage_usage` | Live category breakdown: photos, docs, pdfs, videos, archives, audio |
| `activity_logs` | Comprehensive user audit trail (upload, edit, rename, delete, share) |
| `processing_jobs` | Background bulk processing queue and status tracker |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher recommended; v22 supported)
- npm (v9 or higher)

### 1. Installation

Clone or open the project directory:
```bash
cd "c:\Users\HP\Desktop\Final year proj"
```

Install backend dependencies:
```bash
cd backend
npm install
```

Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### 2. Database Initialization & Seeding

The database initializes automatically on server launch, with embedded persistent PostgreSQL storage (`./backend/data/pglite_db`). To run the database seed script:

```bash
cd ../backend
npm run db:seed
```

This creates the default demo accounts:
- **Administrator**:
  - Email: `admin@mediavault.io`
  - Password: `AdminPassword123!`
  - Role: `admin` (50 GB quota)
- **Regular User**:
  - Email: `user@mediavault.io`
  - Password: `UserPassword123!`
  - Role: `user` (10 GB quota)

### 3. Launching the Application

**Option A: Development Mode (Two Terminals)**

Terminal 1 (Backend API Server on Port 5000):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend Vite Server on Port 5173):
```bash
cd frontend
npm run dev
```

Open your browser to: **`http://localhost:5173`**

---

## 🧪 Automated Testing

MediaVault includes a full end-to-end integration test suite (`backend/test_suite.js`) validating all 12 core workflows:
1. System Health Check
2. User Registration & JWT Issuance
3. User & Admin Authentication
4. Folder Creation & Hierarchy
5. Multi-file Multipart Uploads with SHA-256 & Perceptual Hashing
6. Image Processing (Filters, Watermark, Sharp WebP Conversion)
7. PDF Operations (Multi-file Merge & Rotation)
8. Cryptographic & Perceptual Duplicate Detection
9. File Version Rollback & State Restoration
10. Password-Protected Public Share Link Access
11. Recycle Bin Soft-Delete, Recovery, and Purging
12. Administrative Quota and User Governance

Run the test suite:
```bash
cd backend
node test_suite.js
```

---

## 📄 API Reference Highlights

### Authentication
- `POST /api/auth/register` — Register user account
- `POST /api/auth/login` — Sign in and receive JWT token
- `GET /api/auth/me` — Retrieve current user profile and live storage breakdown
- `PUT /api/auth/profile` — Update bio, full name, and retention days
- `PUT /api/auth/change-password` — Change password

### Asset Management
- `POST /api/files/upload` — Multipart multi-file upload with metadata extraction
- `GET /api/files` — List files with category, folder, favorite, search, and sort filters
- `GET /api/files/:id/download` — Stream asset download with Content-Disposition
- `GET /api/files/:id/preview` — In-browser inline preview
- `PUT /api/files/:id/rename` — Rename file
- `POST /api/files/move` — Move files into target folder
- `POST /api/files/copy` — Create duplicates
- `POST /api/files/delete` — Move to trash or purge permanently
- `POST /api/files/bulk-download` — Generate and stream ZIP archive
- `POST /api/files/bulk-rename` — Batch pattern renaming

### Photo Studio
- `GET /api/photos` — Filter image assets
- `POST /api/photos/:id/process` — Crop, resize, rotate, flip, filter, watermark, enhance, transcode
- `GET /api/photos/albums` — List user albums
- `POST /api/photos/albums` — Create album

### PDF Suite
- `POST /api/pdf/merge` — Concatenate multiple PDFs
- `POST /api/pdf/:id/split` — Split into individual pages
- `POST /api/pdf/:id/extract` — Extract specific page numbers
- `POST /api/pdf/:id/reorder` — Custom page sequence
- `POST /api/pdf/:id/rotate` — Rotate pages (90°, 180°, 270°)
- `POST /api/pdf/images-to-pdf` — Compile photos into a PDF booklet

### Deduplication & Versions
- `GET /api/duplicates/scan` — Group exact SHA-256 and visual dHash duplicates
- `GET /api/versions/:fileId` — Revisions history
- `POST /api/versions/:fileId/restore/:versionNumber` — Version rollback

### Secure Sharing
- `POST /api/shares` — Create share token with optional password & expiration
- `GET /api/shares/public/:token` — Recipient verification endpoint
- `GET /api/shares/public/:token/download` — Public asset download

### Administration
- `GET /api/admin/stats` — Platform aggregates
- `GET /api/admin/users` — User management and storage audit
- `PUT /api/admin/users/:id/status` — Activate / suspend user account
- `PUT /api/admin/users/:id/quota` — Update storage quota
- `GET /api/admin/logs` — Security audit logs

---

## 🔒 Security Best Practices Implemented
- Passwords hashed using `bcryptjs` with salt factor 10.
- Ephemeral JWT tokens with configurable expiration (`7d`).
- Strict file isolation: all queries scoped to authenticated `user_id`.
- Content verification: MIME type & file extension cross-referenced; file signatures inspected.
- Cryptographic SHA-256 and 64-bit dHash computed on disk streams to prevent file spoofing.
- Public shares generate 48-character hex cryptographic tokens.
- Internal absolute storage paths are never exposed to clients.

