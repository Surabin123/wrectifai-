'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, type User } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { setLocationCookie } from '@/utils/location';
import { Phone, ShieldCheck, User as UserIcon, Mail, Lock } from 'lucide-react';
import OtpInput from '@/components/common/otp-input';
import { useGoogleLogin } from '@react-oauth/google';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export default function SignupPage() {
  const { isAuthenticated, login, user } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to their role-based dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.roles?.includes('admin')) {
        window.location.href = '/admin/dashboard';
      } else if (user.roles?.includes('garage')) {
        window.location.href = '/garage/dashboard';
      } else {
        window.location.href = '/dashboard';
      }
    }
  }, [isAuthenticated, user]);

  // Form states
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Please enter your full name');
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(name)) {
      setErrorMsg('Name can only contain letters and spaces.');
      return;
    }

    if (!mobileNumber.trim()) {
      setErrorMsg('Please enter a valid phone number');
      return;
    }

    const sanitizedPhone = mobileNumber.replace(/\s+/g, '');

    if (countryCode === '+91' && !/^[6-9]\d{9}$/.test(sanitizedPhone)) {
      setErrorMsg('Not a valid Indian mobile number.');
      return;
    }
    if (countryCode === '+1' && !/^[2-9]\d{9}$/.test(sanitizedPhone)) {
      setErrorMsg('Not a valid US mobile number.');
      return;
    }
    if (countryCode === '+971' && !/^5\d{8}$/.test(sanitizedPhone)) {
      setErrorMsg('Not a valid UAE mobile number.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter a valid email and password');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setErrorMsg('Password must be at least 8 characters with upper, lower, and special character.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Pre-check phone to see if it exists to provide friendly error
      const checkRes = await apiClient.post<{ exists: boolean }>('/auth/check-user', { mobileNumber: sanitizedPhone });
      if (checkRes.exists) {
        setErrorMsg('Account already exists with this phone number. Please sign in.');
        setIsSubmitting(false);
        return;
      }

      // Step 2: Register user with all details
      const data = await apiClient.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
        mobileNumber: sanitizedPhone,
        role: 'customer'
      });
      
      setLocationCookie('wrectifai_country_code', countryCode);
      login(data.accessToken, data.refreshToken, data.user);
      setSuccessMsg('Successfully registered and logged in! Redirecting...');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed.';
      setErrorMsg(message);
      setIsSubmitting(false);
    }
  };



  const googleSignup = useGoogleLogin({
    onSuccess: async (credentialResponse) => {
      setErrorMsg('');
      setSuccessMsg('');
      setIsSubmitting(true);
      try {
        const data = await apiClient.post<AuthResponse>('/auth/google', {
          credential: credentialResponse.access_token,
        });
        login(data.accessToken, data.refreshToken, data.user);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Google sign-up failed.';
        setErrorMsg(message);
        setIsSubmitting(false);
      }
    },
    onError: () => {
      setErrorMsg('Google sign-up failed to initialize.');
    },
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#f6f8fe] via-[#edf2fc] to-[#e4ecff]">
      {/* Background blobs for premium glassmorphism feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#1a56db]/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#1a56db]/5 blur-[80px] pointer-events-none" />



      {/* Signup Card */}
      <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-2xl border border-white/60 p-6 sm:p-8 shadow-[0_20px_50px_rgba(23,48,122,0.08)] relative z-10">
        
        {/* Logo and Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <img src="/fin_logo.png" alt="WrectifAI Logo" className="h-24 w-auto mb-0 object-contain" />
          <h1 className="text-[22px] font-bold text-[#17307a] tracking-tight">Create Account</h1>
          <p className="text-[12.5px] text-[#5f7099] mt-1 font-medium">Sign up to access specialized vehicle services</p>
        </div>

        {/* Messages */}
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

        {/* Form Flow */}
        <form onSubmit={handleSignup} className="space-y-4">

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-[#17307a] mb-1.5">Full Name</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ea0c7]">
                <UserIcon className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="h-11 w-full rounded-xl border border-[#dbe6ff] bg-white pl-10 pr-3.5 text-[13px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10"
              />
            </div>
          </div>

          {/* Phone Number with Country Code */}
          <div>
            <label className="block text-xs font-semibold text-[#17307a] mb-1.5">Phone Number</label>
            <div className="flex relative rounded-xl border border-[#dbe6ff] bg-white transition-all focus-within:border-[#1a56db] focus-within:ring-2 focus-within:ring-[#1a56db]/10 overflow-hidden">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="pl-2 pr-0 py-3 bg-[#f8fafe] text-[12.5px] text-[#17307a] border-r border-[#dbe6ff] outline-none font-semibold cursor-pointer hover:bg-[#f0f4fd] transition-colors"
              >
                <option value="+91">IN (+91)</option>
                <option value="+1">US (+1)</option>
                <option value="+971">AE (+971)</option>
              </select>
              <input
                type="tel"
                required
                autoComplete="off"
                value={mobileNumber}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  const maxLen = countryCode === '+971' ? 9 : 10;
                  setMobileNumber(digitsOnly.slice(0, maxLen));
                }}
                placeholder="9876543210"
                className="h-11 w-full bg-transparent px-3.5 text-[13px] text-[#17307a] placeholder-[#8ea0c7] outline-none"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-[#17307a] mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ea0c7]">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9@.]/g, '');
                  setEmail(val);
                }}
                placeholder="email@example.com"
                className="h-11 w-full rounded-xl border border-[#dbe6ff] bg-white pl-10 pr-3.5 text-[13px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10"
              />
            </div>
          </div>

          {/* Passwords */}
          <div>
            <label className="block text-xs font-semibold text-[#17307a] mb-1.5">Create Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ea0c7]">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="h-11 w-full rounded-xl border border-[#dbe6ff] bg-white pl-10 pr-3.5 text-[13px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#17307a] mb-1.5">Confirm Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ea0c7]">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="h-11 w-full rounded-xl border border-[#dbe6ff] bg-white pl-10 pr-3.5 text-[13px] text-[#17307a] placeholder-[#8ea0c7] outline-none transition-all focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={
              isSubmitting || 
              !name.trim() || 
              mobileNumber.trim().length !== (countryCode === '+971' ? 9 : 10) || 
              !email.trim() || 
              !password.trim() || 
              !confirmPassword.trim()
            }
            className="w-full h-11 rounded-xl bg-[#1a56db] text-white text-[13px] font-semibold hover:bg-[#1546b5] transition-all flex items-center justify-center disabled:opacity-50 shadow-sm shadow-[#1a56db]/10 mt-4"
          >
            {isSubmitting ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e4ecff]"></div>
          </div>
          <span className="relative bg-[#fbfdff] px-3 text-xs text-[#8ea0c7] font-semibold">OR</span>
        </div>

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-3">
          {/* Google — uses real OAuth flow */}
          <button
            onClick={() => googleSignup()}
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

          {/* Apple — not yet integrated, show graceful message */}
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

        {/* Footer Link */}
        <div className="text-center mt-6">
          <p className="text-[12.5px] text-[#5f7099] font-medium">
            {"Already have an account? "}
            <Link href="/login" className="font-semibold text-[#1a56db] hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
