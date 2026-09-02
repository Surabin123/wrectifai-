'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { TopNavbar } from '@/components/home/top-navbar';
import { DashboardShell } from '@/components/home/dashboard-shell';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { Copy, CheckCircle2, Share2, Users, Gift, TrendingUp, Info } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  totalEarned: number;
  currency: string;
  earningPotential: number;
}

export default function ReferPageClient() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await apiClient.get<ReferralStats>('/referrals/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch referral stats', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchStats();
    }
  }, [user]);

  const referralLink = typeof window !== 'undefined' && stats?.referralCode 
    ? `${window.location.origin}/signup?ref=${stats.referralCode}` 
    : '';

  const handleCopy = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (navigator.share && referralLink) {
      navigator.share({
        title: 'Join WrectifAI',
        text: `Use my referral code ${stats?.referralCode} to join WrectifAI and get exclusive services!`,
        url: referralLink,
      }).catch(console.error);
    } else {
      handleCopy();
    }
  };

  return (
    <>
      <TopNavbar />
      <DashboardShell>
        <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-4">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a56db] to-[#1e40af] p-8 sm:p-10 text-white shadow-lg">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#3b82f6]/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                <Gift className="mr-2 h-4 w-4" />
                Refer & Earn Program
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Invite friends. <br className="hidden sm:block" />
                Earn {stats ? formatCurrency(stats.earningPotential, stats.currency) : 'rewards'}.
              </h1>
              <p className="text-blue-100 max-w-lg text-sm sm:text-base leading-relaxed">
                For every friend who signs up using your link and completes their first paid service, you both win. The more you refer, the more you earn!
              </p>
            </div>
            
            <div className="shrink-0 w-40 h-40 relative hidden md:block">
              <Image 
                src="/assets/gift icon.png" 
                alt="Gift" 
                fill 
                className="object-contain drop-shadow-2xl animate-pulse-slow"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse flex gap-6">
            <div className="flex-1 h-48 bg-gray-100 rounded-3xl" />
            <div className="flex-1 h-48 bg-gray-100 rounded-3xl hidden sm:block" />
          </div>
        ) : stats ? (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Users className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Successful Referrals</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalReferrals}</h3>
                </div>
              </div>
              
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:-translate-y-1 hover:shadow-md">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                  <TrendingUp className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Earned</p>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.totalEarned, stats.currency)}
                  </h3>
                </div>
              </div>
            </div>

            {/* Link Sharing Section */}
            <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-gray-100 text-center space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Your unique referral link</h2>
                <p className="text-sm text-gray-500 mt-1">Share this link to ensure you get credited for the referral</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 justify-center max-w-2xl mx-auto">
                <div className="relative w-full sm:w-auto flex-1">
                  <input 
                    type="text" 
                    readOnly 
                    value={referralLink} 
                    className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-700 outline-none"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {stats.referralCode}
                    </span>
                  </div>
                </div>
                
                <div className="flex w-full sm:w-auto gap-2">
                  <Button 
                    onClick={handleCopy} 
                    variant={copied ? "outline" : "default"}
                    className={`h-12 w-full sm:w-auto rounded-xl font-semibold gap-2 transition-all ${
                      copied ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50' : 'bg-[#1a56db] hover:bg-[#1546b5]'
                    }`}
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </Button>
                  
                  <Button 
                    onClick={handleShare}
                    variant="outline"
                    className="h-12 w-full sm:w-auto rounded-xl font-semibold gap-2 border-gray-200 hover:bg-gray-50"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-3xl bg-gray-50 p-6 sm:p-8 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Info className="h-5 w-5 text-gray-500" />
                How it works
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                <div className="hidden md:block absolute top-6 left-1/6 right-1/6 h-[2px] bg-gradient-to-r from-blue-200 via-gray-200 to-transparent -z-0" />
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1a56db] text-white font-bold text-lg shadow-md shadow-blue-500/20">
                    1
                  </div>
                  <h4 className="font-bold text-gray-900">Share Link</h4>
                  <p className="text-sm text-gray-500">Send your unique link or code to your friends and family.</p>
                </div>
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1a56db] border-2 border-[#1a56db] font-bold text-lg shadow-sm">
                    2
                  </div>
                  <h4 className="font-bold text-gray-900">Friend Signs Up</h4>
                  <p className="text-sm text-gray-500">Your friend creates a new WrectifAI account using your link.</p>
                </div>
                
                <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1a56db] border-2 border-[#1a56db] font-bold text-lg shadow-sm">
                    3
                  </div>
                  <h4 className="font-bold text-gray-900">Get Rewarded</h4>
                  <p className="text-sm text-gray-500">When they complete their first paid service, you get your reward.</p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-500">
                  Rewards are automatically added to your <Link href="/wallet-payments" className="text-blue-600 font-semibold hover:underline">Wallet</Link> and can be used for future services.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-3xl border border-gray-100">
            <p className="text-gray-500">Unable to load referral information. Please try again later.</p>
          </div>
        )}
      </div>
      </DashboardShell>
    </>
  );
}
