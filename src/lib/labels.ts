import type { BoshlikZone, Club, EventStaffRole, PermissionFlag, Persona, Role } from '../types';
import { getPrimaryRoleBadgeForUser } from './logic';

export const LONG_ROLE: Record<Role, string> = {
  student: 'Student · BSc Finance, Year 2',
  club_lead: 'Club President · FinTech Society',
  admin: 'Campus Admin · Student Affairs',
};

export const BOSHLIK_ZONES: { id: BoshlikZone; label: string; short: string }[] = [
  { id: 'all', label: 'All Boshlik Zones', short: 'All Zones' },
  { id: 'halls', label: 'Main Lecture Halls (A1, A2, B1)', short: 'Halls A1/B1' },
  { id: 'labs', label: 'Tech & FinTech Labs (Lab 204, Lab 302)', short: 'Labs 204/302' },
  { id: 'lrc', label: 'Learning Resource Centre (LRC & Coworking)', short: 'LRC Lounge' },
  { id: 'sports', label: 'UDEA Sports Centre', short: 'Sports Centre' },
  { id: 'online', label: 'Online / Telegram Stream', short: 'Online Stream' },
];

export const PERMISSION_META: {
  id: PermissionFlag;
  label: string;
  short: string;
  description: string;
}[] = [
  {
    id: 'create_events',
    label: 'Create & Edit Events',
    short: 'Create Events',
    description: 'Create and edit official or peer events under this club',
  },
  {
    id: 'publish_posts',
    label: 'Publish Campus Posts',
    short: 'Publish Posts',
    description: 'Create, edit and pin announcements, promos and recaps',
  },
  {
    id: 'book_rooms',
    label: 'Book Boshlik Rooms',
    short: 'Book Rooms',
    description: 'Request official Boshlik Campus halls, labs and equipment',
  },
  {
    id: 'manage_registrations',
    label: 'Approve Applicants',
    short: 'Approve RSVPs',
    description: 'Review screening applications and manage waitlist promotions',
  },
  {
    id: 'scan_tickets',
    label: 'Scan QR Tickets',
    short: 'Scan Tickets',
    description: 'Open offline QR scanner and check in guests at the door',
  },
  {
    id: 'send_broadcasts',
    label: 'Send Broadcasts',
    short: 'Broadcasts',
    description: 'Send live Telegram bot updates to registered attendees',
  },
  {
    id: 'manage_roles',
    label: 'Manage Team & Roles',
    short: 'Manage Team',
    description: 'Create custom club roles and assign responsible students',
  },
];

export const STAFF_ROLE_LABEL: Record<EventStaffRole, string> = {
  co_host: 'Co-Organizer',
  coordinator: 'Responsible Coordinator',
  scanner_volunteer: 'Check-in Volunteer',
  speaker: 'Featured Speaker / Mentor',
};

export const STAFF_ROLE_DEFAULT_PERMS: Record<EventStaffRole, PermissionFlag[]> = {
  co_host: ['create_events', 'publish_posts', 'book_rooms', 'manage_registrations', 'scan_tickets', 'send_broadcasts'],
  coordinator: ['create_events', 'publish_posts', 'manage_registrations', 'scan_tickets', 'send_broadcasts'],
  scanner_volunteer: ['scan_tickets'],
  speaker: ['publish_posts'],
};

export function personaRoleLabel(personaOrRole: Persona | Role, clubs?: Club[]): string {
  if (typeof personaOrRole === 'string') {
    return personaOrRole === 'club_lead'
      ? 'Club President'
      : personaOrRole === 'admin'
        ? 'Campus Admin'
        : 'Student';
  }
  if (personaOrRole.role === 'admin') return 'Campus Admin';
  if (personaOrRole.role === 'club_lead') return 'Club President';
  if (clubs) {
    const custom = getPrimaryRoleBadgeForUser(personaOrRole, clubs);
    if (custom) return custom.title;
  }
  return personaOrRole.headlineRole || 'Regular Student';
}

export function personaSubtitle(persona: Persona, clubs?: Club[]): string {
  if (persona.role === 'admin') return 'Campus Coordinator · Student Affairs';
  if (persona.role === 'club_lead') return 'President · UDEA FinTech Society';
  if (clubs) {
    const custom = getPrimaryRoleBadgeForUser(persona, clubs);
    if (custom) return `${custom.title} · ${custom.clubShort}`;
  }
  return persona.headlineRole ?? `${persona.programmeShort ?? 'Student'} · ${persona.year ?? 'Boshlik'}`;
}
