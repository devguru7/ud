import type { Category, EventItem, Room } from '../types';

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3).toUpperCase());
// Monday-first weekday headers for Uzbekistan / European academic calendars
export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const JS_WEEKDAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const CATEGORY_LABEL: Record<Category, string> = {
  fintech: 'FinTech & Agrobank',
  tech: 'IT, AI & AgriTech',
  academic: 'Academic & ACCA',
  sports: 'Sports & Cybersport',
  culture: 'Debate & Social',
};

export const CATEGORY_SHORT: Record<Category, string> = {
  fintech: 'FinTech',
  tech: 'Tech',
  academic: 'Academic',
  sports: 'Sports',
  culture: 'Culture',
};

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function isoDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(offset: number, from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + offset);
  return d;
}

export function isoOffset(offset: number): string {
  return isoDate(addDays(offset));
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function parseDateTime(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export function dayLabel(iso: string): string {
  const d = fromISO(iso);
  return `${JS_WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function longDate(iso: string): string {
  const d = fromISO(iso);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function shortDate(iso: string): string {
  const d = fromISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function monthMatrix(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  // Monday = 0 ... Sunday = 6
  const start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month + 1)}-${pad(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function fmtCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const days = Math.floor(clamped / 86400000);
  const hours = Math.floor((clamped % 86400000) / 3600000);
  const mins = Math.floor((clamped % 3600000) / 60000);
  const secs = Math.floor((clamped % 60000) / 1000);
  return `${pad(days)}D : ${pad(hours)}H : ${pad(mins)}M : ${pad(secs)}S`;
}

export function timeRange(start: string, end: string): string {
  return `${start}–${end}`;
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s'-]/gu, '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function firstName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Student';
  if (parts.length === 1) return parts[0];
  const surnamePattern = /(ov|ova|ev|eva|yev|yeva)$/i;
  if (surnamePattern.test(parts[0]) && !surnamePattern.test(parts[1])) {
    return parts[1];
  }
  return parts[0];
}

export function eventSeatsLeft(ev: EventItem): number {
  return Math.max(0, ev.capacity - ev.registeredCount);
}

export function isFull(ev: EventItem): boolean {
  return ev.registeredCount >= ev.capacity;
}

export function capacityState(ev: EventItem): 'open' | 'almost' | 'full' {
  if (isFull(ev)) return 'full';
  const ratio = ev.registeredCount / ev.capacity;
  return ratio >= 0.75 ? 'almost' : 'open';
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

/**
 * Converts a Tashkent local date+time (Asia/Tashkent, UTC+05:00) into an RFC5545 UTC timestamp.
 */
export function icsTimestamp(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const tashkentUtcMs = Date.UTC(y || 2026, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0) - 5 * 3600000;
  const utc = new Date(tashkentUtcMs);
  return `${utc.getUTCFullYear()}${pad(utc.getUTCMonth() + 1)}${pad(utc.getUTCDate())}T${pad(
    utc.getUTCHours(),
  )}${pad(utc.getUTCMinutes())}00Z`;
}

export function buildICS(ev: EventItem, room: Room | undefined): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UDEA Pulse//Campus Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.id}-udeapulse@udea.uz`,
    `DTSTAMP:${icsTimestamp(isoDate(), '09:00')}`,
    `DTSTART:${icsTimestamp(ev.date, ev.startTime)}`,
    `DTEND:${icsTimestamp(ev.date, ev.endTime)}`,
    `SUMMARY:${ev.title.replace(/[,;]/g, ' ')}`,
    `DESCRIPTION:${ev.subtitle.replace(/[,;]/g, ' ')} — ${ev.hostName}. ${room?.name ?? ev.campus}. UDEA Pulse.`,
    `LOCATION:${room ? `${room.address} — ${room.name}` : ev.campus === 'Online' ? 'Telegram Live Stream' : ev.campus}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function buildCSV(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(','),
    )
    .join('\r\n');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function randomHash(prefix = 'UDEA-PASS'): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 2; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${num}-${suffix}`;
}

export function randomTicketId(): string {
  return `tkt_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

export function minutesFromTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function timeFromMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return minutesFromTime(aStart) < minutesFromTime(bEnd) && minutesFromTime(bStart) < minutesFromTime(aEnd);
}

export function relativeTime(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function programmeKey(programme: string): string {
  if (/Finance/i.test(programme)) return 'International Finance';
  if (/Data/i.test(programme)) return 'Business Data Analytics';
  if (/Agro/i.test(programme)) return 'AgriTech';
  if (/Foundation/i.test(programme)) return 'Foundation';
  if (/Management/i.test(programme)) return 'Business Management';
  return 'FinTech MSc';
}

export function downloadEventPosterPNG(ev: EventItem, room?: Room): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const palettes: Record<Category, [string, string, string]> = {
    fintech: ['#059669', '#064e3b', '#022c22'],
    tech: ['#7c3aed', '#3b0764', '#1e1b4b'],
    academic: ['#2563eb', '#1e3a8a', '#0f172a'],
    sports: ['#65a30d', '#365314', '#14532d'],
    culture: ['#ea580c', '#7c2d12', '#431407'],
  };
  const [c1, c2, c3] = palettes[ev.category] ?? palettes.fintech;

  const grad = ctx.createRadialGradient(220, 200, 80, 540, 675, 980);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.55, c2);
  grad.addColorStop(1, c3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1350);

  // Subtle architectural grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1080; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1350);
    ctx.stroke();
  }
  for (let y = 0; y <= 1350; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1080, y);
    ctx.stroke();
  }

  // Watermark
  ctx.save();
  ctx.font = '800 130px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.fillText(CATEGORY_SHORT[ev.category].toUpperCase(), 72, 310);
  ctx.restore();

  // Top Header Pill
  ctx.fillStyle = 'rgba(12, 14, 22, 0.55)';
  ctx.fillRect(72, 72, 936, 76);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  ctx.strokeRect(72, 72, 936, 76);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.fillText(`UDEA PULSE · BOSHLIK CAMPUS · ${ev.language}`, 100, 118);

  // Kicker
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.fillText(
    `${CATEGORY_LABEL[ev.category]} · ${ev.hostName}`.toUpperCase(),
    72,
    470,
  );

  // Wrapped Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 68px "Plus Jakarta Sans", sans-serif';
  const words = ev.title.split(' ');
  let line = '';
  let y = 560;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > 920) {
      ctx.fillText(line, 72, y);
      line = word;
      y += 80;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, 72, y);
    y += 90;
  }

  // Subtitle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.84)';
  ctx.font = '500 30px "Inter", sans-serif';
  const subWords = ev.subtitle.split(' ');
  let subLine = '';
  for (const w of subWords) {
    const test = subLine ? `${subLine} ${w}` : w;
    if (ctx.measureText(test).width > 900) {
      ctx.fillText(subLine, 72, y);
      subLine = w;
      y += 44;
    } else {
      subLine = test;
    }
  }
  if (subLine) ctx.fillText(subLine, 72, y);

  // Bottom Metadata Card
  ctx.fillStyle = 'rgba(9, 11, 17, 0.78)';
  ctx.fillRect(72, 1020, 936, 250);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.strokeRect(72, 1020, 936, 250);

  ctx.fillStyle = '#34d399';
  ctx.font = '700 24px "JetBrains Mono", monospace';
  ctx.fillText(`DATE & TIME: ${longDate(ev.date).toUpperCase()} · ${ev.startTime}–${ev.endTime}`, 108, 1082);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    room ? `${room.name} (${room.code} · ${room.floor})` : ev.campus === 'Online' ? 'Telegram Live Stream' : 'Boshlik Campus, Tashkent',
    108,
    1140,
  );

  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText(
    `RSVP ON TELEGRAM: @udea_pulse_bot?startapp=event_${ev.id} · CAP ${ev.capacity}`,
    108,
    1205,
  );

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ev.id}-boshlik-poster.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

