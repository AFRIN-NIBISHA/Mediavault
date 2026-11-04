import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Wand2,
  Scissors,
  Image as ImageIcon,
  Sliders,
  Eraser,
  Sparkle,
  Zap,
  Download,
  FolderPlus,
  RefreshCw,
  Eye,
  CheckCircle2,
  Layers,
  ArrowRight,
  Maximize2,
  UploadCloud,
  FileCheck,
  ChevronRight,
  History,
  Info
} from 'lucide-react';
import api from '../services/api';
import { formatBytes } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

export function AIPhotoStudioPage() {
  const [activeTab, setActiveTab] = useState('remove-bg'); // remove-bg, generate-bg, text-to-image, transform, inpaint, enhance, analyze, smart-edit, history
  const [userPhotos, setUserPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  // Tool Specific States
  // 1. BG Generator
  const [bgPrompt, setBgPrompt] = useState('majestic mountain sunrise with misty atmospheric fog');
  const [bgPosition, setBgPosition] = useState('bottomCenter');
  const [bgScale, setBgScale] = useState(0.8);

  // 2. Text to Image
  const [genPrompt, setGenPrompt] = useState('a futuristic glass skyscraper with glowing violet lights at twilight');
  const [genStyle, setGenStyle] = useState('cinematic');
  const [genAspect, setGenAspect] = useState('1:1');

  // 3. Transform
  const [transformStyle, setTransformStyle] = useState('anime');

  // 4. Inpainting
  const [brushSize, setBrushSize] = useState(25);
  const inpaintCanvasRef = useRef(null);
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const [maskBoundingBox, setMaskBoundingBox] = useState(null);

  // 5. Enhance
  const [enhanceMode, setEnhanceMode] = useState('upscale_2x');

  // 6. Smart Edit
  const [smartInstruction, setSmartInstruction] = useState('Increase brightness and apply cinematic film look');

  // 7. Smart Analysis
  const [analysisResult, setAnalysisResult] = useState(null);

  // Before & After comparison
  const [showOriginal, setShowOriginal] = useState(false);

  const { addToast } = useToast();

  useEffect(() => {
    fetchPhotos();
    fetchHistory();
  }, []);

  const fetchPhotos = async () => {
    try {
      const res = await api.get('/files?category=photos');
      if (res.data.success && res.data.files.length > 0) {
        setUserPhotos(res.data.files);
        if (!selectedPhoto) {
          setSelectedPhoto(res.data.files[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load photos:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/ai/history');
      if (res.data.success) {
        setHistoryItems(res.data.history || []);
      }
    } catch (err) {
      console.error('Failed loading history:', err);
    }
  };

  // -------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------
  const handleRemoveBg = async () => {
    if (!selectedPhoto) {
      addToast('Please select a photo first.', 'warning');
      return;
    }
    setProcessing(true);
    setResultData(null);
    try {
      const res = await api.post('/ai/remove-bg', { fileId: selectedPhoto.id, saveToVault: true });
      if (res.data.success) {
        setResultData(res.data);
        addToast('Background removed successfully and saved to MediaVault!', 'success');
        fetchPhotos();
        fetchHistory();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Background removal failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateBg = async () => {
    if (!bgPrompt.trim()) {
      addToast('Please enter a background prompt.', 'warning');
      return;
    }
    setProcessing(true);
    setResultData(null);
    try {
      const res = await api.post('/ai/generate-bg', {
        prompt: bgPrompt.trim(),
        subjectFileId: selectedPhoto ? selectedPhoto.id : null,
        position: bgPosition,
        scale: bgScale,
        saveToVault: true
      });
      if (res.data.success) {
        setResultData(res.data);
        addToast('AI background generated and composited!', 'success');
        fetchPhotos();
        fetchHistory();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Background generation failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleTextToImage = async () => {
    if (!genPrompt.trim()) {
      addToast('Please enter an image prompt.', 'warning');
      return;
    }
    setProcessing(true);
    setResultData(null);
    try {
      const res = await api.post('/ai/generate-image', {
        prompt: genPrompt.trim(),
        style: genStyle,
        aspectRatio: genAspect,
        saveToVault: true
      });
      if (res.data.success) {
        setResultData(res.data);
        addToast('AI Image generated and saved to MediaVault!', 'success');
        fetchPhotos();
        fetchHistory();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Image generation failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleTransformImage = async () => {
    if (!selectedPhoto) {
      addToast('Please select a photo first.', 'warning');
      return;
    }
    setProcessing(true);
    setResultData(null);
    try {
      const res = await api.post('/ai/transform-image', {
        fileId: selectedPhoto.id,
        style: transformStyle,
        saveToVault: true
      });
      if (res.data.success) {
        setResultData(res.data);
        addToast(`Transformed to ${transformStyle} style!`, 'success');
        fetchPhotos();
        fetchHistory();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Transformation failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleInpaint = async () => {
    if (!selectedPhoto) {
      addToast('Please select a photo first.', 'warning');
      return;
    }
    setProcessing(true);
    setResultData(null);
    try {
      // Use painted bounding box or center sample
      const mask = maskBoundingBox || { x: 80, y: 80, width: 140, height: 140 };
      const res = await api.post('/ai/remove-object', {
        fileId: selectedPhoto.id,
        maskArea: mask,
        saveToVault: true
      });
      if (res.data.success) {
        setResultData(res.data);
        addToast('Object removed & background reconstructed!', 'success');
        fetchPhotos();
        fetchHistory();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Inpainting failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleEnhance = async () => {
    if (!selectedPhoto) {
      addToast('Please select a photo first.', 'warning');
      return;
    }
    setProcessing(true);
    setResultData(null);
    try {
      const res = await api.post('/ai/enhance', {
        fileId: selectedPhoto.id,
        mode: enhanceMode,
        saveToVault: true
      });
      if (res.data.success) {
        setResultData(res.data);
        addToast(`Image enhancement (${enhanceMode}) complete!`, 'success');
        fetchPhotos();
        fetchHistory();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Enhancement failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedPhoto) {
      addToast('Please select a photo to analyze.', 'warning');
      return;
    }
    setProcessing(true);
    setAnalysisResult(null);
    try {
      const res = await api.post('/ai/analyze', { fileId: selectedPhoto.id });
      if (res.data.success) {
        setAnalysisResult(res.data.analysis);
        addToast('Smart diagnostic analysis completed!', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Analysis failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSmartEdit = async () => {
    if (!selectedPhoto) {
      addToast('Please select a photo first.', 'warning');
      return;
    }
    if (!smartInstruction.trim()) {
      addToast('Please enter an editing instruction.', 'warning');
      return;
    }
    setProcessing(true);
    setResultData(null);
    try {
      const res = await api.post('/ai/smart-edit', {
        fileId: selectedPhoto.id,
        instruction: smartInstruction.trim(),
        saveToVault: true
      });
      if (res.data.success) {
        setResultData(res.data);
        addToast(res.data.message || 'Smart edit executed!', 'success');
        fetchPhotos();
        fetchHistory();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Smart edit failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Inpaint canvas setup
  useEffect(() => {
    if (activeTab === 'inpaint' && selectedPhoto && inpaintCanvasRef.current) {
      const canvas = inpaintCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `/api/files/${selectedPhoto.id}/preview`;
      img.onload = () => {
        canvas.width = 480;
        canvas.height = (img.height / img.width) * 480;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    }
  }, [activeTab, selectedPhoto]);

  const startDrawMask = (e) => {
    setIsDrawingMask(true);
    drawMask(e);
  };

  const stopDrawMask = () => {
    setIsDrawingMask(false);
  };

  const drawMask = (e) => {
    if (!isDrawingMask || !inpaintCanvasRef.current) return;
    const canvas = inpaintCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.fillStyle = 'rgba(168, 85, 247, 0.65)'; // Royal purple semi-transparent mask
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    setMaskBoundingBox({
      x: Math.max(0, Math.round(x - brushSize)),
      y: Math.max(0, Math.round(y - brushSize)),
      width: Math.round(brushSize * 2),
      height: Math.round(brushSize * 2)
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
              AI Photo Studio
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 uppercase">
              Neural Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-surface-500">
            Professional background removal, text-to-image synthesis, intelligent inpainting, and neural photo diagnostics.
          </p>
        </div>

        {/* Selected Photo Info & Switcher Button */}
        <div className="flex items-center gap-3">
          {selectedPhoto && (
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
              <img
                src={`/api/files/${selectedPhoto.id}/preview`}
                alt="Selected"
                className="w-8 h-8 rounded-lg object-cover border border-surface-300"
              />
              <div className="text-left">
                <span className="text-xs font-semibold block text-surface-900 dark:text-surface-100 max-w-[140px] truncate">
                  {selectedPhoto.original_name}
                </span>
                <span className="text-[10px] text-surface-400">Active Subject</span>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowPhotoPicker(true)}
            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-purple-200 dark:border-purple-800"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Choose Photo</span>
          </button>
        </div>
      </div>

      {/* Main Studio Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'remove-bg', label: 'Background Removal', icon: Scissors },
          { id: 'generate-bg', label: 'AI Background Generator', icon: Wand2 },
          { id: 'text-to-image', label: 'Text-to-Image', icon: Sparkles },
          { id: 'transform', label: 'Style Transformation', icon: Sparkle },
          { id: 'inpaint', label: 'Object Removal & Inpainting', icon: Eraser },
          { id: 'enhance', label: 'Neural Enhancement', icon: Zap },
          { id: 'analyze', label: 'Smart Photo Analysis', icon: Info },
          { id: 'smart-edit', label: 'AI Editing Assistant', icon: Sliders },
          { id: 'history', label: 'History & Logs', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setResultData(null);
                setAnalysisResult(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-400 hover:text-surface-900 border border-surface-200 dark:border-surface-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Studio Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Controls */}
        <div className="p-6 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium space-y-6">
          {/* TAB 1: BACKGROUND REMOVAL */}
          {activeTab === 'remove-bg' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  AI Background Removal
                </h3>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Automatically identifies the foreground subject and isolates it onto a 100% transparent PNG with anti-aliased edge feathering.
              </p>

              <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs space-y-2">
                <div className="flex justify-between text-surface-600 dark:text-surface-400">
                  <span>Output Format:</span>
                  <span className="font-semibold text-purple-600 uppercase">Transparent PNG</span>
                </div>
                <div className="flex justify-between text-surface-600 dark:text-surface-400">
                  <span>Target Image:</span>
                  <span className="font-semibold truncate max-w-[160px]">{selectedPhoto?.original_name || 'None selected'}</span>
                </div>
              </div>

              <button
                onClick={handleRemoveBg}
                disabled={processing || !selectedPhoto}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Isolating Subject...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Remove Background Now</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: BACKGROUND GENERATOR */}
          {activeTab === 'generate-bg' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  AI Background Generator
                </h3>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Describe a new environment in plain text. The AI synthesizes the background scene and seamlessly blends the foreground subject into it.
              </p>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                  Environment Prompt
                </label>
                <textarea
                  value={bgPrompt}
                  onChange={(e) => setBgPrompt(e.target.value)}
                  placeholder="e.g. majestic mountain environment with morning misty fog"
                  className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs focus:outline-none focus:border-purple-500 h-24"
                />
              </div>

              {/* Preset prompt pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Misty mountain sunrise',
                  'Cyberpunk neon city',
                  'Minimalist studio podium',
                  'Tropical sunset beach',
                  'Cozy luxury interior'
                ].map(p => (
                  <button
                    key={p}
                    onClick={() => setBgPrompt(p)}
                    className="px-2.5 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 text-[11px] text-surface-600 dark:text-surface-300 hover:bg-purple-50 hover:text-purple-600"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-surface-600 mb-1">Subject Position</label>
                  <select
                    value={bgPosition}
                    onChange={(e) => setBgPosition(e.target.value)}
                    className="w-full p-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs"
                  >
                    <option value="center">Centered</option>
                    <option value="bottomCenter">Bottom Center</option>
                    <option value="bottomLeft">Bottom Left</option>
                    <option value="bottomRight">Bottom Right</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-surface-600 mb-1">Scale: {Math.round(bgScale * 100)}%</label>
                  <input
                    type="range"
                    min="0.4"
                    max="1.2"
                    step="0.05"
                    value={bgScale}
                    onChange={(e) => setBgScale(parseFloat(e.target.value))}
                    className="w-full accent-purple-600 mt-2"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateBg}
                disabled={processing}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Scene...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate & Composite Scene</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 3: TEXT TO IMAGE */}
          {activeTab === 'text-to-image' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  Text-to-Image Generation
                </h3>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Create novel digital artworks, realistic scenery, or stylized concepts directly from creative text descriptions.
              </p>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                  Creative Prompt
                </label>
                <textarea
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  placeholder="e.g. futuristic glass skyscraper with glowing violet lights at twilight"
                  className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs focus:outline-none focus:border-purple-500 h-24"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                  Aesthetic Style Preset
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cinematic', label: '🎬 Cinematic' },
                    { id: 'anime', label: '✨ Anime' },
                    { id: 'photorealistic', label: '📷 Photorealistic' },
                    { id: 'cyberpunk', label: '🌆 Cyberpunk' },
                    { id: 'digital_art', label: '🎨 Digital Art' },
                    { id: '3d_render', label: '🧊 3D Render' }
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setGenStyle(s.id)}
                      className={`p-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                        genStyle === s.id
                          ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: '1:1', label: '1:1 Square' },
                    { id: '16:9', label: '16:9 Wide' },
                    { id: '9:16', label: '9:16 Story' },
                    { id: '4:3', label: '4:3 Classic' }
                  ].map(a => (
                    <button
                      key={a.id}
                      onClick={() => setGenAspect(a.id)}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                        genAspect === a.id
                          ? 'border-purple-600 bg-purple-50 text-purple-700'
                          : 'border-surface-200 hover:bg-surface-50 text-surface-600'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleTextToImage}
                disabled={processing}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Image...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Artwork</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 4: STYLE TRANSFORMATION */}
          {activeTab === 'transform' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkle className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  Image-to-Image Transformation
                </h3>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Transform any uploaded photo into an artistic genre while retaining structural contours and subject identity.
              </p>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                  Choose Transformation Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'anime', label: 'Anime Illustration' },
                    { id: 'cartoon', label: 'Cel-Shaded Cartoon' },
                    { id: 'cinematic', label: 'Cinematic Film' },
                    { id: 'digital_art', label: 'Digital Artwork' },
                    { id: 'pencil_sketch', label: 'Pencil Sketch' },
                    { id: 'cyberpunk', label: 'Cyberpunk Neon' },
                    { id: 'watercolor', label: 'Watercolor Wash' }
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => setTransformStyle(st.id)}
                      className={`p-2.5 rounded-xl text-xs font-semibold text-left border transition-all ${
                        transformStyle === st.id
                          ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleTransformImage}
                disabled={processing || !selectedPhoto}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Applying Transformation...</span>
                  </>
                ) : (
                  <>
                    <Sparkle className="w-4 h-4" />
                    <span>Apply Style Transformation</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 5: OBJECT REMOVAL / INPAINTING */}
          {activeTab === 'inpaint' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Eraser className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  AI Object Removal & Inpainting
                </h3>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Paint over unwanted objects, people, or blemishes on the canvas to the right. The inpainting engine reconstructs natural background pixels.
              </p>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Eraser Brush Size</span>
                  <span className="font-mono text-purple-600">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-[11px] text-purple-700 dark:text-purple-300">
                👉 Click and drag directly on the image to paint a purple mask over the object you want erased.
              </div>

              <button
                onClick={handleInpaint}
                disabled={processing || !selectedPhoto}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Reconstructing Background...</span>
                  </>
                ) : (
                  <>
                    <Eraser className="w-4 h-4" />
                    <span>Erase & Inpaint Object</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 6: NEURAL ENHANCEMENT */}
          {activeTab === 'enhance' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  Neural Image Enhancement
                </h3>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Super-resolution upscaling, edge reconstruction, sensor noise reduction, and old photograph restoration.
              </p>

              <div className="space-y-2">
                {[
                  { id: 'upscale_2x', title: '2× Super-Resolution', desc: 'Doubles pixel count with Lanczos3 sharpening' },
                  { id: 'upscale_4x', title: '4× Ultra Upscale', desc: 'Quadruple resolution high-definition enlargement' },
                  { id: 'denoise', title: 'Sensor Denoise', desc: 'Removes ISO noise while protecting sharp contours' },
                  { id: 'sharpen', title: 'Adaptive Sharpening', desc: 'Edge contrast & clarity recovery' },
                  { id: 'color_enhance', title: 'Vibrance & HDR', desc: 'Equalizes dynamic range and color saturation' },
                  { id: 'restore_old', title: 'Old Photo Repair', desc: 'Suppresses scratches, balances sepia, restores levels' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setEnhanceMode(m.id)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      enhanceMode === m.id
                        ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60'
                        : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-surface-900 dark:text-surface-100">{m.title}</div>
                    <div className="text-[11px] text-surface-500">{m.desc}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleEnhance}
                disabled={processing || !selectedPhoto}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enhancing Details...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Run Neural Enhancement</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 7: SMART PHOTO ANALYSIS */}
          {activeTab === 'analyze' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  Smart Photo Diagnostics
                </h3>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Computes pixel-level quality scores, Laplacian focus variance, exposure clipping, and composition suitability.
              </p>

              <button
                onClick={handleAnalyze}
                disabled={processing || !selectedPhoto}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Diagnosing Pixels...</span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4" />
                    <span>Run Diagnostic Analysis</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 8: SMART EDITING ASSISTANT */}
          {activeTab === 'smart-edit' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  AI Smart Editing Assistant
                </h3>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Type natural language commands. The NLP vision pipeline parses and executes real editing operations directly.
              </p>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                  Natural Language Command
                </label>
                <textarea
                  value={smartInstruction}
                  onChange={(e) => setSmartInstruction(e.target.value)}
                  placeholder="e.g. Increase brightness and apply cinematic film look"
                  className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs focus:outline-none focus:border-purple-500 h-24"
                />
              </div>

              {/* Suggestions */}
              <div className="space-y-1.5">
                {[
                  'Increase brightness by +25%',
                  'Apply cinematic film look with high contrast',
                  'Convert to rich black and white',
                  'Boost color saturation and vibrance',
                  'Blur background and increase contrast'
                ].map(cmd => (
                  <button
                    key={cmd}
                    onClick={() => setSmartInstruction(cmd)}
                    className="w-full p-2 text-left rounded-lg bg-surface-50 dark:bg-surface-800 text-[11px] text-surface-600 hover:bg-purple-50 hover:text-purple-600 truncate border border-surface-200/60"
                  >
                    "{cmd}"
                  </button>
                ))}
              </div>

              <button
                onClick={handleSmartEdit}
                disabled={processing || !selectedPhoto}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Instruction...</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-4 h-4" />
                    <span>Execute Command</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 9: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
                  AI Generation History
                </h3>
              </div>
              <p className="text-xs text-surface-500 leading-relaxed">
                Log of past neural image generation requests and background synthesis jobs.
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {historyItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 text-xs space-y-1">
                    <div className="font-semibold text-surface-800 truncate">"{item.prompt}"</div>
                    <div className="flex justify-between text-[10px] text-surface-400">
                      <span className="uppercase">{item.generation_type}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 2 Columns: Live Canvas / Preview Stage */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium min-h-[540px] flex flex-col justify-between">
            {/* Stage Toolbar */}
            <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-surface-900 dark:text-surface-100">
                  {resultData ? 'AI Processed Output' : 'Studio Visual Canvas'}
                </span>
                {resultData && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-emerald-50 text-emerald-600 font-semibold">
                    Saved to MediaVault
                  </span>
                )}
              </div>

              {/* Actions: Download / Hold to view original */}
              <div className="flex items-center gap-2">
                {resultData && selectedPhoto && (
                  <button
                    onMouseDown={() => setShowOriginal(true)}
                    onMouseUp={() => setShowOriginal(false)}
                    onTouchStart={() => setShowOriginal(true)}
                    onTouchEnd={() => setShowOriginal(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-surface-200 bg-surface-50 text-surface-700 hover:bg-surface-100"
                  >
                    {showOriginal ? 'Viewing Original' : 'Hold for Original'}
                  </button>
                )}

                {resultData?.file && (
                  <a
                    href={`/api/files/${resultData.file.id}/download`}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </a>
                )}
              </div>
            </div>

            {/* Central Visual Workspace */}
            <div className="flex-1 flex items-center justify-center p-4 rounded-2xl bg-surface-50 dark:bg-surface-950/40 border border-surface-100 dark:border-surface-800 relative overflow-hidden">
              {/* Checkerboard Pattern for transparent PNGs */}
              {activeTab === 'remove-bg' && resultData && (
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
                />
              )}

              {/* Active Tab Views */}
              {activeTab === 'inpaint' ? (
                <div className="relative">
                  <canvas
                    ref={inpaintCanvasRef}
                    onMouseDown={startDrawMask}
                    onMouseUp={stopDrawMask}
                    onMouseLeave={stopDrawMask}
                    onMouseMove={drawMask}
                    className="rounded-xl shadow-elevated cursor-crosshair max-w-full"
                  />
                  <div className="text-[11px] text-center text-surface-400 mt-2">
                    Paint purple brush over unwanted region
                  </div>
                </div>
              ) : activeTab === 'analyze' && analysisResult ? (
                <div className="w-full max-w-lg space-y-4 p-4 text-xs">
                  {/* Gauge Score */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-surface-800 border border-surface-200 text-center shadow-sm">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-surface-400 block mb-1">
                      Composite Photo Quality Score
                    </span>
                    <div className="text-5xl font-black text-purple-600 mb-1">
                      {analysisResult.qualityScore}%
                    </div>
                    <span className="text-xs text-surface-500 font-medium">
                      {analysisResult.resolution} • {analysisResult.aspectRatio}
                    </span>
                  </div>

                  {/* Diagnostic Metric Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-white dark:bg-surface-800 border border-surface-200">
                      <span className="text-[10px] font-bold uppercase text-surface-400 block mb-1">Exposure & Lighting</span>
                      <div className="font-bold text-surface-900">{analysisResult.lighting?.status}</div>
                      <div className="text-[11px] text-surface-500 mt-0.5">Luminance: {analysisResult.lighting?.meanLuminance}/255</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white dark:bg-surface-800 border border-surface-200">
                      <span className="text-[10px] font-bold uppercase text-surface-400 block mb-1">Focus & Sharpness</span>
                      <div className="font-bold text-surface-900">{analysisResult.sharpness?.verdict}</div>
                      <div className="text-[11px] text-surface-500 mt-0.5">Laplacian: {analysisResult.sharpness?.laplacianVariance}</div>
                    </div>
                  </div>

                  {/* Suggestions List */}
                  <div className="p-4 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-surface-400 block">AI Suggestions</span>
                    {analysisResult.suggestions?.map((s, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-surface-700">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Standard Image Display */
                <div className="relative max-h-[460px] max-w-full flex items-center justify-center">
                  {resultData && !showOriginal ? (
                    <img
                      src={resultData.previewUrl}
                      alt="AI Processed"
                      className="max-h-[440px] max-w-full object-contain rounded-2xl shadow-elevated"
                    />
                  ) : selectedPhoto ? (
                    <img
                      src={`/api/files/${selectedPhoto.id}/preview`}
                      alt={selectedPhoto.original_name}
                      className="max-h-[440px] max-w-full object-contain rounded-2xl shadow-elevated"
                    />
                  ) : (
                    <div className="text-center p-8 text-surface-400 text-xs">
                      Select or upload an image to display in studio canvas.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stage Footer Status */}
            <div className="flex items-center justify-between text-xs text-surface-400 pt-4 border-t border-surface-100 dark:border-surface-800">
              <span>
                {resultData ? `Processed: ${resultData.width || 1080}×${resultData.height || 1080} px` : selectedPhoto ? `${selectedPhoto.original_name} (${formatBytes(selectedPhoto.file_size)})` : 'Ready for input'}
              </span>
              <span className="font-semibold text-purple-600">
                100% Neural Processing Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Picker Modal */}
      {showPhotoPicker && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-surface-900 rounded-3xl p-6 shadow-elevated border border-surface-200 dark:border-surface-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200">
              <h3 className="text-base font-bold text-surface-900">Select Image from MediaVault</h3>
              <button
                onClick={() => setShowPhotoPicker(false)}
                className="p-1.5 rounded-xl hover:bg-surface-100 text-surface-500"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-1">
              {userPhotos.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPhoto(p);
                    setResultData(null);
                    setShowPhotoPicker(false);
                  }}
                  className={`p-2 rounded-2xl border cursor-pointer transition-all ${
                    selectedPhoto?.id === p.id
                      ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-500/20'
                      : 'border-surface-200 hover:border-purple-400 bg-surface-50'
                  }`}
                >
                  <img
                    src={`/api/files/${p.id}/preview`}
                    alt={p.original_name}
                    className="w-full h-24 object-cover rounded-xl mb-1.5"
                  />
                  <div className="text-[11px] font-semibold text-surface-800 truncate" title={p.original_name}>
                    {p.original_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

