import type {
  Club,
  EventItem,
  PermissionFlag,
  Persona,
  Room,
} from '../types';
import { isFull, minutesFromTime, overlaps, timeFromMinutes } from './utils';

export const ALL_PERMISSIONS: PermissionFlag[] = [
  'create_events',
  'publish_posts',
  'book_rooms',
  'manage_registrations',
  'scan_tickets',
  'send_broadcasts',
  'manage_roles',
];

/**
 * Fix #5: Check against BOTH 'approved' AND 'pending_room_approval' / 'pending'
 * (ignoring only 'rejected' or 'cancelled', and excluding excludeEventId when editing).
 */
export function findRoomConflicts(
  events: EventItem[],
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string,
): EventItem[] {
  if (roomId === 'rm_online') return [];
  return events.filter(
    (e) =>
      e.id !== excludeEventId &&
      e.roomId === roomId &&
      e.date === date &&
      (e.approvalStatus === 'approved' ||
        e.approvalStatus === 'pending_room_approval' ||
        e.approvalStatus === 'pending') &&
      overlaps(startTime, endTime, e.startTime, e.endTime),
  );
}

export function nextFreeSlot(
  events: EventItem[],
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string,
): string | null {
  const duration = Math.max(30, minutesFromTime(endTime) - minutesFromTime(startTime));
  const dayStart = minutesFromTime('08:00');
  const dayEnd = minutesFromTime('21:30');
  for (let start = minutesFromTime(startTime) + 30; start + duration <= dayEnd; start += 30) {
    const candidateStart = timeFromMinutes(start);
    const candidateEnd = timeFromMinutes(start + duration);
    if (findRoomConflicts(events, roomId, date, candidateStart, candidateEnd, excludeEventId).length === 0) {
      return candidateStart;
    }
  }
  for (let start = dayStart; start + duration <= minutesFromTime(startTime); start += 30) {
    const candidateStart = timeFromMinutes(start);
    const candidateEnd = timeFromMinutes(start + duration);
    if (findRoomConflicts(events, roomId, date, candidateStart, candidateEnd, excludeEventId).length === 0) {
      return candidateStart;
    }
  }
  return null;
}

export function availableRooms(
  events: EventItem[],
  rooms: Room[],
  campus: string,
  date: string,
  startTime: string,
  endTime: string,
  minCapacity: number,
  excludeEventId?: string,
): Room[] {
  return rooms.filter(
    (r) =>
      r.campus === campus &&
      r.kind !== 'online' &&
      r.capacity >= Math.min(minCapacity, 30) &&
      findRoomConflicts(events, r.id, date, startTime, endTime, excludeEventId).length === 0,
  );
}

/**
 * Centralized Permission Resolution Engine for Clubs (Part 2.2)
 */
export function getUserPermissionsForClub(user: Persona, club: Club): PermissionFlag[] {
  if (!user || !club) return [];
  if (user.role === 'admin') return [...ALL_PERMISSIONS];
  if (club.leadId === user.id || (user.role === 'club_lead' && user.clubId === club.id)) {
    return [...ALL_PERMISSIONS];
  }
  const perms = new Set<PermissionFlag>();
  const assignments = (club.roster ?? []).filter((m) => m.userId === user.id);
  for (const assignment of assignments) {
    const role = (club.customRoles ?? []).find((r) => r.id === assignment.roleId);
    if (role) {
      role.permissions.forEach((p) => perms.add(p));
    }
  }
  return Array.from(perms);
}

export function getUserRoleInClub(
  user: Persona,
  club: Club,
): { title: string; badgeColor: string; clubShort: string; permissions: PermissionFlag[] } | null {
  if (user.role === 'admin') {
    return {
      title: 'Campus Admin',
      badgeColor: '#10B981',
      clubShort: club.short,
      permissions: [...ALL_PERMISSIONS],
    };
  }
  if (club.leadId === user.id || (user.role === 'club_lead' && user.clubId === club.id)) {
    return {
      title: 'Club President',
      badgeColor: club.color || '#8B5CF6',
      clubShort: club.short,
      permissions: [...ALL_PERMISSIONS],
    };
  }
  const assignment = (club.roster ?? []).find((m) => m.userId === user.id);
  if (!assignment) return null;
  const role = (club.customRoles ?? []).find((r) => r.id === assignment.roleId);
  if (!role) return null;
  return {
    title: role.title,
    badgeColor: role.badgeColor || club.color || '#2563EB',
    clubShort: club.short,
    permissions: role.permissions,
  };
}

export function getPrimaryRoleBadgeForUser(
  user: Persona,
  clubs: Club[],
): { title: string; badgeColor: string; clubId: string; clubShort: string; permissions: PermissionFlag[] } | null {
  for (const club of clubs) {
    if (club.leadId === user.id || (user.role === 'club_lead' && user.clubId === club.id)) {
      return {
        title: 'Club President',
        badgeColor: club.color,
        clubId: club.id,
        clubShort: club.short,
        permissions: [...ALL_PERMISSIONS],
      };
    }
  }
  for (const club of clubs) {
    const assignment = (club.roster ?? []).find((m) => m.userId === user.id);
    if (assignment) {
      const role = (club.customRoles ?? []).find((r) => r.id === assignment.roleId);
      if (role) {
        return {
          title: role.title,
          badgeColor: role.badgeColor,
          clubId: club.id,
          clubShort: club.short,
          permissions: role.permissions,
        };
      }
    }
  }
  return null;
}

/**
 * Centralized Permission Resolution Engine for Events (Part 2.2)
 */
export function getUserPermissionsForEvent(
  user: Persona,
  event: EventItem,
  clubs: Club[] = [],
): PermissionFlag[] {
  if (!user || !event) return [];
  if (user.role === 'admin') return [...ALL_PERMISSIONS];
  if (event.createdBy === user.id) {
    return [
      'create_events',
      'publish_posts',
      'book_rooms',
      'manage_registrations',
      'scan_tickets',
      'send_broadcasts',
    ];
  }

  const perms = new Set<PermissionFlag>();

  // Check host club + co-host clubs
  const clubIds = [event.hostClubId, ...(event.coHostClubIds ?? [])].filter(Boolean) as string[];
  for (const cid of clubIds) {
    const club = clubs.find((c) => c.id === cid);
    if (club) {
      const clubPerms = getUserPermissionsForClub(user, club);
      clubPerms.forEach((p) => perms.add(p));
    }
  }

  // Check event-level connected team members
  const member = (event.teamMembers ?? []).find((tm) => tm.userId === user.id);
  if (member) {
    member.permissions.forEach((p) => perms.add(p));
  }

  return Array.from(perms);
}

export function hasEventPermission(
  user: Persona,
  event: EventItem,
  clubs: Club[],
  flag: PermissionFlag,
): boolean {
  return getUserPermissionsForEvent(user, event, clubs).includes(flag);
}

export function canManage(event: EventItem, persona: Persona, clubs: Club[] = []): boolean {
  if (persona.role === 'admin') return true;
  if (event.createdBy === persona.id) return true;
  if (persona.clubId && event.hostClubId === persona.clubId) return true;
  return getUserPermissionsForEvent(persona, event, clubs).length > 0;
}

export function getUserCanPublishPosts(user: Persona, clubs: Club[]): boolean {
  if (user.role === 'admin' || user.role === 'club_lead') return true;
  return clubs.some((c) => getUserPermissionsForClub(user, c).includes('publish_posts'));
}

export function getUserCanCreateOfficialEvents(
  user: Persona,
  clubs: Club[],
  clubId?: string | null,
  _category?: string,
): boolean {
  if (user.role === 'admin' || user.role === 'club_lead') return true;
  if (clubId) {
    const target = clubs.find((c) => c.id === clubId);
    if (target && getUserPermissionsForClub(user, target).includes('create_events')) {
      return true;
    }
  }
  return clubs.some((c) => getUserPermissionsForClub(user, c).includes('create_events'));
}

export function getUserRoleTitleForClub(
  user: Persona,
  clubId: string | null,
  clubs: Club[],
): string | null {
  if (clubId) {
    const club = clubs.find((c) => c.id === clubId);
    if (club) {
      const info = getUserRoleInClub(user, club);
      if (info) return info.title;
    }
  }
  const primary = getPrimaryRoleBadgeForUser(user, clubs);
  return primary ? primary.title : null;
}

export function getCertificateRoleTitle(
  user: Persona,
  event: EventItem,
  clubs: Club[] = [],
): string {
  const staff = (event.teamMembers ?? []).find((tm) => tm.userId === user.id);
  if (staff) {
    if (staff.role === 'co_host') return `Co-Host & Organizer (${staff.customLabel || 'Event Lead'})`;
    if (staff.role === 'coordinator') return `Official Event Coordinator (${staff.customLabel || 'Coordinator'})`;
    if (staff.role === 'speaker') return `Featured Speaker (${staff.customLabel || 'Keynote / Mentor'})`;
    if (staff.role === 'scanner_volunteer') return `Official Event Team (${staff.customLabel || 'Door Check-in'})`;
  }
  if (event.createdBy === user.id) {
    return event.createdByRoleTitle
      ? `Official Event Creator • ${event.createdByRoleTitle}`
      : 'Official Event Coordinator';
  }
  if (event.hostClubId) {
    const club = clubs.find((c) => c.id === event.hostClubId);
    if (club) {
      const clubRole = getUserRoleInClub(user, club);
      if (clubRole) {
        return `${clubRole.title} • ${club.short}`;
      }
    }
  }
  return 'Verified Participant';
}

export function capacityTone(event: EventItem): 'open' | 'almost' | 'full' {
  if (isFull(event)) return 'full';
  return event.registeredCount / event.capacity >= 0.75 ? 'almost' : 'open';
}

export function screenStatusLabel(status?: string): string {
  if (status === 'pending') return 'Screening pending';
  if (status === 'approved') return 'Screening approved';
  if (status === 'rejected') return 'Screening rejected';
  return 'No screening';
}
