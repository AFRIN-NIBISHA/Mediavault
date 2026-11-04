import React from 'react';
import { Link } from 'react-router-dom';
import {
  FolderLock,
  ArrowRight,
  Shield,
  Zap,
  Image,
  FileText,
  Copy,
  Layers,
  HardDrive,
  Share2,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Lock,
  RotateCcw,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-100 flex flex-col">
      {/* Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-violet-400 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <FolderLock className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-surface-900 dark:text-white">
              MediaVault
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-surface-600 dark:text-surface-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
            >
              Features
            </a>
            <Link
              to="/converter"
              className="text-surface-600 dark:text-surface-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
            >
              Universal Converter
            </Link>
            <Link
              to="/photo-toolkit"
              className="text-surface-600 dark:text-surface-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
            >
              Photo Toolkit
            </Link>
            <Link
              to="/file-toolkit"
              className="text-surface-600 dark:text-surface-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
            >
              File Toolkit
            </Link>
            <a
              href="#comparison"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-surface-600 dark:text-surface-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
            >
              Comparison
            </a>
            <a
              href="#faq"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-surface-600 dark:text-surface-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className="p-2 rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-subtle"
            >
              {theme === 'light' ? <Moon className="w-4 h-4 text-purple-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                Go to Workspace
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-surface-700 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white text-sm font-semibold transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all transform active:scale-95"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 text-center overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-semibold shadow-subtle">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span>Unified Digital Asset & File Management Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-surface-950 dark:text-white leading-[1.1]">
            One Platform. Every File.{' '}
            <span className="bg-gradient-to-r from-purple-600 via-fuchsia-500 to-violet-600 bg-clip-text text-transparent">
              Complete Control.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-surface-600 dark:text-surface-300 max-w-2xl mx-auto leading-relaxed">
            Manage, edit, organize, convert, and share all your digital assets through one powerful workspace. Engineered with enterprise security, sharp image processing, and intelligent deduplication.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-semibold shadow-elevated flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
              <span>{isAuthenticated ? 'Open Workspace' : 'Get Started'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-3.5 bg-white dark:bg-surface-900 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-800 dark:text-surface-200 border border-surface-200 dark:border-surface-800 rounded-2xl font-semibold shadow-subtle transition-all cursor-pointer"
            >
              Explore Features
            </a>
          </div>

          {/* Quick Demo Credentials pill */}
          <div className="pt-4 text-xs text-surface-500 flex items-center justify-center gap-2">
            <span>Demo accounts ready:</span>
            <code className="bg-surface-200 dark:bg-surface-800 px-2 py-0.5 rounded font-mono">user@mediavault.io</code>
            <span>or</span>
            <code className="bg-surface-200 dark:bg-surface-800 px-2 py-0.5 rounded font-mono">admin@mediavault.io</code>
          </div>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="max-w-6xl mx-auto mt-16 rounded-3xl p-3 bg-gradient-to-b from-surface-200/60 to-surface-100/30 dark:from-surface-800/60 dark:to-surface-900/30 border border-surface-200 dark:border-surface-800 shadow-elevated">
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6 text-left space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-200 dark:border-surface-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-3 text-xs font-mono text-surface-400">mediavault.io/workspace</span>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                PostgreSQL Engine Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Link
                to="/files"
                className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700/60 hover:border-purple-400 hover:shadow-subtle transition-all cursor-pointer group"
              >
                <p className="text-xs text-surface-500 font-medium">Unified Assets</p>
                <p className="text-2xl font-bold mt-1 text-surface-900 dark:text-white group-hover:text-purple-600 transition-colors">100% Private</p>
                <p className="text-[11px] text-emerald-500 mt-1 flex items-center justify-between">
                  <span>Role-Based Isolated</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">Open &rarr;</span>
                </p>
              </Link>
              <Link
                to="/photo-toolkit"
                className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700/60 hover:border-purple-400 hover:shadow-subtle transition-all cursor-pointer group"
              >
                <p className="text-xs text-surface-500 font-medium">Photo Toolkit</p>
                <p className="text-2xl font-bold mt-1 text-surface-900 dark:text-white group-hover:text-purple-600 transition-colors">13 Tools</p>
                <p className="text-[11px] text-purple-600 mt-1 flex items-center justify-between">
                  <span>Sharp Image Engine</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">Open &rarr;</span>
                </p>
              </Link>
              <Link
                to="/pdf-tools"
                className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700/60 hover:border-purple-400 hover:shadow-subtle transition-all cursor-pointer group"
              >
                <p className="text-xs text-surface-500 font-medium">PDF & Utilities</p>
                <p className="text-2xl font-bold mt-1 text-surface-900 dark:text-white group-hover:text-purple-600 transition-colors">Full Suite</p>
                <p className="text-[11px] text-purple-500 mt-1 flex items-center justify-between">
                  <span>PDF-lib & JSZip Engine</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">Open &rarr;</span>
                </p>
              </Link>
              <Link
                to="/duplicates"
                className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700/60 hover:border-purple-400 hover:shadow-subtle transition-all cursor-pointer group"
              >
                <p className="text-xs text-surface-500 font-medium">Duplicate Hunter</p>
                <p className="text-2xl font-bold mt-1 text-surface-900 dark:text-white group-hover:text-purple-600 transition-colors">Dual Mode</p>
                <p className="text-[11px] text-amber-500 mt-1 flex items-center justify-between">
                  <span>SHA-256 + dHash</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">Open &rarr;</span>
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">Engineered for Complete Asset Autonomy</h2>
          <p className="text-surface-600 dark:text-surface-400 text-sm sm:text-base">
            Every feature is backed by dedicated backend processing algorithms rather than mock representations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Photo Toolkit */}
          <Link
            to="/photo-toolkit"
            className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium hover:shadow-elevated hover:border-purple-400 dark:hover:border-purple-600 hover:-translate-y-1.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Image className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold group-hover:text-purple-600 transition-colors">Photo Toolkit</h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                Crop, resize, rotate, flip, adjust contrast/brightness/saturation, apply artistic filters, add custom watermarks, and compress images with before-and-after visual inspection.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>Launch Photo Studio</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 2: File Toolkit & PDF Suite */}
          <Link
            to="/file-toolkit"
            className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium hover:shadow-elevated hover:border-emerald-400 dark:hover:border-emerald-600 hover:-translate-y-1.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold group-hover:text-emerald-600 transition-colors">File Toolkit & PDF Suite</h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                Merge multiple PDFs, split documents, extract or reorder individual pages, rotate orientations, convert photo collections directly into PDF booklets, and compress ZIP archives.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Open PDF & File Studio</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Advanced Duplicate Detection */}
          <Link
            to="/duplicates"
            className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium hover:shadow-elevated hover:border-amber-400 dark:hover:border-amber-600 hover:-translate-y-1.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Copy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold group-hover:text-amber-600 transition-colors">Advanced Duplicate Detection</h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                Dual-layer scanning: cryptographic SHA-256 for exact byte matches, and 64-bit difference hashing (dHash) for finding visually similar or re-compressed photos.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
              <span>Scan Duplicate Assets</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Version History */}
          <Link
            to="/versions"
            className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium hover:shadow-elevated hover:border-indigo-400 dark:hover:border-indigo-600 hover:-translate-y-1.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold group-hover:text-indigo-600 transition-colors">Version History</h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                Every file transformation or document update records an immutable version. Roll back to any historical state with a single click without data corruption.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <span>Inspect Version Log</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 5: Secure Asset Sharing */}
          <Link
            to="/shared"
            className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium hover:shadow-elevated hover:border-purple-400 dark:hover:border-purple-600 hover:-translate-y-1.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold group-hover:text-purple-600 transition-colors">Secure Asset Sharing</h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                Generate unique cryptographic sharing links with time-limited expiration, optional password enforcement, and real-time view & download tracking.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400">
              <span>Manage Shared Vaults</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Card 6: Storage Analytics & Recycle Bin */}
          <Link
            to="/analytics"
            className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium hover:shadow-elevated hover:border-rose-400 dark:hover:border-rose-600 hover:-translate-y-1.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <HardDrive className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold group-hover:text-rose-600 transition-colors">Storage Analytics & Recycle Bin</h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                Live storage breakdown by category, largest file audit, wasted duplicate metric, and a safe 30-day recycling bin to protect against accidental deletions.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
              <span>Explore Analytics & Bin</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* Feature Comparison Section */}
      <section id="comparison" className="py-20 px-6 bg-surface-100/60 dark:bg-surface-900/40 border-y border-surface-200 dark:border-surface-800">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight">Why MediaVault?</h2>
            <p className="text-surface-600 dark:text-surface-400 text-sm">
              How MediaVault compares with traditional siloed cloud storage solutions.
            </p>
          </div>

          <div className="bg-white dark:bg-surface-900 rounded-3xl border border-surface-200 dark:border-surface-800 overflow-hidden shadow-premium">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-800 text-xs font-bold uppercase tracking-wider text-surface-500">
                <tr>
                  <th className="p-4 sm:p-5">Capability</th>
                  <th className="p-4 sm:p-5 text-brand-600 dark:text-brand-400">MediaVault</th>
                  <th className="p-4 sm:p-5 text-surface-400">Traditional Cloud Drive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                <tr>
                  <td className="p-4 sm:p-5 font-medium">In-Workspace Photo Editor (Crop, Filters, Watermark)</td>
                  <td className="p-4 sm:p-5 text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Native Sharp Engine</td>
                  <td className="p-4 sm:p-5 text-surface-400">Requires 3rd party tool</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium">PDF Merge, Split & Page Extraction</td>
                  <td className="p-4 sm:p-5 text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Built-in PDF Tools</td>
                  <td className="p-4 sm:p-5 text-surface-400">Viewer only</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium">Perceptual Image Duplicate Detection</td>
                  <td className="p-4 sm:p-5 text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> 64-bit dHash Analysis</td>
                  <td className="p-4 sm:p-5 text-surface-400">Not supported</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium">Side-by-Side Visual Asset Comparison</td>
                  <td className="p-4 sm:p-5 text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Interactive Split & Slider</td>
                  <td className="p-4 sm:p-5 text-surface-400">Not supported</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium">Full Version History with 1-Click Rollback</td>
                  <td className="p-4 sm:p-5 text-emerald-600 font-bold flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Comprehensive Revisions</td>
                  <td className="p-4 sm:p-5 text-surface-400">Limited tiers</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 max-w-4xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <p className="text-surface-600 dark:text-surface-400 text-sm">
            Everything you need to know about the MediaVault architecture.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'How does MediaVault detect duplicate files?',
              a: 'MediaVault utilizes a dual-engine architecture: cryptographic SHA-256 for exact byte-matching, and difference hashing (dHash) via Sharp to detect visually similar images even if slightly resized or compressed.'
            },
            {
              q: 'Can I edit images without losing the original file?',
              a: 'Yes! The visual editor gives you the choice to save your changes as a brand new asset or save as a new revision under the existing file with complete version history rollback.'
            },
            {
              q: 'How does password-protected file sharing work?',
              a: 'When you share a file with an optional password, MediaVault hashes the password using bcrypt. The recipient is presented with a clean verification prompt before granting preview or download access.'
            },
            {
              q: 'What database powers MediaVault?',
              a: 'MediaVault runs on PostgreSQL with fully normalized tables, foreign key constraints, and automatic migration scripts.'
            }
          ].map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 space-y-2">
              <h4 className="font-semibold text-base text-surface-900 dark:text-surface-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-brand-500 flex-shrink-0" />
                {item.q}
              </h4>
              <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed pl-6">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 px-6 border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-center text-xs text-surface-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <FolderLock className="w-4 h-4 text-brand-500" />
            <span className="font-semibold text-surface-800 dark:text-surface-200">MediaVault</span>
            <span>— Final Year Engineering Platform</span>
          </div>
          <p>© {new Date().getFullYear()} MediaVault. Production-grade Digital Asset & File Management.</p>
        </div>
      </footer>
    </div>
  );
}

