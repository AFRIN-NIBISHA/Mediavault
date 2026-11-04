import { query } from '../database/db.js';
import { calculateHammingDistance } from '../services/hashService.js';
import { deleteFiles } from './fileController.js';

export async function scanDuplicates(req, res) {
  try {
    const userId = req.user.id;

    // 1. Exact Duplicate Groups using SHA-256
    const exactGroupsQuery = await query(
      `SELECT file_hash, COUNT(*) as file_count, SUM(file_size) as total_group_size
       FROM files
       WHERE user_id = $1 AND is_trashed = false AND file_hash IS NOT NULL AND file_hash != ''
       GROUP BY file_hash
       HAVING COUNT(*) > 1
       ORDER BY total_group_size DESC`,
      [userId]
    );

    const exactGroups = [];
    let exactWastedBytes = 0;

    for (const g of exactGroupsQuery.rows) {
      const filesInGroup = await query(
        `SELECT f.id, f.original_name, f.filename, f.file_size, f.file_category, f.extension,
                f.created_at, f.updated_at, m.width, m.height, fd.name as folder_name
         FROM files f
         LEFT JOIN file_metadata m ON m.file_id = f.id
         LEFT JOIN folders fd ON fd.id = f.folder_id
         WHERE f.user_id = $1 AND f.file_hash = $2 AND f.is_trashed = false
         ORDER BY f.created_at ASC`,
        [userId, g.file_hash]
      );

      const count = filesInGroup.rows.length;
      if (count > 1) {
        // Wasted = total size - size of 1 kept file
        const singleSize = filesInGroup.rows[0].file_size;
        const wasted = singleSize * (count - 1);
        exactWastedBytes += wasted;

        exactGroups.push({
          type: 'exact',
          hash: g.file_hash,
          fileCount: count,
          wastedBytes: wasted,
          files: filesInGroup.rows
        });
      }
    }

    // 2. Visually Similar Duplicate Groups using Perceptual Hash (dHash)
    const photosQuery = await query(
      `SELECT f.id, f.original_name, f.filename, f.file_size, f.perceptual_hash, f.created_at,
              m.width, m.height, fd.name as folder_name
       FROM files f
       LEFT JOIN file_metadata m ON m.file_id = f.id
       LEFT JOIN folders fd ON fd.id = f.folder_id
       WHERE f.user_id = $1 AND f.file_category = 'photos' AND f.is_trashed = false
         AND f.perceptual_hash IS NOT NULL AND f.perceptual_hash != ''
       ORDER BY f.created_at ASC`,
      [userId]
    );

    const photos = photosQuery.rows;
    const visited = new Set();
    const similarGroups = [];
    let similarWastedBytes = 0;

    for (let i = 0; i < photos.length; i++) {
      if (visited.has(photos[i].id)) continue;

      const groupMembers = [photos[i]];
      for (let j = i + 1; j < photos.length; j++) {
        if (visited.has(photos[j].id)) continue;

        // Skip if exact duplicate (already caught by exact scan)
        if (photos[i].file_hash === photos[j].file_hash) continue;

        const dist = calculateHammingDistance(photos[i].perceptual_hash, photos[j].perceptual_hash);
        // Hamming distance <= 10 indicates > 84% visual similarity
        if (dist <= 10) {
          groupMembers.push({ ...photos[j], hammingDistance: dist });
          visited.add(photos[j].id);
        }
      }

      if (groupMembers.length > 1) {
        visited.add(photos[i].id);
        let groupSize = groupMembers.reduce((acc, curr) => acc + parseInt(curr.file_size, 10), 0);
        let wasted = groupSize - parseInt(groupMembers[0].file_size, 10);
        similarWastedBytes += wasted;

        similarGroups.push({
          type: 'perceptual',
          fileCount: groupMembers.length,
          wastedBytes: wasted,
          files: groupMembers
        });
      }
    }

    return res.json({
      success: true,
      summary: {
        exactGroupsCount: exactGroups.length,
        similarGroupsCount: similarGroups.length,
        totalWastedBytes: exactWastedBytes + similarWastedBytes,
        exactWastedBytes,
        similarWastedBytes
      },
      exactGroups,
      similarGroups
    });
  } catch (err) {
    console.error('scanDuplicates error:', err);
    return res.status(500).json({ success: false, message: 'Failed to scan for duplicates.' });
  }
}

export async function deleteSelectedDuplicates(req, res) {
  // Leverage existing safe delete endpoint
  return deleteFiles(req, res);
}

