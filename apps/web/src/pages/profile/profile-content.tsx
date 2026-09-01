'use client';
import { Card } from '@/components/common/card';
import { useState, useEffect } from 'react';
import { Button } from '@/components/common/button';
import { Edit2, Save, CameraIcon, Check, AlertCircle, Car, Calendar, ShoppingBag, Star, UserCircle, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';

export function ProfileContent() {
  const { user, token, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', mobileNumber: '', image: '' });
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  const [stats, setStats] = useState({ bookingsCount: 0, vehiclesCount: 0, quotesCount: 0, ordersCount: 0 });
  const [activeTab, setActiveTab] = useState<'personal' | 'vehicles' | 'orders' | 'reviews'>('personal');
  const [myReviews, setMyReviews] = useState<any[]>([]);

  useEffect(() => {
    // Fetch stats
    apiClient.get<any>('/users/customer/stats').then(res => {
      if (res && !res.error) {
        setStats({
          bookingsCount: res.bookingsCount || 0,
          vehiclesCount: res.vehiclesCount || 0,
          quotesCount: res.quotesCount || 0,
          ordersCount: res.ordersCount || 0,
        });
      }
    }).catch(console.error);

    // Fetch reviews
    apiClient.get<any>('/reviews/my-reviews').then(res => {
      if (res && !res.error && Array.isArray(res)) {
        setMyReviews(res);
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

  const initials = user.name ? user.name.substring(0, 2).toUpperCase() : (user.email ? user.email.substring(0, 2).toUpperCase() : 'US');

  return (
    <div className="space-y-6 relative max-w-5xl">
      {toast && (
        <div className={`fixed bottom-4 right-4 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-5 flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Identity Card */}
      <Card className="p-6 flex items-center gap-6 shadow-sm border-slate-100 rounded-[24px] bg-gradient-to-r from-blue-50/50 to-white">
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold overflow-hidden border-4 border-white shadow-sm">
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
            <h2 className="text-2xl font-bold text-slate-900">{user.name || 'User'}</h2>
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center gap-1">
              <UserCircle className="w-3 h-3" /> Customer
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{user.email || 'N/A'} • {user.mobileNumber || 'N/A'}</p>
        </div>
        
        {!isEditing && (
          <Button variant="outline" className="gap-2 font-bold bg-white" onClick={startEditing}>
            <Edit2 className="w-4 h-4" /> Edit Profile
          </Button>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 overflow-x-auto pb-1">
        <button 
          onClick={() => setActiveTab('personal')}
          className={`pb-2 px-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Personal Info
        </button>
        <button 
          onClick={() => setActiveTab('vehicles')}
          className={`pb-2 px-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'vehicles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          My Vehicles
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`pb-2 px-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Service & Orders
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          className={`pb-2 px-2 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'reviews' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          My Reviews
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column (2/3) */}
        <div className="md:col-span-2 space-y-6">
          
          {activeTab === 'personal' && (
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
              
              {isEditing && (
                <div className="flex justify-end gap-4 mt-6">
                  <Button variant="outline" className="font-bold w-32" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button className="font-bold w-32 bg-blue-600 text-white hover:bg-blue-700" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" /> Save
                  </Button>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'vehicles' && (
            <Card className="p-6 shadow-sm border-slate-100 rounded-[24px] flex flex-col items-center justify-center text-center min-h-[250px]">
              <Car className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">My Vehicles</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-4">
                You currently have {stats.vehiclesCount} vehicle(s) registered to your account.
              </p>
              <Button variant="outline" className="font-bold">Manage Vehicles in Garage</Button>
            </Card>
          )}

          {activeTab === 'orders' && (
            <Card className="p-6 shadow-sm border-slate-100 rounded-[24px] flex flex-col items-center justify-center text-center min-h-[250px]">
              <ShoppingBag className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Service History</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-4">
                You have {stats.bookingsCount} total bookings and {stats.ordersCount} orders.
              </p>
              <Button variant="outline" className="font-bold">View Full Service History</Button>
            </Card>
          )}

          {activeTab === 'reviews' && (
            <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" /> My Reviews
              </h3>
              
              {myReviews.length > 0 ? (
                <div className="space-y-4">
                  {myReviews.map((review) => (
                    <div key={review.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-900 text-sm">{review.garageName}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(review.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                        ))}
                      </div>
                      <p className="text-sm text-slate-700">{review.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <Star className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  You haven't written any reviews yet.
                </div>
              )}
            </Card>
          )}

        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px] bg-white">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Your Summary</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <Car className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Vehicles</span>
                </div>
                <span className="font-bold text-slate-900">{stats.vehiclesCount}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Bookings</span>
                </div>
                <span className="font-bold text-slate-900">{stats.bookingsCount}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Quotes</span>
                </div>
                <span className="font-bold text-slate-900">{stats.quotesCount}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                    <Star className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Reviews</span>
                </div>
                <span className="font-bold text-slate-900">{myReviews.length}</span>
              </div>
            </div>
          </Card>
        </div>
        
      </div>
    </div>
  );
}

export default ProfileContent;
