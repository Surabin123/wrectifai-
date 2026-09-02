'use client';
import { Card } from '@/components/common/card';
import { useState, useEffect } from 'react';
import { Button } from '@/components/common/button';
import { Edit2, Save, CameraIcon, Check, AlertCircle, MapPin, Clock, FileText, BadgeCheck, Phone, Mail, Store } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';

export function GarageProfileContent() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/garages/my-profile');
      if (res && !res.error) {
        setProfile(res);
        setFormData({
          garageName: res.garageName || '',
          address: res.address || '',
          description: res.description || '',
          pickupDropSupported: res.pickupDropSupported || false,
          image: res.image || '',
        });
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success'|'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startEditing = () => setIsEditing(true);

  const handleSave = async () => {
    try {
      const res = await apiClient.put<any>('/garages/my-profile', formData);
      if (res && !res.error) {
        setProfile({ ...profile, ...res });
        setIsEditing(false);
        showToast('Profile updated successfully', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update profile', 'error');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Profile...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-red-500">Could not load garage profile.</div>;
  }

  const initials = profile.garageName ? profile.garageName.substring(0, 2).toUpperCase() : 'GR';

  return (
    <div className="space-y-6 relative max-w-5xl">
      {toast && (
        <div className={`fixed bottom-4 right-4 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-5 flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Identity Card */}
      <Card className="p-6 flex flex-col md:flex-row md:items-start gap-6 shadow-sm border-slate-100 rounded-[24px]">
        <div className="relative shrink-0">
          <div className="w-32 h-32 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-4xl font-bold overflow-hidden border border-slate-100">
            {formData.image || profile.image ? (
              <img src={formData.image || profile.image} alt="Garage" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {isEditing && (
            <>
              <input 
                type="file" 
                id="garage-image-upload" 
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
              <label htmlFor="garage-image-upload" className="absolute -bottom-2 -right-2 p-2 bg-white border rounded-full text-slate-600 hover:text-blue-600 shadow-md cursor-pointer">
                <CameraIcon className="w-4 h-4" />
              </label>
            </>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">{profile.garageName || 'Unnamed Garage'}</h2>
                {profile.approvalStatus === 'approved' && (
                  <BadgeCheck className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <p className="text-slate-500 mt-1 flex items-start gap-1">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                {profile.address || 'Address not set'}
              </p>
              
              <div className="flex items-center gap-2 mt-3">
                 <span className={`px-2 py-0.5 text-xs font-bold rounded flex items-center gap-1 ${
                   (profile.approvalStatus === 'approved' || profile.approvalStatus === 'active') ? 'bg-green-100 text-green-700' : 
                   profile.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-700' : 
                   profile.approvalStatus === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                 }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      (profile.approvalStatus === 'approved' || profile.approvalStatus === 'active') ? 'bg-green-600' : 
                      profile.approvalStatus === 'pending' ? 'bg-amber-600' : 
                      profile.approvalStatus === 'suspended' ? 'bg-red-600' : 'bg-slate-600'
                    }`}></span> 
                    {(profile.approvalStatus === 'approved' || profile.approvalStatus === 'active') ? 'Active & Verified' : 
                     profile.approvalStatus === 'pending' ? 'Verification Pending' : 
                     profile.approvalStatus === 'suspended' ? 'Suspended' : 
                     profile.approvalStatus === 'deleted' ? 'Deleted' : 
                     profile.approvalStatus === 'rejected' ? 'Rejected' : 'Inactive'}
                 </span>
                 
                 {profile.ratingCount > 0 && (
                   <span className="flex items-center gap-1 text-sm font-medium text-slate-700">
                     <span className="text-amber-500">★</span> {profile.ratingAvg} ({profile.ratingCount} reviews)
                   </span>
                 )}
              </div>
            </div>
            
            {!isEditing && (
              <Button variant="outline" className="gap-2 font-bold shrink-0" onClick={startEditing}>
                <Edit2 className="w-4 h-4" /> Edit Garage Details
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-600" /> Business Information
            </h3>
            
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                <span className="text-sm font-medium text-slate-500 w-1/3">Garage Name</span>
                {isEditing ? (
                  <input type="text" className="border rounded p-2 text-sm w-full sm:w-2/3" value={formData.garageName} onChange={(e) => setFormData({...formData, garageName: e.target.value})} />
                ) : (
                  <span className="text-sm font-bold text-slate-900 text-right w-full sm:w-2/3">{profile.garageName || 'N/A'}</span>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b pb-4">
                <span className="text-sm font-medium text-slate-500 w-1/3 pt-2">Address</span>
                {isEditing ? (
                  <textarea className="border rounded p-2 text-sm w-full sm:w-2/3 min-h-[80px]" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                ) : (
                  <span className="text-sm font-medium text-slate-900 text-right w-full sm:w-2/3">{profile.address || 'N/A'}</span>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b pb-4">
                <span className="text-sm font-medium text-slate-500 w-1/3 pt-2">Description</span>
                {isEditing ? (
                  <textarea className="border rounded p-2 text-sm w-full sm:w-2/3 min-h-[100px]" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Tell customers about your garage..." />
                ) : (
                  <span className="text-sm text-slate-700 text-right w-full sm:w-2/3">{profile.description || 'No description provided.'}</span>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2">
                <span className="text-sm font-medium text-slate-500 w-1/3">Pickup & Drop</span>
                {isEditing ? (
                  <label className="flex items-center gap-2 w-full sm:w-2/3 justify-end">
                    <input type="checkbox" checked={formData.pickupDropSupported} onChange={(e) => setFormData({...formData, pickupDropSupported: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-slate-700">Supported</span>
                  </label>
                ) : (
                  <span className="text-sm font-bold text-slate-900 text-right w-full sm:w-2/3">
                    {profile.pickupDropSupported ? 'Supported' : 'Not Supported'}
                  </span>
                )}
              </div>
            </div>
            
            {isEditing && (
              <div className="flex justify-end gap-4 mt-6">
                <Button variant="outline" className="font-bold w-32" onClick={() => { setIsEditing(false); setFormData({...profile}); }}>Cancel</Button>
                <Button className="font-bold w-32 bg-blue-600 text-white hover:bg-blue-700" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> Save
                </Button>
              </div>
            )}
          </Card>

          {!isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Link href="/garage/services" className="block">
                <Card className="p-6 shadow-sm border-slate-100 rounded-[24px] hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <Store className="w-5 h-5 text-blue-600" />
                    </div>
                    <BadgeCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Services Offered</h4>
                  <p className="text-2xl font-black text-[#17307a]">{profile.servicesCount || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Manage your service catalogue</p>
                </Card>
              </Link>
              <Link href="/garage/inventory" className="block">
                <Card className="p-6 shadow-sm border-slate-100 rounded-[24px] hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <Store className="w-5 h-5 text-blue-600" />
                    </div>
                    <BadgeCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">Inventory</h4>
                  <p className="text-2xl font-black text-[#17307a]">{profile.inventoryCount || 0}</p>
                  <p className="text-xs text-slate-500 mt-1">Manage products and stock</p>
                </Card>
              </Link>
            </div>
          )}
        </div>
        
        {/* Right Column (1/3) */}
        <div className="space-y-6">
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" /> Working Hours
            </h3>
            {profile.businessHours ? (
              <div className="space-y-2 text-sm">
                {Object.entries(profile.businessHours).map(([day, hours]: [string, any]) => (
                  <div key={day} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                    <span className="capitalize text-slate-500">{day}</span>
                    <span className="font-medium text-slate-900">
                      {hours.open ? `${hours.start} - ${hours.end}` : 'Closed'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Working hours not configured.</p>
            )}
            
            {isEditing && (
              <p className="text-xs text-blue-600 mt-4 bg-blue-50 p-2 rounded">
                Contact admin to update complex working hours or location coordinates.
              </p>
            )}
          </Card>
          
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px] bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" /> Verification Documents
            </h3>
            <div className="space-y-3">
              {profile.documents && profile.documents.length > 0 ? (
                profile.documents.map((doc: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100">
                    <span className="text-sm font-medium text-slate-700 uppercase">{doc.doc_type}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      doc.verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                      doc.verification_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.verification_status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No documents uploaded.</p>
              )}
            </div>
          </Card>
          
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px]">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Owner Contact</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="font-bold text-slate-500">{profile.ownerName?.charAt(0) || 'U'}</span>
                </div>
                <span className="font-medium text-slate-900">{profile.ownerName || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 pl-11">
                <Phone className="w-4 h-4" />
                <span>{profile.ownerPhone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600 pl-11">
                <Mail className="w-4 h-4" />
                <span className="truncate">{profile.ownerEmail || 'N/A'}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default GarageProfileContent;
