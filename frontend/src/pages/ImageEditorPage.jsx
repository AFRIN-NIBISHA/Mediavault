import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Stage, Layer, Rect, Circle, Star, Line, Text as KonvaText, Image as KonvaImage, Transformer } from 'react-konva';
import {
  Wand2,
  Type,
  Square,
  Circle as CircleIcon,
  Star as StarIcon,
  PenTool,
  Eraser,
  Layers,
  Save,
  Download,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Sliders,
  Sparkles,
  Palette,
  Image as ImageIcon,
  Check,
  ChevronDown,
  X,
  FileText
} from 'lucide-react';
import api from '../services/api';
import { formatBytes } from '../utils/formatters';
import { useToast } from '../context/ToastContext';

// Helper component for loading image elements into KonvaImage
function CanvasImageItem({ shapeProps, isSelected, onSelect, onChange }) {
  const [imageObj, setImageObj] = useState(null);
  const shapeRef = useRef(null);

  useEffect(() => {
    if (shapeProps.src) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = shapeProps.src;
      img.onload = () => setImageObj(img);
    }
  }, [shapeProps.src]);

  return (
    <KonvaImage
      image={imageObj}
      ref={shapeRef}
      {...shapeProps}
      draggable={!shapeProps.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          ...shapeProps,
          x: e.target.x(),
          y: e.target.y()
        });
      }}
      onTransformEnd={() => {
        const node = shapeRef.current;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          ...shapeProps,
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY),
          rotation: node.rotation()
        });
      }}
    />
  );
}

export function ImageEditorPage() {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('fileId');
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Project Info
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState('Untitled Creative Design');
  const [canvasWidth, setCanvasWidth] = useState(1080);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [canvasBg, setCanvasBg] = useState('#ffffff');
  const [zoomScale, setZoomScale] = useState(0.5);

  // Layers Array: [{ id, type: 'image'|'text'|'rect'|'circle'|'star'|'line', ...props }]
  const [layers, setLayers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'brush', 'eraser'

  // Drawing Brush
  const [brushColor, setBrushColor] = useState('#9333ea');
  const [brushWidth, setBrushWidth] = useState(8);
  const [isDrawing, setIsDrawing] = useState(false);

  // Undo / Redo History
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Adjustments & Filters (right panel)
  const [brightness, setBrightness] = useState(1.0);
  const [contrast, setContrast] = useState(1.0);
  const [saturation, setSaturation] = useState(1.0);
  const [temperature, setTemperature] = useState(0);
  const [blurVal, setBlurVal] = useState(0);
  const [activeFilter, setActiveFilter] = useState('none');

  // Export Modal
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [exportQuality, setExportQuality] = useState(95);
  const [exportScale, setExportScale] = useState(1);
  const [exporting, setExporting] = useState(false);

  // Refs
  const stageRef = useRef(null);
  const trRef = useRef(null);

  // User media files
  const [userPhotos, setUserPhotos] = useState([]);
  const [showPhotoDrawer, setShowPhotoDrawer] = useState(false);

  // Initialize
  useEffect(() => {
    fetchUserPhotos();
    checkIncomingTemplateOrFile();
  }, [fileId]);

  const fetchUserPhotos = async () => {
    try {
      const res = await api.get('/files?category=photos');
      if (res.data.success) {
        setUserPhotos(res.data.files);
      }
    } catch (e) {}
  };

  const checkIncomingTemplateOrFile = async () => {
    // 1. Check if a template was launched from Design Studio
    const templateData = sessionStorage.getItem('active_studio_template');
    if (templateData) {
      try {
        const tmpl = JSON.parse(templateData);
        sessionStorage.removeItem('active_studio_template');
        setProjectName(tmpl.name);
        setCanvasWidth(tmpl.width);
        setCanvasHeight(tmpl.height);
        const parsed = typeof tmpl.template_data === 'string' ? JSON.parse(tmpl.template_data) : tmpl.template_data;
        setCanvasBg(parsed.backgroundColor || '#ffffff');
        if (Array.isArray(parsed.layers)) {
          const loadedLayers = parsed.layers.map((l, idx) => ({
            ...l,
            id: l.id || `layer-${Date.now()}-${idx}`
          }));
          setLayers(loadedLayers);
          pushHistory(loadedLayers);
        }
        addToast(`Loaded template: ${tmpl.name}`, 'success');
        return;
      } catch (err) {}
    }

    // 2. Check if a specific fileId was passed
    if (fileId) {
      try {
        const res = await api.get(`/files/${fileId}`);
        if (res.data.success) {
          const f = res.data.file;
          const meta = res.data.metadata || {};
          const w = meta.width || 1080;
          const h = meta.height || 1080;
          setProjectName(f.original_name);
          setCanvasWidth(w);
          setCanvasHeight(h);
          const initialLayer = [
            {
              id: 'base-image',
              type: 'image',
              name: f.original_name,
              src: `/api/files/${f.id}/preview`,
              x: 0,
              y: 0,
              width: w,
              height: h,
              rotation: 0,
              opacity: 1,
              locked: false,
              visible: true
            }
          ];
          setLayers(initialLayer);
          pushHistory(initialLayer);
        }
      } catch (e) {}
    } else {
      // Default blank square design
      const defaultBlank = [
        {
          id: 'welcome-heading',
          type: 'text',
          name: 'Main Title',
          text: 'MediaVault Creative Studio',
          fontSize: 44,
          fontFamily: 'Inter',
          fontStyle: 'bold',
          fill: '#0f172a',
          x: 100,
          y: 200,
          opacity: 1,
          visible: true
        },
        {
          id: 'welcome-subtext',
          type: 'text',
          name: 'Subtitle',
          text: 'Add images, custom typography, shapes, and neural AI filters.',
          fontSize: 22,
          fontFamily: 'Inter',
          fill: '#64748b',
          x: 100,
          y: 280,
          opacity: 1,
          visible: true
        }
      ];
      setLayers(defaultBlank);
      pushHistory(defaultBlank);
    }
  };

  // Push to Undo/Redo stack
  const pushHistory = (newLayers) => {
    const updated = history.slice(0, historyStep + 1);
    updated.push(JSON.parse(JSON.stringify(newLayers)));
    setHistory(updated);
    setHistoryStep(updated.length - 1);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const nextStep = historyStep - 1;
      setHistoryStep(nextStep);
      setLayers(JSON.parse(JSON.stringify(history[nextStep])));
      setSelectedId(null);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setLayers(JSON.parse(JSON.stringify(history[nextStep])));
      setSelectedId(null);
    }
  };

  // Keep Transformer attached to selected layer
  useEffect(() => {
    if (!trRef.current) return;
    if (selectedId) {
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        trRef.current.getLayer().batchDraw();
      }
    } else {
      trRef.current.nodes([]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedId, layers]);

  // -------------------------------------------------------------
  // LAYER ACTIONS
  // -------------------------------------------------------------
  const addTextLayer = () => {
    const newText = {
      id: `text-${Date.now()}`,
      type: 'text',
      name: 'Custom Heading',
      text: 'Double click to edit text',
      fontSize: 36,
      fontFamily: 'Inter',
      fontStyle: 'bold',
      fill: '#9333ea',
      x: canvasWidth / 2 - 150,
      y: canvasHeight / 2 - 25,
      opacity: 1,
      visible: true,
      locked: false
    };
    const next = [...layers, newText];
    setLayers(next);
    setSelectedId(newText.id);
    pushHistory(next);
  };

  const addShapeLayer = (shapeType) => {
    const baseId = `shape-${Date.now()}`;
    let newShape;
    if (shapeType === 'rect') {
      newShape = {
        id: baseId,
        type: 'rect',
        name: 'Rectangle',
        x: canvasWidth / 2 - 120,
        y: canvasHeight / 2 - 80,
        width: 240,
        height: 160,
        fill: '#9333ea',
        cornerRadius: 16,
        opacity: 0.9,
        visible: true,
        locked: false
      };
    } else if (shapeType === 'circle') {
      newShape = {
        id: baseId,
        type: 'circle',
        name: 'Circle',
        x: canvasWidth / 2,
        y: canvasHeight / 2,
        radius: 90,
        fill: '#a855f7',
        opacity: 0.85,
        visible: true,
        locked: false
      };
    } else if (shapeType === 'star') {
      newShape = {
        id: baseId,
        type: 'star',
        name: 'Star Badge',
        x: canvasWidth / 2,
        y: canvasHeight / 2,
        numPoints: 5,
        innerRadius: 40,
        outerRadius: 85,
        fill: '#eab308',
        opacity: 1,
        visible: true,
        locked: false
      };
    }
    const next = [...layers, newShape];
    setLayers(next);
    setSelectedId(newShape.id);
    pushHistory(next);
  };

  const addImageLayer = (file) => {
    const newImg = {
      id: `img-${Date.now()}`,
      type: 'image',
      name: file.original_name,
      src: `/api/files/${file.id}/preview`,
      x: 100,
      y: 100,
      width: Math.min(600, canvasWidth * 0.7),
      height: Math.min(600, canvasHeight * 0.7),
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false
    };
    const next = [...layers, newImg];
    setLayers(next);
    setSelectedId(newImg.id);
    pushHistory(next);
    setShowPhotoDrawer(false);
  };

  const updateSelectedLayerProps = (newProps) => {
    if (!selectedId) return;
    const next = layers.map(l => l.id === selectedId ? { ...l, ...newProps } : l);
    setLayers(next);
  };

  const deleteSelectedLayer = () => {
    if (!selectedId) return;
    const next = layers.filter(l => l.id !== selectedId);
    setLayers(next);
    setSelectedId(null);
    pushHistory(next);
  };

  const duplicateSelectedLayer = () => {
    if (!selectedId) return;
    const item = layers.find(l => l.id === selectedId);
    if (!item) return;
    const dup = {
      ...JSON.parse(JSON.stringify(item)),
      id: `${item.type}-${Date.now()}`,
      name: `${item.name} Copy`,
      x: (item.x || 0) + 30,
      y: (item.y || 0) + 30
    };
    const next = [...layers, dup];
    setLayers(next);
    setSelectedId(dup.id);
    pushHistory(next);
  };

  const moveLayerOrder = (direction) => {
    if (!selectedId) return;
    const idx = layers.findIndex(l => l.id === selectedId);
    if (idx === -1) return;
    const next = [...layers];
    if (direction === 'up' && idx < next.length - 1) {
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
    } else if (direction === 'down' && idx > 0) {
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
    }
    setLayers(next);
    pushHistory(next);
  };

  // -------------------------------------------------------------
  // BRUSH DRAWING HANDLERS
  // -------------------------------------------------------------
  const handleMouseDown = (e) => {
    if (activeTool !== 'brush') {
      const clickedOnEmpty = e.target === e.target.getStage();
      if (clickedOnEmpty) {
        setSelectedId(null);
      }
      return;
    }

    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    const newLine = {
      id: `brush-${Date.now()}`,
      type: 'line',
      name: 'Brush Stroke',
      points: [pos.x / zoomScale, pos.y / zoomScale],
      stroke: brushColor,
      strokeWidth: brushWidth,
      tension: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
      visible: true
    };
    setLayers([...layers, newLine]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || activeTool !== 'brush') return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastLine = layers[layers.length - 1];
    if (!lastLine || lastLine.type !== 'line') return;

    const newPoints = lastLine.points.concat([point.x / zoomScale, point.y / zoomScale]);
    lastLine.points = newPoints;
    setLayers([...layers.slice(0, layers.length - 1), lastLine]);
  };

  const handleMouseUp = () => {
    if (isDrawing && activeTool === 'brush') {
      setIsDrawing(false);
      pushHistory(layers);
    }
  };

  // -------------------------------------------------------------
  // PROJECT SAVE & EXPORT
  // -------------------------------------------------------------
  const handleSaveProject = async () => {
    try {
      const dataUri = stageRef.current.toDataURL({ pixelRatio: 1 });
      const payload = {
        id: projectId,
        name: projectName,
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: canvasBg,
        thumbnailData: dataUri,
        canvasData: { zoomScale, activeFilter },
        layers
      };

      if (!navigator.onLine) {
        // Save to offline storage
        const offlineProjects = JSON.parse(localStorage.getItem('mv_offline_projects') || '[]');
        const existingIdx = offlineProjects.findIndex(p => p.id === projectId);
        const savedItem = { ...payload, id: projectId || `offline-${Date.now()}`, updatedAt: new Date().toISOString() };
        if (existingIdx >= 0) {
          offlineProjects[existingIdx] = savedItem;
        } else {
          offlineProjects.unshift(savedItem);
        }
        localStorage.setItem('mv_offline_projects', JSON.stringify(offlineProjects));
        addToast('Saved project locally in offline storage!', 'success');
        return;
      }

      const res = await api.post('/studio/projects', payload);
      if (res.data.success) {
        setProjectId(res.data.project.id);
        addToast('Project saved successfully to PostgreSQL database!', 'success');
      }
    } catch (err) {
      console.warn('Backend save failed, using offline storage fallback:', err);
      // Offline fallback
      try {
        const dataUri = stageRef.current.toDataURL({ pixelRatio: 1 });
        const offlineProjects = JSON.parse(localStorage.getItem('mv_offline_projects') || '[]');
        const savedItem = {
          id: projectId || `offline-${Date.now()}`,
          name: projectName,
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: canvasBg,
          thumbnailData: dataUri,
          canvasData: { zoomScale, activeFilter },
          layers,
          updatedAt: new Date().toISOString()
        };
        offlineProjects.unshift(savedItem);
        localStorage.setItem('mv_offline_projects', JSON.stringify(offlineProjects));
        addToast('Network unavailable — saved project in offline local storage!', 'success');
      } catch (fallbackErr) {
        addToast(err.response?.data?.message || 'Failed to save project', 'error');
      }
    }
  };

  const handleExportDesign = async (saveToVault = true) => {
    if (!stageRef.current) return;
    setExporting(true);
    let dataUri = '';
    const prevSelected = selectedId;

    try {
      // Temporarily deselect so transformer handles are hidden in exported image
      setSelectedId(null);

      // Force high-res export via client-side canvas
      dataUri = stageRef.current.toDataURL({
        pixelRatio: exportScale,
        mimeType: exportFormat === 'png' ? 'image/png' : 'image/jpeg',
        quality: exportQuality / 100
      });

      if (!navigator.onLine) {
        // Immediate in-browser offline download
        const downloadLink = document.createElement('a');
        downloadLink.href = dataUri;
        const safeName = (projectName || 'design').replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadLink.download = `${safeName}.${exportFormat}`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        addToast(`Downloaded design locally (${exportFormat.toUpperCase()}) in offline mode!`, 'success');
        setExportModalOpen(false);
        return;
      }

      const res = await api.post('/studio/export', {
        dataUrl: dataUri,
        name: projectName,
        format: exportFormat,
        quality: exportQuality,
        saveToVault
      });

      if (res.data.success) {
        addToast(`Exported design as ${res.data.filename}!`, 'success');
        // Trigger download in browser
        const downloadLink = document.createElement('a');
        downloadLink.href = res.data.downloadUrl;
        downloadLink.download = res.data.filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        setExportModalOpen(false);
      }
    } catch (err) {
      console.warn('Backend export failed, attempting client-side offline canvas export:', err);
      if (dataUri) {
        const downloadLink = document.createElement('a');
        downloadLink.href = dataUri;
        const safeName = (projectName || 'design').replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadLink.download = `${safeName}.${exportFormat}`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        addToast(`Offline mode: Downloaded design (${exportFormat.toUpperCase()}) directly from canvas!`, 'success');
        setExportModalOpen(false);
      } else {
        addToast(err.response?.data?.message || 'Export failed', 'error');
      }
    } finally {
      setSelectedId(prevSelected);
      setExporting(false);
    }
  };

  const selectedLayer = layers.find(l => l.id === selectedId);

  return (
    <div className="space-y-4">
      {/* Top Studio Toolbar */}
      <div className="h-16 px-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-premium flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="text-sm font-bold text-surface-900 dark:text-surface-100 bg-transparent border-b border-transparent hover:border-purple-300 focus:border-purple-600 focus:outline-none transition-all px-1 py-0.5"
          />
          <span className="text-[11px] font-mono text-surface-400">
            {canvasWidth} × {canvasHeight} px
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyStep <= 0}
            className="p-2 rounded-xl text-surface-600 hover:bg-surface-100 disabled:opacity-40"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyStep >= history.length - 1}
            className="p-2 rounded-xl text-surface-600 hover:bg-surface-100 disabled:opacity-40"
            title="Redo"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-surface-100 dark:bg-surface-800 rounded-xl px-2 py-1 text-xs font-semibold gap-1">
            <button onClick={() => setZoomScale(Math.max(0.2, zoomScale - 0.1))} className="p-1 hover:text-purple-600">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono">{Math.round(zoomScale * 100)}%</span>
            <button onClick={() => setZoomScale(Math.min(2.0, zoomScale + 0.1))} className="p-1 hover:text-purple-600">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Save Project to DB */}
          <button
            onClick={handleSaveProject}
            className="px-4 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-purple-100 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Project</span>
          </button>

          {/* Export Design Modal trigger */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export & Download</span>
          </button>
        </div>
      </div>

      {/* Main Studio 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Creative Elements & Layer Stack (Cols 1-3) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Quick Insert Elements Card */}
          <div className="p-5 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Add Creative Layers
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setShowPhotoDrawer(true)}
                className="p-3 rounded-2xl border border-surface-200 hover:border-purple-400 hover:bg-purple-50/50 flex flex-col items-center gap-1.5 font-semibold text-surface-800 transition-all"
              >
                <ImageIcon className="w-5 h-5 text-purple-600" />
                <span>Add Image</span>
              </button>

              <button
                onClick={addTextLayer}
                className="p-3 rounded-2xl border border-surface-200 hover:border-purple-400 hover:bg-purple-50/50 flex flex-col items-center gap-1.5 font-semibold text-surface-800 transition-all"
              >
                <Type className="w-5 h-5 text-purple-600" />
                <span>Add Text</span>
              </button>

              <button
                onClick={() => addShapeLayer('rect')}
                className="p-3 rounded-2xl border border-surface-200 hover:border-purple-400 hover:bg-purple-50/50 flex flex-col items-center gap-1.5 font-semibold text-surface-800 transition-all"
              >
                <Square className="w-5 h-5 text-purple-600" />
                <span>Rectangle</span>
              </button>

              <button
                onClick={() => addShapeLayer('circle')}
                className="p-3 rounded-2xl border border-surface-200 hover:border-purple-400 hover:bg-purple-50/50 flex flex-col items-center gap-1.5 font-semibold text-surface-800 transition-all"
              >
                <CircleIcon className="w-5 h-5 text-purple-600" />
                <span>Circle</span>
              </button>

              <button
                onClick={() => addShapeLayer('star')}
                className="p-3 rounded-2xl border border-surface-200 hover:border-purple-400 hover:bg-purple-50/50 flex flex-col items-center gap-1.5 font-semibold text-surface-800 transition-all"
              >
                <StarIcon className="w-5 h-5 text-yellow-500" />
                <span>Star Badge</span>
              </button>

              <button
                onClick={() => setActiveTool(activeTool === 'brush' ? 'select' : 'brush')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 font-semibold transition-all ${
                  activeTool === 'brush'
                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                    : 'border-surface-200 hover:bg-surface-50 text-surface-800'
                }`}
              >
                <PenTool className="w-5 h-5 text-purple-600" />
                <span>Drawing Pen</span>
              </button>
            </div>

            {/* Freehand Brush Options if tool active */}
            {activeTool === 'brush' && (
              <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2 text-xs">
                <div className="flex justify-between font-semibold text-purple-800">
                  <span>Pen Color</span>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-purple-800 mb-1">
                    <span>Width: {brushWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="40"
                    value={brushWidth}
                    onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                    className="w-full accent-purple-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Layer Management Stack Card */}
          <div className="p-5 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                Layers Stack ({layers.length})
              </h3>
              {selectedId && (
                <div className="flex items-center gap-1">
                  <button onClick={() => moveLayerOrder('up')} className="p-1 hover:text-purple-600 text-xs">▲</button>
                  <button onClick={() => moveLayerOrder('down')} className="p-1 hover:text-purple-600 text-xs">▼</button>
                  <button onClick={duplicateSelectedLayer} className="p-1 hover:text-purple-600" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={deleteSelectedLayer} className="p-1 hover:text-rose-500" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {layers.slice().reverse().map((layer) => {
                const isSelected = selectedId === layer.id;
                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedId(layer.id)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 text-purple-700'
                        : 'border-surface-200/60 hover:bg-surface-50 text-surface-700'
                    }`}
                  >
                    <span className="truncate max-w-[140px]">{layer.name || layer.type}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSelectedLayerProps({ visible: !layer.visible });
                        }}
                        className="text-surface-400 hover:text-purple-600"
                      >
                        {layer.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSelectedLayerProps({ locked: !layer.locked });
                        }}
                        className="text-surface-400 hover:text-purple-600"
                      >
                        {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column: Interactive Canvas Stage (Cols 4-9) */}
        <div className="lg:col-span-6 bg-slate-50 dark:bg-surface-950 rounded-3xl p-4 border border-surface-200 dark:border-surface-800 shadow-elevated flex items-center justify-center overflow-auto min-h-[580px]">
          <div
            style={{
              width: canvasWidth * zoomScale,
              height: canvasHeight * zoomScale,
              transformOrigin: 'center center'
            }}
            className="shadow-2xl rounded-2xl overflow-hidden border border-surface-300 relative bg-white"
          >
            <Stage
              ref={stageRef}
              width={canvasWidth * zoomScale}
              height={canvasHeight * zoomScale}
              scaleX={zoomScale}
              scaleY={zoomScale}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <Layer>
                {/* Canvas Background Fill */}
                <Rect
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  fill={canvasBg}
                />

                {/* Render Layers */}
                {layers.map((l) => {
                  if (l.visible === false) return null;
                  const isSelected = l.id === selectedId;

                  if (l.type === 'image') {
                    return (
                      <CanvasImageItem
                        key={l.id}
                        shapeProps={l}
                        isSelected={isSelected}
                        onSelect={() => setSelectedId(l.id)}
                        onChange={(newAttrs) => {
                          const next = layers.map(item => item.id === l.id ? newAttrs : item);
                          setLayers(next);
                          pushHistory(next);
                        }}
                      />
                    );
                  } else if (l.type === 'text') {
                    return (
                      <KonvaText
                        key={l.id}
                        id={l.id}
                        {...l}
                        draggable={!l.locked}
                        onClick={() => setSelectedId(l.id)}
                        onTap={() => setSelectedId(l.id)}
                        onDragEnd={(e) => {
                          const next = layers.map(item => item.id === l.id ? { ...item, x: e.target.x(), y: e.target.y() } : item);
                          setLayers(next);
                          pushHistory(next);
                        }}
                      />
                    );
                  } else if (l.type === 'rect') {
                    return (
                      <Rect
                        key={l.id}
                        id={l.id}
                        {...l}
                        draggable={!l.locked}
                        onClick={() => setSelectedId(l.id)}
                        onTap={() => setSelectedId(l.id)}
                        onDragEnd={(e) => {
                          const next = layers.map(item => item.id === l.id ? { ...item, x: e.target.x(), y: e.target.y() } : item);
                          setLayers(next);
                          pushHistory(next);
                        }}
                      />
                    );
                  } else if (l.type === 'circle') {
                    return (
                      <Circle
                        key={l.id}
                        id={l.id}
                        {...l}
                        draggable={!l.locked}
                        onClick={() => setSelectedId(l.id)}
                        onTap={() => setSelectedId(l.id)}
                        onDragEnd={(e) => {
                          const next = layers.map(item => item.id === l.id ? { ...item, x: e.target.x(), y: e.target.y() } : item);
                          setLayers(next);
                          pushHistory(next);
                        }}
                      />
                    );
                  } else if (l.type === 'star') {
                    return (
                      <Star
                        key={l.id}
                        id={l.id}
                        {...l}
                        draggable={!l.locked}
                        onClick={() => setSelectedId(l.id)}
                        onTap={() => setSelectedId(l.id)}
                        onDragEnd={(e) => {
                          const next = layers.map(item => item.id === l.id ? { ...item, x: e.target.x(), y: e.target.y() } : item);
                          setLayers(next);
                          pushHistory(next);
                        }}
                      />
                    );
                  } else if (l.type === 'line') {
                    return (
                      <Line
                        key={l.id}
                        id={l.id}
                        {...l}
                        onClick={() => setSelectedId(l.id)}
                      />
                    );
                  }
                  return null;
                })}

                {/* Active Transformer Handle */}
                <Transformer
                  ref={trRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 5 || newBox.height < 5) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Right Column: Properties & Adjustments Panel (Cols 10-12) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-5 bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
              {selectedLayer ? 'Selected Layer Properties' : 'Canvas Settings'}
            </h3>

            {/* When a layer is selected, show its properties */}
            {selectedLayer ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-surface-600 block mb-1">Layer Name</label>
                  <input
                    type="text"
                    value={selectedLayer.name || ''}
                    onChange={(e) => updateSelectedLayerProps({ name: e.target.value })}
                    className="w-full p-2 rounded-xl border border-surface-200 bg-surface-50 text-xs"
                  />
                </div>

                {/* Text specific props */}
                {selectedLayer.type === 'text' && (
                  <>
                    <div>
                      <label className="text-[11px] font-semibold text-surface-600 block mb-1">Text Content</label>
                      <textarea
                        value={selectedLayer.text || ''}
                        onChange={(e) => updateSelectedLayerProps({ text: e.target.value })}
                        className="w-full p-2 rounded-xl border border-surface-200 bg-surface-50 text-xs h-16"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-surface-600 block mb-1">Font Size</label>
                        <input
                          type="number"
                          value={selectedLayer.fontSize || 32}
                          onChange={(e) => updateSelectedLayerProps({ fontSize: parseInt(e.target.value) || 12 })}
                          className="w-full p-2 rounded-xl border border-surface-200 bg-surface-50 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-surface-600 block mb-1">Text Color</label>
                        <input
                          type="color"
                          value={selectedLayer.fill || '#0f172a'}
                          onChange={(e) => updateSelectedLayerProps({ fill: e.target.value })}
                          className="w-full h-8 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Shape specific props */}
                {(selectedLayer.type === 'rect' || selectedLayer.type === 'circle' || selectedLayer.type === 'star') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-surface-600 block mb-1">Fill Color</label>
                      <input
                        type="color"
                        value={selectedLayer.fill || '#9333ea'}
                        onChange={(e) => updateSelectedLayerProps({ fill: e.target.value })}
                        className="w-full h-8 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-surface-600 block mb-1">Opacity: {Math.round((selectedLayer.opacity ?? 1) * 100)}%</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={selectedLayer.opacity ?? 1}
                        onChange={(e) => updateSelectedLayerProps({ opacity: parseFloat(e.target.value) })}
                        className="w-full accent-purple-600 mt-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Canvas Background Color */
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-surface-600 block mb-1">Canvas Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={canvasBg}
                      onChange={(e) => setCanvasBg(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-xs">{canvasBg}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => { setCanvasWidth(1080); setCanvasHeight(1080); }}
                    className="p-2 rounded-xl border border-surface-200 text-[11px] font-semibold hover:bg-surface-50"
                  >
                    1:1 Square
                  </button>
                  <button
                    onClick={() => { setCanvasWidth(1920); setCanvasHeight(1080); }}
                    className="p-2 rounded-xl border border-surface-200 text-[11px] font-semibold hover:bg-surface-50"
                  >
                    16:9 Landscape
                  </button>
                  <button
                    onClick={() => { setCanvasWidth(1080); setCanvasHeight(1920); }}
                    className="p-2 rounded-xl border border-surface-200 text-[11px] font-semibold hover:bg-surface-50"
                  >
                    9:16 Story
                  </button>
                  <button
                    onClick={() => { setCanvasWidth(1280); setCanvasHeight(720); }}
                    className="p-2 rounded-xl border border-surface-200 text-[11px] font-semibold hover:bg-surface-50"
                  >
                    YouTube 720p
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Picker Drawer Modal */}
      {showPhotoDrawer && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-surface-900 rounded-3xl p-6 shadow-elevated border border-surface-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="text-sm font-bold text-surface-900">Add Photo from MediaVault</h3>
              <button onClick={() => setShowPhotoDrawer(false)} className="p-1 hover:bg-surface-100 rounded-lg text-surface-500">✕</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
              {userPhotos.map(p => (
                <div
                  key={p.id}
                  onClick={() => addImageLayer(p)}
                  className="p-2 rounded-xl border border-surface-200 hover:border-purple-600 cursor-pointer bg-surface-50 transition-all"
                >
                  <img src={`/api/files/${p.id}/preview`} alt={p.original_name} className="w-full h-20 object-cover rounded-lg mb-1" />
                  <div className="text-[11px] font-semibold truncate">{p.original_name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-surface-900 rounded-3xl p-6 shadow-elevated border border-surface-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="text-sm font-bold text-surface-900">Export Creative Studio Design</h3>
              <button onClick={() => setExportModalOpen(false)} className="p-1 hover:bg-surface-100 rounded-lg text-surface-500">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Export File Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {['png', 'jpg', 'webp', 'pdf'].map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`p-2 rounded-xl text-center uppercase font-bold border transition-all ${
                        exportFormat === fmt ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-surface-200 hover:bg-surface-50'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Resolution Scale</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { scale: 1, label: '1× Normal' },
                    { scale: 2, label: '2× Retina HD' },
                    { scale: 3, label: '3× Ultra 4K' }
                  ].map(sc => (
                    <button
                      key={sc.scale}
                      onClick={() => setExportScale(sc.scale)}
                      className={`p-2 rounded-xl text-center font-semibold border transition-all ${
                        exportScale === sc.scale ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-surface-200 hover:bg-surface-50'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Compression Quality</span>
                  <span className="font-mono text-purple-600">{exportQuality}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={exportQuality}
                  onChange={(e) => setExportQuality(parseInt(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleExportDesign(true)}
                disabled={exporting}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {exporting ? (
                  <span>Generating Export...</span>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download & Save to MediaVault</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
