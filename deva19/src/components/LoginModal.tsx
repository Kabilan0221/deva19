import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { apiRequest, setAuthSession } from '../utils/api';
import { StoreSettings } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  settings?: StoreSettings | null;
  targetView?: 'pos' | 'admin' | null;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  settings,
  targetView,
}) => {
  const [mode, setMode] = useState<'login' | 'recovery'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Recovery Key States (no SMS / MSG91 / WhatsApp / OTP needed)
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('owner');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [showRecoveryNewPassword, setShowRecoveryNewPassword] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      if (res && res.token && res.user) {
        setAuthSession(res.token, res.user);
        onLoginSuccess(res.user);
        onClose();
      } else {
        setError('Invalid username or password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const resetForgotState = () => {
    setMode('login');
    setError(null);
    setSuccessMessage(null);
    setRecoveryKey('');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
  };

  // Recovery Key reset: one step, no OTP/SMS involved at all.
  const handleRecoveryKeyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (recoveryNewPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setError('Passwords do not match. Please enter the same password in both fields.');
      return;
    }
    if (!recoveryKey.trim()) {
      setError('Please enter the Recovery Key.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        token: string;
        user: any;
      }>('/api/auth/forgot-password/recovery-key-reset', {
        method: 'POST',
        body: JSON.stringify({
          identifier: recoveryIdentifier.trim(),
          recovery_key: recoveryKey.trim(),
          new_password: recoveryNewPassword,
        }),
      });

      if (res && res.success && res.token) {
        setSuccessMessage('Password reset successfully! Logging you in...');
        setAuthSession(res.token, res.user);
        setTimeout(() => {
          onLoginSuccess(res.user);
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Please check the Recovery Key and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
        {/* Header with vibrant red banner */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
              {mode === 'login' ? (
                <ShieldCheck className="w-6 h-6 text-amber-300" />
              ) : (
                <KeyRound className="w-6 h-6 text-amber-300" />
              )}
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>
                  {mode === 'login' ? 'Authorized Portal Access' : 'Owner / Staff Security'}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white font-['Outfit',sans-serif]">
                {mode === 'login'
                  ? 'Staff & Owner Login'
                  : 'Recovery Key Reset / மீட்பு திறவுகோல்'}
              </h2>
              <p className="text-xs text-red-100 mt-0.5">
                தேவராஜ் பட்டாசு கடை // DEVARAJ TRADERS
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {targetView === 'pos' && mode === 'login' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Billing Counter Access:</span> Please sign in with your worker or owner account to open the POS Billing Register.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* ================= LOGIN FORM ================= */
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Username (பயனர் பெயர்)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder=""
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-none transition-all font-medium text-gray-900"
                    />
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Password (கடவுச்சொல்)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('recovery');
                        setRecoveryIdentifier('owner');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-black text-red-700 hover:text-red-900 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Forgot Password? / கடவுச்சொல் மீட்பு</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-600 focus:border-red-600 focus:outline-none transition-all font-medium text-gray-900"
                    />
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-extrabold py-3 rounded-xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? 'Authenticating...' : 'Sign In to Portal / உள்நுழைக'}</span>
                </button>

                {/* Dedicated Admin Forgot Password / Recovery Key Reset Option */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('recovery');
                      setRecoveryIdentifier('owner');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>👑 Admin / Staff Forgot Password? Reset with Recovery Key</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* ================= RECOVERY KEY RESET (no OTP/SMS) ================= */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <button
                  type="button"
                  onClick={resetForgotState}
                  className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">
                  No OTP Needed
                </span>
              </div>

              <form onSubmit={handleRecoveryKeyReset} className="space-y-3.5">
                <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 text-xs text-emerald-950 leading-relaxed">
                  <p className="font-bold text-emerald-900 mb-1">
                    🔑 Instant Reset with Recovery Key
                  </p>
                  <p className="text-gray-600">
                    This resets the password directly, without needing SMS/MSG91 or WhatsApp. Enter the secret <strong>Recovery Key</strong> (set as <code className="bg-white px-1 rounded border border-emerald-200">ADMIN_RECOVERY_KEY</code> on the server; ask whoever deployed the site if you don't have it).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Username or Registered Mobile
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={recoveryIdentifier}
                      onChange={(e) => setRecoveryIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-bold text-gray-900"
                    />
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Recovery Key
                  </label>
                  <div className="relative">
                    <input
                      type={showRecoveryKey ? 'text' : 'password'}
                      required
                      value={recoveryKey}
                      onChange={(e) => setRecoveryKey(e.target.value)}
                      placeholder="Enter the secret recovery key"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium text-gray-900"
                    />
                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowRecoveryKey(!showRecoveryKey)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showRecoveryKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showRecoveryNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={recoveryNewPassword}
                      onChange={(e) => setRecoveryNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium text-gray-900"
                    />
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                    <button
                      type="button"
                      onClick={() => setShowRecoveryNewPassword(!showRecoveryNewPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showRecoveryNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showRecoveryNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={recoveryConfirmPassword}
                      onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none font-medium text-gray-900"
                    />
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold py-3 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Resetting Password...' : 'Reset Password & Sign In'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

