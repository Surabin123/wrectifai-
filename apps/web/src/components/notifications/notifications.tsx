'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/common/card';
import { Button } from '@/components/common/button';
import { Input } from '@/components/common/input';
import { Bell, Calendar, Wallet, FileText, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const iconMap: Record<string, any> = { Calendar, Wallet, FileText, Bell, CheckCircle2, Clock, ShieldAlert };

export const initialNotifications: any[] = [
  { id: 1, type: 'Booking', title: 'Booking Confirmed', desc: 'Your service appointment at Metro Auto Bay is confirmed for Tomorrow, 10:00 AM.', time: '10 mins ago', read: false, icon: 'Calendar', color: 'text-blue-500', bg: 'bg-blue-50', audience: 'All' },
  { id: 2, type: 'Payment', title: 'Payment Successful', desc: 'Payment of $120.00 for Oil Change has been processed successfully.', time: '2 hours ago', read: false, icon: 'Wallet', color: 'text-green-500', bg: 'bg-green-50', audience: 'All' },
  { id: 3, type: 'Quote', title: 'New Quote Received', desc: 'SpeedCare Garage has sent a quote for Brake Pad Replacement.', time: '5 hours ago', read: true, icon: 'FileText', color: 'text-purple-500', bg: 'bg-purple-50', audience: 'All' },
  { id: 4, type: 'System', title: 'Welcome to WrectifAI', desc: 'Complete your profile to get personalized service recommendations.', time: '1 day ago', read: true, icon: 'Bell', color: 'text-amber-500', bg: 'bg-amber-50', audience: 'All' },
  { id: 5, type: 'Booking', title: 'Service Completed', desc: 'Your vehicle is ready for pickup from Tyre Hub.', time: '2 days ago', read: true, icon: 'CheckCircle2', color: 'text-green-500', bg: 'bg-green-50', audience: 'All' },
  { id: 6, type: 'Reminder', title: 'Upcoming Service', desc: 'Your AC Service is due in 3 days. Book now to avoid rush.', time: '3 days ago', read: true, icon: 'Clock', color: 'text-orange-500', bg: 'bg-orange-50', audience: 'All' },
  { id: 7, type: 'System', title: 'Security Alert', desc: 'New login detected from Chrome on Windows.', time: '1 week ago', read: true, icon: 'ShieldAlert', color: 'text-red-500', bg: 'bg-red-50', audience: 'All' },
];

export function Notifications() {
  const pathname = usePathname();
  const { user } = useAuth();

  const [notifications, setNotificationsState] = useState(initialNotifications);
  const [filter, setFilter] = useState('All');
  


  const setNotifications = (newNotifications: any[]) => {
    setNotificationsState(newNotifications);
    localStorage.setItem('wrectifai_notifications', JSON.stringify(newNotifications));
    window.dispatchEvent(new Event('notifications-updated'));
  };

  useEffect(() => {
    const stored = localStorage.getItem('wrectifai_notifications');
    if (stored) {
      setNotificationsState(JSON.parse(stored));
    } else {
      localStorage.setItem('wrectifai_notifications', JSON.stringify(initialNotifications));
      setNotificationsState(initialNotifications);
    }
  }, []);

  const isAdmin = user?.roles?.includes('admin');
  const isGarage = user?.roles?.includes('garage');
  const audienceRole = isAdmin ? 'Admin' : isGarage ? 'Garage' : 'Customer';

  const audienceFiltered = notifications.filter(n => 
    n.audience === 'All' || n.audience === audienceRole
  );

  const filteredNotifications = audienceFiltered.filter(n => filter === 'All' || n.type === filter);
  
  const unreadCount = audienceFiltered.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
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

        <div className="flex flex-wrap gap-2">
          {['All', 'Booking', 'Payment', 'Quote', 'System'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors",
                filter === f 
                  ? "bg-slate-800 text-white" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <Card className="p-0 overflow-hidden border-slate-100 shadow-sm rounded-[16px]">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No notifications found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={cn("p-4 flex gap-4 transition-colors group relative", !notification.read ? "bg-blue-50/30" : "hover:bg-slate-50")}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1", notification.bg, notification.color)}>
                    {(() => {
                      const Icon = iconMap[notification.icon as string] || Bell;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={cn("text-sm font-bold truncate", !notification.read ? "text-slate-900" : "text-slate-700")}>
                        {notification.title}
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap ml-2">
                        {notification.time}
                      </span>
                    </div>
                    <p className={cn("text-xs line-clamp-2", !notification.read ? "text-slate-700 font-medium" : "text-slate-500")}>
                      {notification.desc}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 absolute top-5 right-4"></div>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                    className="absolute bottom-4 right-4 text-xs font-bold text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
