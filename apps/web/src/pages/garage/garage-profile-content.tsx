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
          garageType: res.garageType || '',
          stateRegion: res.stateRegion || '',
          postalCode: res.postalCode || '',
          timezone: res.timezone || '',
          ownerName: res.ownerName || '',
          ownerDesignation: res.ownerDesignation || '',
          businessHours: res.businessHours || {},
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

  const viewDocument = async (documentId: string) => {
    try {
      const result = await apiClient.get<{url: string}>(`/garages/my-documents/${documentId}/access`);
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err: any) { showToast(err.message || 'Could not open document', 'error'); }
  };

  const replaceDocument = (documentId: string, file?: File) => {
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) { showToast('Upload a PDF, JPG, or PNG under 5MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await apiClient.put(`/garages/my-documents/${documentId}`, { file: { name: file.name, type: file.type, size: file.size, data: reader.result } });
        showToast('Document replaced successfully', 'success');
        await fetchProfile();
      } catch (err: any) { showToast(err.message || 'Failed to replace document', 'error'); }
    };
    reader.readAsDataURL(file);
  };

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
              {(profile.responseMins || profile.specializations?.length) && <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-600">
                {profile.responseMins && <span className="rounded bg-slate-100 px-2 py-1">Responds in about {profile.responseMins} min</span>}
                {(profile.specializations || []).map((highlight: string) => <span key={highlight} className="rounded bg-blue-50 px-2 py-1 text-blue-700">{highlight}</span>)}
              </div>}
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

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                <span className="text-sm font-medium text-slate-500 w-1/3">Garage Type</span>
                {isEditing ? (
                  <input type="text" className="border rounded p-2 text-sm w-full sm:w-2/3" value={formData.garageType} onChange={(e) => setFormData({...formData, garageType: e.target.value})} />
                ) : <span className="text-sm font-bold text-slate-900 text-right w-full sm:w-2/3">{profile.garageType || 'Not specified'}</span>}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                <span className="text-sm font-medium text-slate-500 w-1/3">Registration Number</span>
                <span className="text-sm font-bold text-slate-900 text-right w-full sm:w-2/3">{profile.registrationNumber || 'Not specified'}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                <span className="text-sm font-medium text-slate-500 w-1/3">Business Location</span>
                {isEditing ? (
                  <div className="flex gap-2 w-full sm:w-2/3"><input className="border rounded p-2 text-sm w-1/2" value={formData.stateRegion} onChange={(e) => setFormData({...formData, stateRegion: e.target.value})} placeholder="State / Province" /><input className="border rounded p-2 text-sm w-1/2" value={formData.postalCode} onChange={(e) => setFormData({...formData, postalCode: e.target.value})} placeholder="Postal code" /></div>
                ) : <span className="text-sm text-slate-700 text-right w-full sm:w-2/3">{[profile.city, profile.stateRegion, profile.postalCode].filter(Boolean).join(', ') || 'Not specified'}</span>}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b pb-4">
                <span className="text-sm font-medium text-slate-500 w-1/3 pt-2">Description</span>
                {isEditing ? (
                  <textarea className="border rounded p-2 text-sm w-full sm:w-2/3 min-h-[100px]" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Tell customers about your garage..." />
                ) : (
                  <span className="text-sm text-slate-700 text-right w-full sm:w-2/3">{profile.description || 'No description provided.'}</span>
                )}
              </div>
              
              {isEditing && <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4"><span className="text-sm font-medium text-slate-500 w-1/3">Representative</span><div className="flex gap-2 w-full sm:w-2/3"><input className="border rounded p-2 text-sm w-1/2" value={formData.ownerName} onChange={(e) => setFormData({...formData, ownerName: e.target.value})} placeholder="Full name" /><input className="border rounded p-2 text-sm w-1/2" value={formData.ownerDesignation} onChange={(e) => setFormData({...formData, ownerDesignation: e.target.value})} placeholder="Designation" /></div></div>}
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
              <Link href="/garage/orders" className="block">
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
            {isEditing ? (
              <div className="space-y-2 text-xs">{Object.entries(formData.businessHours || {}).map(([day, hours]: [string, any]) => <div key={day} className="grid grid-cols-3 gap-2 items-center"><label className="capitalize flex gap-2"><input type="checkbox" checked={hours.open} onChange={e => setFormData({...formData, businessHours: {...formData.businessHours, [day]: {...hours, open: e.target.checked}}})}/>{day}</label><input disabled={!hours.open} value={hours.start || ''} onChange={e => setFormData({...formData, businessHours: {...formData.businessHours, [day]: {...hours, start: e.target.value}}})} className="border rounded p-1 disabled:bg-slate-100"/><input disabled={!hours.open} value={hours.end || ''} onChange={e => setFormData({...formData, businessHours: {...formData.businessHours, [day]: {...hours, end: e.target.value}}})} className="border rounded p-1 disabled:bg-slate-100"/></div>)}</div>
            ) : profile.businessHours ? (
              <div className="space-y-2 text-sm">
                {Object.entries(profile.businessHours)
                  .sort(([dayA], [dayB]) => {
                    const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                    return order.indexOf(dayA.toLowerCase()) - order.indexOf(dayB.toLowerCase());
                  })
                  .map(([day, hours]: [string, any]) => (
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
            
          </Card>
          
          <Card className="p-6 shadow-sm border-slate-100 rounded-[24px] bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" /> Verification Documents
            </h3>
            <div className="space-y-3">
              {profile.documents && profile.documents.length > 0 ? (
                profile.documents.map((doc: any) => (
                  <div key={doc.id} className="flex justify-between items-center gap-2 bg-white p-3 rounded-lg border border-slate-100">
                    <div className="min-w-0"><span className="text-sm font-medium text-slate-700">{doc.doc_type}</span>{doc.originalFilename && <p className="text-[10px] text-slate-400 truncate">{doc.originalFilename}</p>}</div>
                    <div className="flex gap-2"><button type="button" onClick={() => viewDocument(doc.id)} className="text-xs font-bold text-blue-600">View</button><label className="text-xs font-bold text-blue-600 cursor-pointer">Replace<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={event => replaceDocument(doc.id, event.target.files?.[0])}/></label></div>
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
              {profile.ownerDesignation && <div className="text-xs text-slate-500 pl-11">{profile.ownerDesignation}</div>}
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
