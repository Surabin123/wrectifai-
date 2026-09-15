'use client';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ComingSoonPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mx-auto">
          <Sparkles className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#17307a] mb-3">We&apos;re working on it!</h1>
          <p className="text-slate-500">
            This feature is currently under development and will be available in our upcoming release. We appreciate your patience.
          </p>
        </div>
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center justify-center w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    </div>
  );
}
