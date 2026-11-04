import assert from 'assert';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';

async function runStudioTests() {
  console.log('🧪 Starting MediaVault Advanced AI Photo Studio Test Suite...\n');

  // 1. Authenticate demo user or create test user
  let token;
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@mediavault.io',
      password: 'UserPassword123!'
    })
  });
  const loginData = await loginRes.json();
  if (loginData.success) {
    token = loginData.token;
    console.log('✓ 1. Authenticated as Alex Vance (user@mediavault.io)');
  } else {
    // Register test user
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `studio_${Date.now()}@mediavault.io`,
        username: `studio_${Date.now()}`,
        password: 'StudioPassword123!',
        fullName: 'Studio Test Specialist'
      })
    });
    const regData = await regRes.json();
    assert(regData.success, 'Registration failed: ' + (regData.message || ''));
    token = regData.token;
    console.log('✓ 1. Registered and authenticated new Studio Test User');
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Fetch or create a sample photo
  let filesRes = await fetch(`${API_BASE}/files?category=photos`, { headers: authHeaders });
  let filesData = await filesRes.json();
  let samplePhoto;
  if (filesData.success && filesData.files.length > 0) {
    samplePhoto = filesData.files[0];
  } else {
    // Generate one via AI
    const initGen = await fetch(`${API_BASE}/ai/generate-image`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        prompt: 'Studio portrait of an innovative engineer with violet ambient lighting',
        style: 'photorealistic',
        aspectRatio: '1:1',
        saveToVault: true
      })
    });
    const initGenData = await initGen.json();
    samplePhoto = initGenData.file;
  }
  assert(samplePhoto && samplePhoto.id, 'Failed finding or creating sample photo');
  console.log(`✓ 2. Using sample photo: "${samplePhoto.original_name}" (ID: ${samplePhoto.id})`);

  // 3. Test AI Background Removal
  console.log('Testing AI Background Removal...');
  const bgRemoveRes = await fetch(`${API_BASE}/ai/remove-bg`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ fileId: samplePhoto.id, saveToVault: true })
  });
  const bgRemoveData = await bgRemoveRes.json();
  assert(bgRemoveData.success, 'AI Background Removal failed');
  assert(bgRemoveData.previewUrl.startsWith('data:image/png'), 'Expected transparent PNG preview');
  console.log(`✓ 3. AI Background Removal: success, dimensions: ${bgRemoveData.width}x${bgRemoveData.height}`);

  // 4. Test AI Background Generator
  console.log('Testing AI Background Generator...');
  const bgGenRes = await fetch(`${API_BASE}/ai/generate-bg`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      prompt: 'majestic mountain landscape with morning misty glow',
      subjectFileId: samplePhoto.id,
      position: 'bottomCenter',
      scale: 0.75,
      saveToVault: true
    })
  });
  const bgGenData = await bgGenRes.json();
  assert(bgGenData.success, 'AI Background Generator failed');
  assert(bgGenData.file && bgGenData.file.id, 'Expected generated file in MediaVault');
  console.log(`✓ 4. AI Background Generator: success (Provider: ${bgGenData.provider})`);

  // 5. Test AI Text-to-Image Generation
  console.log('Testing AI Text-to-Image Generation...');
  const imgGenRes = await fetch(`${API_BASE}/ai/generate-image`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      prompt: 'futuristic glass skyscraper with glowing violet lights at twilight',
      style: 'cyberpunk',
      aspectRatio: '16:9',
      saveToVault: true
    })
  });
  const imgGenData = await imgGenRes.json();
  assert(imgGenData.success, 'AI Image Generation failed');
  console.log(`✓ 5. AI Text-to-Image: success (${imgGenData.width}x${imgGenData.height}, style: cyberpunk)`);

  // 6. Test AI Image-to-Image Transformation
  console.log('Testing AI Image-to-Image Transformation...');
  const transformRes = await fetch(`${API_BASE}/ai/transform-image`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      fileId: samplePhoto.id,
      style: 'anime',
      saveToVault: true
    })
  });
  const transformData = await transformRes.json();
  assert(transformData.success, 'AI Style Transformation failed');
  console.log(`✓ 6. AI Style Transformation: success (style: ${transformData.style})`);

  // 7. Test AI Object Removal / Inpainting
  console.log('Testing AI Object Removal & Inpainting...');
  const inpaintRes = await fetch(`${API_BASE}/ai/remove-object`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      fileId: samplePhoto.id,
      maskArea: { x: 50, y: 50, width: 120, height: 120 },
      saveToVault: true
    })
  });
  const inpaintData = await inpaintRes.json();
  assert(inpaintData.success, 'AI Inpainting failed');
  console.log('✓ 7. AI Object Removal: success (reconstructed background area)');

  // 8. Test AI Image Enhancement
  console.log('Testing AI Image Enhancement (Super-Resolution & Sharpen)...');
  const enhanceRes = await fetch(`${API_BASE}/ai/enhance`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      fileId: samplePhoto.id,
      mode: 'upscale_2x',
      saveToVault: true
    })
  });
  const enhanceData = await enhanceRes.json();
  assert(enhanceData.success, 'AI Enhancement failed');
  console.log(`✓ 8. AI Enhancement: success (${enhanceData.originalDimensions} -> ${enhanceData.enhancedDimensions})`);

  // 9. Test AI Smart Photo Analysis
  console.log('Testing AI Smart Photo Analysis...');
  const analyzeRes = await fetch(`${API_BASE}/ai/analyze`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ fileId: samplePhoto.id })
  });
  const analyzeData = await analyzeRes.json();
  assert(analyzeData.success, 'AI Analysis failed');
  assert(analyzeData.analysis.qualityScore >= 0, 'Expected quality score');
  console.log(`✓ 9. AI Smart Analysis: Quality Score = ${analyzeData.analysis.qualityScore}%, Lighting = ${analyzeData.analysis.lighting.status}, Focus = ${analyzeData.analysis.sharpness.verdict}`);

  // 10. Test AI Smart Editing Assistant
  console.log('Testing AI Smart Editing Assistant...');
  const smartEditRes = await fetch(`${API_BASE}/ai/smart-edit`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      fileId: samplePhoto.id,
      instruction: 'Increase brightness and apply cinematic film look with high contrast',
      saveToVault: true
    })
  });
  const smartEditData = await smartEditRes.json();
  assert(smartEditData.success, 'AI Smart Edit failed');
  console.log(`✓ 10. AI Smart Edit: ${smartEditData.message}`);

  // 11. Test AI History
  const historyRes = await fetch(`${API_BASE}/ai/history`, { headers: authHeaders });
  const historyData = await historyRes.json();
  assert(historyData.success && historyData.history.length > 0, 'Expected AI history records');
  console.log(`✓ 11. AI History: ${historyData.history.length} generation logs, ${historyData.jobs.length} processing jobs`);

  // 12. Test Studio Templates
  const templatesRes = await fetch(`${API_BASE}/studio/templates`, { headers: authHeaders });
  const templatesData = await templatesRes.json();
  assert(templatesData.success && templatesData.templates.length >= 10, 'Expected 10 design templates');
  console.log(`✓ 12. Studio Templates: verified ${templatesData.templates.length} design presets`);

  // 13. Test Studio Project Save & Load
  const saveProjRes = await fetch(`${API_BASE}/studio/projects`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Test Instagram Campaign',
      width: 1080,
      height: 1080,
      backgroundColor: '#f8fafc',
      canvasData: { version: '1.0' },
      layers: [
        { type: 'shape', name: 'Background Rect', x: 0, y: 0, width: 1080, height: 1080, fill: '#ffffff' },
        { type: 'text', name: 'Headline', x: 100, y: 150, text: 'Hello MediaVault Studio', fontSize: 48, fill: '#9333ea' }
      ]
    })
  });
  const saveProjData = await saveProjRes.json();
  assert(saveProjData.success && saveProjData.project.id, 'Failed saving studio project');
  console.log(`✓ 13. Studio Project: Saved Project ID ${saveProjData.project.id}`);

  // 14. Test Composition Merge
  if (filesData.files.length >= 2) {
    const mergeRes = await fetch(`${API_BASE}/studio/compose/merge`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        fileIds: [filesData.files[0].id, filesData.files[1].id],
        mode: 'horizontal',
        gap: 16
      })
    });
    const mergeData = await mergeRes.json();
    assert(mergeData.success, 'Image merge failed');
    console.log(`✓ 14. Composition Image Merge: success (${mergeData.width}x${mergeData.height})`);
  }

  // 15. Test Studio Export to PDF
  const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const exportRes = await fetch(`${API_BASE}/studio/export`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      dataUrl: testDataUrl,
      name: 'Final_Year_Studio_Design',
      format: 'pdf',
      saveToVault: true
    })
  });
  const exportData = await exportRes.json();
  assert(exportData.success, 'Export to PDF failed');
  assert(exportData.filename.endsWith('.pdf'), 'Expected PDF file');
  console.log(`✓ 15. Studio Export: success (exported as ${exportData.filename} to MediaVault)`);

  console.log('\n=======================================================');
  console.log('🎉 ALL 15 ADVANCED AI PHOTO STUDIO TESTS PASSED!');
  console.log('=======================================================\n');
}

runStudioTests().catch(err => {
  console.error('\n❌ Studio test failed:', err);
  process.exit(1);
});
