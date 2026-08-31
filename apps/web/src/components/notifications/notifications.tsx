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

const timeAgo = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export function Notifications() {
  const pathname = usePathname();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

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

  const filteredNotifications = notifications.filter(n => filter === 'All' || n.type === filter);
  
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4">
      <div className="flex-1 space-y-6 max-w-4xl">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Notifications</h1>
            <p className="text-slate-500 text-sm">Stay updated on your bookings and activities</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" className="text-xs h-8 text-blue-600 border-blue-200" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>

        <Card className="p-0 overflow-hidden border-slate-100 shadow-sm rounded-[16px]">
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
                  className={cn("p-4 flex gap-4 transition-colors group relative", !notification.is_read ? "bg-blue-50/30" : "hover:bg-slate-50")}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 bg-blue-50 text-blue-500")}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={cn("text-sm font-bold truncate", !notification.is_read ? "text-slate-900" : "text-slate-700")}>
                        {notification.title}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap ml-2">
                        {notification.created_at ? timeAgo(new Date(notification.created_at)) : 'Just now'}
                      </span>
                    </div>
                    <p className={cn("text-xs line-clamp-2", !notification.is_read ? "text-slate-700 font-medium" : "text-slate-500")}>
                      {notification.description}
                    </p>
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
    </div>
  );
}
