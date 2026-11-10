import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PERMISSIONS,
  canManage,
  findRoomConflicts,
  getCertificateRoleTitle,
  getUserPermissionsForClub,
  getUserPermissionsForEvent,
} from './logic';
import { buildSeedClubs, buildSeedEvents, PERSONAS } from './seed';

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

test('getUserPermissionsForClub resolves Admin, President, Delegated Student, and Regular Student', () => {
  const clubs = buildSeedClubs();
  const fintechClub = clubs.find((c) => c.id === 'club_fintech')!;

  const firdavs = PERSONAS.find((p) => p.id === 'usr_1')!; // Delegated FinTech Case Coordinator
  const malika = PERSONAS.find((p) => p.id === 'usr_2')!;  // Club President
  const timur = PERSONAS.find((p) => p.id === 'usr_3')!;   // Campus Admin
  const jasur = PERSONAS.find((p) => p.id === 'usr_4')!;   // Regular Student

  assert.deepEqual(getUserPermissionsForClub(timur, fintechClub), ALL_PERMISSIONS);
  assert.deepEqual(getUserPermissionsForClub(malika, fintechClub), ALL_PERMISSIONS);

  const firdavsPerms = getUserPermissionsForClub(firdavs, fintechClub);
  assert.equal(firdavsPerms.includes('create_events'), true);
  assert.equal(firdavsPerms.includes('publish_posts'), true);
  assert.equal(firdavsPerms.includes('scan_tickets'), true);
  assert.equal(firdavsPerms.includes('manage_roles'), false);

  const jasurPerms = getUserPermissionsForClub(jasur, fintechClub);
  assert.equal(jasurPerms.length, 0);
});

test('getUserPermissionsForEvent & getCertificateRoleTitle resolve event staff and club roles', () => {
  const clubs = buildSeedClubs();
  const events = buildSeedEvents();
  const hackathon = events.find((e) => e.id === 'evt_1')!;

  const firdavs = PERSONAS.find((p) => p.id === 'usr_1')!;
  const jasur = PERSONAS.find((p) => p.id === 'usr_4')!;

  assert.equal(canManage(hackathon, firdavs, clubs), true);
  assert.equal(canManage(hackathon, jasur, clubs), false);

  const firdavsEventPerms = getUserPermissionsForEvent(firdavs, hackathon, clubs);
  assert.equal(firdavsEventPerms.includes('scan_tickets'), true);

  assert.match(getCertificateRoleTitle(firdavs, hackathon, clubs), /Coordinator/);
  assert.equal(getCertificateRoleTitle(jasur, hackathon, clubs), 'Verified Participant');
});
