'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

export function NotificationPoller() {
  const { user } = useAuth();
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      notifiedIds.current.clear();
      return;
    }

    const pollNotifications = async () => {
      try {
        const { apiClient } = await import('@/lib/api-client');
        let url = '/notifications';
        if (user.roles?.includes('garage') && (user as any).garageId) {
          url += `?garageId=${(user as any).garageId}`;
        }
        
        const res = await apiClient<{ data: any[] }>(url);
        if (res?.data) {
          const unread = res.data.filter((n: any) => !n.is_read);
          
          unread.forEach((n: any) => {
            if (!notifiedIds.current.has(n.id)) {
              notifiedIds.current.add(n.id);
              toast(n.title, {
                description: n.message,
                action: {
                  label: 'View',
                  onClick: () => {
                    const basePath = user.roles?.includes('garage') ? '/garage' : user.roles?.includes('admin') ? '/admin' : '';
                    if (basePath) {
                      window.location.href = `${basePath}/notifications`;
                    }
                  }
                },
              });
            }
          });
        }
      } catch (error) {
        console.error('Failed to poll notifications', error);
      }
    };

    // Initial poll
    pollNotifications();

    // Poll every 15 seconds
    const interval = setInterval(pollNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  return null;
}
