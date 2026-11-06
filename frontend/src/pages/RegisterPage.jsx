import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderLock, ArrowRight, User, Mail, Lock, AlertCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), username.trim(), password, fullName.trim());
      addToast('Account created successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
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
          Create your enterprise workspace
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700 underline decoration-sky-300 underline-offset-2">
            Sign in to workspace
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

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Vance"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. alexvance"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/90 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

