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
  const [folderColor, setFolderColor] = useState('#0c87eb');
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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenUpload={() => setUploadModalOpen(true)}
          onOpenNewFolder={() => setNewFolderModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
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
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Folder Name
            </label>
            <input
              type="text"
              placeholder="e.g. Design Deliverables, Tax 2026"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:border-brand-500"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-2">
              Color Tag
            </label>
            <div className="flex items-center gap-2">
              {[
                '#0c87eb',
                '#10b981',
                '#8b5cf6',
                '#f59e0b',
                '#ef4444',
                '#ec4899',
                '#06b6d4',
                '#64748b'
              ].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setFolderColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    folderColor === c ? 'scale-125 ring-2 ring-offset-2 ring-brand-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-surface-100 dark:border-surface-800">
            <button
              type="button"
              onClick={() => setNewFolderModalOpen(false)}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingFolder || !folderName.trim()}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50"
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

