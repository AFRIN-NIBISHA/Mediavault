import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { FileUploadModal } from '../files/FileUploadModal';
import { Modal } from '../common/Modal';
import { AICopilotChatbox } from '../assistant/AICopilotChatbox';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#0284C7');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const { addToast } = useToast();

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setCreatingFolder(true);
    try {
      const res = await api.post('/folders', {
        name: folderName.trim(),
        color: folderColor
      });
      if (res.data.success) {
        addToast('Folder created successfully', 'success');
        setFolderName('');
        setNewFolderModalOpen(false);
        // Dispatch custom event to notify file views to refresh
        window.dispatchEvent(new CustomEvent('folder-created'));
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create folder', 'error');
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] text-slate-900 flex antialiased">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenUpload={() => setUploadModalOpen(true)}
          onOpenNewFolder={() => setNewFolderModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full transition-all">
          <Outlet />
        </main>
      </div>

      {/* Global File Upload Modal */}
      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadComplete={() => {
          window.dispatchEvent(new CustomEvent('files-uploaded'));
        }}
      />

      {/* New Folder Creation Modal */}
      <Modal
        isOpen={newFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
        title="Create New Folder"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Folder Name
            </label>
            <input
              type="text"
              placeholder="e.g. Design Deliverables, Tax 2026"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all duration-200"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Color Tag
            </label>
            <div className="flex items-center gap-2">
              {[
                '#0284C7',
                '#6366F1',
                '#10B981',
                '#F59E0B',
                '#EF4444',
                '#EC4899',
                '#06B6D4',
                '#64748B'
              ].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setFolderColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    folderColor === c ? 'scale-125 ring-2 ring-offset-2 ring-sky-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setNewFolderModalOpen(false)}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingFolder || !folderName.trim()}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white transition-all shadow-sm shadow-sky-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {creatingFolder ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Omnipresent AI Copilot Assistant Chatbox */}
      <AICopilotChatbox />
    </div>
  );
}
