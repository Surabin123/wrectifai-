'use client';
import { Card } from '@/components/common/card';
import { Search, Plus, Eye, CheckCircle2, PauseCircle, MoreVertical, Edit, ShieldAlert, ShieldCheck, MapPin, Mail, Phone, Calendar, Clock, FileText } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';
import { resolveImageUrl } from '@/lib/utils';

export default function AllGaragesPage() {
  const [garages, setGarages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGarage, setSelectedGarage] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  const [actionModal, setActionModal] = useState<{isOpen: boolean, id: string, action: string}>({isOpen: false, id: '', action: ''});
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'down' | 'up'>('down');
  const [previewModal, setPreviewModal] = useState({ isOpen: false, url: '', name: '' });

  const handleDropdownClick = (e: React.MouseEvent, id: string) => {
    if (openDropdownId === id) {
      setOpenDropdownId(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isNearBottom = window.innerHeight - rect.bottom < 150;
    setDropdownPosition(isNearBottom ? 'up' : 'down');
    setOpenDropdownId(id);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const garagesData = await apiClient.get<any[]>('/admin/onboarding/garages');
      setGarages(garagesData);
    } catch (err) {
      console.error('Failed to load garages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async (id: string, action: string) => {
    try {
      const status = action === 'activate' ? 'active' : action === 'suspend' ? 'suspended' : action;
      await apiClient.put(`/admin/garages/${id}/status`, { status });
      await loadData();
      if (selectedGarage && selectedGarage.id === id) {
        handleViewDetails(id); // refresh details
      }
      setActionModal({isOpen: false, id: '', action: ''});
    } catch (err) {
      console.error('Failed to update garage', err);
    }
  };

  const handleViewDetails = async (id: string) => {
    setDetailsLoading(true);
    setSelectedGarage({ id, loading: true }); // Open modal immediately with loading state
    setOpenDropdownId(null);
    try {
      const data = await apiClient.get<any>(`/admin/onboarding/garages/${id}`);
      setSelectedGarage(data);
    } catch (err) {
      console.error('Failed to load garage details', err);
      setSelectedGarage(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const totalGarages = garages.length;
  const activeGarages = garages.filter(g => g.approvalStatus === 'active').length;
  const inactiveGarages = garages.filter(g => g.approvalStatus === 'inactive' || g.approvalStatus === 'suspended').length;

  const formatTime = (isoString: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold text-[#17307a] mb-1">All Garages</h1>
           <p className="text-sm text-slate-500">Dashboard &gt; Garage Management &gt; All Garages</p>
        </div>
        <Link href="/admin/garages/register" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4"/> Register Garage</Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-white border border-blue-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><div className="text-xl font-bold">G</div></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Total Garages</p>
            <p className="text-2xl font-black text-[#17307a]">{loading ? '-' : totalGarages}</p>
          </div>
        </Card>
        <Card className="p-5 bg-white border border-green-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle2 className="w-6 h-6"/></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Active Garages</p>
            <p className="text-2xl font-black text-[#17307a]">{loading ? '-' : activeGarages}</p>
          </div>
        </Card>
        <Card className="p-5 bg-white border border-orange-100 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center"><PauseCircle className="w-6 h-6"/></div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Inactive Garages</p>
            <p className="text-2xl font-black text-[#17307a]">{loading ? '-' : inactiveGarages}</p>
          </div>
        </Card>
      </div>

      <Card className="p-0 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
           <div className="relative w-80">
             <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
             <input type="text" placeholder="Search by garage name, owner, email or phone..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-1 focus:ring-blue-500" />
           </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-4 text-xs font-bold text-slate-500">Garage Name</th>
              <th className="p-4 text-xs font-bold text-slate-500">Owner</th>
              <th className="p-4 text-xs font-bold text-slate-500">City</th>
              <th className="p-4 text-xs font-bold text-slate-500">Status</th>
              <th className="p-4 text-xs font-bold text-slate-500">Joined Date</th>
              <th className="p-4 text-xs font-bold text-slate-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">Loading garages...</td>
                </tr>
            ) : garages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">No garages registered yet.</td>
                </tr>
            ) : (
                garages.map(g => (
                <tr key={g.id} className="hover:bg-slate-50 bg-white transition-colors relative">
                    <td className="p-4">
                        <button onClick={() => handleViewDetails(g.id)} className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline leading-tight text-left text-ellipsis overflow-hidden whitespace-nowrap max-w-[200px]">{g.name}</button>
                    </td>
                    <td className="p-4">
                        <p className="text-xs font-bold text-[#17307a] leading-tight">{g.ownerName || 'N/A'}</p>
                    </td>
                    <td className="p-4 text-xs text-slate-600">{g.city || 'N/A'}</td>
                    <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${g.approvalStatus === 'inactive' || g.approvalStatus === 'suspended' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                        {g.approvalStatus === 'inactive' || g.approvalStatus === 'suspended' ? g.approvalStatus : 'ACTIVE'}
                    </span>
                    </td>
                    <td className="p-4 text-xs text-slate-600">{formatTime(g.createdAt)}</td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end items-center relative">
                          <div className="relative">
                            <button onClick={(e) => handleDropdownClick(e, g.id)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 border border-slate-200 bg-white" title="More Actions">
                              <MoreVertical className="w-3.5 h-3.5"/>
                            </button>
                            {openDropdownId === g.id && (
                              <div className={`absolute right-0 ${dropdownPosition === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 overflow-hidden`}>
                                <button onClick={() => { setOpenDropdownId(null); handleViewDetails(g.id); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Eye className="w-3.5 h-3.5"/> View Details</button>
                                
                                <div className="border-t border-slate-100 my-1"></div>
                                
                                {g.approvalStatus === 'active' || g.approvalStatus === 'approved' ? (
                                  <>
                                    <button onClick={() => { setOpenDropdownId(null); setActionModal({isOpen: true, id: g.id, action: 'suspend'}); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-50 flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5"/> Suspend</button>
                                    <button onClick={() => { setOpenDropdownId(null); setActionModal({isOpen: true, id: g.id, action: 'delete'}); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5"/> Delete</button>
                                  </>
                                ) : (
                                  <button onClick={() => { setOpenDropdownId(null); setActionModal({isOpen: true, id: g.id, action: 'activate'}); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-green-600 hover:bg-green-50 flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5"/> Make Active</button>
                                )}
                              </div>
                            )}
                          </div>
                      </div>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Details Modal */}
      <Modal isOpen={!!selectedGarage} onClose={() => setSelectedGarage(null)} title="Garage Profile" className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {selectedGarage?.loading ? (
           <div className="p-12 text-center text-slate-500 text-sm flex-1">Loading garage profile...</div>
        ) : selectedGarage && (
          <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-8 custom-scrollbar">
            
            {/* Header Section */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-6 gap-6">
              <div className="flex gap-6 items-center">
                {selectedGarage.image ? (
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border shadow-sm">
                     <img src={resolveImageUrl(selectedGarage.image)} alt={selectedGarage.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-slate-100 border flex items-center justify-center flex-shrink-0">
                     <span className="text-slate-400 text-xs font-bold">No Image</span>
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-black text-[#17307a] mb-2">{selectedGarage.name}</h2>
                  <div className="flex gap-4 items-center text-xs text-slate-600 font-medium">
                     <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400"/> {selectedGarage.locality && selectedGarage.locality !== selectedGarage.city ? `${selectedGarage.locality}, ` : ''}{selectedGarage.city || 'City N/A'}, {selectedGarage.country || 'Country N/A'}</span>
                     <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400"/> Joined {formatTime(selectedGarage.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border shadow-sm ${selectedGarage.approvalStatus === 'inactive' || selectedGarage.approvalStatus === 'suspended' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                   Status: {selectedGarage.approvalStatus === 'inactive' || selectedGarage.approvalStatus === 'suspended' ? selectedGarage.approvalStatus : 'ACTIVE'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Garage Information */}
              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">Garage Information</h3>
                 <div className="grid grid-cols-1 gap-y-4 gap-x-4">
                    <div className="col-span-1">
                      <p className="text-[11px] text-slate-500 font-bold mb-0.5">Description</p>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedGarage.description || 'No description provided.'}</p>
                    </div>
                 </div>
              </div>

              {/* Owner & Account */}
              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">Owner & Account</h3>
                 <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 space-y-4">
                    <div>
                      <p className="text-[11px] text-blue-500 font-bold mb-0.5">Owner Full Name</p>
                      <p className="text-sm font-bold text-[#17307a]">{selectedGarage.ownerName || 'Not provided'}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-[11px] text-blue-500 font-bold mb-0.5">Phone Number</p>
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400"/> {selectedGarage.ownerPhone || 'Not provided'}</p>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">Location</h3>
                 <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                    <div>
                      <p className="text-[11px] text-slate-500 font-bold mb-0.5">Country</p>
                      <p className="text-sm font-semibold text-slate-800">{selectedGarage.country || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 font-bold mb-0.5">City</p>
                      <p className="text-sm font-semibold text-slate-800">{selectedGarage.city || 'Not provided'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] text-slate-500 font-bold mb-0.5">Complete Address</p>
                      <p className="text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedGarage.address || 'Not provided'}</p>
                    </div>
                 </div>
              </div>

              {/* Working Hours */}
              <div className="space-y-4">
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">Working Hours</h3>
                 {selectedGarage.businessHours ? (
                   <div className="text-sm text-slate-700 font-medium">Configured in system.</div>
                 ) : (
                   <div className="flex items-center gap-2 text-sm text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
                     <Clock className="w-4 h-4" /> Not provided
                   </div>
                 )}
              </div>
            </div>

            {/* Services */}
            <div className="space-y-4 pt-4">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">Services Offered</h3>
               {selectedGarage.servicesList && selectedGarage.servicesList.length > 0 ? (
                 <div className="flex flex-wrap gap-2">
                   {selectedGarage.servicesList.map((s: any, idx: number) => (
                     <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                       {s.name}
                     </span>
                   ))}
                 </div>
               ) : (
                 <p className="text-sm text-slate-500 italic">No services registered.</p>
               )}
            </div>

            {/* Documents */}
            <div className="space-y-4 pt-4">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b pb-2">Business Documents</h3>
               {selectedGarage.docsList && selectedGarage.docsList.length > 0 ? (
                 <div className="grid grid-cols-2 gap-4">
                   {selectedGarage.docsList.map((doc: any, idx: number) => (
                     <div key={idx} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between bg-white hover:border-blue-200 transition-colors">
                       <div className="flex items-center gap-3 overflow-hidden">
                         <div className="w-10 h-10 bg-slate-50 rounded flex items-center justify-center text-slate-400 flex-shrink-0">
                           <FileText className="w-5 h-5"/>
                         </div>
                         <div className="overflow-hidden">
                           <p className="text-sm font-bold text-slate-800 truncate">{doc.doc_type || 'Document'}</p>
                           <p className="text-[10px] font-bold text-slate-500 uppercase">{doc.verification_status || 'Pending'}</p>
                         </div>
                       </div>
                       {doc.file_url && (
                         <button onClick={() => {
                           const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000';
                           setPreviewModal({isOpen: true, url: baseUrl + doc.file_url, name: doc.doc_type});
                         }} className="text-xs font-bold text-blue-600 hover:underline">View</button>
                       )}
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">No documents uploaded.</p>
               )}
            </div>
            
          </div>
        )}
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal isOpen={actionModal.isOpen} onClose={() => setActionModal({isOpen: false, id: '', action: ''})} title="Confirm Action" className="max-w-md">
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">Are you sure you want to <strong>{actionModal.action === 'activate' ? 'activate' : actionModal.action === 'suspend' ? 'suspend' : 'delete'}</strong> this garage? This will immediately affect their visibility in the system.</p>
        <div className="flex justify-end gap-3">
           <button onClick={() => setActionModal({isOpen: false, id: '', action: ''})} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
           <button onClick={() => handleVerify(actionModal.id, actionModal.action)} className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 ${actionModal.action === 'activate' ? 'bg-green-600 hover:bg-green-700' : actionModal.action === 'suspend' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}>
             {actionModal.action === 'activate' ? <CheckCircle2 className="w-4 h-4"/> : <ShieldAlert className="w-4 h-4"/>} Confirm
           </button>
        </div>
      </Modal>

      {/* Document Preview Modal */}
      <Modal isOpen={previewModal.isOpen} onClose={() => setPreviewModal({isOpen: false, url: '', name: ''})} title={previewModal.name} className="max-w-4xl max-h-[90vh]">
        <div className="w-full h-[70vh] flex items-center justify-center bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
          {previewModal.url.toLowerCase().endsWith('.pdf') ? (
            <object data={previewModal.url} type="application/pdf" className="w-full h-full">
               <iframe src={previewModal.url} className="w-full h-full border-none">
                 <p>This browser does not support PDFs. Please download the PDF to view it.</p>
               </iframe>
            </object>
          ) : (
            <img src={previewModal.url} alt={previewModal.name} className="max-w-full max-h-full object-contain" />
          )}
        </div>
      </Modal>
      
      {/* Global click handler to close dropdown */}
      {openDropdownId && (
        <div className="fixed inset-0 z-0" onClick={() => setOpenDropdownId(null)}></div>
      )}
    </div>
  );
}

