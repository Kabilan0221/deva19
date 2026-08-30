import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  Sparkles,
  Phone,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
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
  const [mode, setMode] = useState<'login' | 'forgot' | 'recovery'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot Password States
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1: request OTP, 2: enter OTP & new password
  const [forgotIdentifier, setForgotIdentifier] = useState('owner');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [maskedMobile, setMaskedMobile] = useState('');
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Recovery Key States (no SMS / MSG91 / WhatsApp needed)
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

  // Step 1 of Forgot Password: Send OTP
  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        maskedMobile: string;
        username: string;
        sms_configured?: boolean;
        sms_delivery_failed?: boolean;
        otp_for_dev?: string; // only ever present outside production — never rely on this in prod
      }>('/api/auth/forgot-password/request-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });

      if (res && res.success) {
        setMaskedMobile(res.maskedMobile);
        // Dev-only convenience: never present in production, since the
        // backend only includes this field outside production.
        if (res.otp_for_dev) {
          setDevOtpHint(res.otp_for_dev);
          setForgotOtp(res.otp_for_dev);
          setSuccessMessage(res.message || `OTP sent to registered mobile (${res.maskedMobile})!`);
          setForgotStep(2);
        } else if (res.sms_configured === false) {
          setError('SMS delivery is not set up on this server yet, so the OTP could not be sent. Please ask the site owner to add SMS provider credentials, or reset the password directly from the admin panel.');
        } else if (res.sms_delivery_failed) {
          setError('We could not deliver the OTP over SMS. Please check the number and try again in a moment.');
        } else {
          setSuccessMessage(res.message || `OTP sent via SMS to registered mobile (${res.maskedMobile})!`);
          setForgotStep(2);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP. Please verify your username or registered mobile.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 of Forgot Password: Verify OTP and Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please enter the same password in both fields.');
      return;
    }

    if (!forgotOtp.trim()) {
      setError('Please enter the 6-digit verification OTP sent to your mobile.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        token: string;
        user: any;
      }>('/api/auth/forgot-password/verify-and-reset', {
        method: 'POST',
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          otp: forgotOtp.trim(),
          new_password: newPassword,
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
      setError(err.message || 'Password reset failed. Please check the OTP and try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForgotState = () => {
    setMode('login');
    setError(null);
    setSuccessMessage(null);
    setForgotStep(1);
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setDevOtpHint(null);
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
                  : mode === 'recovery'
                  ? 'Recovery Key Reset / மீட்பு திறவுகோல்'
                  : 'Forgot Password / கடவுச்சொல் மீட்பு'}
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
                        setMode('forgot');
                        setForgotIdentifier('owner');
                        setError(null);
                        setSuccessMessage(null);
                        setForgotStep(1);
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

                {/* Dedicated Admin Forgot Password / OTP Reset Option */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotIdentifier('owner');
                      setError(null);
                      setSuccessMessage(null);
                      setForgotStep(1);
                    }}
                    className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-red-600" />
                    <span>👑 Admin Forgot Password? Reset with OTP / கடவுச்சொல் மீட்டெடுப்பு</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('recovery');
                      setRecoveryIdentifier('owner');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full mt-2 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>🔑 Reset with Recovery Key (no SMS needed)</span>
                  </button>
                </div>
              </form>
            </>
          ) : mode === 'recovery' ? (
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
          ) : (
            /* ================= FORGOT PASSWORD WORKFLOW ================= */
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
                <span className="text-[11px] font-black text-red-700 bg-red-50 px-2 py-0.5 rounded-full uppercase">
                  Step {forgotStep} of 2
                </span>
              </div>

              {forgotStep === 1 ? (
                /* Step 1: Request OTP */
                <form onSubmit={handleRequestForgotOtp} className="space-y-4">
                  <div className="bg-red-50/60 p-3.5 rounded-2xl border border-red-100 text-xs text-red-950 leading-relaxed">
                    <p className="font-bold text-red-900 mb-1">
                      🔐 Owner / Staff Password Recovery
                    </p>
                    <p className="text-gray-600">
                      Enter your <strong>Username (e.g. owner)</strong> or <strong>Registered Mobile (8870929100)</strong>. We will send a secure 6-digit OTP to your verified mobile number.
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
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder=""
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-none font-bold text-gray-900"
                      />
                      <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    </div>
                  </div>

                  {/* Quick helpers for Admin & Staff */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setForgotIdentifier('owner')}
                      className={`px-2.5 py-1.5 font-bold rounded-lg cursor-pointer transition-colors border ${
                        forgotIdentifier === 'owner' || forgotIdentifier === 'admin'
                          ? 'bg-red-700 text-white border-red-800 shadow-xs'
                          : 'bg-red-50 hover:bg-red-100 text-red-900 border-red-200'
                      }`}
                    >
                      👑 Admin / Owner (owner)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotIdentifier('8870929100')}
                      className={`px-2.5 py-1.5 font-bold rounded-lg cursor-pointer transition-colors border ${
                        forgotIdentifier === '8870929100'
                          ? 'bg-red-700 text-white border-red-800 shadow-xs'
                          : 'bg-red-50 hover:bg-red-100 text-red-900 border-red-200'
                      }`}
                    >
                      📱 98947 77176
                    </button>
                    <button
                      type="button"
                      onClick={() => setForgotIdentifier('worker1')}
                      className={`px-2.5 py-1.5 font-bold rounded-lg cursor-pointer transition-colors border ${
                        forgotIdentifier === 'worker1'
                          ? 'bg-amber-700 text-white border-amber-800 shadow-xs'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                      }`}
                    >
                      ⚡ Worker 1
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-extrabold py-3 rounded-xl text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{loading ? 'Sending Security OTP...' : 'Send Security OTP / OTP அனுப்பு'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('recovery');
                      setRecoveryIdentifier(forgotIdentifier || 'owner');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="w-full text-center text-xs font-bold text-gray-500 hover:text-red-700 hover:underline cursor-pointer pt-1"
                  >
                    No SMS/MSG91 set up? Reset instantly with your Recovery Key →
                  </button>
                </form>
              ) : (
                /* Step 2: Enter OTP & New Password */
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-600">Mobile: </span>
                      <span className="font-black text-slate-900 font-mono">{maskedMobile}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestForgotOtp}
                      disabled={loading}
                      className="text-amber-800 font-extrabold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend OTP</span>
                    </button>
                  </div>

                  {devOtpHint && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                      <span>
                        ⚠️ DEV MODE ONLY (hidden in production): <strong className="font-mono text-sm tracking-widest bg-white px-2 py-0.5 rounded border border-emerald-400">{devOtpHint}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setForgotOtp(devOtpHint)}
                        className="text-[10px] bg-emerald-600 text-white font-black px-2 py-1 rounded-md cursor-pointer hover:bg-emerald-700"
                      >
                        Auto Fill
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Enter 6-Digit OTP (கடவுச்சொல் சரிபார்ப்பு)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder=""
                        className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-none font-mono font-black tracking-widest text-gray-900 text-center"
                      />
                      <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      New Password (புதிய கடவுச்சொல்)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-none font-medium text-gray-900"
                      />
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Confirm New Password (மீண்டும் புதிய கடவுச்சொல்)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-none font-medium text-gray-900"
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

