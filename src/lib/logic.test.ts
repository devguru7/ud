import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PERMISSIONS,
  availableRooms,
  canManage,
  findRoomConflicts,
  getAllRoleBadgesForUser,
  getCertificateRoleTitle,
  getUserCanCreateOfficialEvents,
  getUserPermissionsForClub,
  getUserPermissionsForEvent,
} from './logic';
import { buildSeedClubs, buildSeedEvents, PERSONAS, ROOMS } from './seed';
import { firstName, icsTimestamp, monthMatrix, overlaps, WEEKDAYS } from './utils';

test('findRoomConflicts detects both approved and pending_room_approval events', () => {
  const events = buildSeedEvents();
  const pendingEvent = events.find((e) => e.id === 'evt_pending')!;
  assert.ok(pendingEvent, 'pending event exists');

  const conflictsWithPending = findRoomConflicts(
    events,
    pendingEvent.roomId,
    pendingEvent.date,
    '14:00',
    '15:00',
  );
  assert.equal(conflictsWithPending.length, 1);
  assert.equal(conflictsWithPending[0].id, 'evt_pending');

  // Excluding own event ID when editing returns zero conflicts
  const selfExcluded = findRoomConflicts(
    events,
    pendingEvent.roomId,
    pendingEvent.date,
    '14:00',
    '15:00',
    'evt_pending',
  );
  assert.equal(selfExcluded.length, 0);
});

test('getUserPermissionsForClub resolves Admin, President, Delegated Student, Regular Student, and allowedCategories', () => {
  const clubs = buildSeedClubs();
  const fintechClub = clubs.find((c) => c.id === 'club_fintech')!;

  const firdavs = PERSONAS.find((p) => p.id === 'usr_1')!; // Delegated FinTech Case Coordinator (allowedCategories: ['fintech', 'tech'])
  const malika = PERSONAS.find((p) => p.id === 'usr_2')!;  // Club President
  const timur = PERSONAS.find((p) => p.id === 'usr_3')!;   // Campus Admin
  const jasur = PERSONAS.find((p) => p.id === 'usr_4')!;   // Regular Student

  assert.deepEqual(getUserPermissionsForClub(timur, fintechClub), ALL_PERMISSIONS);
  assert.deepEqual(getUserPermissionsForClub(malika, fintechClub), ALL_PERMISSIONS);

  const firdavsPerms = getUserPermissionsForClub(firdavs, fintechClub, 'fintech');
  assert.equal(firdavsPerms.includes('create_events'), true);
  assert.equal(firdavsPerms.includes('publish_posts'), true);
  assert.equal(firdavsPerms.includes('scan_tickets'), true);
  assert.equal(firdavsPerms.includes('manage_roles'), false);

  // Category restriction: Firdavs's role in club_fintech only allows 'fintech' and 'tech'
  assert.equal(getUserCanCreateOfficialEvents(firdavs, clubs, 'club_fintech', 'fintech'), true);
  assert.equal(getUserCanCreateOfficialEvents(firdavs, clubs, 'club_fintech', 'sports'), false);

  const jasurPerms = getUserPermissionsForClub(jasur, fintechClub);
  assert.equal(jasurPerms.length, 0);
});

test('getUserPermissionsForEvent, getAllRoleBadgesForUser & getCertificateRoleTitle resolve event staff and club roles', () => {
  const clubs = buildSeedClubs();
  const events = buildSeedEvents();
  const hackathon = events.find((e) => e.id === 'evt_1')!;

  const firdavs = PERSONAS.find((p) => p.id === 'usr_1')!;
  const jasur = PERSONAS.find((p) => p.id === 'usr_4')!;

  assert.equal(canManage(hackathon, firdavs, clubs), true);
  assert.equal(canManage(hackathon, jasur, clubs), false);

  const firdavsBadges = getAllRoleBadgesForUser(firdavs, clubs);
  assert.equal(firdavsBadges.length, 2); // FinTech Society + Agrobank Hub

  const firdavsEventPerms = getUserPermissionsForEvent(firdavs, hackathon, clubs);
  assert.equal(firdavsEventPerms.includes('scan_tickets'), true);

  assert.match(getCertificateRoleTitle(firdavs, hackathon, clubs), /Coordinator/);
  assert.equal(getCertificateRoleTitle(jasur, hackathon, clubs), 'Verified Participant');
});

test('firstName, overlaps, Monday-first monthMatrix, availableRooms, and Tashkent UTC+5 icsTimestamp', () => {
  assert.equal(firstName('Soliyev Firdavs'), 'Firdavs');
  assert.equal(firstName('Malika Karimova'), 'Malika');
  assert.equal(firstName('Jasur Rakhimov'), 'Jasur');
  assert.equal(firstName('Diyora Rustamova'), 'Diyora');

  // Numeric overlaps works even with non-padded hours
  assert.equal(overlaps('9:00', '11:00', '10:00', '12:00'), true);
  assert.equal(overlaps('09:00', '10:00', '10:00', '11:00'), false);

  // Monday-first calendar
  assert.equal(WEEKDAYS[0], 'MON');
  assert.equal(WEEKDAYS[6], 'SUN');
  const matrix = monthMatrix(2026, 10); // Nov 2026 starts on Sunday -> 6 leading nulls
  assert.equal(matrix.slice(0, 6).every((c) => c === null), true);
  assert.equal(matrix[6], '2026-11-01');

  // availableRooms respects minCapacity >= 100 (only Auditorium A1 has 150 capacity)
  const roomsFor100 = availableRooms([], ROOMS, 'Boshlik', '2026-12-01', '10:00', '12:00', 100);
  assert.equal(roomsFor100.every((r) => r.capacity >= 100), true);

  // Tashkent UTC+5: 10:00 Tashkent is 05:00 UTC
  assert.equal(icsTimestamp('2026-11-15', '10:00'), '20261115T050000Z');
});
