import React, { useState, useEffect } from 'react';
import {
  Layers,
  FileText,
  Scissors,
  RotateCw,
  Image as ImageIcon,
  Check,
  Download,
  Eye,
  Plus,
  ArrowRight,
  ListOrdered
} from 'lucide-react';
import api from '../services/api';
import { formatBytes } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export function PdfToolsPage() {
  const [pdfs, setPdfs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedPdfId, setSelectedPdfId] = useState('');
  const [activeTool, setActiveTool] = useState('merge'); // 'merge' | 'split' | 'extract' | 'rotate' | 'reorder' | 'img2pdf'
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Tool Specific States
  // 1. Merge
  const [mergeIds, setMergeIds] = useState([]);
  const [mergeTitle, setMergeTitle] = useState('Consolidated_Document.pdf');

  // 2. Extract
  const [extractPagesStr, setExtractPagesStr] = useState('1, 2');
  const [extractTitle, setExtractTitle] = useState('Extracted_Pages.pdf');

  // 3. Reorder
  const [reorderOrderStr, setReorderOrderStr] = useState('2, 1');

  // 4. Rotate
  const [rotateAngle, setRotateAngle] = useState(90);

  // 5. Image to PDF
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [img2PdfTitle, setImg2PdfTitle] = useState('Compiled_Photos.pdf');

  // Output generated file
  const [generatedFile, setGeneratedFile] = useState(null);

  const { addToast } = useToast();

  const loadAssets = async () => {
    setLoading(true);
    try {
      const [allFilesRes, photoRes] = await Promise.all([
        api.get('/files', { params: { limit: 100 } }),
        api.get('/files', { params: { category: 'photos', limit: 100 } })
      ]);

      if (allFilesRes.data.success) {
        const all = allFilesRes.data.files || [];
        const pdfFiles = all.filter(f =>
          f.extension?.toLowerCase() === 'pdf' ||
          f.file_category === 'pdfs' ||
          f.mime_type === 'application/pdf' ||
          f.original_name?.toLowerCase().endsWith('.pdf')
        );
        setPdfs(pdfFiles);
        if (pdfFiles.length > 0) {
          setSelectedPdfId(prev => (prev && pdfFiles.some(p => p.id === prev)) ? prev : pdfFiles[0].id);
        }
      }
      if (photoRes.data.success) {
        setPhotos(photoRes.data.files || []);
      }
    } catch (err) {
      console.error('Failed to load assets for PDF studio:', err);
      addToast('Failed to load assets for PDF studio', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectPdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setProcessing(true);
    try {
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newFile = res.data.file || (res.data.files && res.data.files[0]);
      if (res.data.success && newFile) {
        setPdfs(prev => [newFile, ...prev.filter(p => p.id !== newFile.id)]);
        setSelectedPdfId(newFile.id);
        addToast(`Uploaded and selected "${newFile.original_name}"!`, 'success');
        await loadAssets();
      } else {
        addToast(res.data.message || 'Failed to upload PDF', 'error');
      }
    } catch (err) {
      console.error('Direct PDF upload failed:', err);
      const errorMsg = err.response?.data?.message || (err.response?.status === 500 ? 'Server was restarting. Please try again now.' : err.message) || 'Failed to upload PDF';
      addToast(errorMsg, 'error');
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleMergeSubmit = async (e) => {
    e.preventDefault();
    if (mergeIds.length < 2) {
      addToast('Please select at least 2 PDF documents to merge', 'warning');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post('/pdf/merge', {
        fileIds: mergeIds,
        outputTitle: mergeTitle.trim()
      });
      if (res.data.success) {
        addToast('PDFs merged successfully!', 'success');
        setGeneratedFile(res.data.file);
        loadAssets();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Merge failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSplitSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPdfId) return;

    setProcessing(true);
    try {
      const res = await api.post(`/pdf/${selectedPdfId}/split`);
      if (res.data.success) {
        addToast(res.data.message || 'PDF split into pages', 'success');
        loadAssets();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Split failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleExtractSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPdfId) return;

    const pageNumbers = extractPagesStr
      .split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);

    if (pageNumbers.length === 0) {
      addToast('Provide valid comma-separated page numbers (e.g. 1, 2, 5)', 'warning');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post(`/pdf/${selectedPdfId}/extract`, {
        pageNumbers,
        outputTitle: extractTitle.trim()
      });
      if (res.data.success) {
        addToast('Pages extracted into new PDF!', 'success');
        setGeneratedFile(res.data.file);
        loadAssets();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Extraction failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReorderSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPdfId) return;

    const newOrder = reorderOrderStr
      .split(',')
      .map(p => parseInt(p.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);

    setProcessing(true);
    try {
      const res = await api.post(`/pdf/${selectedPdfId}/reorder`, { newOrder });
      if (res.data.success) {
        addToast('PDF pages reordered successfully!', 'success');
        setGeneratedFile(res.data.file);
        loadAssets();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Reorder failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRotateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPdfId) return;

    setProcessing(true);
    try {
      const res = await api.post(`/pdf/${selectedPdfId}/rotate`, { angle: rotateAngle });
      if (res.data.success) {
        addToast(`PDF pages rotated by ${rotateAngle}°!`, 'success');
        setGeneratedFile(res.data.file);
        loadAssets();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Rotation failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleImagesToPdfSubmit = async (e) => {
    e.preventDefault();
    if (selectedPhotoIds.length === 0) {
      addToast('Select at least one photo to convert to PDF', 'warning');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post('/pdf/images-to-pdf', {
        imageFileIds: selectedPhotoIds,
        outputTitle: img2PdfTitle.trim()
      });
      if (res.data.success) {
        addToast('Photos converted to PDF document!', 'success');
        setGeneratedFile(res.data.file);
        loadAssets();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Conversion failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const renderPdfSelector = (label = 'Target PDF Document') => {
    const selectedPdf = pdfs.find(p => p.id === selectedPdfId);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold uppercase text-surface-500">
            {label}
          </label>
          <label className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>Upload New PDF</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleDirectPdfUpload}
            />
          </label>
        </div>

        <select
          value={selectedPdfId}
          onChange={(e) => setSelectedPdfId(e.target.value)}
          className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-xs font-semibold text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
        >
          {pdfs.length === 0 ? (
            <option value="" disabled>
              ⚠️ No PDF uploaded yet — Click "+ Upload New PDF" above
            </option>
          ) : (
            <>
              <option value="" disabled>
                -- Select a PDF Document ({pdfs.length} available) --
              </option>
              {pdfs.map(p => (
                <option key={p.id} value={p.id}>
                  📄 {p.original_name} ({formatBytes(p.file_size)})
                </option>
              ))}
            </>
          )}
        </select>

        {/* If no PDFs exist, show empty dropzone prompt */}
        {pdfs.length === 0 && (
          <label className="border-2 border-dashed border-rose-200 dark:border-rose-900/40 hover:border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
            <FileText className="w-8 h-8 text-rose-500 mb-1" />
            <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
              No PDF Document Selected
            </span>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
              Click here to upload a PDF from your computer
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={handleDirectPdfUpload}
            />
          </label>
        )}

        {/* Selected PDF Badge Info */}
        {selectedPdf && (
          <div className="flex items-center justify-between p-2.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-rose-600 shrink-0" />
              <div className="min-w-0 truncate">
                <p className="font-bold text-surface-900 dark:text-surface-100 truncate">{selectedPdf.original_name}</p>
                <p className="text-[10px] text-surface-500">{formatBytes(selectedPdf.file_size)}</p>
              </div>
            </div>
            <a
              href={`/api/files/${selectedPdf.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 shrink-0 flex items-center gap-1 hover:underline"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <Layers className="w-6 h-6 text-rose-500" />
          <span>Professional PDF Tools Suite</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          In-memory PDF manipulation: merge documents, split pages, rotate orientations, and compile images to PDF.
        </p>
      </div>

      {/* Main Studio Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tool Navigation & Controls */}
        <div className="space-y-4">
          <div className="p-2 bg-surface-100 dark:bg-surface-800 rounded-2xl grid grid-cols-3 gap-1">
            {[
              { id: 'merge', label: 'Merge' },
              { id: 'split', label: 'Split' },
              { id: 'extract', label: 'Extract' },
              { id: 'rotate', label: 'Rotate' },
              { id: 'reorder', label: 'Reorder' },
              { id: 'img2pdf', label: 'Img → PDF' }
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id);
                  setGeneratedFile(null);
                }}
                className={`py-2 px-1 text-center rounded-xl text-xs font-semibold transition-all ${
                  activeTool === tool.id
                    ? 'bg-white dark:bg-surface-700 text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-surface-600 dark:text-surface-400 hover:text-surface-900'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {/* Tool Control Forms */}
          <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium">
            {/* 1. Merge PDFs Form */}
            {activeTool === 'merge' && (
              <form onSubmit={handleMergeSubmit} className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                    Merge Multiple PDFs
                  </h3>
                  <label className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload New PDF</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={handleDirectPdfUpload}
                    />
                  </label>
                </div>
                <p className="text-surface-500">
                  Select 2 or more PDFs from your storage to concatenate into a single document.
                </p>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-surface-200 dark:border-surface-800 p-2 rounded-xl">
                  {pdfs.length === 0 ? (
                    <div className="p-3 text-center text-surface-400 text-xs">
                      No PDF documents uploaded yet. Click "+ Upload New PDF" above to add documents.
                    </div>
                  ) : (
                    pdfs.map(pdf => (
                      <label key={pdf.id} className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mergeIds.includes(pdf.id)}
                          onChange={() => {
                            setMergeIds(prev =>
                              prev.includes(pdf.id) ? prev.filter(x => x !== pdf.id) : [...prev, pdf.id]
                            );
                          }}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="truncate font-medium">{pdf.original_name}</span>
                        <span className="text-[10px] text-surface-400 ml-auto">({formatBytes(pdf.file_size)})</span>
                      </label>
                    ))
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1">
                    Output Filename
                  </label>
                  <input
                    type="text"
                    required
                    value={mergeTitle}
                    onChange={(e) => setMergeTitle(e.target.value)}
                    className="w-full p-2 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing || mergeIds.length < 2}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl disabled:opacity-50 shadow-sm"
                >
                  {processing ? 'Merging PDFs...' : `Merge Selected (${mergeIds.length})`}
                </button>
              </form>
            )}

            {/* 2. Split PDF Form */}
            {activeTool === 'split' && (
              <form onSubmit={handleSplitSubmit} className="space-y-4 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                  Split Document into Pages
                </h3>
                <p className="text-surface-500">
                  Separates every single page into an individual standalone PDF file.
                </p>

                {renderPdfSelector('Target PDF Document')}

                <button
                  type="submit"
                  disabled={processing || !selectedPdfId}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl disabled:opacity-50 shadow-sm"
                >
                  {processing ? 'Splitting Pages...' : 'Split PDF Document'}
                </button>
              </form>
            )}

            {/* 3. Extract Specific Pages */}
            {activeTool === 'extract' && (
              <form onSubmit={handleExtractSubmit} className="space-y-4 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                  Extract Specific Pages
                </h3>
                {renderPdfSelector('Target PDF')}

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1">
                    Page Numbers (Comma-separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={extractPagesStr}
                    onChange={(e) => setExtractPagesStr(e.target.value)}
                    placeholder="e.g. 1, 3, 5"
                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1">
                    Output Document Title
                  </label>
                  <input
                    type="text"
                    required
                    value={extractTitle}
                    onChange={(e) => setExtractTitle(e.target.value)}
                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-xs font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing || !selectedPdfId}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {processing ? 'Extracting Pages...' : 'Extract Pages'}
                </button>
              </form>
            )}

            {/* 4. Rotate PDF */}
            {activeTool === 'rotate' && (
              <form onSubmit={handleRotateSubmit} className="space-y-4 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                  Rotate PDF Orientation
                </h3>
                {renderPdfSelector('Target PDF')}

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1">
                    Rotation Angle
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[90, 180, 270].map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setRotateAngle(a)}
                        className={`p-2 rounded-xl border font-bold text-center ${
                          rotateAngle === a ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-surface-200 dark:border-surface-800'
                        }`}
                      >
                        {a}° Clockwise
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={processing || !selectedPdfId}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {processing ? 'Rotating Document...' : 'Rotate PDF Pages'}
                </button>
              </form>
            )}

            {/* 5. Reorder Pages */}
            {activeTool === 'reorder' && (
              <form onSubmit={handleReorderSubmit} className="space-y-4 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                  Reorder PDF Pages
                </h3>
                {renderPdfSelector('Target PDF')}

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1">
                    New Page Sequence (e.g. 3, 1, 2)
                  </label>
                  <input
                    type="text"
                    required
                    value={reorderOrderStr}
                    onChange={(e) => setReorderOrderStr(e.target.value)}
                    placeholder="e.g. 3, 1, 2"
                    className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-xs font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing || !selectedPdfId}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {processing ? 'Reordering...' : 'Reorder Pages'}
                </button>
              </form>
            )}

            {/* 6. Images to PDF */}
            {activeTool === 'img2pdf' && (
              <form onSubmit={handleImagesToPdfSubmit} className="space-y-4 text-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                  Convert Images to PDF
                </h3>
                <p className="text-surface-500">
                  Embeds photos sequentially into a unified multi-page PDF document.
                </p>

                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-surface-200 dark:border-surface-800 p-2 rounded-xl">
                  {photos.length === 0 ? (
                    <div className="p-3 text-center text-surface-400 text-xs">
                      No photos uploaded yet. Upload images via the top Upload button first.
                    </div>
                  ) : (
                    photos.map(img => (
                      <label key={img.id} className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPhotoIds.includes(img.id)}
                          onChange={() => {
                            setSelectedPhotoIds(prev =>
                              prev.includes(img.id) ? prev.filter(x => x !== img.id) : [...prev, img.id]
                            );
                          }}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="truncate font-medium">{img.original_name}</span>
                      </label>
                    ))
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1">
                    PDF Document Name
                  </label>
                  <input
                    type="text"
                    required
                    value={img2PdfTitle}
                    onChange={(e) => setImg2PdfTitle(e.target.value)}
                    className="w-full p-2 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing || selectedPhotoIds.length === 0}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {processing ? 'Converting Images...' : `Convert ${selectedPhotoIds.length} Photos to PDF`}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Live PDF Document Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium h-[580px] flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800">
              <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
                Document Preview Window
              </span>
              {generatedFile && (
                <a
                  href={`/api/files/${generatedFile.id}/download`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Result ({formatBytes(generatedFile.file_size)})</span>
                </a>
              )}
            </div>

            <div className="flex-1 bg-surface-100 dark:bg-surface-950 rounded-2xl overflow-hidden mt-3 flex items-center justify-center">
              {generatedFile ? (
                <iframe
                  src={`/api/files/${generatedFile.id}/preview`}
                  title="PDF Output Preview"
                  className="w-full h-full border-none"
                />
              ) : selectedPdfId ? (
                <iframe
                  src={`/api/files/${selectedPdfId}/preview`}
                  title="PDF Source Preview"
                  className="w-full h-full border-none"
                />
              ) : (
                <div className="text-center p-8 text-surface-400 text-xs">
                  Select or generate a PDF to display interactive viewer.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

