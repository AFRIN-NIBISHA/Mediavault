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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="p-2 rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-subtle"
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-purple-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-violet-400 flex items-center justify-center text-white shadow-elevated">
            <FolderLock className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-surface-900 dark:text-white">
            MediaVault
          </span>
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-surface-900 dark:text-surface-100">
          Sign in to your workspace
        </h2>
        <p className="mt-1 text-xs text-surface-500">
          Or{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:text-brand-500 underline">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-surface-900 py-8 px-6 sm:px-8 shadow-elevated rounded-3xl border border-surface-200 dark:border-surface-800 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Demo Credentials */}
          <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('user')}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-surface-700 text-xs font-semibold text-surface-800 dark:text-surface-200 hover:border-brand-500 border border-surface-200 dark:border-surface-600 shadow-subtle transition-all text-left"
              >
                Regular User
                <span className="text-[10px] text-surface-400 block font-normal">user@mediavault.io</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-surface-700 text-xs font-semibold text-surface-800 dark:text-surface-200 hover:border-brand-500 border border-surface-200 dark:border-surface-600 shadow-subtle transition-all text-left"
              >
                Administrator
                <span className="text-[10px] text-surface-400 block font-normal">admin@mediavault.io</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="e.g. user@mediavault.io"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 rounded-xl text-xs sm:text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-50 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700 rounded-xl text-xs sm:text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
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
          <p className="text-xs text-surface-500 leading-relaxed">
            Enter your account email. MediaVault will generate a secure reset token for testing.
          </p>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="user@mediavault.io"
              className="w-full px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-xs sm:text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          {forgotMsg && (
            <div className="p-3 bg-surface-100 dark:bg-surface-800 rounded-xl text-xs text-surface-700 dark:text-surface-300">
              <p>{forgotMsg}</p>
              {resetTokenInfo && (
                <div className="mt-2 font-mono text-[11px] bg-white dark:bg-surface-900 p-2 rounded border border-surface-200 dark:border-surface-700 break-all">
                  Token: {resetTokenInfo}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setForgotModalOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold"
            >
              Send Reset Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

