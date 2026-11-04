import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import { AppLayout } from './components/layout/AppLayout';
import { PwaStatusBanner } from './components/common/PwaStatusBanner';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { AllFilesPage } from './pages/AllFilesPage';
import { UniversalConverterPage } from './pages/UniversalConverterPage';
import { PhotoToolkitPage } from './pages/PhotoToolkitPage';
import { ImageEditorPage } from './pages/ImageEditorPage';
import { AIPhotoStudioPage } from './pages/AIPhotoStudioPage';
import { DesignStudioPage } from './pages/DesignStudioPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { FileToolkitPage } from './pages/FileToolkitPage';
import { PdfToolsPage } from './pages/PdfToolsPage';
import { BulkProcessingPage } from './pages/BulkProcessingPage';
import { DuplicateManagerPage } from './pages/DuplicateManagerPage';
import { VersionHistoryPage } from './pages/VersionHistoryPage';
import { StorageAnalyticsPage } from './pages/StorageAnalyticsPage';
import { SharedFilesPage } from './pages/SharedFilesPage';
import { FavouritesPage } from './pages/FavouritesPage';
import { RecentFilesPage } from './pages/RecentFilesPage';
import { RecycleBinPage } from './pages/RecycleBinPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { PublicSharedViewPage } from './pages/PublicSharedViewPage';

function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export function App() {
  return (
    <>
      <PwaStatusBanner />
      <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/share/:token" element={<PublicSharedViewPage />} />

      {/* Authenticated Application Workspace */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/files" element={<AllFilesPage />} />
        <Route path="/converter" element={<UniversalConverterPage />} />
        <Route path="/assistant" element={<AIAssistantPage />} />
        <Route path="/photo-toolkit" element={<PhotoToolkitPage />} />
        <Route path="/image-editor" element={<ImageEditorPage />} />
        <Route path="/photo-studio" element={<ImageEditorPage />} />
        <Route path="/ai-studio" element={<AIPhotoStudioPage />} />
        <Route path="/design-studio" element={<DesignStudioPage />} />
        <Route path="/file-toolkit" element={<FileToolkitPage />} />
        <Route path="/pdf-tools" element={<PdfToolsPage />} />
        <Route path="/bulk-processing" element={<BulkProcessingPage />} />
        <Route path="/duplicates" element={<DuplicateManagerPage />} />
        <Route path="/versions" element={<VersionHistoryPage />} />
        <Route path="/analytics" element={<StorageAnalyticsPage />} />
        <Route path="/shared" element={<SharedFilesPage />} />
        <Route path="/favourites" element={<FavouritesPage />} />
        <Route path="/recent" element={<RecentFilesPage />} />
        <Route path="/trash" element={<RecycleBinPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Admin Console */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}

export default App;

