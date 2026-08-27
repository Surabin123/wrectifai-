'use client';
import { Card } from '@/components/common/card';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/common/modal';

const BLANK_FORM = {
  name: '', email: '', phone: '', password: '',
  address: '', city: '', state: '', pincode: '',
  vehicleMake: '', vehicleModel: '', vehicleYear: '',
  vehiclePlate: '', vehicleVin: '', vehicleTrim: '', vehicleFuelType: '', vehicleMileage: '',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [actionModal, setActionModal] = useState<{isOpen: boolean, id: string, action: string, type: 'confirm' | 'error', message: string}>({isOpen: false, id: '', action: '', type: 'confirm', message: ''});

  // Add Customer
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  const setField = (field: string, value: string) => setAddForm(f => ({ ...f, [field]: value }));

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password) {
      setAddError('Name, email, and password are required.');
      return;
    }
    if (!passwordRegex.test(addForm.password)) {
      setAddError('Password must be at least 8 characters with uppercase, lowercase, and a special character.');
      return;
    }
    // Vehicle partial-entry guard
    const vehiclePartial = addForm.vehicleMake || addForm.vehicleModel || addForm.vehicleYear;
    if (vehiclePartial && (!addForm.vehicleMake || !addForm.vehicleModel || !addForm.vehicleYear)) {
      setAddError('Vehicle make, model, and year are all required when providing vehicle information.');
      return;
    }
    setAddSubmitting(true);
    try {
      await apiClient.post('/admin/users', {
        name:           addForm.name.trim(),
        email:          addForm.email.trim(),
        password:       addForm.password,
        phone:          addForm.phone.trim() || undefined,
        address:        addForm.address.trim() || undefined,
        city:           addForm.city.trim()    || undefined,
        state:          addForm.state.trim()   || undefined,
        pincode:        addForm.pincode.trim() || undefined,
        vehicleMake:     addForm.vehicleMake.trim()     || undefined,
        vehicleModel:    addForm.vehicleModel.trim()    || undefined,
        vehicleYear:     addForm.vehicleYear            || undefined,
        vehiclePlate:    addForm.vehiclePlate.trim()    || undefined,
        vehicleVin:      addForm.vehicleVin.trim()      || undefined,
        vehicleTrim:     addForm.vehicleTrim.trim()     || undefined,
        vehicleFuelType: addForm.vehicleFuelType.trim() || undefined,
        vehicleMileage:  addForm.vehicleMileage         || undefined,
      });
      setAddSuccess('Customer created successfully.');
      setAddForm(BLANK_FORM);
      loadData();
      setTimeout(() => { setAddOpen(false); setAddSuccess(''); }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
        || err?.response?.data?.message
        || err?.message
        || 'Failed to create customer.';
      setAddError(msg);
    } finally {
      setAddSubmitting(false);
    }
  };

  const loadData = async () => {
    try {
      const data = await apiClient.get<any[]>('/admin/users');
      setCustomers(data);
    } catch (err) {
      console.warn('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      await apiClient.post(`/admin/users/${id}/${action}`);
      setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''});
      loadData();
    } catch (err) {
      setActionModal({isOpen: true, id: '', action: '', type: 'error', message: `Failed to ${action} customer.`});
      console.error('Failed to update status', err);
    }
  };

  const handleViewDetails = async (id: string) => {
    setSelectedUser({ id, loading: true });
    setDetailsLoading(true);
    try {
      const data = await apiClient.get<any>(`/admin/users/${id}`);
      setSelectedUser(data);
    } catch (err) {
      console.error('Failed to load user details', err);
      setSelectedUser(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const confirmAction = () => {
    handleAction(actionModal.id, actionModal.action);
  };

  const filtered = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <button
          id="admin-add-customer-btn"
          onClick={() => { setAddOpen(true); setAddError(''); setAddSuccess(''); }}
          className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Customer
        </button>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
            />
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="p-4 font-semibold w-[15%]">Name</th>
                <th className="p-4 font-semibold w-[20%]">Email</th>
                <th className="p-4 font-semibold w-[15%]">Phone</th>
                <th className="p-4 font-semibold w-[12%]">Status</th>
                <th className="p-4 font-semibold w-[12%]">Created Date</th>
                <th className="p-4 font-semibold w-[16%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                 <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                 <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-500">No Records Found.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-slate-900 truncate">
                      <div className="flex items-center gap-2">
                        {c.name}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-700 truncate" title={c.email}>{c.email}</td>
                    <td className="p-4 text-sm text-slate-700 truncate">{c.phone || 'N/A'}</td>
                    <td className="p-4 text-sm text-slate-700">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        c.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {c.status || 'active'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-700">{new Date(c.joined || c.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="p-4 text-right flex gap-2 justify-end">
                       {c.status === 'suspended' ? (
                         <button onClick={() => setActionModal({isOpen: true, id: c.id, action: 'activate', type: 'confirm', message: 'Are you sure you want to unsuspend this customer?'})} className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">Unsuspend</button>
                       ) : (
                         <button onClick={() => setActionModal({isOpen: true, id: c.id, action: 'suspend', type: 'confirm', message: 'Are you sure you want to suspend this customer?'})} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">Suspend</button>
                       )}
                       <button onClick={() => handleViewDetails(c.id)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">View Details</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={actionModal.isOpen && actionModal.type === 'confirm'} onClose={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} title="Confirm Action" className="max-w-md">
        <p className="text-sm text-slate-600 mb-6">{actionModal.message}</p>
        <div className="flex justify-end gap-3">
           <button onClick={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
           <button onClick={confirmAction} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Confirm</button>
        </div>
      </Modal>
      
      <Modal isOpen={actionModal.isOpen && actionModal.type === 'error'} onClose={() => setActionModal({isOpen: false, id: '', action: '', type: 'confirm', message: ''})} title="Error" className="max-w-md">
        <p className="text-sm text-slate-600 mb-6">{actionModal.message}</p>
      </Modal>

      {/* Customer Details Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="Customer Profile" className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {selectedUser?.loading ? (
          <div className="p-12 text-center text-slate-500 text-sm flex-1">Loading customer profile...</div>
        ) : selectedUser && (
          <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6 custom-scrollbar">
            
            {/* Header Section */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedUser.name}</h2>
                <div className="text-sm text-slate-600 space-x-4">
                  <span>{selectedUser.email}</span>
                  <span>{selectedUser.phone || 'No Phone'}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                 selectedUser.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
              }`}>
                 {selectedUser.status}
              </span>
            </div>

            {/* Vehicles */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 border-b pb-1">Registered Vehicles</h3>
              {selectedUser.vehicles && selectedUser.vehicles.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {selectedUser.vehicles.map((v: any) => (
                    <div key={v.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <p className="font-bold text-slate-800 text-sm">{v.make} {v.model} {v.year ? `(${v.year})` : ''}</p>
                      <p className="text-xs text-slate-500 mt-1">VIN: {v.vin || 'N/A'}</p>
                      <p className="text-xs text-slate-500">Plate: {v.plateNumber || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-500">No vehicles registered.</p>}
            </div>

            {/* Quotes */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 border-b pb-1">Quote History</h3>
              {selectedUser.quotes && selectedUser.quotes.length > 0 ? (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                      <th className="py-2 px-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold">Garage</th>
                      <th className="py-2 px-3 font-semibold">Amount</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.quotes.map((q: any) => (
                      <tr key={q.id} className="border-b border-slate-100">
                        <td className="py-2 px-3 text-slate-700">{new Date(q.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 px-3 text-slate-700">{q.garageName || 'Unknown'}</td>
                        <td className="py-2 px-3 font-medium">{q.amount ? `${q.currency} ${q.amount}` : '-'}</td>
                        <td className="py-2 px-3">
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 uppercase text-slate-600">{q.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-slate-500">No quotes requested.</p>}
            </div>

            {/* Bookings */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3 border-b pb-1">Booking History</h3>
              {selectedUser.bookings && selectedUser.bookings.length > 0 ? (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                      <th className="py-2 px-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold">Garage</th>
                      <th className="py-2 px-3 font-semibold">Amount</th>
                      <th className="py-2 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUser.bookings.map((b: any) => (
                      <tr key={b.id} className="border-b border-slate-100">
                        <td className="py-2 px-3 text-slate-700">{new Date(b.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 px-3 text-slate-700">{b.garageName || 'Unknown'}</td>
                        <td className="py-2 px-3 font-medium">{b.amount ? `${b.currency} ${b.amount}` : '-'}</td>
                        <td className="py-2 px-3">
                          <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 uppercase text-slate-600">{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-slate-500">No bookings made.</p>}
            </div>

          </div>
        )}
      </Modal>

      {/* ── Add Customer Modal ── */}
      <Modal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setAddError(''); setAddSuccess(''); }}
        title="Add New Customer"
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <form
          id="admin-add-customer-form"
          onSubmit={handleAddCustomer}
          className="flex-1 overflow-y-auto pr-1 pb-4 space-y-6"
        >
          {addError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-medium">
              {addError}
            </div>
          )}
          {addSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg font-medium">
              {addSuccess}
            </div>
          )}

          {/* ── Section 1: Account ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">1. Account Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Full Name <span className="text-red-500">*</span></label>
                <input id="add-name" type="text" required value={addForm.name} onChange={e => setField('name', e.target.value)}
                  placeholder="e.g. Samuel Johnson"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Email Address <span className="text-red-500">*</span></label>
                <input id="add-email" type="email" required value={addForm.email} onChange={e => setField('email', e.target.value)}
                  placeholder="e.g. samuel@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Mobile Number</label>
                <input id="add-phone" type="tel" value={addForm.phone} onChange={e => setField('phone', e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Password <span className="text-red-500">*</span></label>
                <input id="add-password" type="password" required value={addForm.password} onChange={e => setField('password', e.target.value)}
                  placeholder="Min 8 chars, upper, lower, special"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* ── Section 2: Address ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">2. Address Details (Optional)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-600">Street Address</label>
                <input id="add-address" type="text" value={addForm.address} onChange={e => setField('address', e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">City</label>
                <input id="add-city" type="text" value={addForm.city} onChange={e => setField('city', e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">State</label>
                <input id="add-state" type="text" value={addForm.state} onChange={e => setField('state', e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Pincode</label>
                <input id="add-pincode" type="text" value={addForm.pincode} onChange={e => setField('pincode', e.target.value)}
                  placeholder="e.g. 560001"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* ── Section 3: Vehicle (all optional, but if any entered make+model+year required) ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">3. Vehicle Information (Optional)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Make</label>
                <input id="add-vehicleMake" type="text" value={addForm.vehicleMake} onChange={e => setField('vehicleMake', e.target.value)}
                  placeholder="e.g. Toyota"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Model</label>
                <input id="add-vehicleModel" type="text" value={addForm.vehicleModel} onChange={e => setField('vehicleModel', e.target.value)}
                  placeholder="e.g. Fortuner"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Year</label>
                <input id="add-vehicleYear" type="number" min="1990" max="2030" value={addForm.vehicleYear} onChange={e => setField('vehicleYear', e.target.value)}
                  placeholder="e.g. 2022"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Plate Number</label>
                <input id="add-vehiclePlate" type="text" value={addForm.vehiclePlate} onChange={e => setField('vehiclePlate', e.target.value)}
                  placeholder="e.g. KA-01-AB-1234"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">VIN</label>
                <input id="add-vehicleVin" type="text" value={addForm.vehicleVin} onChange={e => setField('vehicleVin', e.target.value)}
                  placeholder="17-digit VIN"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Trim / Body Type</label>
                <input id="add-vehicleTrim" type="text" value={addForm.vehicleTrim} onChange={e => setField('vehicleTrim', e.target.value)}
                  placeholder="e.g. Sedan, SUV"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Fuel Type</label>
                <input id="add-vehicleFuelType" type="text" value={addForm.vehicleFuelType} onChange={e => setField('vehicleFuelType', e.target.value)}
                  placeholder="e.g. Petrol, Diesel, EV"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Mileage (km)</label>
                <input id="add-vehicleMileage" type="number" min="0" value={addForm.vehicleMileage} onChange={e => setField('vehicleMileage', e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => { setAddOpen(false); setAddError(''); setAddSuccess(''); }}
              className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
            <button id="admin-add-customer-submit" type="submit" disabled={addSubmitting}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
              {addSubmitting ? 'Creating...' : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
