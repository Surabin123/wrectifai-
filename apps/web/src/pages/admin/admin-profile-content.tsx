'use client';
import { Card } from '@/components/common/card';
import { useState, useEffect } from 'react';
import { Button } from '@/components/common/button';
import { Edit2, Save, CameraIcon, Check, AlertCircle, Shield, Activity, Users, Store, Calendar, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';

export function AdminProfileContent() {
  const { user, token, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', mobileNumber: '', image: '' });
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  const [stats, setStats] = useState({ users: 0, garages: 0, bookings: 0 });
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'activity'>('personal');

  useEffect(() => {
    // Fetch stats
    apiClient.get<any>('/admin/stats').then(res => {
      if (res && !res.error) {
        setStats({
          users: res.usersCount || 0,
          garages: res.garagesCount || 0,
          bookings: res.bookingsCount || 0
        });
      }
    }).catch(console.error);
  }, []);

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

  const initials = user.name ? user.name.substring(0, 2).toUpperCase() : (user.email ? user.email.substring(0, 2).toUpperCase() : 'AD');

  return (
    <div className="space-y-6 relative max-w-5xl">
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
        <button 
          onClick={() => setActiveTab('activity')}
          className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Activity Log
        </button>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column (2/3) */}
        <div className="md:col-span-2 space-y-6">
          
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
                    <span className="text-xs text-slate-500">Last changed 3 months ago</span>
                  </div>
                  <Button variant="outline" size="sm" className="font-bold">Change Password</Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Two-Factor Authentication (2FA)</span>
                    <span className="text-xs text-slate-500">Add an extra layer of security</span>
                  </div>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded">Coming Soon</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Active Sessions</span>
                    <span className="text-xs text-slate-500">Manage signed-in devices</span>
                  </div>
                  <Button variant="outline" size="sm" className="font-bold">View All</Button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'activity' && (
            <Card className="p-6 shadow-sm border-slate-100 rounded-[24px] flex flex-col items-center justify-center text-center h-64">
              <Activity className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Activity Log</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Detailed audit logs and activity history will appear here. This feature is currently under development.
              </p>
            </Card>
          )}

        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px] bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Platform Stats</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.users}</div>
                  <div className="text-xs text-slate-400">Total Users</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.garages}</div>
                  <div className="text-xs text-slate-400">Garages</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.bookings}</div>
                  <div className="text-xs text-slate-400">Total Bookings</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
        
      </div>
    </div>
  );
}

export default AdminProfileContent;
