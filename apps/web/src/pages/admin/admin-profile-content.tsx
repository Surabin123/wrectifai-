'use client';
import { Card } from '@/components/common/card';
import { useState, useEffect } from 'react';
import { Button } from '@/components/common/button';
import { Edit2, Save, CameraIcon, Check, AlertCircle, Shield, Activity, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';

export function AdminProfileContent() {
  const { user, token, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', mobileNumber: '', image: '' });
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const showToast = (message: string, type: 'success'|'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startEditing = () => {
    setFormData({ 
      name: user?.name || '', 
      email: user?.email || '', 
      mobileNumber: user?.mobileNumber || '',
      image: user?.image || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const updatedUser = await apiClient.put<any>('/users/profile', formData);
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
      if (token) {
        login(token, undefined, { ...user, ...updatedUser, roles: user?.roles || [] });
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update profile', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');

    if (!pwdForm.currentPassword || !pwdForm.newPassword || !pwdForm.confirmPassword) {
      setPwdError('All fields are required.');
      return;
    }

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('New password and confirm password do not match.');
      return;
    }

    setPwdSubmitting(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      showToast('Password updated successfully', 'success');
      setPwdModalOpen(false);
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error?.message || err.message;
      if (errorMsg?.toLowerCase().includes('invalid current password')) {
        setPwdError('Please enter your correct current password');
      } else {
        setPwdError(errorMsg || 'Failed to update password');
      }
    } finally {
      setPwdSubmitting(false);
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-slate-500">Loading Profile...</div>;
  }

  const initials = user.name ? user.name.substring(0, 2).toUpperCase() : (user.email ? user.email.substring(0, 2).toUpperCase() : 'AD');

  return (
    <div className="space-y-6 relative max-w-4xl mx-auto">
      {toast && (
        <div className={`fixed bottom-4 right-4 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-5 flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
      
      {/* Identity Card */}
      <Card className="p-6 flex items-center gap-6 shadow-sm border-slate-100 rounded-[24px]">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-slate-800 text-white flex items-center justify-center text-3xl font-bold overflow-hidden border-4 border-slate-100">
            {formData.image || user.image ? (
              <img src={formData.image || user.image} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {isEditing && (
            <>
              <input 
                type="file" 
                id="profile-image-upload" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormData({ ...formData, image: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <label htmlFor="profile-image-upload" className="absolute bottom-0 right-0 p-1.5 bg-white border rounded-full text-slate-600 hover:text-blue-600 shadow-sm cursor-pointer">
                <CameraIcon className="w-4 h-4" />
              </label>
            </>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">{user.name || 'Admin User'}</h2>
            <span className="px-2.5 py-0.5 bg-slate-800 text-white text-xs font-bold rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> Platform Administrator
            </span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
            <span className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {user.email || 'N/A'}</span>
            <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" /> {user.mobileNumber || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
             <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Active
             </span>
             <span className="text-xs text-slate-400 font-medium">Since: Account Creation</span>
          </div>
        </div>
        
        {!isEditing && (
          <Button variant="outline" className="gap-2 font-bold" onClick={startEditing}>
            <Edit2 className="w-4 h-4" /> Edit Profile
          </Button>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('personal')}
          className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Personal Info
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'security' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Security
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'personal' && (
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Account Information</h3>
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                <span className="text-sm font-medium text-slate-500 w-1/3">Full Name</span>
                {isEditing ? (
                  <input type="text" className="border rounded p-2 text-sm w-full sm:w-2/3" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                ) : (
                  <span className="text-sm font-bold text-slate-900 text-right w-full sm:w-2/3">{user.name || 'N/A'}</span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                <span className="text-sm font-medium text-slate-500 w-1/3">Email</span>
                {isEditing ? (
                  <input type="email" className="border rounded p-2 text-sm w-full sm:w-2/3" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                ) : (
                  <span className="text-sm font-bold text-slate-900 text-right w-full sm:w-2/3">{user.email || 'N/A'}</span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2">
                <span className="text-sm font-medium text-slate-500 w-1/3">Phone Number</span>
                {isEditing ? (
                  <input type="text" className="border rounded p-2 text-sm w-full sm:w-2/3" value={formData.mobileNumber} onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})} />
                ) : (
                  <span className="text-sm font-bold text-slate-900 text-right w-full sm:w-2/3">{user.mobileNumber ?? 'N/A'}</span>
                )}
              </div>
            </div>
            
            {isEditing && (
              <div className="flex justify-end gap-4 mt-6">
                <Button variant="outline" className="font-bold w-32" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button className="font-bold w-32 bg-blue-600 text-white hover:bg-blue-700" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </Button>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'security' && (
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" /> Account Security
            </h3>
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Password</span>
                  <span className="text-xs text-slate-500">Secure your account with a strong password</span>
                </div>
                <Button variant="outline" size="sm" className="font-bold" onClick={() => { setPwdModalOpen(true); setPwdError(''); setPwdForm({currentPassword:'', newPassword:'', confirmPassword:''}); }}>Change Password</Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2">
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Two-Factor Authentication (2FA)</span>
                  <span className="text-xs text-slate-500">Add an extra layer of security</span>
                </div>
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">Coming Soon</span>
              </div>
            </div>
          </Card>
        )}

      </div>

      <Modal isOpen={pwdModalOpen} onClose={() => setPwdModalOpen(false)} title="Change Password" className="max-w-md">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {pwdError && (
             <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200">
               {pwdError}
             </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Current Password</label>
            <input 
              type="password" 
              required
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-600" 
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm({...pwdForm, currentPassword: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">New Password</label>
            <input 
              type="password" 
              required
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-600" 
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm({...pwdForm, newPassword: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Confirm New Password</label>
            <input 
              type="password" 
              required
              className="w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-600" 
              value={pwdForm.confirmPassword}
              onChange={(e) => setPwdForm({...pwdForm, confirmPassword: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
             <Button type="button" variant="outline" onClick={() => setPwdModalOpen(false)}>Cancel</Button>
             <Button type="submit" disabled={pwdSubmitting} className="bg-blue-600 text-white hover:bg-blue-700">
               {pwdSubmitting ? 'Saving...' : 'Save Password'}
             </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AdminProfileContent;
