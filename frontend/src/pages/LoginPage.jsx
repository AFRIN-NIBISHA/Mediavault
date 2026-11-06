import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FolderLock, ArrowRight, Lock, User, KeyRound, AlertCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Modal } from '../components/common/Modal';

export function LoginPage() {
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password modal
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [resetTokenInfo, setResetTokenInfo] = useState('');

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await login(loginInput.trim(), password);
      addToast('Signed in successfully', 'success');
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (userType) => {
    if (userType === 'admin') {
      setLoginInput('admin@mediavault.io');
      setPassword('AdminPassword123!');
    } else {
      setLoginInput('user@mediavault.io');
      setPassword('UserPassword123!');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;

    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail });
      setForgotMsg(res.data.message);
      if (res.data.resetToken) {
        setResetTokenInfo(res.data.resetToken);
      }
    } catch (err) {
      setForgotMsg(err.response?.data?.message || 'Error processing request');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FB] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background soft light diffusion */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute top-5 right-5 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-subtle"
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-sky-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <Link to="/" className="inline-flex items-center space-x-3 mb-4 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-apple group-hover:scale-105 transition-transform">
            <FolderLock className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="font-bold text-2xl tracking-tighter text-slate-900 block leading-none">
              MediaVault
            </span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-sky-600">
              by Secure Hardline
            </span>
          </div>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
          Sign in to your workspace
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Or{' '}
          <Link to="/register" className="font-semibold text-sky-600 hover:text-sky-700 underline decoration-sky-300 underline-offset-2">
            create a new enterprise account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl py-8 px-6 sm:px-9 shadow-apple rounded-3xl border border-slate-200/80 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200/90 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Quick Demo Credentials */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Demo Access
              </p>
              <span className="text-[10px] text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                Instant Fill
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillDemo('user')}
                className="px-3 py-2 rounded-xl bg-white hover:bg-sky-50/60 text-xs font-semibold text-slate-800 hover:text-sky-700 hover:border-sky-300 border border-slate-200/80 shadow-subtle transition-all text-left group"
              >
                <div className="font-semibold">Regular User</div>
                <span className="text-[10px] text-slate-400 block font-normal truncate group-hover:text-sky-600">user@mediavault.io</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="px-3 py-2 rounded-xl bg-white hover:bg-sky-50/60 text-xs font-semibold text-slate-800 hover:text-sky-700 hover:border-sky-300 border border-slate-200/80 shadow-subtle transition-all text-left group"
              >
                <div className="font-semibold">Administrator</div>
                <span className="text-[10px] text-slate-400 block font-normal truncate group-hover:text-sky-600">admin@mediavault.io</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="e.g. user@mediavault.io"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs text-sky-600 hover:text-sky-700 hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-subtle hover:shadow-apple transition-all duration-200 transform active:scale-97 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => {
          setForgotModalOpen(false);
          setForgotMsg('');
          setResetTokenInfo('');
        }}
        title="Reset Password"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter your account email. MediaVault will generate a secure reset token for verification.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="user@mediavault.io"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
            />
          </div>

          {forgotMsg && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <p className="font-medium text-sky-700">{forgotMsg}</p>
              {resetTokenInfo && (
                <div className="mt-2 font-mono text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 break-all select-all text-slate-800">
                  Token: {resetTokenInfo}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-subtle active:scale-97 transition-all cursor-pointer"
            >
              Send Reset Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

