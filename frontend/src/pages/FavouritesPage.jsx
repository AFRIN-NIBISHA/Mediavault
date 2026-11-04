import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import api from '../services/api';
import { FileCard } from '../components/files/FileCard';
import { FilePreviewModal } from '../components/files/FilePreviewModal';
import { ShareModal } from '../components/files/ShareModal';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function FavouritesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const { addToast } = useToast();

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await api.get('/files', { params: { favorite: 'true' } });
      if (res.data.success) {
        setFiles(res.data.files);
      }
    } catch (err) {
      addToast('Failed to load favorite files', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleToggleFavorite = async (fileId) => {
    try {
      const res = await api.put(`/files/${fileId}/favorite`);
      if (res.data.success) {
        setFiles(prev => prev.filter(f => f.id !== fileId));
        addToast('Removed from favourites', 'info');
      }
    } catch (err) {
      addToast('Failed to update favorite', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
          <span>Starred & Favourite Assets</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Quickly access all your starred digital media and important documents.
        </p>
      </div>

      {loading ? (
        <SkeletonLoader type="card" count={4} />
      ) : files.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No favourite files yet"
          description="Click the star icon on any card or file row to bookmark it for fast retrieval."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map(file => (
            <FileCard
              key={file.id}
              file={file}
              isSelected={false}
              onSelect={() => {}}
              onPreview={setPreviewFile}
              onToggleFavorite={handleToggleFavorite}
              onShare={setShareFile}
            />
          ))}
        </div>
      )}

      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        onShare={(f) => {
          setPreviewFile(null);
          setShareFile(f);
        }}
      />

      <ShareModal
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
        file={shareFile}
      />
    </div>
  );
}

