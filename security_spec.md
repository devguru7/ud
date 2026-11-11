# UDEA Pulse Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: All unmatched paths are unconditionally denied (`allow read, write: if false;`).
2. **Path Variable Guard (`isValidId`)**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates that the path ID is a string of length 1..128 matching `^[a-zA-Z0-9_\-]+$`.
3. **Verified Authentication**: Every write requires an authenticated user with `request.auth.token.email_verified == true`.
4. **Ownership & Identity Integrity**:
   - Creating an `Event`, `Club`, `Ticket`, or `WorkspaceSnapshot` requires `incoming().ownerUid == request.auth.uid`.
   - Creating a `Post` requires `incoming().authorUid == request.auth.uid`.
   - `ownerUid` / `authorUid` and `createdAt` are immutable across all updates.
5. **Temporal Integrity**: `createdAt == request.time` on creation and `updatedAt == request.time` on both creation and update.
6. **Terminal State Locking**: Once an `Event` reaches `cancelled` or `rejected`, or a `Ticket` reaches `cancelled`, non-admin users cannot mutate it further.
7. **Query Enforcer (No Blanket Lists)**: `list` on `/tickets` and `/workspaces` strictly requires `resource.data.ownerUid == request.auth.uid`. Public campus feeds (`/events`, `/posts`, `/clubs`) enforce `resource.data.id is string`.

## 2. The "Dirty Dozen" Payloads
1. **Unverified Email Spoof**: Admin email `maxsudasattarova0@gmail.com` with `email_verified: false` attempting to approve an event -> `PERMISSION_DENIED`.
2. **Shadow Field Injection on Event Create**: Adding `isVerified: true` to `/events/evt_99` -> `PERMISSION_DENIED` via `hasOnly`.
3. **Owner Spoofing on Ticket Create**: Creating `/tickets/tkt_1` where `ownerUid != request.auth.uid` -> `PERMISSION_DENIED`.
4. **ID Poisoning**: Document ID exceeding 128 chars or containing spaces/slashes -> `PERMISSION_DENIED` via `isValidId`.
5. **Client Timestamp Forgery**: Setting `createdAt` to a past timestamp instead of `request.time` -> `PERMISSION_DENIED`.
6. **Immortal Field Mutation**: Updating `createdAt` or `ownerUid` on `/events/evt_1` -> `PERMISSION_DENIED`.
7. **Value Poisoning on Update**: Updating `title` on `/posts/pst_1` with a 10,000-character string -> `PERMISSION_DENIED` via `isValidPost`.
8. **Terminal State Resurrection**: Non-admin updating a `cancelled` ticket back to `confirmed` -> `PERMISSION_DENIED`.
9. **Unauthorized Ticket Scraping (`list`)**: Listing `/tickets` without filtering `where('ownerUid', '==', uid)` -> `PERMISSION_DENIED`.
10. **Cross-User Workspace Read (`get`)**: Reading `/workspaces/other_uid` as a non-admin -> `PERMISSION_DENIED`.
11. **Action-Update Bypass**: Updating an unlisted field on `/clubs/clb_1` outside `affectedKeys().hasOnly(...)` -> `PERMISSION_DENIED`.
12. **Unauthenticated Write**: Creating a post in `/posts/pst_99` with `request.auth == null` -> `PERMISSION_DENIED`.
