import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Image,
  FolderPlus,
  Wand2,
  Sparkles,
  Palette,
  Maximize2,
  Trash2,
  Star,
  Search,
  ArrowUpDown,
  Info,
  Layers,
  Copy,
  Plus,
  X
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDate, formatDateTime } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function PhotoToolkitPage() {
  const [photos, setPhotos] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Albums modal
  const [newAlbumModalOpen, setNewAlbumModalOpen] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');

  // Selected photo for fullscreen & metadata
  const [activePhoto, setActivePhoto] = useState(null);
  const [metaPhoto, setMetaPhoto] = useState(null);

  const navigate = useNavigate();
  const { addToast } = useToast();

  const loadPhotosAndAlbums = async () => {
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([
        api.get('/photos', {
          params: {
            albumId: selectedAlbumId !== 'all' ? selectedAlbumId : undefined,
            search: searchQuery || undefined
          }
        }),
        api.get('/photos/albums')
      ]);

      if (pRes.data.success) setPhotos(pRes.data.photos);
      if (aRes.data.success) setAlbums(aRes.data.albums);
    } catch (err) {
      addToast('Failed to load photos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotosAndAlbums();
  }, [selectedAlbumId, searchQuery]);

  const handleCreateAlbum = async (e) => {
    e.preventDefault();
    if (!albumName.trim()) return;

    try {
      const res = await api.post('/photos/albums', {
        name: albumName.trim(),
        description: albumDesc.trim()
      });
      if (res.data.success) {
        addToast('Album created', 'success');
        setNewAlbumModalOpen(false);
        setAlbumName('');
        setAlbumDesc('');
        loadPhotosAndAlbums();
      }
    } catch (err) {
      addToast('Failed to create album', 'error');
    }
  };

  const handleToggleFavorite = async (photoId) => {
    try {
      const res = await api.put(`/files/${photoId}/favorite`);
      if (res.data.success) {
        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, is_favorite: res.data.isFavorite } : p));
      }
    } catch (err) {
      addToast('Failed to update favorite', 'error');
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Move photo to Recycle Bin?')) return;
    try {
      await api.post('/files/delete', { fileIds: [photoId], permanent: false });
      addToast('Photo moved to Recycle Bin', 'success');
      loadPhotosAndAlbums();
    } catch (err) {
      addToast('Failed to delete photo', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2.5">
            <Image className="w-6 h-6 text-brand-500" />
            <span>Photo Toolkit</span>
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Visual asset management, albums, EXIF inspection, and advanced image processing studio.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setNewAlbumModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-50 flex items-center gap-1.5 shadow-subtle"
          >
            <FolderPlus className="w-4 h-4 text-brand-500" />
            <span>New Album</span>
          </button>
          <button
            onClick={() => navigate('/image-editor')}
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Wand2 className="w-4 h-4" />
            <span>Open Image Studio</span>
          </button>
        </div>
      </div>

      {/* AI Studio & Design Presets Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => navigate('/ai-studio')}
          className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200/80 dark:border-purple-800/80 shadow-premium flex items-center justify-between cursor-pointer hover:border-purple-400 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  AI Photo Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-600 text-white uppercase">
                  Neural AI
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Background removal, text-to-image synthesis, inpainting, and neural upscaling.
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-sm">
            Launch →
          </button>
        </div>

        <div
          onClick={() => navigate('/design-studio')}
          className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200/80 dark:border-purple-800/80 shadow-premium flex items-center justify-between cursor-pointer hover:border-purple-400 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  Creative Design Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 uppercase">
                  10 Templates
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Instagram, YouTube thumbnails, photo collages, and split comparisons.
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl bg-white text-purple-700 border border-purple-200 text-xs font-semibold shadow-sm hover:bg-purple-50">
            Templates →
          </button>
        </div>
      </div>

      {/* Albums horizontal carousel */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
          Photo Albums
        </span>
        <div className="flex items-center gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedAlbumId('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedAlbumId === 'all'
                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                : 'bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-800 hover:bg-surface-50'
            }`}
          >
            All Photos ({photos.length})
          </button>

          {albums.map(album => (
            <button
              key={album.id}
              onClick={() => setSelectedAlbumId(String(album.id))}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                selectedAlbumId === String(album.id)
                  ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                  : 'bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-800 hover:bg-surface-50'
              }`}
            >
              <span>{album.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-200/60 dark:bg-surface-800 text-surface-500">
                {album.photo_count || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Studio & Design Presets Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => navigate('/ai-studio')}
          className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200/80 dark:border-purple-800/80 shadow-premium flex items-center justify-between cursor-pointer hover:border-purple-400 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  AI Photo Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-600 text-white uppercase">
                  Neural AI
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Background removal, text-to-image synthesis, inpainting, and neural upscaling.
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-sm">
            Launch →
          </button>
        </div>

        <div
          onClick={() => navigate('/design-studio')}
          className="p-5 rounded-3xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200/80 dark:border-purple-800/80 shadow-premium flex items-center justify-between cursor-pointer hover:border-purple-400 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  Creative Design Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-700 uppercase">
                  10 Templates
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Instagram, YouTube thumbnails, photo collages, and split comparisons.
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-xl bg-white text-purple-700 border border-purple-200 text-xs font-semibold shadow-sm hover:bg-purple-50">
            Templates →
          </button>
        </div>
      </div>

      {/* Photos Grid */}
      {loading ? (
        <SkeletonLoader type="card" count={8} />
      ) : photos.length === 0 ? (
        <EmptyState
          icon={Image}
          title="No photos found"
          description="Upload photos or import imagery to use the Photo Toolkit."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map(photo => (
            <div
              key={photo.id}
              className="group relative rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 overflow-hidden shadow-subtle hover:shadow-premium transition-all flex flex-col justify-between"
            >
              {/* Image Preview Box */}
              <div
                onClick={() => setActivePhoto(photo)}
                className="h-44 bg-surface-100 dark:bg-surface-800 relative cursor-pointer overflow-hidden"
              >
                <img
                  src={`/api/files/${photo.id}/preview`}
                  alt={photo.original_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Overlay hover action buttons */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3 text-white">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/image-editor?fileId=${photo.id}`);
                      }}
                      title="Edit in Image Studio"
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 backdrop-blur-sm"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMetaPhoto(photo);
                      }}
                      title="View EXIF & Details"
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 backdrop-blur-sm"
                    >
                      <Info className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(photo.id);
                      }}
                      title="Move to Trash (Delete)"
                      className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-600 backdrop-blur-sm text-white transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(photo.id);
                    }}
                    className={`p-1.5 rounded-lg backdrop-blur-sm ${photo.is_favorite ? 'text-amber-400 bg-white/30' : 'text-white bg-white/20'}`}
                  >
                    <Star className={`w-3.5 h-3.5 ${photo.is_favorite ? 'fill-amber-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Photo metadata footer */}
              <div className="p-3">
                <h4
                  onClick={() => setActivePhoto(photo)}
                  className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate cursor-pointer hover:text-brand-600"
                  title={photo.original_name}
                >
                  {photo.original_name}
                </h4>
                <div className="flex items-center justify-between mt-1 text-[11px] text-surface-400">
                  <span>{photo.width ? `${photo.width}×${photo.height}` : formatBytes(photo.file_size)}</span>
                  <span className="uppercase">{photo.extension}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Photo Lightbox Modal (Light Theme & Zero-Gap Portal) */}
      {activePhoto && createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setActivePhoto(null)} />
          <div className="relative w-full max-w-5xl h-[92vh] bg-white dark:bg-surface-900 rounded-3xl shadow-elevated border border-surface-200 dark:border-surface-800 z-10 flex flex-col overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="h-16 px-6 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between gap-4 bg-white/95 dark:bg-surface-900/95 backdrop-blur-sm flex-shrink-0">
              <div className="truncate">
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100 truncate">
                  {activePhoto.original_name}
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  {activePhoto.width} × {activePhoto.height} px • {formatBytes(activePhoto.file_size)} • {formatDate(activePhoto.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = activePhoto.id;
                    setActivePhoto(null);
                    navigate(`/image-editor?fileId=${id}`);
                  }}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Open in Editor</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const id = activePhoto.id;
                    setActivePhoto(null);
                    handleDeletePhoto(id);
                  }}
                  title="Move to Trash (Delete)"
                  className="p-2 rounded-xl text-surface-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  className="p-2 rounded-xl text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Stage */}
            <div className="flex-1 bg-surface-50 dark:bg-surface-950/50 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
              <img
                src={`/api/files/${activePhoto.id}/preview`}
                alt={activePhoto.original_name}
                className="max-h-full max-w-full object-contain rounded-2xl shadow-elevated"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* EXIF & Metadata Inspector Modal */}
      <Modal
        isOpen={!!metaPhoto}
        onClose={() => setMetaPhoto(null)}
        title="Photo Metadata & EXIF Details"
        maxWidth="max-w-md"
      >
        {metaPhoto && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-surface-50 dark:bg-surface-800/60 rounded-2xl border border-surface-200 dark:border-surface-700">
              <div>
                <span className="text-surface-400 block mb-0.5">Resolution</span>
                <span className="font-semibold text-surface-800 dark:text-surface-200">
                  {metaPhoto.width && metaPhoto.height ? `${metaPhoto.width} × ${metaPhoto.height} px` : 'Unspecified'}
                </span>
              </div>
              <div>
                <span className="text-surface-400 block mb-0.5">Format</span>
                <span className="font-semibold uppercase text-surface-800 dark:text-surface-200">
                  {metaPhoto.extension}
                </span>
              </div>
              <div>
                <span className="text-surface-400 block mb-0.5">File Size</span>
                <span className="font-semibold text-surface-800 dark:text-surface-200">
                  {formatBytes(metaPhoto.file_size)}
                </span>
              </div>
              <div>
                <span className="text-surface-400 block mb-0.5">Captured / Added</span>
                <span className="font-semibold text-surface-800 dark:text-surface-200">
                  {formatDate(metaPhoto.created_at)}
                </span>
              </div>
            </div>

            <div>
              <span className="text-surface-400 block mb-1 font-semibold uppercase text-[10px]">
                Perceptual Image Hash (dHash)
              </span>
              <p className="font-mono text-[11px] p-2 bg-surface-100 dark:bg-surface-800 rounded-xl break-all">
                {metaPhoto.perceptual_hash || 'dHash calculation active'}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setMetaPhoto(null)}
                className="px-4 py-2 bg-surface-200 dark:bg-surface-800 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* New Album Modal */}
      <Modal
        isOpen={newAlbumModalOpen}
        onClose={() => setNewAlbumModalOpen(false)}
        title="Create Photo Album"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateAlbum} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Album Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Portfolio Highlights, Summer 2026"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:border-brand-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              placeholder="Add notes about this album collection..."
              value={albumDesc}
              onChange={(e) => setAlbumDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:border-brand-500 h-20"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={() => setNewAlbumModalOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white"
            >
              Create Album
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

