import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesText = fs.readFileSync('firestore.rules', 'utf8');

test('Dirty Dozen security assertions are enforced in firestore.rules', () => {
  // 1. Default deny catch-all
  assert.equal(rulesText.includes('allow read, write: if false;'), true);
  // 2. Email verification guard on admin and writes
  assert.equal(rulesText.includes('request.auth.token.email_verified == true'), true);
  // 3. Bootstrapped admin email check
  assert.equal(rulesText.includes("request.auth.token.email == 'maxsudasattarova0@gmail.com'"), true);
  // 4. Path variable ID poisoning guard
  assert.equal(rulesText.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"), true);
  // 5. Strict key allowlists via hasAll and hasOnly
  assert.equal(rulesText.includes('data.keys().hasAll('), true);
  assert.equal(rulesText.includes('data.keys().hasOnly('), true);
  // 6. Action-based update diff checks
  assert.equal(rulesText.includes('incoming().diff(existing()).affectedKeys().hasOnly('), true);
  // 7. Server timestamp enforcement
  assert.equal(rulesText.includes('incoming().createdAt == request.time'), true);
  assert.equal(rulesText.includes('incoming().updatedAt == request.time'), true);
  // 8. Query enforcer on tickets and workspaces
  assert.equal(rulesText.includes('allow list: if isVerifiedUser() && existing().ownerUid == request.auth.uid;'), true);
});
