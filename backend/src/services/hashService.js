import crypto from 'crypto';
import fs from 'fs';
import sharp from 'sharp';

/**
 * Compute cryptographic SHA-256 hash of a file for exact duplicate detection
 */
export function calculateSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', err => reject(err));
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Compute perceptual Difference Hash (dHash) for images (64-bit hex)
 */
export async function calculatePerceptualHash(filePath) {
  try {
    // Resize to 9 columns x 8 rows in grayscale raw format
    const { data } = await sharp(filePath)
      .resize(9, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let bits = '';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const leftPixel = data[row * 9 + col];
        const rightPixel = data[row * 9 + col + 1];
        bits += leftPixel > rightPixel ? '1' : '0';
      }
    }

    // Convert 64-bit binary string into 16-character hex string
    let hexHash = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = bits.substring(i, i + 4);
      hexHash += parseInt(nibble, 2).toString(16);
    }

    return hexHash;
  } catch (err) {
    // If file is not a supported image or corrupt, return null
    return null;
  }
}

/**
 * Calculate Hamming distance between two hex hashes (number of differing bits)
 */
export function calculateHammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const val1 = parseInt(hash1[i], 16);
    const val2 = parseInt(hash2[i], 16);
    let xor = val1 ^ val2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

