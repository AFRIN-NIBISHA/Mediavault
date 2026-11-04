import fs from 'fs';
import path from 'path';

async function testAdminUpload() {
  console.log('--- Login as admin ---');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login: 'admin@mediavault.io', password: 'AdminPassword123!' })
  });
  const loginData = await loginRes.json();
  console.log('Admin login status:', loginRes.status, 'User ID:', loginData.user?.id);
  const token = loginData.token;

  const pdfSamplePath = path.resolve('backend/uploads/1793760924962_389563094_IT_Naan_mudhalvan.pdf');
  const pdfBuffer = fs.readFileSync(pdfSamplePath);

  const form = new FormData();
  form.append('files', new Blob([pdfBuffer], { type: 'application/pdf' }), 'admin_test.pdf');
  form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'admin_test.pdf');

  console.log('\n--- Uploading as Admin ---');
  const uploadRes = await fetch('http://localhost:5000/api/files/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });

  const uploadData = await uploadRes.json();
  console.log('Upload status:', uploadRes.status);
  console.log('Upload response:', uploadData);
}

testAdminUpload().catch(console.error);

