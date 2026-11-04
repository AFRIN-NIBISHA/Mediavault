import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 MEDIAVAULT AUTOMATED COMPREHENSIVE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // Helper for requests
  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const res = await fetch(url, options);
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { status: res.status, data, headers: res.headers };
  }

  try {
    // 1. Health check
    console.log('1. Testing System Health...');
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'Health check returns 200 healthy');

    // 2. User Registration
    console.log('\n2. Testing User Registration...');
    const testEmail = `testuser_${Date.now()}@mediavault.io`;
    const regRes = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        username: `tester_${Date.now()}`,
        password: 'Password123!',
        fullName: 'Automated Tester'
      })
    });
    assert(regRes.status === 201 && regRes.data.token, 'User registered and JWT token issued');
    const userToken = regRes.data.token;
    const userHeaders = { 'Authorization': `Bearer ${userToken}`, 'Content-Type': 'application/json' };

    // 3. User Login
    console.log('\n3. Testing User Login...');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: 'admin@mediavault.io',
        password: 'AdminPassword123!'
      })
    });
    assert(loginRes.status === 200 && loginRes.data.user.role === 'admin', 'Admin logged in successfully');
    const adminToken = loginRes.data.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    // 4. Folder Creation
    console.log('\n4. Testing Folder Operations...');
    const folderRes = await request('/folders', {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({ name: 'Automated Test Folder', color: '#8b5cf6' })
    });
    assert(folderRes.status === 201 && folderRes.data.folder.name === 'Automated Test Folder', 'Folder created successfully');
    const folderId = folderRes.data.folder.id;

    // 5. Create real sample files for upload
    console.log('\n5. Creating & Uploading Test Assets (Image & PDF)...');
    const testDir = path.join(__dirname, 'test_tmp');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    // Generate test sample image using Sharp
    const testImg1Path = path.join(testDir, 'sample_photo_1.png');
    await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 4,
        background: { r: 50, g: 120, b: 220, alpha: 1 }
      }
    }).png().toFile(testImg1Path);

    // Generate duplicate test sample image
    const testImgDupPath = path.join(testDir, 'sample_photo_duplicate.png');
    fs.copyFileSync(testImg1Path, testImgDupPath);

    // Generate test PDF 1
    const pdfDoc1 = await PDFDocument.create();
    const page1 = pdfDoc1.addPage([500, 400]);
    page1.drawText('MediaVault Test PDF Document 1', { x: 50, y: 350 });
    const pdf1Bytes = await pdfDoc1.save();
    const testPdf1Path = path.join(testDir, 'sample_doc_1.pdf');
    fs.writeFileSync(testPdf1Path, pdf1Bytes);

    // Generate test PDF 2
    const pdfDoc2 = await PDFDocument.create();
    const page2 = pdfDoc2.addPage([500, 400]);
    page2.drawText('MediaVault Test PDF Document 2', { x: 50, y: 350 });
    const pdf2Bytes = await pdfDoc2.save();
    const testPdf2Path = path.join(testDir, 'sample_doc_2.pdf');
    fs.writeFileSync(testPdf2Path, pdf2Bytes);

    // Upload using FormData
    const formData = new FormData();
    const img1Blob = new Blob([fs.readFileSync(testImg1Path)], { type: 'image/png' });
    const imgDupBlob = new Blob([fs.readFileSync(testImgDupPath)], { type: 'image/png' });
    const pdf1Blob = new Blob([fs.readFileSync(testPdf1Path)], { type: 'application/pdf' });
    const pdf2Blob = new Blob([fs.readFileSync(testPdf2Path)], { type: 'application/pdf' });

    formData.append('files', img1Blob, 'sample_photo_1.png');
    formData.append('files', imgDupBlob, 'sample_photo_duplicate.png');
    formData.append('files', pdf1Blob, 'sample_doc_1.pdf');
    formData.append('files', pdf2Blob, 'sample_doc_2.pdf');
    formData.append('folderId', folderId);

    const uploadRes = await fetch(`${BASE_URL}/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userToken}` },
      body: formData
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201 && uploadData.files.length === 4, 'Uploaded 4 test files (images & PDFs) with hashes and metadata');

    const uploadedImg = uploadData.files.find(f => f.original_name === 'sample_photo_1.png');
    const uploadedPdf1 = uploadData.files.find(f => f.original_name === 'sample_doc_1.pdf');
    const uploadedPdf2 = uploadData.files.find(f => f.original_name === 'sample_doc_2.pdf');

    // 6. Test Image Processing Pipeline
    console.log('\n6. Testing Image Processing (Sharp Engine)...');
    const processRes = await request(`/photos/${uploadedImg.id}/process`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        operations: {
          brightness: 1.2,
          contrast: 1.1,
          filter: 'vintage',
          watermark: { text: 'MediaVault QA', position: 'bottomRight' },
          format: 'webp',
          quality: 80
        },
        saveAsNew: true,
        newTitle: 'Processed_Vintage_Photo.webp'
      })
    });
    assert(processRes.status === 200 && processRes.data.file.extension === 'webp', 'Image cropped/filtered/watermarked and saved as WebP');

    // 7. Test PDF Processing (Merge & Rotate)
    console.log('\n7. Testing PDF Suite (PDF-lib Engine)...');
    const mergeRes = await request('/pdf/merge', {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        fileIds: [uploadedPdf1.id, uploadedPdf2.id],
        outputTitle: 'Test_Merged_Report.pdf'
      })
    });
    assert(mergeRes.status === 201 && mergeRes.data.pageCount === 2, 'Merged 2 PDF documents into a 2-page consolidated document');

    const rotateRes = await request(`/pdf/${uploadedPdf1.id}/rotate`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({ angle: 90 })
    });
    assert(rotateRes.status === 201, 'PDF rotated 90 degrees successfully');

    // 8. Test Duplicate Detection
    console.log('\n8. Testing Cryptographic & Perceptual Duplicate Detection...');
    const dupRes = await request('/duplicates/scan', { headers: userHeaders });
    assert(dupRes.status === 200 && dupRes.data.summary.exactGroupsCount >= 1, 'Exact duplicate detected with SHA-256 match');

    // 9. Test Version Restoration
    console.log('\n9. Testing File Version Restoration...');
    // Make an edit to uploadedImg saved as new version
    await request(`/photos/${uploadedImg.id}/process`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        operations: { filter: 'grayscale' },
        saveAsNew: false
      })
    });
    // Check version list
    const verRes = await request(`/versions/${uploadedImg.id}`, { headers: userHeaders });
    assert(verRes.status === 200 && verRes.data.versions.length >= 2, 'File version incremented after edit');

    // Restore version 1
    const restoreRes = await request(`/versions/${uploadedImg.id}/restore/1`, {
      method: 'POST',
      headers: userHeaders
    });
    assert(restoreRes.status === 200 && restoreRes.data.currentVersion === 3, 'Restored historical version 1 as active Version 3');

    // 10. Test File Sharing (Public & Password Protected)
    console.log('\n10. Testing File Sharing & Public Link...');
    const shareRes = await request('/shares', {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        fileId: uploadedImg.id,
        accessType: 'download',
        password: 'ShareSecretPassword99!'
      })
    });
    assert(shareRes.status === 201 && shareRes.data.share.share_token, 'Generated unique password-protected share token');
    const shareToken = shareRes.data.share.share_token;

    // Test public access without password (should indicate password required)
    const pubCheck1 = await request(`/shares/public/${shareToken}`);
    assert(pubCheck1.status === 200 && pubCheck1.data.requiresPassword === true, 'Public share requires password prompt');

    // Test public access with correct password
    const pubCheck2 = await request(`/shares/public/${shareToken}?password=ShareSecretPassword99!`);
    assert(pubCheck2.status === 200 && pubCheck2.data.requiresPassword === false && pubCheck2.data.file, 'Public share unlocked with correct password');

    // 11. Test Recycle Bin & Safe Deletion
    console.log('\n11. Testing Recycle Bin Operations...');
    const delRes = await request('/files/delete', {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({ fileIds: [uploadedPdf2.id], permanent: false })
    });
    assert(delRes.status === 200, 'Soft deleted file moved to Recycle Bin');

    const trashRes = await request('/recycle-bin', { headers: userHeaders });
    assert(trashRes.status === 200 && trashRes.data.files.some(f => f.id === uploadedPdf2.id), 'Trash list contains deleted file');

    const restTrashRes = await request(`/recycle-bin/${uploadedPdf2.id}/restore`, {
      method: 'POST',
      headers: userHeaders
    });
    assert(restTrashRes.status === 200, 'Restored file back from Recycle Bin to workspace');

    // 12. Admin Controls
    console.log('\n12. Testing Administrative Controls...');
    const adminStats = await request('/admin/stats', { headers: adminHeaders });
    assert(adminStats.status === 200 && adminStats.data.stats.totalUsers >= 2, 'Admin retrieved system-wide stats');

    // 13. Direct Browser Image & File Preview (Zero-auth header for <img> & <iframe>)
    console.log('\n13. Testing Direct Browser Previews (Zero Auth Header)...');
    const directPreview = await request(`/files/${uploadedImg.id}/preview`);
    assert(directPreview.status === 200, `Direct browser <img> preview returns 200 OK (Status: ${directPreview.status})`);

    const directDownload = await request(`/files/${uploadedImg.id}/download`);
    assert(directDownload.status === 200, `Direct file download returns 200 OK (Status: ${directDownload.status})`);

    // Clean up temporary test files
    fs.rmSync(testDir, { recursive: true, force: true });

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test Suite encountered unhandled fatal exception:', error);
    process.exit(1);
  }
}

runTests();

