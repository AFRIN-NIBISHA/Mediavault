import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import api from '../services/api';
import { FileCard } from '../components/files/FileCard';
import { FilePreviewModal } from '../components/files/FilePreviewModal';
import { ShareModal } from '../components/files/ShareModal';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function RecentFilesPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const { addToast } = useToast();

  const loadRecent = async () => {
    setLoading(true);
    try {
      const res = await api.get('/files', { params: { sortBy: 'updated_at', order: 'desc', limit: 40 } });
      if (res.data.success) {
        setFiles(res.data.files);
      }
    } catch (err) {
      addToast('Failed to load recent files', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecent();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <Clock className="w-6 h-6 text-brand-500" />
          <span>Recent Activity & Updates</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Files and assets recently uploaded, edited, or modified across your workspace.
        </p>
      </div>

      {loading ? (
        <SkeletonLoader type="card" count={8} />
      ) : files.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No recent files"
          description="Uploaded and edited assets will appear here sorted chronologically."
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
              onToggleFavorite={async () => {
                await api.put(`/files/${file.id}/favorite`);
                loadRecent();
              }}
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

