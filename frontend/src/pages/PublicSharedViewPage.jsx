import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderLock,
  Download,
  Lock,
  Eye,
  Calendar,
  User,
  AlertCircle,
  FileText
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDateTime, getFileIcon } from '../utils/formatters';

export function PublicSharedViewPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSharedFile = async (pwd = null) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/shares/public/${token}`, {
        params: pwd ? { password: pwd } : undefined
      });

      if (res.data.success) {
        if (res.data.requiresPassword) {
          setRequiresPassword(true);
          setData(res.data);
        } else {
          setRequiresPassword(false);
          setData(res.data);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'This shared link is invalid, expired, or deactivated.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedFile();
  }, [token]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    fetchSharedFile(password);
  };

  const file = data?.file;
  const isImage = file?.fileCategory === 'photos';
  const isPdf = file?.fileCategory === 'pdfs' || file?.extension === 'pdf';

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col justify-between">
      {/* Header */}
      <header className="h-16 px-6 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-violet-400 flex items-center justify-center text-white shadow-md">
            <FolderLock className="w-5 h-5" />
          </div>
          <span className="font-bold text-base tracking-tight text-surface-900 dark:text-white">
            MediaVault Shared File
          </span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col items-center justify-center">
        {loading ? (
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-surface-500">Retrieving encrypted asset...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium text-center max-w-md w-full space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">Link Unavailable</h2>
            <p className="text-xs text-surface-500">{errorMsg}</p>
            <Link
              to="/"
              className="inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              Return to MediaVault
            </Link>
          </div>
        ) : requiresPassword ? (
          // Password prompt
          <div className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium max-w-md w-full space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">
                Password Protected File
              </h2>
              <p className="text-xs text-surface-500 mt-1">
                "{data?.fileName}" was shared securely by {data?.sharedBy}.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1.5">
                  Access Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:border-brand-500"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-sm transition-all"
              >
                Unlock Asset
              </button>
            </form>
          </div>
        ) : file ? (
          // File preview & download presentation
          <div className="w-full rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium overflow-hidden space-y-6">
            <div className="p-6 border-b border-surface-200 dark:border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 truncate">
                {getFileIcon(file.fileCategory, file.extension, 'w-8 h-8 flex-shrink-0')}
                <div className="truncate">
                  <h2 className="text-base font-bold text-surface-900 dark:text-surface-100 truncate">
                    {file.originalName}
                  </h2>
                  <p className="text-xs text-surface-400">
                    {formatBytes(file.fileSize)} • Shared by {file.sharedBy}
                  </p>
                </div>
              </div>

              <a
                href={`/api/shares/public/${token}/download${password ? `?password=${encodeURIComponent(password)}` : ''}`}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
            </div>

            {/* Visual stage preview */}
            <div className="p-6">
              <div className="h-[420px] rounded-2xl bg-surface-100 dark:bg-surface-950 flex items-center justify-center overflow-hidden">
                {isImage && (
                  <img
                    src={`/api/shares/public/${token}/download${password ? `?password=${encodeURIComponent(password)}` : ''}`}
                    alt={file.originalName}
                    className="max-h-full max-w-full object-contain rounded-xl"
                  />
                )}
                {isPdf && (
                  <iframe
                    src={`/api/shares/public/${token}/download${password ? `?password=${encodeURIComponent(password)}` : ''}`}
                    title={file.originalName}
                    className="w-full h-full border-none"
                  />
                )}
                {!isImage && !isPdf && (
                  <div className="text-center p-8 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-surface-900 flex items-center justify-center mx-auto shadow-subtle">
                      {getFileIcon(file.fileCategory, file.extension, 'w-8 h-8')}
                    </div>
                    <p className="text-xs text-surface-500 font-medium">
                      Direct online preview unavailable for this format.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-surface-400 border-t border-surface-200 dark:border-surface-800">
        MediaVault Secure Asset Sharing Architecture • Verified via Cryptographic Token
      </footer>
    </div>
  );
}

