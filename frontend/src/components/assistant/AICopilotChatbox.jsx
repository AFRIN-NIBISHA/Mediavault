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
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { formatBytes } from '../../utils/formatters';
import { convertImageOffline } from '../../utils/offlineConverter';

const QUICK_ACTIONS = [
  { label: '📽️ 12 Slides Dark Theme (PPT)', prompt: 'MediaVault pathi 12 slides dark theme elegant presentation ready panni tha' },
  { label: '✨ 12 Slides Light Theme (PPT)', prompt: 'MediaVault pathi 12 slides light theme premium presentation ready panni tha' },
  { label: '🏛️ Corporate Navy Deck (PPT)', prompt: 'MediaVault pathi 12 slides corporate navy presentation ready panni kudu' },
  { label: '📄 Resume Ready பண்ணு (PDF)', prompt: 'Full Stack Software Engineer resume ready panni tha PDF-la' },
  { label: '📝 Project Report (Word)', prompt: 'Cloud Computing pathi professional project report Word docx-la ready pannu' },
  { label: '📊 Budget Tracker (Excel)', prompt: 'Monthly budget and expense tracker Excel sheet ready panni kudu' },
  { label: 'Transparent Sticker-ஆ மாத்து', prompt: 'Itha WhatsApp Telegram standard transparent sticker ah mathi kudu' },
  { label: 'Background Remove பண்ணு', prompt: 'Background remove pannu, transparent PNG kudu' },
  { label: 'Remove Last 2 Pages (PDF)', prompt: 'Ithula last iruka rendu certificate um remove panni tha' },
  { label: 'PDF to Word (DOCX)', prompt: 'PDF to editable Word DOCX ah mathu' }
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
          className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
          </span>
          <Bot className="w-5 h-5 text-white animate-bounce" style={{ animationDuration: '3s' }} />
          <span className="font-bold text-sm tracking-wide">AI Copilot</span>
          <Sparkles className="w-4 h-4 text-purple-200 group-hover:rotate-12 transition-transform" />
        </button>
      </div>
    );
  }

  const containerClasses = standalone
    ? 'w-full h-full flex flex-col bg-white rounded-3xl border border-surface-200 shadow-xl overflow-hidden'
    : isMaximized
    ? 'fixed inset-4 sm:inset-10 z-50 flex flex-col bg-white rounded-3xl border border-surface-200 shadow-2xl overflow-hidden'
    : 'fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[440px] h-[640px] max-h-[88vh] flex flex-col bg-white rounded-3xl border border-surface-200 shadow-2xl shadow-purple-950/15 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200';

  return (
    <>
      <div className={containerClasses}>
        {/* Chatbox Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 text-white select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm leading-tight">MediaVault AI Copilot</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-purple-200/90 leading-tight mt-0.5">
                English • Tanglish • தமிழ் Voice & Text
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!standalone && (
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title={isMaximized ? 'Restore size' : 'Maximize'}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            {!standalone && (
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Attached Active File Bar (if any) */}
        {attachedFile && (
          <div className="px-4 py-2.5 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-purple-200 text-purple-700 flex items-center justify-center shrink-0 overflow-hidden">
                {attachedFile.previewUrl && attachedFile.name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                  <img src={attachedFile.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="min-w-0 truncate">
                <p className="font-bold text-purple-950 truncate leading-tight">{attachedFile.name}</p>
                <p className="text-[10px] text-purple-600 leading-tight">
                  {attachedFile.size ? formatBytes(attachedFile.size) : 'Ready'} • Active for next command
                </p>
              </div>
            </div>
            <button
              onClick={removeAttachment}
              className="p-1 rounded-md text-purple-400 hover:text-purple-700 hover:bg-purple-200/50 transition-colors cursor-pointer"
              title="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-50/60">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-purple-600 text-white rounded-br-none'
                        : m.isError
                        ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-none'
                        : 'bg-white text-surface-900 border border-surface-200/80 rounded-bl-none'
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
                      <div className="mt-3 p-3 bg-surface-50 rounded-xl border border-surface-200 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-surface-700">
                          <span className="flex items-center gap-1.5 text-purple-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            {m.operation || 'Result Output'}
                          </span>
                          {m.size && <span className="text-surface-500">{formatBytes(m.size)}</span>}
                        </div>

                        {/* Visual Media Preview */}
                        {m.outExt && ['webp', 'png', 'jpg', 'jpeg'].includes(m.outExt.toLowerCase()) ? (
                          <div className="p-3 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:10px_10px] rounded-lg border border-surface-200 flex items-center justify-center min-h-[140px] max-h-[220px]">
                            <img
                              src={m.previewUrl}
                              alt="Output Preview"
                              className="max-h-[200px] max-w-full object-contain rounded-md drop-shadow-md"
                            />
                          </div>
                        ) : (
                          <div className="p-3 bg-white rounded-lg border border-surface-200 flex items-center gap-3">
                            <FileText className="w-8 h-8 text-purple-600" />
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-surface-900 truncate">{m.outFilename}</p>
                              <p className="text-[10px] text-surface-500 uppercase">{m.outExt} Document</p>
                            </div>
                          </div>
                        )}

                        {/* Download & Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {m.downloadUrl && (
                            <a
                              href={m.downloadUrl}
                              download
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download File
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-surface-400 px-1">{m.timestamp}</span>
                </div>
              </div>
            );
          })}

          {/* Typing / Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50/80 p-3 rounded-2xl border border-purple-100 w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span className="font-semibold">Processing instruction & editing file...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-white border-t border-surface-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_ACTIONS.map((qa, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(qa.prompt)}
              disabled={isProcessing}
              className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-100 hover:bg-purple-50 hover:text-purple-700 text-surface-700 border border-surface-200 transition-all cursor-pointer whitespace-nowrap"
            >
              {qa.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-surface-200">
          <div className="flex items-end gap-2 bg-surface-50 rounded-2xl p-2 border border-surface-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
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
                className="p-1.5 rounded-xl text-surface-500 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                title="Attach file from computer"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleOpenVaultPicker}
                className="p-1.5 rounded-xl text-surface-500 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
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
              placeholder="ChatGPT mathiri: 'Resume ready pannu PDF-la', 'Project report Word-la create pannu', 'Budget sheet Excel-la kudu'..."
              rows={1}
              className="flex-1 bg-transparent text-xs sm:text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none resize-none max-h-24 py-1.5"
            />

            {/* Send button */}
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isProcessing || (!inputMessage.trim() && !attachedFile)}
              className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:hover:bg-purple-600 text-white transition-all shadow-md shadow-purple-600/20 cursor-pointer shrink-0"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-surface-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-base text-surface-900">Select File from MediaVault</h3>
              </div>
              <button
                onClick={() => setVaultModalOpen(false)}
                className="p-1.5 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter categories */}
            <div className="flex items-center gap-2 px-6 py-2.5 bg-surface-50 border-b border-surface-200 overflow-x-auto text-xs">
              {['all', 'photos', 'documents'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setVaultCategory(cat)}
                  className={`px-3 py-1 rounded-full font-bold capitalize transition-all cursor-pointer ${
                    vaultCategory === cat
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white text-surface-600 hover:bg-surface-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {vaultLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-surface-400">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="text-xs font-semibold">Loading your vault files...</span>
                </div>
              ) : vaultFiles.length === 0 ? (
                <div className="text-center py-12 text-surface-400 text-xs">
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
                      className="flex items-center justify-between p-3 rounded-2xl border border-surface-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          {f.file_category === 'photos' ? (
                            <ImageIcon className="w-4 h-4" />
                          ) : f.original_name.endsWith('.pdf') ? (
                            <FileText className="w-4 h-4 text-red-500" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-surface-900 group-hover:text-purple-700 truncate">
                            {f.original_name}
                          </p>
                          <p className="text-[10px] text-surface-400">
                            {formatBytes(f.file_size)} • {f.extension?.toUpperCase() || 'FILE'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
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

