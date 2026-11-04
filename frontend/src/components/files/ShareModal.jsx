import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Lock,
  Calendar,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../common/Modal';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function ShareModal({ isOpen, onClose, file }) {
  const [accessType, setAccessType] = useState('view');
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleCreateShare = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      let expiresAt = null;
      if (expiresInDays !== 'never') {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(expiresInDays, 10));
        expiresAt = d.toISOString();
      }

      const res = await api.post('/shares', {
        fileId: file.id,
        accessType,
        password: usePassword ? password : null,
        expiresAt
      });

      if (res.data.success) {
        const link = `${window.location.origin}/share/${res.data.share.share_token}`;
        setGeneratedLink(link);
        addToast('Share link created successfully!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create share link', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    addToast('Link copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setGeneratedLink('');
    setCopied(false);
    setPassword('');
    setUsePassword(false);
  };

  if (!file) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${file.original_name}"`} maxWidth="max-w-lg">
      {!generatedLink ? (
        <form onSubmit={handleCreateShare} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-2">
              Permissions
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-3 rounded-xl border cursor-pointer flex items-center space-x-2.5 transition-all ${
                accessType === 'view' ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30' : 'border-surface-200 dark:border-surface-700'
              }`}>
                <input
                  type="radio"
                  name="accessType"
                  value="view"
                  checked={accessType === 'view'}
                  onChange={() => setAccessType('view')}
                  className="hidden"
                />
                <Globe className="w-4 h-4 text-brand-500" />
                <div>
                  <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">View Only</p>
                  <p className="text-[10px] text-surface-400">Recipients can view</p>
                </div>
              </label>

              <label className={`p-3 rounded-xl border cursor-pointer flex items-center space-x-2.5 transition-all ${
                accessType === 'download' ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30' : 'border-surface-200 dark:border-surface-700'
              }`}>
                <input
                  type="radio"
                  name="accessType"
                  value="download"
                  checked={accessType === 'download'}
                  onChange={() => setAccessType('download')}
                  className="hidden"
                />
                <ShieldCheck className="w-4 h-4 text-brand-500" />
                <div>
                  <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">Download</p>
                  <p className="text-[10px] text-surface-400">Recipients can save</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Link Expiration
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs sm:text-sm font-medium focus:outline-none focus:border-brand-500"
            >
              <option value="1">Expires in 24 Hours</option>
              <option value="7">Expires in 7 Days</option>
              <option value="30">Expires in 30 Days</option>
              <option value="never">Never Expire</option>
            </select>
          </div>

          {/* Password Protection Toggle */}
          <div className="pt-2 border-t border-surface-200 dark:border-surface-800 space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={usePassword}
                onChange={(e) => setUsePassword(e.target.checked)}
                className="rounded border-surface-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-surface-500" /> Protect with Password
              </span>
            </label>

            {usePassword && (
              <input
                type="password"
                placeholder="Enter access password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={usePassword}
                className="w-full px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs sm:text-sm focus:outline-none focus:border-brand-500"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (usePassword && !password)}
              className="px-5 py-2 text-xs sm:text-sm font-medium rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Create Share Link'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-3">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Share Link is Active
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Anyone with this link can view this file.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Unique Share URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100 dark:bg-surface-800 font-mono text-xs text-surface-800 dark:text-surface-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-brand-600 hover:underline font-medium"
            >
              Create another link
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

