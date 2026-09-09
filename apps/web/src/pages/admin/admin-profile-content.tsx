'use client';
import { Card } from '@/components/common/card';
import { useState, useEffect } from 'react';
import { Button } from '@/components/common/button';
import { Edit2, Save, CameraIcon, Check, AlertCircle, Shield, Activity, ShieldCheck, LogOut, Bell, Monitor, MonitorSmartphone, XCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';

export function AdminProfileContent() {
  const { user, token, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', mobileNumber: '', image: '' });
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'sessions' | 'activity' | 'notifications'>('personal');

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Activity State
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Notifications State
  const [notifPrefs, setNotifPrefs] = useState({ enabled: true, inApp: true, email: true, sms: false });
  const [loadingNotifs, setLoadingNotifs] = useState(false);

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
      await apiClient.put<any>('/users/profile', formData);
      setIsEditing(false);
      showToast('Profile updated successfully', 'success');
      
      // Re-fetch canonical user data
      const meData = await apiClient.get<any>('/auth/me');
      if (token && meData?.user) {
        login(token, undefined, meData.user);
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

  // Tab Data Fetching
  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
    } else if (activeTab === 'activity') {
      fetchActivities();
    } else if (activeTab === 'notifications') {
      fetchNotifPrefs();
    }
  }, [activeTab]);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const data = await apiClient.get<any[]>('/users/sessions');
      setSessions(data || []);
    } catch(err) {
      showToast('Failed to load sessions', 'error');
    } finally {
      setLoadingSessions(false);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await apiClient.delete(`/users/sessions/${id}`);
      showToast('Session revoked successfully', 'success');
      fetchSessions();
    } catch(err) {
      showToast('Failed to revoke session', 'error');
    }
  };

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const data = await apiClient.get<any[]>('/users/login-activity');
      setActivities(data || []);
    } catch(err) {
      showToast('Failed to load login activity', 'error');
    } finally {
      setLoadingActivities(false);
    }
  };

  const fetchNotifPrefs = async () => {
    setLoadingNotifs(true);
    try {
      const data = await apiClient.get<any>('/users/preferences/notifications');
      if (data) setNotifPrefs(data);
    } catch(err) {
      showToast('Failed to load preferences', 'error');
    } finally {
      setLoadingNotifs(false);
    }
  };

  const updateNotifPrefs = async (key: string, value: boolean) => {
    const newPrefs = { ...notifPrefs, [key]: value };
    setNotifPrefs(newPrefs); // optimistic UI update
    try {
      await apiClient.put('/users/preferences/notifications', newPrefs);
      showToast('Preferences updated', 'success');
    } catch(err) {
      setNotifPrefs(notifPrefs); // rollback
      showToast('Failed to update preferences', 'error');
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
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'personal', label: 'Personal Info' },
          { id: 'security', label: 'Security' },
          { id: 'sessions', label: 'Active Sessions' },
          { id: 'activity', label: 'Login Activity' },
          { id: 'notifications', label: 'Notifications' },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {tab.label}
          </button>
        ))}
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
              <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-2">
                <span className="text-sm font-medium text-slate-500 w-1/3 mt-2">Phone Number</span>
                {isEditing ? (
                  <div className="w-full sm:w-2/3 flex flex-col">
                    <div className="flex gap-2">
                      <select 
                        value={(() => {
                          const num = formData.mobileNumber || '';
                          if (num.startsWith('+1')) return '+1';
                          if (num.startsWith('+971')) return '+971';
                          return '+91';
                        })()}
                        onChange={(e) => {
                          const code = e.target.value;
                          const currentNum = formData.mobileNumber || '';
                          const bareNum = currentNum.replace(/^\+\d+/, '');
                          setFormData({...formData, mobileNumber: code + bareNum});
                        }}
                        className="border rounded p-2 text-sm bg-white outline-none w-28"
                      >
                        <option value="+91">IN (+91)</option>
                        <option value="+1">US (+1)</option>
                        <option value="+971">AE (+971)</option>
                      </select>
                      <input 
                        type="text" 
                        className="border rounded p-2 text-sm flex-1 outline-none focus:border-blue-500" 
                        placeholder="Enter phone number"
                        value={(() => {
                          const num = formData.mobileNumber || '';
                          if (num.startsWith('+1')) return num.slice(2);
                          if (num.startsWith('+971')) return num.slice(4);
                          if (num.startsWith('+91')) return num.slice(3);
                          return num;
                        })()} 
                        onChange={(e) => {
                          const num = formData.mobileNumber || '';
                          let code = '+91';
                          if (num.startsWith('+1')) code = '+1';
                          if (num.startsWith('+971')) code = '+971';
                          
                          const maxLen = code === '+971' ? 9 : 10;
                          const bareNum = e.target.value.replace(/\D/g, '').slice(0, maxLen);
                          setFormData({...formData, mobileNumber: code + bareNum});
                        }} 
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-slate-900 text-right w-full sm:w-2/3 mt-2">{user.mobileNumber ?? 'N/A'}</span>
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

        {activeTab === 'sessions' && (
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-600" /> Active Sessions
            </h3>
            {loadingSessions ? (
              <div className="text-center text-slate-500 py-4 text-sm">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center text-slate-500 py-4 text-sm">No active sessions found.</div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => {
                  const isCurrent = session.deviceInfo === navigator.userAgent; // heuristic
                  return (
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl gap-4">
                      <div className="flex items-start gap-3">
                        <MonitorSmartphone className="w-8 h-8 text-slate-400 mt-1" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{session.deviceInfo ? session.deviceInfo.substring(0, 40) + '...' : 'Unknown Device'}</span>
                            {isCurrent && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">Current</span>}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">IP: {session.ipAddress || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">Started: {new Date(session.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                      {!isCurrent && (
                        <Button variant="outline" size="sm" onClick={() => revokeSession(session.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                          <LogOut className="w-4 h-4 mr-1.5" /> Revoke
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'activity' && (
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" /> Login Activity
            </h3>
            {loadingActivities ? (
              <div className="text-center text-slate-500 py-4 text-sm">Loading activity...</div>
            ) : activities.length === 0 ? (
              <div className="text-center text-slate-500 py-4 text-sm">No login activity found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Date & Time</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Device</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">IP Address</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((act) => (
                      <tr key={act.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-slate-700">{new Date(act.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-slate-700 max-w-[200px] truncate" title={act.deviceInfo}>{act.deviceInfo || 'Unknown'}</td>
                        <td className="py-3 px-4 text-sm text-slate-700">{act.ipAddress || 'Unknown'}</td>
                        <td className="py-3 px-4">
                          {act.status === 'success' ? (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded w-fit">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Success
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded w-fit">
                              <XCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'notifications' && (
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" /> Notification Preferences
            </h3>
            {loadingNotifs ? (
              <div className="text-center text-slate-500 py-4 text-sm">Loading preferences...</div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Push Notifications</span>
                    <span className="text-xs text-slate-500">Receive in-app push notifications for important updates</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={notifPrefs.inApp} onChange={(e) => updateNotifPrefs('inApp', e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Email Alerts</span>
                    <span className="text-xs text-slate-500">Get daily summaries and alerts sent to your email</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={notifPrefs.email} onChange={(e) => updateNotifPrefs('email', e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">SMS Notifications</span>
                    <span className="text-xs text-slate-500">Receive text messages for critical security alerts</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={notifPrefs.sms} onChange={(e) => updateNotifPrefs('sms', e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}
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
