import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Palette,
  LayoutGrid,
  Columns2,
  Sparkles,
  Download,
  FolderPlus,
  RefreshCw,
  Plus,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Layers,
  FileImage,
  Maximize2
} from 'lucide-react';
import api from '../services/api';
import { formatBytes } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export function DesignStudioPage() {
  const [activeTab, setActiveTab] = useState('templates'); // 'templates', 'collage', 'compare', 'merge'
  const [templates, setTemplates] = useState([]);
  const [userPhotos, setUserPhotos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Collage State
  const [collagePhotos, setCollagePhotos] = useState([]);
  const [collageLayout, setCollageLayout] = useState('2x2');
  const [collageGap, setCollageGap] = useState(16);
  const [collageRadius, setCollageRadius] = useState(16);
  const [collageBg, setCollageBg] = useState('#ffffff');
  const [collageResult, setCollageResult] = useState(null);
  const [processingCollage, setProcessingCollage] = useState(false);

  // Compare State
  const [compareLeft, setCompareLeft] = useState(null);
  const [compareRight, setCompareRight] = useState(null);
  const [compareSlider, setCompareSlider] = useState(50); // 0 to 100%

  // Merge State
  const [mergePhotos, setMergePhotos] = useState([]);
  const [mergeMode, setMergeMode] = useState('horizontal');
  const [mergeGap, setMergeGap] = useState(12);
  const [mergeResult, setMergeResult] = useState(null);
  const [processingMerge, setProcessingMerge] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchUserPhotos();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/studio/templates');
      if (res.data.success) {
        setTemplates(res.data.templates);
      }
    } catch (err) {
      console.error('Failed loading templates:', err);
    }
  };

  const fetchUserPhotos = async () => {
    try {
      const res = await api.get('/files?category=photos');
      if (res.data.success && res.data.files.length > 0) {
        setUserPhotos(res.data.files);
        // Pre-fill compare slots if available
        if (res.data.files.length >= 2) {
          setCompareLeft(res.data.files[0]);
          setCompareRight(res.data.files[1]);
          setCollagePhotos([res.data.files[0].id, res.data.files[1].id]);
          setMergePhotos([res.data.files[0].id, res.data.files[1].id]);
        }
      }
    } catch (err) {
      console.error('Failed loading user photos:', err);
    }
  };

  // 1-Click Load Template into Image Editor Canvas
  const handleOpenTemplate = (tmpl) => {
    // Store template preset in sessionStorage for ImageEditorPage to pick up
    sessionStorage.setItem('active_studio_template', JSON.stringify(tmpl));
    navigate('/image-editor');
  };

  // Collage Generator
  const handleCreateCollage = async () => {
    if (collagePhotos.length === 0) {
      addToast('Please select at least 2 photos for the collage.', 'warning');
      return;
    }
    setProcessingCollage(true);
    setCollageResult(null);
    try {
      const res = await api.post('/studio/compose/collage', {
        fileIds: collagePhotos,
        layout: collageLayout,
        gap: collageGap,
        cornerRadius: collageRadius,
        backgroundColor: collageBg,
        saveToVault: true
      });
      if (res.data.success) {
        setCollageResult(res.data);
        addToast('Photo collage created and saved to MediaVault!', 'success');
        fetchUserPhotos();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed creating collage', 'error');
    } finally {
      setProcessingCollage(false);
    }
  };

  // Merge Generator
  const handleMergeImages = async () => {
    if (mergePhotos.length < 2) {
      addToast('Select at least 2 photos to merge.', 'warning');
      return;
    }
    setProcessingMerge(true);
    setMergeResult(null);
    try {
      const res = await api.post('/studio/compose/merge', {
        fileIds: mergePhotos,
        mode: mergeMode,
        gap: mergeGap,
        saveToVault: true
      });
      if (res.data.success) {
        setMergeResult(res.data);
        addToast('Images merged and saved to MediaVault!', 'success');
        fetchUserPhotos();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Image merge failed', 'error');
    } finally {
      setProcessingMerge(false);
    }
  };

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300">
              <Palette className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
              Creative Design Studio & Composition
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 uppercase">
              10 Ready Presets
            </span>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Professional graphic design templates, interactive photo collages, and side-by-side asset comparison.
          </p>
        </div>

        {/* Quick Launch Studio */}
        <button
          onClick={() => navigate('/image-editor')}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <Layers className="w-4 h-4" />
          <span>Open Full Studio Canvas</span>
        </button>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200 dark:border-surface-800 pb-2">
        {[
          { id: 'templates', label: 'Design Templates (10)', icon: Palette },
          { id: 'collage', label: 'Photo Collage Maker', icon: LayoutGrid },
          { id: 'compare', label: 'Side-by-Side Comparison', icon: Columns2 },
          { id: 'merge', label: 'Merge Multiple Photos', icon: Layers }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-surface-900 text-surface-600 hover:text-surface-900 border border-surface-200 dark:border-surface-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DESIGN TEMPLATES SHOWCASE */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'All Templates' },
              { id: 'social', label: 'Social Media' },
              { id: 'marketing', label: 'Marketing & Posters' },
              { id: 'identity', label: 'ID & Passport Badges' },
              { id: 'personal', label: 'Celebration & Invitations' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(tmpl => {
              const parsed = typeof tmpl.template_data === 'string' ? JSON.parse(tmpl.template_data) : tmpl.template_data;
              return (
                <div
                  key={tmpl.id}
                  className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium flex flex-col justify-between hover:border-purple-300 transition-all group"
                >
                  <div>
                    {/* Simulated Template Visual Canvas Preview */}
                    <div
                      className="h-48 rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative border border-surface-200/80 mb-4 transition-transform group-hover:scale-[1.02]"
                      style={{ backgroundColor: parsed.backgroundColor || '#f8fafc' }}
                    >
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700">
                          {tmpl.category}
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-black/5 text-surface-700">
                          {tmpl.width} × {tmpl.height} px
                        </span>
                      </div>

                      {/* Representation of template headline */}
                      <div className="my-auto">
                        <div className="text-base font-black text-surface-900 truncate">
                          {tmpl.name}
                        </div>
                        <div className="text-[11px] text-surface-500 mt-1 line-clamp-2">
                          {tmpl.description}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-purple-600 font-semibold">
                        <Sparkles className="w-3 h-3" />
                        <span>Interactive Multi-Layer Layout</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100 mb-1">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-surface-500 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>

                  {/* Open & Customize CTA */}
                  <div className="pt-4 mt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-surface-400">
                      {tmpl.width}×{tmpl.height}
                    </span>
                    <button
                      onClick={() => handleOpenTemplate(tmpl)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <span>Customize in Studio</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PHOTO COLLAGE MAKER */}
      {activeTab === 'collage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="p-6 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium space-y-6">
            <div>
              <h3 className="text-sm font-bold text-surface-900 mb-1">Collage Layout</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { id: '2x2', label: '2×2 Quad Grid' },
                  { id: '1_top_2_bottom', label: '1 Large + 2 Split' },
                  { id: '3_vertical_strips', label: '3 Vertical Strips' },
                  { id: '2_horizontal', label: '2 Split Screen' }
                ].map(l => (
                  <button
                    key={l.id}
                    onClick={() => setCollageLayout(l.id)}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition-all ${
                      collageLayout === l.id
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-surface-200 hover:bg-surface-50 text-surface-600'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Multi-Selector */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-surface-700 uppercase tracking-wider">
                  Select Photos ({collagePhotos.length} selected)
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-surface-200 rounded-xl bg-surface-50">
                {userPhotos.map(p => {
                  const isSelected = collagePhotos.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (isSelected) {
                          setCollagePhotos(collagePhotos.filter(id => id !== p.id));
                        } else {
                          if (collagePhotos.length >= 4) {
                            addToast('Maximum 4 photos allowed for this collage layout.', 'info');
                            return;
                          }
                          setCollagePhotos([...collagePhotos, p.id]);
                        }
                      }}
                      className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected ? 'border-purple-600 ring-2 ring-purple-500/30' : 'border-transparent'
                      }`}
                    >
                      <img src={`/api/files/${p.id}/preview`} alt={p.original_name} className="w-full h-16 object-cover" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spacing & Radius */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">Gap: {collageGap}px</label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={collageGap}
                  onChange={(e) => setCollageGap(parseInt(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-surface-600 mb-1">Corner Radius: {collageRadius}px</label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={collageRadius}
                  onChange={(e) => setCollageRadius(parseInt(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>
            </div>

            <button
              onClick={handleCreateCollage}
              disabled={processingCollage || collagePhotos.length === 0}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {processingCollage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Collage...</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-4 h-4" />
                  <span>Build & Save Collage</span>
                </>
              )}
            </button>
          </div>

          {/* Preview Canvas */}
          <div className="lg:col-span-2 p-6 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3 mb-4">
              <span className="text-xs font-bold text-surface-900">Live Collage Preview</span>
              {collageResult?.file && (
                <a
                  href={`/api/files/${collageResult.file.id}/download`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Collage</span>
                </a>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center bg-surface-50 rounded-2xl p-4 border border-surface-100">
              {collageResult ? (
                <img
                  src={collageResult.previewUrl}
                  alt="Collage"
                  className="max-h-[460px] max-w-full object-contain rounded-2xl shadow-elevated"
                />
              ) : (
                <div className="text-center p-8 text-surface-400 text-xs">
                  Select photos on the left and click "Build & Save Collage" to preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SIDE-BY-SIDE PHOTO COMPARISON */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          {/* Photo selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider block mb-2">
                Photo A (Left / Base)
              </span>
              <select
                value={compareLeft?.id || ''}
                onChange={(e) => setCompareLeft(userPhotos.find(p => p.id === parseInt(e.target.value)))}
                className="w-full p-2.5 rounded-xl border border-surface-200 bg-surface-50 text-xs"
              >
                {userPhotos.map(p => (
                  <option key={p.id} value={p.id}>{p.original_name} ({formatBytes(p.file_size)})</option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-2">
                Photo B (Right / Modified)
              </span>
              <select
                value={compareRight?.id || ''}
                onChange={(e) => setCompareRight(userPhotos.find(p => p.id === parseInt(e.target.value)))}
                className="w-full p-2.5 rounded-xl border border-surface-200 bg-surface-50 text-xs"
              >
                {userPhotos.map(p => (
                  <option key={p.id} value={p.id}>{p.original_name} ({formatBytes(p.file_size)})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Split Curtain Comparison Viewer */}
          {compareLeft && compareRight && (
            <div className="p-6 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-purple-600">👈 {compareLeft.original_name}</span>
                <span className="text-surface-400">Curtain Split: {compareSlider}%</span>
                <span className="text-emerald-600">{compareRight.original_name} 👉</span>
              </div>

              {/* Range Slider Control */}
              <input
                type="range"
                min="0"
                max="100"
                value={compareSlider}
                onChange={(e) => setCompareSlider(parseInt(e.target.value))}
                className="w-full accent-purple-600 cursor-ew-resize"
              />

              <div className="relative h-[480px] bg-surface-100 rounded-2xl overflow-hidden border border-surface-200 flex items-center justify-center">
                {/* Right Image (Background) */}
                <img
                  src={`/api/files/${compareRight.id}/preview`}
                  alt="Right"
                  className="absolute inset-0 w-full h-full object-contain"
                />

                {/* Left Image (Clipped Overlay) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${compareSlider}%` }}
                >
                  <img
                    src={`/api/files/${compareLeft.id}/preview`}
                    alt="Left"
                    className="absolute inset-0 w-full h-full object-contain max-w-none"
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>

                {/* Vertical Divider Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-elevated pointer-events-none"
                  style={{ left: `${compareSlider}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-elevated border-2 border-purple-600 flex items-center justify-center text-purple-600 text-[10px] font-bold">
                    ↔
                  </div>
                </div>
              </div>

              {/* Metadata Comparison Table */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-surface-50 border border-surface-200 text-xs">
                <div>
                  <h4 className="font-bold text-purple-700 mb-2">Photo A Specs</h4>
                  <div className="space-y-1 text-surface-600">
                    <div>Size: <span className="font-semibold">{formatBytes(compareLeft.file_size)}</span></div>
                    <div>Format: <span className="font-semibold uppercase">{compareLeft.extension}</span></div>
                    <div>Resolution: <span className="font-semibold">{compareLeft.width ? `${compareLeft.width}×${compareLeft.height}` : 'N/A'}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-700 mb-2">Photo B Specs</h4>
                  <div className="space-y-1 text-surface-600">
                    <div>Size: <span className="font-semibold">{formatBytes(compareRight.file_size)}</span></div>
                    <div>Format: <span className="font-semibold uppercase">{compareRight.extension}</span></div>
                    <div>Resolution: <span className="font-semibold">{compareRight.width ? `${compareRight.width}×${compareRight.height}` : 'N/A'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: MERGE PHOTOS */}
      {activeTab === 'merge' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium space-y-6">
            <div>
              <h3 className="text-sm font-bold text-surface-900 mb-1">Merge Orientation</h3>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { id: 'horizontal', label: 'Side-by-Side (Horiz)' },
                  { id: 'vertical', label: 'Stacked (Vert)' },
                  { id: 'grid', label: '2×2 Grid' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMergeMode(m.id)}
                    className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition-all ${
                      mergeMode === m.id
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-surface-200 hover:bg-surface-50 text-surface-600'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photos Selector */}
            <div>
              <label className="text-xs font-semibold text-surface-700 uppercase tracking-wider block mb-1.5">
                Select Photos to Merge ({mergePhotos.length} selected)
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1 border border-surface-200 rounded-xl bg-surface-50">
                {userPhotos.map(p => {
                  const isSelected = mergePhotos.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (isSelected) {
                          setMergePhotos(mergePhotos.filter(id => id !== p.id));
                        } else {
                          setMergePhotos([...mergePhotos, p.id]);
                        }
                      }}
                      className={`relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected ? 'border-purple-600 ring-2 ring-purple-500/30' : 'border-transparent'
                      }`}
                    >
                      <img src={`/api/files/${p.id}/preview`} alt={p.original_name} className="w-full h-16 object-cover" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-surface-600 mb-1">Divider Gap: {mergeGap}px</label>
              <input
                type="range"
                min="0"
                max="50"
                value={mergeGap}
                onChange={(e) => setMergeGap(parseInt(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>

            <button
              onClick={handleMergeImages}
              disabled={processingMerge || mergePhotos.length < 2}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {processingMerge ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Merging Images...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Merge & Save Output</span>
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-2 p-6 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3 mb-4">
              <span className="text-xs font-bold text-surface-900">Merged Image Canvas</span>
              {mergeResult?.file && (
                <a
                  href={`/api/files/${mergeResult.file.id}/download`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Merged Result</span>
                </a>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center bg-surface-50 rounded-2xl p-4 border border-surface-100">
              {mergeResult ? (
                <img
                  src={mergeResult.previewUrl}
                  alt="Merged"
                  className="max-h-[460px] max-w-full object-contain rounded-2xl shadow-elevated"
                />
              ) : (
                <div className="text-center p-8 text-surface-400 text-xs">
                  Select at least 2 images and click "Merge & Save Output".
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

