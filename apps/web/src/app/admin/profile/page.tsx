'use client';
import { AdminProfileContent } from '@/pages/admin/admin-profile-content';

export default function ProfilePage() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Admin Profile</h1>
      </div>
      <AdminProfileContent />
    </div>
  );
}
