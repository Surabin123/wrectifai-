export type NotificationReference = { type: 'booking' | 'quote' | 'invoice'; id: string };

export function getNotificationReference(notification: { type?: string; description?: string }): NotificationReference | null {
  const match = notification.description?.match(/\[ID:([^\]]+)\]/);
  if (!match) return null;
  if (notification.type === 'Booking') return { type: 'booking', id: match[1] };
  if (notification.type === 'Quote') return { type: 'quote', id: match[1] };
  if (notification.type === 'Invoice') return { type: 'invoice', id: match[1] };
  return null;
}
