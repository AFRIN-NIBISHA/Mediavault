import React, { useState, useEffect } from 'react';
import {
  Layers,
  Image,
  FileText,
  Archive,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Clock,
  Sliders
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDateTime } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export function BulkProcessingPage() {
  const [files, setFiles] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [jobType, setJobType] = useState('batch_compress');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Batch Options
  const [quality, setQuality] = useState(75);
  const [targetFormat, setTargetFormat] = useState('webp');
  const [resizePercent, setResizePercent] = useState('50'); // 50%
  const [archiveTitle, setArchiveTitle] = useState('Batch_Archive.zip');

  const { addToast } = useToast();

  const loadFilesAndJobs = async () => {
    setLoading(true);
    try {
      const [fRes, jRes] = await Promise.all([
        api.get('/files'),
        api.get('/bulk/jobs')
      ]);
      if (fRes.data.success) setFiles(fRes.data.files);
      if (jRes.data.success) setJobs(jRes.data.jobs);
    } catch (err) {
      addToast('Failed to load processing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilesAndJobs();
  }, []);

  const handleSelectToggle = (id) => {
    setSelectedFileIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleStartBulkJob = async (e) => {
    e.preventDefault();
    if (selectedFileIds.length === 0) {
      addToast('Select at least one file to process in batch', 'warning');
      return;
    }

    setProcessing(true);
    try {
      const options = {
        quality,
        format: targetFormat,
        outputTitle: archiveTitle
      };

      const res = await api.post('/bulk/jobs', {
        jobType,
        fileIds: selectedFileIds,
        options
      });

      if (res.data.success) {
        addToast(res.data.message || 'Bulk job completed successfully!', 'success');
        setSelectedFileIds([]);
        loadFilesAndJobs();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Bulk job failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <Layers className="w-6 h-6 text-brand-500" />
          <span>Bulk Processing Centre</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Simultaneously compress, convert, archive, or optimize multiple digital assets in high-throughput worker pipelines.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Select Files */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-200 dark:border-surface-800">
              <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
                Select Files ({files.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedFileIds.length === files.length) setSelectedFileIds([]);
                  else setSelectedFileIds(files.map(f => f.id));
                }}
                className="text-xs text-brand-600 font-semibold hover:underline"
              >
                {selectedFileIds.length === files.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {files.map(file => (
                <label
                  key={file.id}
                  className={`flex items-center space-x-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                    selectedFileIds.includes(file.id)
                      ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/20'
                      : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFileIds.includes(file.id)}
                    onChange={() => handleSelectToggle(file.id)}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <div className="truncate flex-1">
                    <p className="font-semibold text-surface-800 dark:text-surface-200 truncate">
                      {file.original_name}
                    </p>
                    <p className="text-[10px] text-surface-400">
                      {formatBytes(file.file_size)} • {file.file_category}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Configure Job Form */}
        <div className="space-y-4">
          <form onSubmit={handleStartBulkJob} className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-5 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Job Configuration
            </h3>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1.5">
                Batch Operation Type
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 font-semibold focus:outline-none"
              >
                <option value="batch_compress">Batch Compress Images (Quality optimization)</option>
                <option value="batch_convert">Batch Convert Image Formats (JPG, WebP, PNG)</option>
                <option value="batch_create_zip">Batch Archive to ZIP (JSZip Engine)</option>
              </select>
            </div>

            {/* Quality Slider for Compression */}
            {jobType === 'batch_compress' && (
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Target Quality</span>
                  <span className="font-mono text-brand-600">{quality}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="95"
                  step="5"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="w-full accent-brand-600 cursor-pointer"
                />
              </div>
            )}

            {/* Target format for Conversion */}
            {jobType === 'batch_convert' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1.5">
                  Convert All To Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['webp', 'png', 'jpeg'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTargetFormat(f)}
                      className={`p-2 rounded-xl border uppercase font-bold text-center ${
                        targetFormat === f ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-surface-200 dark:border-surface-800'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Archive title */}
            {jobType === 'batch_create_zip' && (
              <div>
                <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1.5">
                  ZIP Archive Filename
                </label>
                <input
                  type="text"
                  required
                  value={archiveTitle}
                  onChange={(e) => setArchiveTitle(e.target.value)}
                  className="w-full p-2 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700"
                />
              </div>
            )}

            <div className="p-3 bg-surface-50 dark:bg-surface-800/40 rounded-xl text-surface-500">
              Files queued: <span className="font-bold text-surface-800 dark:text-surface-200">{selectedFileIds.length} files selected</span>
            </div>

            <button
              type="submit"
              disabled={processing || selectedFileIds.length === 0}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing Batch Queue...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Execute Batch Job</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Job Execution History */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Execution Job History
            </h3>

            {jobs.length === 0 ? (
              <p className="text-xs text-surface-400 py-8 text-center">No jobs executed yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {jobs.map(j => (
                  <div
                    key={j.id}
                    className="p-3 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold capitalize text-surface-900 dark:text-surface-100">
                        {j.job_type.replace(/_/g, ' ')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                        j.status === 'completed'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                          : j.status === 'processing'
                          ? 'bg-brand-100 dark:bg-brand-950 text-brand-600 animate-pulse'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                      }`}>
                        {j.status}
                      </span>
                    </div>

                    <div className="w-full bg-surface-200 dark:bg-surface-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-500 h-full rounded-full"
                        style={{ width: `${j.progress_percent || 100}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-surface-400 pt-1">
                      <span>Job #{j.id}</span>
                      <span>{formatDateTime(j.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

