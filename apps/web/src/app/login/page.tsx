'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, User } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requiresPasswordChange?: boolean;
}
import { Phone, ShieldCheck, Mail, Lock } from 'lucide-react';
import OtpInput from '@/components/common/otp-input';
import { useGoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const { isAuthenticated, login, user } = useAuth();
  const router = useRouter();

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Redirect authenticated users to their role-based dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.roles?.includes('admin')) {
        router.replace('/admin/dashboard');
      } else if (user.roles?.includes('garage')) {
        router.replace('/garage/dashboard');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  // Form states
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Admin Login States
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Password Reset States
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempAuthData, setTempAuthData] = useState<AuthResponse | null>(null);

  // Auto-detect email mode based on input
  const handleIdentifierChange = (val: string) => {
    if (val.includes('@') || /[a-zA-Z]/.test(val)) {
      setIsEmailMode(true);
      setEmail(val);
      setMobileNumber('');
    } else {
      setIsEmailMode(false);
      setMobileNumber(val);
      setEmail('');
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (credentialResponse) => {
      setErrorMsg('');
      setSuccessMsg('');
      setIsSubmitting(true);
      try {
        const data = await apiClient.post<AuthResponse>('/auth/google', {
          credential: credentialResponse.access_token
        });
        login(data.accessToken, data.refreshToken, data.user);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Google login failed.';
        setErrorMsg(message);
        setIsSubmitting(false);
      }
    },
    onError: () => {
      setErrorMsg('Google Login failed to initialize.');
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!mobileNumber.trim()) {
      setErrorMsg('Please enter a valid phone number');
      return;
    }

    const sanitizedPhone = mobileNumber.replace(/\s+/g, '');
    if (sanitizedPhone.length < 10) {
      setErrorMsg('error: Invalid phone number.');
      return;
    }

    setIsSubmitting(true);
    setIsOtpSent(true);
    setIsSubmitting(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const data = await apiClient.post<AuthResponse>('/auth/login', {
        mobileNumber: mobileNumber.replace(/\s+/g, ''),
        otp,
      });

      login(data.accessToken, data.refreshToken, data.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed. Please check the OTP code.';
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const data = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password,
      });

      if (data.requiresPasswordChange) {
        setTempAuthData(data);
        setShowPasswordReset(true);
        setIsSubmitting(false);
        return;
      }

      login(data.accessToken, data.refreshToken, data.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long');
      return;
    }

    if (newPassword === 'Admin@12345') {
      setErrorMsg('You cannot reuse the temporary password. Please choose a strong new password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Change the password — authenticated via the HttpOnly cookie set at login
      await apiClient.post('/auth/change-password', { currentPassword: password, newPassword });

      // Re-login with the new password to get fresh cookies and proper session
      const data = await apiClient.post<AuthResponse>('/auth/login', {
        email,
        password: newPassword,
      });
      login(data.accessToken, data.refreshToken, data.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed.';
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const data = await apiClient.post<AuthResponse>('/auth/login', { provider });
      login(data.accessToken, data.refreshToken, data.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : `${provider === 'google' ? 'Google' : 'Apple'} login failed.`;
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };

  // Prevent multiple dialogs rendering or layout shifting by returning modal early if active
  if (showPasswordReset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#f6f8fe] via-[#edf2fc] to-[#e4ecff]">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl border border-white/60 p-6 sm:p-8 shadow-[0_20px_50px_rgba(23,48,122,0.08)] relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-orange-100 text-orange-600 mb-3">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-[22px] font-bold text-[#17307a] tracking-tight">Security Update Required</h1>
            <p className="text-[12.5px] text-[#5f7099] mt-2 font-medium leading-relaxed">
              For security reasons, you must change your temporary password before accessing the system.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#17307a] mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="h-11 w-full rounded-xl border border-[#dbe6ff] bg-white px-3.5 text-[13px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17307a] mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-11 w-full rounded-xl border border-[#dbe6ff] bg-white px-3.5 text-[13px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-[#1a56db] text-white text-[13px] font-semibold hover:bg-[#1546b5] transition-all flex items-center justify-center mt-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#f6f8fe] via-[#edf2fc] to-[#e4ecff]">
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#1a56db]/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#1a56db]/5 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-6 sm:p-8 shadow-[0_20px_50px_rgba(23,48,122,0.08)] relative z-10">
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#1a56db]/10 text-[#1a56db] mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-[22px] font-bold text-[#17307a] tracking-tight">Welcome Back</h1>
          <p className="text-[12.5px] text-[#5f7099] mt-1 font-medium">Log in to manage your account</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-600">
            {successMsg}
          </div>
        )}

        {!isEmailMode ? (
          /* Phone OTP Flow */
          !isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#17307a] mb-1.5">Phone Number or Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ea0c7]">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={mobileNumber || email}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    placeholder="e.g., 9876543210"
                    className="h-11 w-full rounded-xl border border-[#dbe6ff] bg-white pl-10 pr-3.5 text-[13px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-[#1a56db] text-white text-[13px] font-semibold hover:bg-[#1546b5] transition-all flex items-center justify-center disabled:opacity-50 shadow-sm shadow-[#1a56db]/10"
              >
                {isSubmitting ? 'Sending OTP...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-[#17307a]">Enter 6-Digit OTP</label>
                  <button
                    type="button"
                    onClick={() => setIsOtpSent(false)}
                    className="text-xs font-semibold text-[#1a56db] hover:underline"
                  >
                    Change Phone
                  </button>
                </div>
                <OtpInput value={otp} onChange={setOtp} disabled={isSubmitting} />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length !== 6}
                className="w-full h-11 rounded-xl bg-[#1a56db] text-white text-[13px] font-semibold hover:bg-[#1546b5] transition-all flex items-center justify-center disabled:opacity-50 shadow-sm shadow-[#1a56db]/10"
              >
                {isSubmitting ? 'Verifying...' : 'Verify & Log In'}
              </button>
            </form>
          )
        ) : (
          /* Email & Password Flow */
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-[#17307a]">Email Address</label>
                <button
                  type="button"
                  onClick={() => setIsEmailMode(false)}
                  className="text-xs font-semibold text-[#1a56db] hover:underline"
                >
                  Use Phone instead
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ea0c7]">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => handleIdentifierChange(e.target.value)}
                  placeholder="admin@wrectifai.com"
                  className="h-11 w-full rounded-xl border border-[#dbe6ff] bg-white pl-10 pr-3.5 text-[13px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17307a] mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ea0c7]">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-[#dbe6ff] bg-white pl-10 pr-3.5 text-[13px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !password}
              className="w-full h-11 rounded-xl bg-[#1a56db] text-white text-[13px] font-semibold hover:bg-[#1546b5] transition-all flex items-center justify-center disabled:opacity-50 shadow-sm shadow-[#1a56db]/10"
            >
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e4ecff]"></div>
          </div>
          <span className="relative bg-[#fbfdff] px-3 text-xs text-[#8ea0c7] font-semibold">OR</span>
        </div>

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-center w-full">
              <button
                onClick={() => googleLogin()}
                disabled={isSubmitting}
                type="button"
                className="h-10 w-full rounded-2xl border border-[#dbe6ff] bg-white hover:bg-[#fcfdff] text-[#17307a] text-[12.5px] font-semibold transition-all flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-50"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" width="24" height="24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
          </div>

          <button
            onClick={() => setErrorMsg('Apple Sign-In is coming soon.')}
            disabled={isSubmitting}
            type="button"
            className="h-10 rounded-2xl border border-[#dbe6ff] bg-white hover:bg-[#fcfdff] text-[#17307a] text-[12.5px] font-semibold transition-all flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-50 opacity-60"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94.1.08.31.11.45.11.83 0 1.9-.53 2.37-1.44z" />
            </svg>
            <span>Apple (Coming Soon)</span>
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-[12.5px] text-[#5f7099] font-medium">
            {"Don't have an account? "}
            <Link href="/signup" className="font-semibold text-[#1a56db] hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

