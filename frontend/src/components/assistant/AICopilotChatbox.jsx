import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  Bot,
  X,
  Maximize2,
  Minimize2,
  Paperclip,
  FolderOpen,
  Send,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Scissors,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Zap,
  RotateCw,
  Sun,
  Layers,
  ChevronDown,
  Trash2,
  RefreshCw,
  Volume2,
  Music,
  Film,
  Archive
} from 'lucide-react';
import api from '../../services/api';
import { formatBytes } from '../../utils/formatters';
import { convertImageOffline } from '../../utils/offlineConverter';

const QUICK_ACTIONS = [
  { label: '🎙️ Txt to audio (MP3)', prompt: 'MediaVault digital asset management and universal converter. Txt to audio' },
  { label: '🎬 Video to GIF', prompt: 'Video-va animated GIF-ah mathu' },
  { label: '🎵 Extract Audio (MP3)', prompt: 'Extract audio from this video as MP3' },
  { label: '🔄 Reverse GIF', prompt: 'Reverse this GIF boomerang animation' },
  { label: '📊 Clean Excel Duplicates', prompt: 'Remove duplicate rows from Excel sheet' },
  { label: '📦 Create ZIP Archive', prompt: 'Create compressed ZIP archive' },
  { label: '📄 Word to PDF', prompt: 'Word to standardized PDF ah mathu' },
  { label: '📑 PDF to Word (DOCX)', prompt: 'PDF to editable Word DOCX ah mathu' },
  { label: '✨ Transparent Sticker', prompt: 'Itha WhatsApp Telegram standard transparent sticker ah mathi kudu' },
  { label: '✂️ Background Remove', prompt: 'Background remove pannu, transparent PNG kudu' },
  { label: '📄 Resume Ready பண்ணு (PDF)', prompt: 'Full Stack Software Engineer resume ready panni tha PDF-la' },
  { label: '📝 Project Report (Word)', prompt: 'Cloud Computing pathi professional project report Word docx-la ready pannu' },
  { label: '📊 Budget Tracker (Excel)', prompt: 'Monthly budget and expense tracker Excel sheet ready panni kudu' },
  { label: '📽️ 12 Slides Dark Theme (PPT)', prompt: 'MediaVault pathi 12 slides dark theme elegant presentation ready panni tha' }
];

export function AICopilotChatbox({ initialOpen = false, standalone = false }) {
  const [isOpen, setIsOpen] = useState(initialOpen || standalone);
  const [isMaximized, setIsMaximized] = useState(standalone);
  const [inputMessage, setInputMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null); // { type: 'local', file, previewUrl, name, size } or { type: 'vault', fileId, name, size }
  const [isProcessing, setIsProcessing] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultCategory, setVaultCategory] = useState('all');

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Vanakkam! Hello! I am your **MediaVault AI Copilot & Document Generator (like ChatGPT)**! 🤖✨\n\n**ChatGPT போல புதிய ஆவணங்களை உருவாக்கச் சொல்லலாம்:**\n• *"Resume ready panni tha PDF-la"* (Software Engineer Resume)\n• *"Cloud computing pathi project report Word-la create pannu"* (Word DOCX Report)\n• *"Monthly budget tracker Excel sheet ready panni kudu"* (Excel Spreadsheet)\n• *"AI technology pathi 5 slides presentation ready pannu"* (PPT Presentation)\n\n**அல்லது கோப்புகளை இணைத்து எடிட் செய்யச் சொல்லலாம்:**\n• *"Ithula last iruka rendu certificate um remove panni tha"* (PDF Page removal)\n• *"Itha transparent sticker ah mathu"* (Sticker creation)\n• *"Background remove pannu"* (Background cutout)\n• *"Word to PDF mathi kudu"* (Word to PDF)`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Load vault files for picker
  const loadVaultFiles = async () => {
    setVaultLoading(true);
    try {
      const res = await api.get('/files', { params: { limit: 50 } });
      if (res.data?.success) {
        setVaultFiles(res.data.files || []);
      }
    } catch (err) {
      console.error('Failed to load vault files:', err);
    } finally {
      setVaultLoading(false);
    }
  };

  const handleOpenVaultPicker = () => {
    loadVaultFiles();
    setVaultModalOpen(true);
  };

  const handleSelectVaultFile = (file) => {
    setAttachedFile({
      type: 'vault',
      fileId: file.id,
      name: file.original_name,
      size: file.file_size,
      category: file.file_category,
      previewUrl: `/api/files/${file.id}/download`
    });
    setVaultModalOpen(false);
  };

  // Local file selection
  const handleLocalFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const previewUrl = isImage ? URL.createObjectURL(file) : null;

    setAttachedFile({
      type: 'local',
      file,
      previewUrl,
      name: file.name,
      size: file.size
    });

    e.target.value = '';
  };

  const removeAttachment = () => {
    if (attachedFile?.previewUrl && attachedFile.type === 'local') {
      URL.revokeObjectURL(attachedFile.previewUrl);
    }
    setAttachedFile(null);
  };

  const handleSendMessage = async (customPrompt) => {
    const msgText = (customPrompt || inputMessage).trim();
    if (!msgText && !attachedFile) return;

    const userMsgId = 'msg-' + Date.now();
    const currentAttachment = attachedFile;

    const userMessage = {
      id: userMsgId,
      sender: 'user',
      text: msgText || (currentAttachment ? `Edit attached file: ${currentAttachment.name}` : ''),
      attachment: currentAttachment,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('message', msgText);

      if (currentAttachment?.type === 'local' && currentAttachment.file) {
        formData.append('file', currentAttachment.file);
      } else if (currentAttachment?.type === 'vault' && currentAttachment.fileId) {
        formData.append('fileId', currentAttachment.fileId);
      }

      const res = await api.post('/assistant/chat', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const assistantReply = {
        id: 'reply-' + Date.now(),
        sender: 'assistant',
        text: res.data.reply,
        operation: res.data.operation,
        previewUrl: res.data.previewUrl,
        downloadUrl: res.data.downloadUrl,
        outFilename: res.data.outFilename,
        outExt: res.data.outExt,
        size: res.data.size,
        metadata: res.data.metadata,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantReply]);

      // If output is generated, offer to use it as the next active attachment
      if (res.data.file) {
        window.dispatchEvent(new CustomEvent('files-uploaded'));
        setAttachedFile({
          type: 'vault',
          fileId: res.data.file.id,
          name: res.data.outFilename,
          size: res.data.size,
          category: res.data.file.file_category,
          previewUrl: res.data.previewUrl || `/api/files/${res.data.file.id}/download`
        });
      }
    } catch (err) {
      console.warn('AI Copilot network request failed, checking offline in-browser fallback:', err);

      // Offline In-Browser Canvas / Blob Fallback
      if (currentAttachment?.file && currentAttachment.file instanceof File) {
        const lower = msgText.toLowerCase();
        const isSticker = lower.includes('sticker') || lower.includes('ஸ்டிக்கர்');
        const isBw = lower.includes('black and white') || lower.includes('grayscale') || lower.includes('karupu');
        const isPng = lower.includes('png');
        const isJpg = lower.includes('jpg') || lower.includes('jpeg');
        const isWebp = lower.includes('webp');

        if (isSticker || isBw || isPng || isJpg || isWebp) {
          try {
            const targetFormat = isSticker ? 'webp' : (isPng ? 'png' : (isJpg ? 'jpg' : 'webp'));
            const offlineRes = await convertImageOffline(currentAttachment.file, targetFormat, {
              asSticker: isSticker,
              grayscale: isBw
            });

            const offlineReply = {
              id: 'reply-' + Date.now(),
              sender: 'assistant',
              text: `⚡ [Offline Mode Active] Internet connection illama in-browser engine use panni unga request-ah successfully process panniten! Keela iruka preview pathutu download pannikonga! ✨`,
              operation: isSticker ? 'Offline Transparent Sticker' : (isBw ? 'Offline Grayscale' : `Offline Convert to ${targetFormat.toUpperCase()}`),
              previewUrl: offlineRes.previewUrl,
              downloadUrl: offlineRes.downloadUrl,
              outFilename: offlineRes.filename,
              outExt: targetFormat,
              size: offlineRes.size,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages((prev) => [...prev, offlineReply]);
            return;
          } catch (offlineErr) {
            console.warn('Offline chat processing failed:', offlineErr);
          }
        }
      }

      const errorMsg = {
        id: 'err-' + Date.now(),
        sender: 'assistant',
        isError: true,
        text: err.response?.data?.message || err.message || 'Operation failed. Please try again with a valid file or clear instruction.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // If collapsed in floating mode, show launcher button
  if (!isOpen && !standalone) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-sky-600 via-sky-600 to-indigo-600 text-white shadow-apple hover:shadow-elevated hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/30"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
          <Bot className="w-5 h-5 text-white animate-bounce" style={{ animationDuration: '3s' }} />
          <span className="font-semibold text-sm tracking-tight">AI Copilot</span>
          <Sparkles className="w-4 h-4 text-sky-200 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    );
  }

  const containerClasses = standalone
    ? 'w-full h-full flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-apple overflow-hidden'
    : isMaximized
    ? 'fixed inset-4 sm:inset-10 z-50 flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-apple overflow-hidden'
    : 'fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[440px] h-[640px] max-h-[88vh] flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-apple overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200';

  return (
    <>
      <div className={containerClasses}>
        {/* Chatbox Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white/85 backdrop-blur-xl border-b border-slate-200/70 select-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-subtle">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 tracking-tight">MediaVault AI Copilot</h3>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                Autonomous Enterprise Assistant • Multilingual
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!standalone && (
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title={isMaximized ? 'Restore size' : 'Maximize'}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            {!standalone && (
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Attached Active File Bar (if any) */}
        {attachedFile && (
          <div className="px-4 py-2.5 bg-sky-50/70 border-b border-sky-100/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 overflow-hidden">
                {attachedFile.previewUrl && attachedFile.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                  <img src={attachedFile.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0 truncate">
                <p className="font-semibold text-slate-900 truncate leading-tight">{attachedFile.name}</p>
                <p className="text-[10px] text-sky-600 font-medium leading-tight">
                  {attachedFile.size ? formatBytes(attachedFile.size) : 'Ready'} • Active for next command
                </p>
              </div>
            </div>
            <button
              onClick={removeAttachment}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-sky-100 transition-colors cursor-pointer"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F9F9FB]/80">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-subtle mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-none shadow-subtle'
                        : m.isError
                        ? 'bg-rose-50 text-rose-800 border border-rose-200/80 rounded-bl-none'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-subtle'
                    }`}
                  >
                    {/* User attachment pill */}
                    {isUser && m.attachment && (
                      <div className="mb-2 p-2 rounded-xl bg-white/15 border border-white/20 flex items-center gap-2 text-xs">
                        <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center text-white shrink-0 overflow-hidden">
                          {m.attachment.previewUrl && m.attachment.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                            <img src={m.attachment.previewUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-3 h-3" />
                          )}
                        </div>
                        <span className="truncate font-semibold text-[11px]">{m.attachment.name}</span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{m.text}</div>

                    {/* Assistant Result Card (if operation generated output) */}
                    {!isUser && m.previewUrl && (
                      <div className="mt-3 p-3 bg-white rounded-2xl border border-slate-200/80 shadow-subtle space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                          <span className="flex items-center gap-1.5 text-sky-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            {m.operation || 'Result Output'}
                          </span>
                          {m.size && <span className="text-slate-500 font-normal">{formatBytes(m.size)}</span>}
                        </div>

                        {/* Visual Media Preview */}
                        {m.outExt && ['webp', 'png', 'jpg', 'jpeg', 'gif'].includes(m.outExt.toLowerCase()) ? (
                          <div className="p-3 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:10px_10px] rounded-xl border border-slate-200/60 flex items-center justify-center min-h-[140px] max-h-[220px]">
                            <img
                              src={m.previewUrl}
                              alt="Output Preview"
                              className="max-h-[200px] max-w-full object-contain rounded-lg drop-shadow-sm"
                            />
                          </div>
                        ) : m.outExt && ['mp4', 'mov', 'webm'].includes(m.outExt.toLowerCase()) ? (
                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                                <Film className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-slate-900 truncate">{m.outFilename}</p>
                                <p className="text-[10px] text-slate-500 uppercase">{m.outExt} Video Stream</p>
                              </div>
                            </div>
                            <video controls src={m.previewUrl || m.downloadUrl} className="w-full max-h-56 rounded-lg bg-black" />
                          </div>
                        ) : m.outExt && ['mp3', 'wav', 'ogg', 'aac'].includes(m.outExt.toLowerCase()) ? (
                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Volume2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-slate-900 truncate">{m.outFilename}</p>
                                <p className="text-[10px] text-slate-500 uppercase">Spoken MP3 Audio Narration</p>
                              </div>
                            </div>
                            <audio controls src={m.previewUrl || m.downloadUrl} className="w-full h-8 rounded" />
                          </div>
                        ) : m.outExt && ['zip', 'rar', 'tar', 'gz'].includes(m.outExt.toLowerCase()) ? (
                          <div className="p-3 bg-slate-50/80 rounded-xl border border-amber-200/70 flex items-center gap-3">
                            <Archive className="w-8 h-8 text-amber-600" />
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-slate-900 truncate">{m.outFilename}</p>
                              <p className="text-[10px] text-slate-500 uppercase">Compressed ZIP Archive</p>
                            </div>
                          </div>
                        ) : m.outExt && ['xlsx', 'xls', 'csv'].includes(m.outExt.toLowerCase()) ? (
                          <div className="p-3 bg-slate-50/80 rounded-xl border border-emerald-200/70 flex items-center gap-3">
                            <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-slate-900 truncate">{m.outFilename}</p>
                              <p className="text-[10px] text-slate-500 uppercase">{m.outExt} Spreadsheet</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 flex items-center gap-3">
                            <FileText className="w-8 h-8 text-sky-600" />
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-slate-900 truncate">{m.outFilename}</p>
                              <p className="text-[10px] text-slate-500 uppercase">{m.outExt} Document</p>
                            </div>
                          </div>
                        )}

                        {/* Download & Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {m.downloadUrl && (
                            <a
                              href={m.downloadUrl}
                              download
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-subtle active:scale-97 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download File
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 px-1">{m.timestamp}</span>
                </div>
              </div>
            );
          })}

          {/* Typing / Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-sky-700 bg-sky-50/90 p-3 rounded-2xl border border-sky-100 w-fit shadow-subtle">
              <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
              <span className="font-medium">Processing instruction & editing file...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-white/95 border-t border-slate-200/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_ACTIONS.map((qa, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(qa.prompt)}
              disabled={isProcessing}
              className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100/80 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 text-slate-700 border border-slate-200/70 transition-all cursor-pointer whitespace-nowrap"
            >
              {qa.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200/60">
          <div className="flex items-end gap-2 bg-slate-50/90 rounded-2xl p-2 border border-slate-200/80 focus-within:bg-white focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10 transition-all">
            {/* Attachment buttons */}
            <div className="flex items-center gap-1 pb-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLocalFileChange}
                className="hidden"
                accept="*/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                title="Attach file from computer"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleOpenVaultPicker}
                className="p-1.5 rounded-xl text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                title="Select from MediaVault"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
            </div>

            {/* Message input */}
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 'Resume ready pannu PDF-la', 'Project report Word-la create pannu'..."
              rows={1}
              className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none max-h-24 py-1.5"
            />

            {/* Send button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isProcessing || (!inputMessage.trim() && !attachedFile)}
              className="p-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 text-white transition-all shadow-subtle active:scale-95 cursor-pointer shrink-0"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Select from Vault Modal */}
      {vaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-apple border border-slate-200/80 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Select File from MediaVault</h3>
              </div>
              <button
                onClick={() => setVaultModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter categories */}
            <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-50/70 border-b border-slate-200/60 overflow-x-auto text-xs">
              {['all', 'photos', 'documents'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setVaultCategory(cat)}
                  className={`px-3 py-1 rounded-full font-medium capitalize transition-all cursor-pointer ${
                    vaultCategory === cat
                      ? 'bg-sky-50 text-sky-700 border border-sky-200 font-semibold shadow-subtle'
                      : 'bg-white text-slate-600 border border-slate-200/60 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {vaultLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                  <span className="text-xs font-semibold">Loading your vault files...</span>
                </div>
              ) : vaultFiles.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No files found in MediaVault. Upload one to get started!
                </div>
              ) : (
                vaultFiles
                  .filter((f) => {
                    if (vaultCategory === 'photos') return f.file_category === 'photos';
                    if (vaultCategory === 'documents') return f.file_category === 'documents';
                    return true;
                  })
                  .map((f) => (
                    <div
                      key={f.id}
                      onClick={() => handleSelectVaultFile(f)}
                      className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/70 hover:border-sky-300 hover:bg-sky-50/40 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          {f.file_category === 'photos' ? (
                            <ImageIcon className="w-4 h-4 text-sky-600" />
                          ) : f.original_name.endsWith('.pdf') ? (
                            <FileText className="w-4 h-4 text-rose-500" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-slate-900 group-hover:text-sky-700 truncate">
                            {f.original_name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatBytes(f.file_size)} • {f.extension?.toUpperCase() || 'FILE'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Select →
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

