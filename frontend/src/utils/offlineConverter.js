/**
 * In-Browser Offline Conversion Engine
 * Runs 100% locally on HTML5 Canvas & Web APIs without network or server!
 */

export async function convertImageOffline(file, targetFormat = 'png', options = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file locally.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image data.'));
      img.onload = () => {
        const isSticker = options.asSticker || targetFormat === 'webp' && options.stickerMode;
        const targetW = isSticker ? 512 : (options.width || img.width);
        const targetH = isSticker ? 512 : (options.height || img.height);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (isSticker) {
          // Fit into 512x512 maintaining aspect ratio
          const scale = Math.min((512 - 40) / img.width, (512 - 40) / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          const dx = (512 - dw) / 2;
          const dy = (512 - dh) / 2;

          // Draw soft drop shadow for sticker
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;

          ctx.drawImage(img, dx, dy, dw, dh);
        } else {
          // If JPEG, fill white background (JPEG has no alpha)
          if (targetFormat === 'jpg' || targetFormat === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);
        }

        // Grayscale filter if requested
        if (options.grayscale) {
          const imgData = ctx.getImageData(0, 0, targetW, targetH);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            d[i] = gray;
            d[i + 1] = gray;
            d[i + 2] = gray;
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const mime = targetFormat === 'jpg' || targetFormat === 'jpeg'
          ? 'image/jpeg'
          : targetFormat === 'webp'
          ? 'image/webp'
          : 'image/png';

        const quality = (options.quality || 90) / 100;
        const dataUrl = canvas.toDataURL(mime, quality);

        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Canvas export failed.'));
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const filename = `${baseName}-offline.${targetFormat === 'jpeg' ? 'jpg' : targetFormat}`;

          resolve({
            blob,
            dataUrl,
            downloadUrl: dataUrl,
            previewUrl: dataUrl,
            filename,
            size: blob.size,
            isOffline: true,
            metadata: {
              width: targetW,
              height: targetH,
              format: targetFormat
            }
          });
        }, mime, quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function convertTextDataOffline(file, targetFormat = 'txt') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read document locally.'));
    reader.onload = () => {
      const text = reader.result;
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      let outputText = text;
      let mime = 'text/plain';

      if (targetFormat === 'csv') {
        mime = 'text/csv';
        // If source is JSON, convert to CSV
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const keys = Object.keys(parsed[0]);
            const header = keys.join(',');
            const rows = parsed.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','));
            outputText = [header, ...rows].join('\n');
          }
        } catch {
          outputText = text;
        }
      } else if (targetFormat === 'json') {
        mime = 'application/json';
        // If source is CSV, convert to JSON
        try {
          const lines = text.trim().split(/\r?\n/);
          if (lines.length > 1) {
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const data = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
              const obj = {};
              headers.forEach((h, i) => { obj[h] = values[i] || ''; });
              return obj;
            });
            outputText = JSON.stringify(data, null, 2);
          }
        } catch {
          outputText = JSON.stringify({ raw: text }, null, 2);
        }
      } else if (targetFormat === 'html') {
        mime = 'text/html';
        outputText = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${baseName}</title></head><body><pre>${text}</pre></body></html>`;
      }

      const blob = new Blob([outputText], { type: mime });
      const dataUrl = URL.createObjectURL(blob);
      const filename = `${baseName}-offline.${targetFormat}`;

      resolve({
        blob,
        dataUrl,
        downloadUrl: dataUrl,
        previewUrl: dataUrl,
        filename,
        size: blob.size,
        isOffline: true
      });
    };
    reader.readAsText(file);
  });
}

