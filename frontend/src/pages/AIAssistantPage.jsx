import React from 'react';
import { AICopilotChatbox } from '../components/assistant/AICopilotChatbox';
import { Bot, Sparkles, Wand2, Scissors, FileText, RefreshCw, Zap } from 'lucide-react';

export function AIAssistantPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-purple-900/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 blur-3xl pointer-events-none rounded-full" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>Multi-Lingual AI Copilot & Media Editor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            MediaVault AI Assistant
          </h1>
          <p className="text-sm sm:text-base text-purple-100/90 leading-relaxed">
            Attach any photo, document, spreadsheet, or sticker and talk to the AI in English, Tanglish, or தமிழ். The assistant understands your instructions and immediately performs the edits!
          </p>
        </div>
      </div>

      {/* Embedded Full-View Chatbox */}
      <div className="h-[680px] w-full">
        <AICopilotChatbox standalone={true} />
      </div>
    </div>
  );
}

