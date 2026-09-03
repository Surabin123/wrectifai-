export interface DaySchedule {
  open: boolean;
  start?: string;
  end?: string;
}

export type BusinessHours = Record<string, DaySchedule>;

export const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const str = timeStr.trim().toUpperCase();
  const isPM = str.includes('PM');
  const isAM = str.includes('AM');
  const cleanStr = str.replace(/AM|PM/g, '').trim();
  const parts = cleanStr.split(':');
  if (parts.length < 2) return null;

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function formatMinutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = h.toString().padStart(2, '0');
  const mm = m.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatMinutesTo12Hr(mins: number): string {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const mm = m.toString().padStart(2, '0');
  return `${h}:${mm} ${ampm}`;
}

export function getDaySchedule(businessHours: BusinessHours | null | undefined, dateStr: string): {
  dayName: string;
  dayDisplay: string;
  isOpen: boolean;
  startStr?: string;
  endStr?: string;
  availableTimeSlots: Array<{ value: string; label: string }>;
} {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  if (!dateStr) {
    return { dayName: '', dayDisplay: '', isOpen: true, availableTimeSlots: [] };
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) {
    return { dayName: '', dayDisplay: '', isOpen: true, availableTimeSlots: [] };
  }

  const dateObj = new Date(year, month - 1, day);
  const dayName = dayNames[dateObj.getDay()];
  const dayDisplay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  if (!businessHours || !businessHours[dayName]) {
    const slots = generateTimeSlots(540, 1140);
    return { dayName, dayDisplay, isOpen: true, startStr: '09:00 AM', endStr: '07:00 PM', availableTimeSlots: slots };
  }

  const schedule = businessHours[dayName];
  if (!schedule.open) {
    return { dayName, dayDisplay, isOpen: false, startStr: schedule.start, endStr: schedule.end, availableTimeSlots: [] };
  }

  const startMins = parseTimeToMinutes(schedule.start) ?? 540;
  const endMins = parseTimeToMinutes(schedule.end) ?? 1140;

  const slots = generateTimeSlots(startMins, endMins);

  return {
    dayName,
    dayDisplay,
    isOpen: true,
    startStr: schedule.start,
    endStr: schedule.end,
    availableTimeSlots: slots
  };
}

function generateTimeSlots(startMins: number, endMins: number) {
  const slots: Array<{ value: string; label: string }> = [];
  for (let m = startMins; m <= endMins; m += 30) {
    slots.push({
      value: formatMinutesToTime(m),
      label: formatMinutesTo12Hr(m)
    });
  }
  return slots;
}
