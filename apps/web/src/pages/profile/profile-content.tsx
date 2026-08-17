'use client';
import { Card } from '@/components/common/card';
import { useState } from 'react';
import { Button } from '@/components/common/button';
import { Edit2, Save, CameraIcon, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';

export function ProfileContent() {
  const { user, token, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', mobileNumber: '', image: '' });
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

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

  if (!user) {
    return <div className="p-8 text-center text-slate-500">Loading Profile...</div>;
  }

  const initials = user.name ? user.name.substring(0, 2).toUpperCase() : (user.email ? user.email.substring(0, 2).toUpperCase() : 'US');

  return (
    <div className="space-y-6 relative">
      {toast && (
        <div className={`fixed bottom-4 right-4 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-5 flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Account Details</h2>
          <p className="text-sm text-slate-500">Manage your personal information</p>
        </div>
        {!isEditing && (
          <Button variant="outline" className="gap-2 font-bold" onClick={startEditing}>
            <Edit2 className="w-4 h-4" /> Edit Profile
          </Button>
        )}
      </div>

      <Card className="p-6 flex items-center gap-6 shadow-sm border-slate-100 rounded-[24px]">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold overflow-hidden">
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
        <div>
          <h2 className="text-xl font-bold text-slate-900">{user.name || 'N/A'}</h2>
          <div className="flex items-center gap-2 mt-2">
             <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">Active</span>
          </div>
          <p className="text-sm text-slate-500 mt-2">{user.email || 'N/A'}</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Personal Information</h3>
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
        </Card>
      </div>

      {isEditing && (
        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" className="font-bold w-32" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button className="font-bold w-32 bg-blue-600 text-white hover:bg-blue-700" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

export default ProfileContent;
