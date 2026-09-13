'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { Input } from '@/components/common/input';
import { Bell, Calendar, Wallet, FileText, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

// Removed mock initialNotifications
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { SharedBookingDetailsModal } from '@/components/bookings/SharedBookingDetailsModal';
import { SharedQuoteDetailsModal } from '@/components/quotes/SharedQuoteDetailsModal';
import { SharedInvoiceDetailsModal } from '@/components/invoices/SharedInvoiceDetailsModal';

export function Notifications() {
  const pathname = usePathname();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<any>(null);

  useEffect(() => {
    const fetchDetails = async (type: string, id: string) => {
      try {
        let endpoint = '';
        if (type === 'booking') endpoint = user?.roles?.includes('admin') ? `/admin/bookings/${id}` : `/bookings/${id}`;
        else if (type === 'quote') endpoint = user?.roles?.includes('admin') ? `/admin/quotes/${id}` : `/quotes/${id}`;
        else if (type === 'invoice') endpoint = user?.roles?.includes('admin') ? `/admin/invoices/${id}` : `/invoices/${id}`;
        
        const data = await apiClient(endpoint);
        setDetailsData(data);
      } catch (err) {
        console.error(`Failed to fetch ${type} details`, err);
        setDetailsData(null);
      }
    };
    if (selectedBookingId) fetchDetails('booking', selectedBookingId);
    else if (selectedQuoteId) fetchDetails('quote', selectedQuoteId);
    else if (selectedInvoiceId) fetchDetails('invoice', selectedInvoiceId);
    else setDetailsData(null);
  }, [selectedBookingId, selectedQuoteId, selectedInvoiceId, user]);

  const fetchNotifications = async () => {
    try {
      let url = '/notifications';
      if (user?.roles?.includes('garage') && (user as any)?.garageId) {
        url += `?garageId=${(user as any).garageId}`;
      }
      const data = await apiClient<any[]>(url);
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000); // Poll every 15s for "real-time"

    return () => clearInterval(interval);
  }, [user]);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !n.is_read;
    if (filter === 'Read') return n.is_read;
    return n.type === filter;
  });
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = async () => {
    try {
      let url = '/notifications/read-all';
      if (user?.roles?.includes('garage') && (user as any)?.garageId) {
        url += `?garageId=${(user as any).garageId}`;
      }
      await apiClient(url, { method: 'POST' });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const markAsRead = async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (notification?.is_read) return;

    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const clearSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await apiClient('/notifications/clear-selected', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds })
      });
      setNotifications(notifications.filter(n => !selectedIds.includes(n.id)));
      setSelectedIds([]);
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error('Failed to clear selected', err);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      <div className="flex-1 space-y-6 max-w-4xl">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Notifications</h1>
            <p className="text-slate-500 text-sm">Stay updated on your bookings and activities</p>
          </div>
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button variant="outline" className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={clearSelected}>
                Delete Selected ({selectedIds.length})
              </Button>
            )}
            {unreadCount > 0 && (
              <Button variant="outline" className="text-xs h-8 text-blue-600 border-blue-200" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        <Card className="p-0 overflow-hidden border-slate-100 shadow-sm rounded-[16px]">
          <div className="p-4 border-b border-slate-100 space-y-4 bg-white">
            <div className="flex flex-wrap gap-2">
              {['All', 'Unread', 'Read', 'Booking', 'Quote', 'System'].map(s => (
                <button 
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${filter === s ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0"></div>
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                    <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No notifications found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={cn("p-4 flex gap-4 items-center transition-colors group relative cursor-pointer", !notification.is_read ? "bg-blue-50/30" : "hover:bg-slate-50", selectedIds.includes(notification.id) ? "bg-red-50/20" : "")}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div onClick={(e) => toggleSelection(e, notification.id)} className="flex items-center justify-center h-full mr-2">
                    <input type="checkbox" checked={selectedIds.includes(notification.id)} readOnly className="w-4 h-4 cursor-pointer" />
                  </div>
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-50 text-blue-500")}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={cn("text-sm font-bold truncate", !notification.is_read ? "text-slate-900" : "text-slate-700")}>
                        {notification.title}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap ml-2">
                        {notification.created_at ? formatDate(notification.created_at) : formatDate(new Date().toISOString())}
                      </span>
                    </div>
                    <p className={cn("text-xs line-clamp-2", !notification.is_read ? "text-slate-700 font-medium" : "text-slate-500")}>
                      {notification.description?.replace(/\[ID:[^\]]+\]/, '')}
                    </p>
                    {notification.description?.match(/\[ID:([^\]]+)\]/) && (
                      <div className="mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-[10px] h-6 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            const id = notification.description.match(/\[ID:([^\]]+)\]/)[1];
                            if (notification.type === 'Booking') {
                               setSelectedBookingId(id);
                            } else if (notification.type === 'Quote') {
                               setSelectedQuoteId(id);
                            } else if (notification.type === 'Invoice') {
                               setSelectedInvoiceId(id);
                            }
                          }}
                        >
                          View {notification.type} Details
                        </Button>
                      </div>
                    )}
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 absolute top-5 right-4"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {selectedBookingId && detailsData && (
        <SharedBookingDetailsModal
          booking={detailsData}
          onClose={() => { setSelectedBookingId(null); setDetailsData(null); }}
          userRole={user?.roles?.includes('admin') ? 'admin' : user?.roles?.includes('garage') ? 'garage' : 'customer'}
        />
      )}
      {selectedQuoteId && detailsData && (
        <SharedQuoteDetailsModal
          quote={detailsData}
          onClose={() => { setSelectedQuoteId(null); setDetailsData(null); }}
          userRole={user?.roles?.includes('admin') ? 'admin' : user?.roles?.includes('garage') ? 'garage' : 'customer'}
        />
      )}
      {selectedInvoiceId && detailsData && (
        <SharedInvoiceDetailsModal
          invoice={detailsData}
          onClose={() => { setSelectedInvoiceId(null); setDetailsData(null); }}
          userRole={user?.roles?.includes('admin') ? 'admin' : user?.roles?.includes('garage') ? 'garage' : 'customer'}
        />
      )}
    </div>
  );
}
