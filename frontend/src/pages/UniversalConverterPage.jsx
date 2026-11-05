import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
  Search,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Sparkles,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Eye,
  Copy,
  Check,
  FolderOpen,
  ArrowRight,
  Zap,
  Play,
  RotateCw,
  FileCheck,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatBytes } from '../utils/formatters';
import { convertImageOffline, convertTextDataOffline } from '../utils/offlineConverter';

const STUDIOS = [
  { id: 'all', name: 'All Tools', icon: Zap, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'pdf', name: 'PDF Studio', icon: FileText, color: 'text-red-600 bg-red-50 border-red-200' },
  { id: 'word', name: 'Word Studio', icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'excel', name: 'Excel Studio', icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'powerpoint', name: 'PowerPoint Studio', icon: FileText, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'image', name: 'Image Studio', icon: ImageIcon, color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { id: 'gif', name: 'GIF Studio', icon: Film, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'sticker', name: 'Sticker Studio', icon: Sparkles, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  { id: 'audio', name: 'Audio Studio', icon: Music, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'video', name: 'Video Studio', icon: Film, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { id: 'archive', name: 'Archive Studio', icon: Archive, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { id: 'ai', name: 'AI Studio', icon: Sparkles, color: 'text-purple-600 bg-purple-50 border-purple-200' },
];

const TOOLS = [
  // PDF
  { id: 'pdf-to-docx', studio: 'pdf', title: 'PDF to Word', desc: 'Convert PDF documents into fully editable Microsoft Word DOCX files with formatting.', from: 'PDF', to: 'DOCX', icon: FileText },
  { id: 'pdf-to-xlsx', studio: 'pdf', title: 'PDF to Excel', desc: 'Extract data tables, columns, and rows into structured XLSX spreadsheets.', from: 'PDF', to: 'XLSX', icon: FileSpreadsheet },
  { id: 'pdf-to-txt', studio: 'pdf', title: 'PDF to TXT', desc: 'Extract clean raw plain-text content from any PDF document.', from: 'PDF', to: 'TXT', icon: FileText },
  { id: 'pdf-to-html', studio: 'pdf', title: 'PDF to HTML', desc: 'Convert PDF pages into semantic, responsive HTML webpages.', from: 'PDF', to: 'HTML', icon: FileCode },
  { id: 'pdf-compress', studio: 'pdf', title: 'PDF Compression', desc: 'Compress PDF size dynamically while preserving typography and vectors.', from: 'PDF', to: 'PDF', icon: Zap },
  { id: 'pdf-watermark', studio: 'pdf', title: 'PDF Watermark', desc: 'Add confidential stamps, copyright marks, or branding to all pages.', from: 'PDF', to: 'PDF', icon: FileCheck },

  // Word
  { id: 'docx-to-pdf', studio: 'word', title: 'Word to PDF', desc: 'Convert Microsoft Word (.docx) documents into standard PDF documents.', from: 'DOCX', to: 'PDF', icon: FileText },
  { id: 'docx-to-html', studio: 'word', title: 'Word to HTML', desc: 'Convert DOCX documents directly into clean semantic HTML5 markup.', from: 'DOCX', to: 'HTML', icon: FileCode },
  { id: 'docx-to-txt', studio: 'word', title: 'Word to TXT', desc: 'Extract clean text without formatting from Word documents.', from: 'DOCX', to: 'TXT', icon: FileText },
  { id: 'docx-to-xlsx', studio: 'word', title: 'Word to Excel', desc: 'Extract structured text and tables from Word into an Excel sheet.', from: 'DOCX', to: 'XLSX', icon: FileSpreadsheet },

  // Excel
  { id: 'xlsx-to-pdf', studio: 'excel', title: 'Excel to PDF', desc: 'Render spreadsheet worksheets into beautiful landscape PDF documents.', from: 'XLSX', to: 'PDF', icon: FileSpreadsheet },
  { id: 'xlsx-to-csv', studio: 'excel', title: 'Excel to CSV', desc: 'Export spreadsheet data tables to universal comma-separated CSV format.', from: 'XLSX', to: 'CSV', icon: FileSpreadsheet },
  { id: 'xlsx-to-json', studio: 'excel', title: 'Excel to JSON', desc: 'Convert tabular spreadsheet records into JSON arrays for API use.', from: 'XLSX', to: 'JSON', icon: FileCode },
  { id: 'xlsx-to-xml', studio: 'excel', title: 'Excel to XML', desc: 'Transform spreadsheet rows into structured XML data schemas.', from: 'XLSX', to: 'XML', icon: FileCode },
  { id: 'xlsx-to-html', studio: 'excel', title: 'Excel to HTML', desc: 'Export spreadsheets as styled, responsive web data tables.', from: 'XLSX', to: 'HTML', icon: FileCode },
  { id: 'xlsx-dedup', studio: 'excel', title: 'Excel Deduplication', desc: 'Detect and purge duplicate data rows across all workbook columns.', from: 'XLSX', to: 'XLSX', icon: RefreshCw },

  // PowerPoint
  { id: 'pptx-to-pdf', studio: 'powerpoint', title: 'PowerPoint to PDF', desc: 'Convert presentation slides into high-resolution PDF presentation.', from: 'PPTX', to: 'PDF', icon: FileText },
  { id: 'pptx-to-png', studio: 'powerpoint', title: 'PowerPoint to Image', desc: 'Extract and render presentation slide thumbnails as PNG images.', from: 'PPTX', to: 'PNG', icon: ImageIcon },

  // Image
  { id: 'img-to-webp', studio: 'image', title: 'Image to WebP', desc: 'Convert JPG, PNG, or AVIF into ultra-fast compressed WebP.', from: 'JPG/PNG', to: 'WEBP', icon: ImageIcon },
  { id: 'img-to-png', studio: 'image', title: 'Image to PNG', desc: 'Convert any image format to lossless 32-bit transparent PNG.', from: 'ANY', to: 'PNG', icon: ImageIcon },
  { id: 'img-to-avif', studio: 'image', title: 'Image to AVIF', desc: 'Convert images to cutting-edge high-efficiency AVIF standard.', from: 'JPG/PNG', to: 'AVIF', icon: ImageIcon },
  { id: 'img-to-jpg', studio: 'image', title: 'Image to JPG', desc: 'Convert modern image formats (WebP, AVIF, TIFF) to universal JPG.', from: 'ANY', to: 'JPG', icon: ImageIcon },

  // GIF
  { id: 'video-to-gif', studio: 'gif', title: 'Video to GIF', desc: 'Create silky smooth animated GIFs from MP4, MOV, or WebM clips.', from: 'MP4/MOV', to: 'GIF', icon: Film },
  { id: 'gif-to-video', studio: 'gif', title: 'GIF to MP4', desc: 'Convert animated GIF files into high-efficiency H.264 MP4 videos.', from: 'GIF', to: 'MP4', icon: Film },
  { id: 'gif-reverse', studio: 'gif', title: 'Reverse GIF', desc: 'Play animated GIF frames backwards to create looping boomerangs.', from: 'GIF', to: 'GIF', icon: RotateCw },

  // Sticker Studio Suite
  { id: 'create-sticker', studio: 'sticker', title: 'Image to Transparent Sticker', desc: 'Auto-cutout subject with AI background removal and format as a standard 512x512 transparent WebP sticker for WhatsApp and Telegram.', from: 'PNG/JPG', to: 'WEBP', icon: Sparkles },
  { id: 'sticker-to-png', studio: 'sticker', title: 'Sticker to Lossless PNG', desc: 'Extract transparent stickers into high-resolution lossless PNG images.', from: 'WEBP', to: 'PNG', icon: ImageIcon },
  { id: 'sticker-to-jpg', studio: 'sticker', title: 'Sticker to JPG', desc: 'Flatten transparent stickers onto clean white background JPG.', from: 'WEBP', to: 'JPG', icon: ImageIcon },
  { id: 'gif-to-sticker', studio: 'sticker', title: 'GIF to Animated Sticker', desc: 'Convert animated GIF clips into 512x512 WhatsApp/Telegram animated stickers.', from: 'GIF', to: 'WEBP', icon: Film },

  // Audio
  { id: 'audio-to-mp3', studio: 'audio', title: 'Audio to MP3', desc: 'Convert WAV, AAC, OGG, or FLAC to universal MP3 audio.', from: 'AUDIO', to: 'MP3', icon: Music },
  { id: 'audio-to-wav', studio: 'audio', title: 'Audio to WAV', desc: 'Convert compressed audio to uncompressed studio-grade WAV.', from: 'AUDIO', to: 'WAV', icon: Music },
  { id: 'audio-compress', studio: 'audio', title: 'Audio Compression', desc: 'Reduce audio file size by optimizing bitrate (128k / 64k).', from: 'MP3/WAV', to: 'MP3', icon: Zap },
  { id: 'audio-to-text', studio: 'audio', title: 'Audio to Transcript / Text', desc: 'Transcribe speech in audio to readable text, timestamps, subtitles & Word documents.', from: 'AUDIO', to: 'TXT', icon: FileText },

  // Video
  { id: 'video-to-mp4', studio: 'video', title: 'Video to MP4', desc: 'Transcode MOV, AVI, or WebM into widely compatible H.264 MP4.', from: 'VIDEO', to: 'MP4', icon: Film },
  { id: 'video-extract-audio', studio: 'video', title: 'Extract Audio from Video', desc: 'Strip video track and extract crystal clear MP3 soundtrack.', from: 'MP4/MOV', to: 'MP3', icon: Music },
  { id: 'video-compress', studio: 'video', title: 'Video Compression', desc: 'Reduce video file size by up to 80% using smart CRF rate control.', from: 'MP4/MOV', to: 'MP4', icon: Zap },

  // Archive
  { id: 'create-zip-bundle', studio: 'archive', title: 'Create ZIP Archive', desc: 'Compress one or multiple files into a fast, portable ZIP archive.', from: 'MULTI', to: 'ZIP', icon: Archive },
  { id: 'extract-zip-bundle', studio: 'archive', title: 'Extract ZIP Archive', desc: 'Unpack all internal files from any standard ZIP archive into MediaVault.', from: 'ZIP', to: 'FILES', icon: Archive },

  // AI Studio
  { id: 'ai-ocr-text', studio: 'ai', title: 'AI Optical Character Recognition (OCR)', desc: 'Extract editable text from scanned documents, receipts, screenshots, and photos.', from: 'IMG/PDF', to: 'TXT', icon: Sparkles }
];

export function UniversalConverterPage() {
  const { user } = useAuth();
  const [activeStudio, setActiveStudio] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState(TOOLS[0]);

  // File selection
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [isLoadingVault, setIsLoadingVault] = useState(false);

  // Settings
  const [targetFormat, setTargetFormat] = useState('docx');
  const [quality, setQuality] = useState(85);
  const [fps, setFps] = useState(12);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [bitrate, setBitrate] = useState('128k');
  const [ocrLanguage, setOcrLanguage] = useState('eng');
  const [audioLanguage, setAudioLanguage] = useState('eng');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [transcriptViewMode, setTranscriptViewMode] = useState('verbatim');
  const recognitionRef = useRef(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);

  // Filter tools based on activeStudio & searchQuery
  const filteredTools = TOOLS.filter(t => {
    const matchesStudio = activeStudio === 'all' || t.studio === activeStudio;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      t.title.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      t.from.toLowerCase().includes(q) ||
      t.to.toLowerCase().includes(q);
    return matchesStudio && matchesSearch;
  });

  // Load vault files for picker
  const loadVaultFiles = async () => {
    setIsLoadingVault(true);
    try {
      const res = await api.get('/files');
      setVaultFiles(res.data.files || []);
    } catch (err) {
      console.error('Failed to load user files:', err);
    } finally {
      setIsLoadingVault(false);
    }
  };

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
    setTargetFormat(tool.to.toLowerCase());
    setResult(null);
    setErrorMessage('');
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (selectedTool.id === 'create-zip-bundle') {
        setFileList(Array.from(e.dataTransfer.files));
        setSelectedFile(e.dataTransfer.files[0]);
      } else {
        setSelectedFile(e.dataTransfer.files[0]);
      }
      setResult(null);
      setErrorMessage('');
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (selectedTool.id === 'create-zip-bundle') {
        setFileList(Array.from(e.target.files));
        setSelectedFile(e.target.files[0]);
      } else {
        setSelectedFile(e.target.files[0]);
      }
      setResult(null);
      setErrorMessage('');
    }
  };

  const executeConversion = async () => {
    if (!selectedFile && fileList.length === 0) {
      setErrorMessage('Please upload or select a file first.');
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setProgressStatus('Initializing conversion engine...');
    setErrorMessage('');
    setResult(null);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev;
        return prev + Math.floor(Math.random() * 12) + 5;
      });
    }, 400);

    try {
      const formData = new FormData();
      let response;

      const appendSourceFile = () => {
        if (selectedFile?.vaultId) {
          formData.append('fileId', selectedFile.vaultId);
        } else if (selectedFile) {
          formData.append('file', selectedFile);
        }
      };

      // Special tools routing
      if (selectedTool.id === 'audio-to-text') {
        appendSourceFile();
        formData.append('targetFormat', targetFormat || 'txt');
        formData.append('language', audioLanguage);
        formData.append('includeTimestamps', includeTimestamps ? 'true' : 'false');
        if (speechTranscript) {
          formData.append('clientTranscript', speechTranscript);
        }
        setProgressStatus('Neural Audio Engine transcribing speech & timestamps...');
        response = await api.post('/converter/audio-to-text', formData);
        clearInterval(timer);
        setProgress(100);
        setProgressStatus('Transcription Complete!');
        setResult({
          type: 'transcript',
          text: response.data.verbatim || response.data.transcript,
          verbatim: response.data.verbatim || response.data.transcript,
          fullReport: response.data.transcript,
          segments: response.data.segments || [],
          duration: response.data.duration,
          provider: response.data.provider,
          downloadUrl: response.data.downloadUrl,
          filename: response.data.filename,
          audioUrl: selectedFile instanceof File
            ? URL.createObjectURL(selectedFile)
            : (selectedFile?.vaultId ? `/api/files/${selectedFile.vaultId}/download` : null),
          file: response.data.file
        });
      } else if (selectedTool.id === 'ai-ocr-text') {
        appendSourceFile();
        formData.append('language', ocrLanguage);
        setProgressStatus('AI Neural Engine analyzing characters & words...');
        response = await api.post('/converter/ocr', formData);
        clearInterval(timer);
        setProgress(100);
        setProgressStatus('OCR Extraction Complete!');
        setResult({
          type: 'ocr',
          text: response.data.text,
          confidence: response.data.confidence,
          lines: response.data.lines
        });
      } else if (selectedTool.id === 'pdf-compress' || selectedTool.id === 'audio-compress' || selectedTool.id === 'video-compress') {
        appendSourceFile();
        setProgressStatus('Optimizing compression ratio...');
        response = await api.post('/converter/compress', formData);
        clearInterval(timer);
        setProgress(100);
        setProgressStatus('Compression Complete!');
        setResult({
          type: 'file',
          downloadUrl: response.data.downloadUrl,
          filename: response.data.file?.original_name || 'compressed-output',
          size: response.data.file?.size,
          ratio: response.data.ratio
        });
      } else if (selectedTool.id === 'create-zip-bundle') {
        if (fileList.length > 0) {
          fileList.forEach(f => formData.append('files', f));
        } else {
          appendSourceFile();
        }
        formData.append('archiveName', `Bundle-${Date.now()}.zip`);
        setProgressStatus('Bundling into ZIP archive...');
        response = await api.post('/converter/archive/create', formData);
        clearInterval(timer);
        setProgress(100);
        setProgressStatus('Archive Packed Successfully!');
        setResult({
          type: 'file',
          downloadUrl: response.data.downloadUrl,
          filename: response.data.file?.original_name,
          size: response.data.size
        });
      } else if (selectedTool.id === 'extract-zip-bundle') {
        appendSourceFile();
        setProgressStatus('Extracting internal files...');
        response = await api.post('/converter/archive/extract', formData);
        clearInterval(timer);
        setProgress(100);
        setProgressStatus('Archive Extracted Successfully!');
        setResult({
          type: 'archive_extract',
          extractedFiles: response.data.extractedFiles
        });
      } else {
        // Universal Convert route
        appendSourceFile();
        formData.append('toolId', selectedTool.id);
        formData.append('targetFormat', targetFormat);
        formData.append('saveToVault', 'true');
        formData.append('options', JSON.stringify({
          quality,
          fps,
          watermarkText,
          bitrate,
          toolId: selectedTool.id,
          asSticker: selectedTool.studio === 'sticker' || selectedTool.id === 'create-sticker',
          reverse: selectedTool.id === 'gif-reverse'
        }));

        setProgressStatus(`Converting to ${targetFormat.toUpperCase()}...`);
        response = await api.post('/converter/convert', formData);
        clearInterval(timer);
        setProgress(100);
        setProgressStatus('Processing Complete!');
        setResult({
          type: 'file',
          downloadUrl: response.data.downloadUrl,
          previewUrl: response.data.previewUrl || response.data.downloadUrl,
          filename: response.data.filename,
          size: response.data.file?.size,
          metadata: response.data.metadata
        });
      }
    } catch (err) {
      clearInterval(timer);
      console.warn('Backend conversion failed, attempting in-browser offline converter:', err);

      const isImageConvert = ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(targetFormat.toLowerCase());
      const isTextConvert = ['csv', 'json', 'html', 'txt'].includes(targetFormat.toLowerCase());

      if (selectedFile instanceof File && (isImageConvert || isTextConvert)) {
        try {
          setProgressStatus('Operating Offline: Running In-Browser Processing Engine...');
          let offlineRes;
          if (isImageConvert) {
            offlineRes = await convertImageOffline(selectedFile, targetFormat, {
              quality,
              asSticker: selectedTool.studio === 'sticker' || selectedTool.id === 'create-sticker'
            });
          } else {
            offlineRes = await convertTextDataOffline(selectedFile, targetFormat);
          }
          setProgress(100);
          setProgressStatus('In-Browser Offline Conversion Complete!');
          setResult({
            type: 'file',
            downloadUrl: offlineRes.downloadUrl,
            previewUrl: offlineRes.previewUrl,
            filename: offlineRes.filename,
            size: offlineRes.size,
            isOffline: true
          });
          return;
        } catch (offlineErr) {
          console.error('Offline in-browser processing also failed:', offlineErr);
        }
      }

      setErrorMessage(err.response?.data?.message || err.message || 'Conversion failed. Please verify format compatibility.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyOcrToClipboard = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyTranscriptToClipboard = () => {
    let textToCopy = result?.text || result?.verbatim || result?.transcript;
    if (transcriptViewMode === 'timeline' && result?.segments?.length > 0) {
      textToCopy = result.segments.map(s => `[${s.startTime || '00:00:00'} - ${s.endTime || '00:00:05'}] ${s.text || ''}`).join('\n');
    } else if (transcriptViewMode === 'report') {
      textToCopy = result?.fullReport || result?.transcript || result?.text;
    }
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Live in-browser speech recognition is available in Google Chrome and Microsoft Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = audioLanguage === 'tam' ? 'ta-IN' : (audioLanguage === 'hin' ? 'hi-IN' : 'en-US');

        recognition.onresult = (event) => {
          let current = '';
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript + ' ';
          }
          setSpeechTranscript(current.trim());
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setIsListening(false);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl shadow-purple-900/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 blur-3xl pointer-events-none rounded-full" />
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-300" />
            11 SPECIALIZED CONVERSION & MEDIA PROCESSING STUDIOS
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Universal File Converter & Media Studio
          </h1>
          <p className="text-purple-100 text-sm sm:text-base leading-relaxed">
            High-fidelity document, image, vector, audio, video, archive and AI-powered conversions. Genuine lossless processing algorithms with zero format corruption.
          </p>
        </div>

        {/* Global Live Search Bar */}
        <div className="mt-8 relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          <input
            type="text"
            placeholder="Search 25+ conversion tools (e.g. 'PDF to Word', 'Video to GIF', 'Excel to JSON', 'Sticker', 'OCR')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white text-surface-900 placeholder:text-surface-400 rounded-2xl shadow-lg border border-purple-200/50 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all font-medium text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold px-2.5 py-1 bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 11 Studio Workspace Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STUDIOS.map((studio) => {
          const Icon = studio.icon;
          const isActive = activeStudio === studio.id;
          return (
            <button
              key={studio.id}
              onClick={() => {
                setActiveStudio(studio.id);
                const firstMatching = TOOLS.find(t => studio.id === 'all' || t.studio === studio.id);
                if (firstMatching) handleSelectTool(firstMatching);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                  : 'bg-white text-surface-700 border-surface-200/70 hover:bg-surface-50 hover:border-surface-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-surface-500'}`} />
              <span>{studio.name}</span>
            </button>
          );
        })}
      </div>

      {/* Two Column Layout: Tool Selection & Active Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Tools Catalog Grid (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-surface-900">
              Available Tools ({filteredTools.length})
            </h2>
            <span className="text-xs text-surface-500 font-medium">Click to activate tool</span>
          </div>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
            {filteredTools.map((tool) => {
              const isSelected = selectedTool.id === tool.id;
              const Icon = tool.icon;
              return (
                <div
                  key={tool.id}
                  onClick={() => handleSelectTool(tool)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-500/20 shadow-sm'
                      : 'bg-white border-surface-200/80 hover:border-purple-200 hover:bg-surface-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl ${
                      isSelected ? 'bg-purple-600 text-white' : 'bg-surface-100 text-surface-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm text-surface-900 truncate">
                          {tool.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-surface-100 text-surface-600 uppercase">
                            {tool.from}
                          </span>
                          <ArrowRight className="w-3 h-3 text-surface-400" />
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 uppercase">
                            {tool.to}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-surface-500 mt-1 line-clamp-2 leading-relaxed">
                        {tool.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTools.length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-surface-300">
                <Search className="w-8 h-8 text-surface-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-surface-700">No matching tools found</p>
                <p className="text-xs text-surface-400 mt-1">Try another search term or switch categories.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution Workspace & Options (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-surface-200 shadow-sm p-6 sm:p-8 space-y-6">
            {/* Header of Active Tool */}
            <div className="flex items-start justify-between border-b border-surface-100 pb-5">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-bold text-xs uppercase tracking-wider mb-2">
                  Active Tool
                </div>
                <h3 className="text-xl font-bold text-surface-900">{selectedTool.title}</h3>
                <p className="text-xs sm:text-sm text-surface-500 mt-1">{selectedTool.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    loadVaultFiles();
                    setShowVaultPicker(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Select from Vault
                </button>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-surface-300 hover:border-purple-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-surface-50/50 hover:bg-purple-50/30 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                multiple={selectedTool.id === 'create-zip-bundle'}
                className="hidden"
              />
              <div className="w-14 h-14 bg-white shadow-md shadow-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3.5 text-purple-600 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-surface-900">{selectedFile.name}</p>
                  <p className="text-xs text-surface-500">
                    {formatBytes(selectedFile.size)} • Click or drop another file to replace
                  </p>
                  {fileList.length > 1 && (
                    <p className="text-xs font-semibold text-purple-600">
                      + {fileList.length - 1} additional files selected for bundle
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-surface-800">
                    Drop your <span className="text-purple-600">{selectedTool.from}</span> file here, or <span className="text-purple-600 underline">browse</span>
                  </p>
                  <p className="text-xs text-surface-400">
                    Supports high-speed conversion directly on your server with automated saving
                  </p>
                </div>
              )}
            </div>

            {/* Dynamic Tool Options Panel */}
            <div className="p-5 bg-surface-50/80 rounded-2xl border border-surface-200/70 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-surface-700 uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-purple-600" />
                Conversion Settings
              </div>

              {/* Format selection if multiple targets possible */}
              {['image', 'pdf', 'word', 'excel', 'audio', 'video'].includes(selectedTool.studio) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-surface-600 mb-1.5">
                      Target Output Format
                    </label>
                    <input
                      type="text"
                      value={targetFormat.toUpperCase()}
                      onChange={(e) => setTargetFormat(e.target.value.toLowerCase())}
                      className="w-full px-3 py-2 bg-white border border-surface-300 rounded-xl text-surface-900 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Quality slider */}
                  {['image', 'gif'].includes(selectedTool.studio) && (
                    <div>
                      <div className="flex justify-between text-xs font-medium text-surface-600 mb-1.5">
                        <span>Quality / Compression</span>
                        <span className="font-bold text-purple-600">{quality}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        className="w-full accent-purple-600"
                      />
                    </div>
                  )}

                  {/* Audio Bitrate */}
                  {selectedTool.studio === 'audio' && selectedTool.id !== 'audio-to-text' && (
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1.5">
                        Audio Bitrate
                      </label>
                      <select
                        value={bitrate}
                        onChange={(e) => setBitrate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-surface-300 rounded-xl text-surface-900 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="320k">320 kbps (Studio Master)</option>
                        <option value="256k">256 kbps (High Fidelity)</option>
                        <option value="192k">192 kbps (Standard CD)</option>
                        <option value="128k">128 kbps (Compact Web)</option>
                        <option value="64k">64 kbps (Voice/Speech)</option>
                      </select>
                    </div>
                  )}

                  {/* GIF FPS */}
                  {selectedTool.id === 'video-to-gif' && (
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1.5">
                        Animation FPS ({fps} frames/sec)
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="24"
                        value={fps}
                        onChange={(e) => setFps(Number(e.target.value))}
                        className="w-full accent-purple-600"
                      />
                    </div>
                  )}

                  {/* Watermark text */}
                  {selectedTool.id === 'pdf-watermark' && (
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1.5">
                        Watermark Text
                      </label>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-surface-300 rounded-xl text-surface-900 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* OCR language */}
              {selectedTool.id === 'ai-ocr-text' && (
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1.5">
                    Recognition Language
                  </label>
                  <select
                    value={ocrLanguage}
                    onChange={(e) => setOcrLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-surface-300 rounded-xl text-surface-900 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="eng">English (Latin Latin-1)</option>
                    <option value="tam">Tamil</option>
                    <option value="hin">Hindi</option>
                    <option value="fra">French</option>
                    <option value="deu">German</option>
                    <option value="spa">Spanish</option>
                  </select>
                </div>
              )}

              {/* Audio to Transcript Settings */}
              {selectedTool.id === 'audio-to-text' && (
                <div className="space-y-4 pt-2 border-t border-surface-200/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1.5">
                        Transcript Format
                      </label>
                      <select
                        value={targetFormat}
                        onChange={(e) => setTargetFormat(e.target.value.toLowerCase())}
                        className="w-full px-3 py-2 bg-white border border-surface-300 rounded-xl text-surface-900 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="txt">TXT (Plain Text Document)</option>
                        <option value="docx">DOCX (Microsoft Word Document)</option>
                        <option value="srt">SRT (Subtitles with Timestamps)</option>
                        <option value="json">JSON (Structured Timeline Data)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-surface-600 mb-1.5">
                        Audio Spoken Language
                      </label>
                      <select
                        value={audioLanguage}
                        onChange={(e) => setAudioLanguage(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-surface-300 rounded-xl text-surface-900 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="eng">English (Global / Indian Accent)</option>
                        <option value="tam">Tamil (தமிழ்)</option>
                        <option value="hin">Hindi (हिन्दी)</option>
                        <option value="fra">French (Français)</option>
                        <option value="deu">German (Deutsch)</option>
                        <option value="spa">Spanish (Español)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="includeTimestamps"
                      checked={includeTimestamps}
                      onChange={(e) => setIncludeTimestamps(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                    <label htmlFor="includeTimestamps" className="text-xs font-medium text-surface-700 cursor-pointer">
                      Include Timestamp Intervals <span className="text-surface-400 font-mono text-[11px]">[00:00:00 - 00:00:05]</span>
                    </label>
                  </div>

                  {/* Optional Live In-Browser Web Speech Transcriber */}
                  <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mic className={`w-4 h-4 ${isListening ? 'text-red-500 animate-pulse' : 'text-purple-600'}`} />
                        <span className="text-xs font-bold text-surface-800">
                          Live In-Browser Speech Recognition Assistant
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          isListening
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {isListening ? (
                          <>
                            <MicOff className="w-3.5 h-3.5" />
                            <span>Stop Listening</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5" />
                            <span>Start Dictation / Mic</span>
                          </>
                        )}
                      </button>
                    </div>
                    {isListening && (
                      <p className="text-[11px] text-red-600 font-medium animate-pulse">
                        Listening to audio / microphone in real-time... Speak clearly into your mic.
                      </p>
                    )}
                    {speechTranscript && (
                      <div className="p-2.5 bg-white rounded-lg border border-purple-200 text-xs font-mono text-surface-800 max-h-24 overflow-y-auto">
                        <span className="text-[10px] font-bold text-purple-600 uppercase block mb-1">Captured Live Text:</span>
                        {speechTranscript}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Progress Bar (when active) */}
            {isProcessing && (
              <div className="space-y-2 p-4 bg-purple-50/60 rounded-2xl border border-purple-200">
                <div className="flex justify-between text-xs font-semibold text-purple-900">
                  <span>{progressStatus}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-purple-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Convert CTA Button */}
            <button
              onClick={executeConversion}
              disabled={isProcessing || (!selectedFile && fileList.length === 0)}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Conversion...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Execute {selectedTool.title}</span>
                </>
              )}
            </button>
          </div>

          {/* Results Display Area */}
          {result && (
            <div className="bg-white rounded-3xl border border-emerald-200 shadow-md shadow-emerald-500/5 p-6 sm:p-8 space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                <span>Conversion Finished Successfully</span>
              </div>

              {/* Audio Transcript Result */}
              {result.type === 'transcript' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-surface-700 uppercase tracking-wider">
                        Speech Transcript & Timeline
                      </span>
                      {result.duration && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          ⏱️ {result.duration}
                        </span>
                      )}
                      {result.provider && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-surface-100 text-surface-600">
                          {result.provider}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={copyTranscriptToClipboard}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-100 hover:bg-surface-200 rounded-lg text-xs font-semibold text-surface-700 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Transcript'}
                    </button>
                  </div>

                  {/* Audio Player */}
                  {result.audioUrl && (
                    <div className="p-3.5 bg-surface-50 rounded-2xl border border-surface-200 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-surface-700">
                        <Volume2 className="w-4 h-4 text-purple-600" />
                        <span>Synchronized Audio Playback</span>
                      </div>
                      <audio controls src={result.audioUrl} className="w-full h-10 rounded-lg" />
                    </div>
                  )}

                  {/* View Mode Tabs */}
                  <div className="flex items-center gap-1.5 p-1 bg-surface-100 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setTranscriptViewMode('verbatim')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        transcriptViewMode === 'verbatim'
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-surface-600 hover:text-surface-900'
                      }`}
                    >
                      Verbatim Words
                    </button>
                    {result.segments && result.segments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setTranscriptViewMode('timeline')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          transcriptViewMode === 'timeline'
                            ? 'bg-white text-purple-700 shadow-sm'
                            : 'text-surface-600 hover:text-surface-900'
                        }`}
                      >
                        Timestamps ({result.segments.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTranscriptViewMode('report')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        transcriptViewMode === 'report'
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-surface-600 hover:text-surface-900'
                      }`}
                    >
                      Full Report
                    </button>
                  </div>

                  {/* Mode 1: Verbatim Text Editor */}
                  {transcriptViewMode === 'verbatim' && (
                    <div>
                      <label className="block text-xs font-medium text-surface-500 mb-1">
                        Spoken Dialogue & Words (Editable)
                      </label>
                      <textarea
                        rows={8}
                        value={result.text || ''}
                        onChange={(e) => setResult({ ...result, text: e.target.value })}
                        className="w-full p-4 bg-surface-50 rounded-2xl border border-surface-200 text-surface-900 text-xs font-mono max-h-72 whitespace-pre-wrap leading-relaxed focus:ring-2 focus:ring-purple-400 focus:outline-none"
                        placeholder="Transcript text will appear here..."
                      />
                    </div>
                  )}

                  {/* Mode 2: Timestamped Speech Intervals */}
                  {transcriptViewMode === 'timeline' && (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {result.segments?.map((seg, idx) => (
                        <div key={idx} className="p-3 bg-surface-50 rounded-xl border border-surface-200 text-xs flex items-start gap-2.5">
                          <span className="font-mono font-bold text-purple-700 px-2 py-0.5 bg-purple-50 rounded-md whitespace-nowrap">
                            {seg.startTime || `00:00:${String(Math.floor(seg.start || 0)).padStart(2, '0')}`} - {seg.endTime || `00:00:${String(Math.floor(seg.end || 0)).padStart(2, '0')}`}
                          </span>
                          <span className="text-surface-800 font-medium leading-relaxed">
                            {seg.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mode 3: Full Technical Report */}
                  {transcriptViewMode === 'report' && (
                    <pre className="p-4 bg-surface-50 rounded-2xl border border-surface-200 text-surface-900 text-xs font-mono max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {result.fullReport || result.text}
                    </pre>
                  )}

                  {/* Download Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-50 rounded-2xl border border-surface-200">
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-surface-900">{result.filename}</p>
                      <p className="text-xs text-surface-500">
                        Saved to MediaVault • Formatted transcript ready
                      </p>
                    </div>
                    {result.downloadUrl && (
                      <a
                        href={result.downloadUrl}
                        download={result.filename}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Download Transcript ({targetFormat.toUpperCase()})
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* OCR Text Result */}
              {result.type === 'ocr' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-600 uppercase tracking-wider">
                      Extracted Text ({result.confidence ? `${Math.round(result.confidence)}% Confidence` : 'Verified'})
                    </span>
                    <button
                      onClick={copyOcrToClipboard}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-surface-100 hover:bg-surface-200 rounded-lg text-xs font-semibold text-surface-700 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                  <pre className="p-4 bg-surface-50 rounded-2xl border border-surface-200 text-surface-900 text-xs font-mono max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {result.text || 'No text detected in this image.'}
                  </pre>
                </div>
              )}

              {/* Standard File Result */}
              {result.type === 'file' && (
                <div className="space-y-4">
                  {['webp', 'png', 'jpg', 'jpeg', 'gif'].some(ext => result.filename?.toLowerCase().endsWith(ext)) && (
                    <div className="flex flex-col items-center justify-center p-4 bg-surface-50 rounded-2xl border border-surface-200">
                      <div className="p-4 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px] rounded-2xl border border-surface-200 shadow-sm flex items-center justify-center min-w-[180px] min-h-[180px]">
                        <img
                          src={result.previewUrl || result.downloadUrl}
                          alt="Converted Output Preview"
                          className="max-h-60 max-w-full object-contain rounded-xl drop-shadow-lg"
                        />
                      </div>
                      <span className="text-xs font-semibold text-surface-500 mt-2.5">
                        {selectedTool.studio === 'sticker' ? '512×512 Transparent WebP Sticker Preview' : 'Image Preview'}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-50 rounded-2xl border border-surface-200">
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-surface-900">{result.filename}</p>
                      <p className="text-xs text-surface-500">
                        {result.size ? formatBytes(result.size) : 'Ready for download'} • Saved to MediaVault
                      </p>
                    </div>
                    {result.downloadUrl && (
                      <a
                        href={result.downloadUrl}
                        download
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Download Output File
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Extracted Archive Files List */}
              {result.type === 'archive_extract' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-surface-600 uppercase">
                    Extracted Files ({result.extractedFiles?.length || 0})
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {result.extractedFiles?.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-surface-50 rounded-xl text-xs">
                        <span className="font-semibold text-surface-800">{f.original_name}</span>
                        <span className="text-surface-500">{formatBytes(f.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vault File Selection Modal */}
      {showVaultPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-surface-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h3 className="font-bold text-surface-900 text-base">Select File from MediaVault</h3>
              <button
                onClick={() => setShowVaultPicker(false)}
                className="text-surface-400 hover:text-surface-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {isLoadingVault ? (
                <div className="py-12 text-center text-surface-400 text-xs">Loading files...</div>
              ) : vaultFiles.length === 0 ? (
                <div className="py-12 text-center text-surface-400 text-xs">No files found in your vault.</div>
              ) : (
                vaultFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      setSelectedFile({
                        name: file.original_name,
                        size: file.size,
                        vaultId: file.id
                      });
                      setShowVaultPicker(false);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl border border-surface-200 hover:border-purple-300 hover:bg-purple-50/50 cursor-pointer transition-all"
                  >
                    <div className="truncate mr-3">
                      <p className="text-xs font-semibold text-surface-800 truncate">{file.original_name}</p>
                      <p className="text-[11px] text-surface-400">{formatBytes(file.size)}</p>
                    </div>
                    <span className="text-xs font-bold text-purple-600 px-2 py-1 bg-purple-50 rounded-lg">
                      Select
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UniversalConverterPage;

