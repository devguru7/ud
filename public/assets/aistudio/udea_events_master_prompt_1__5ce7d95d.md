# Master Upgrade & Refactoring Prompt for Repository `devguru7/DK` (UDEA Pulse v3.0 — Complete Role Delegation, Campus Posts & Bug-Free UI)

You are a Principal React/TypeScript Architect and Staff UI/UX Product Designer upgrading the existing **UDEA Pulse** codebase (`devguru7/DK`). Your task is to execute a **complete structural, visual, and functional upgrade** across `src/types.ts`, `src/lib/seed.ts`, `src/lib/logic.ts`, `src/lib/store.tsx`, `src/lib/labels.ts`, all components in `src/components/`, and all stylesheets in `src/styles/`.

Every requirement below was verified directly against the current source code of `devguru7/DK`. Nothing may be left half-finished — every layout alignment, z-index layer, permission check, role builder, post editor, and interactive workflow must be **flawless, production-grade, and 100% functional**.

---

## PART 1: SINGLE CAMPUS STANDARDIZATION (BOSHLIK CAMPUS ONLY)

[UDEA](https://udea.uz/) operates on its unified **Boshlik Campus** (`Boshlik Street 3, Yakkasaray District, Tashkent`) plus `Online` sessions.
1. **Remove Multi-Campus Clutter**: Remove any references to other campus buildings. Replace campus filters with a clean **Boshlik Venue / Zone Filter**:
   * `All Boshlik Zones`
   * `Main Lecture Halls (A1, A2, B1)`
   * `Tech & FinTech Labs (Lab 204, Lab 302)`
   * `Learning Resource Centre (LRC & Coworking)`
   * `UDEA Sports Centre`
   * `Online / Telegram Stream`
2. **Accurate Boshlik Room Inventory (`src/lib/seed.ts`)**:
   * `rm_a1`: `Auditorium A1 (Main Hall)` — Floor 1, Capacity `150`, Equipment: `4K Laser Projector, Stage Sound, 4x Wireless Mics`.
   * `rm_b1`: `Debate & Conference Hall B1` — Floor 2, Capacity `60`, Equipment: `Smart Podium, Dual Screens, Conference Mics`.
   * `rm_204`: `Seminar Room 204` — Floor 2, Capacity `40`, Equipment: `HDMI Projector, Glass Whiteboard`.
   * `rm_lab2`: `Computer & FinTech Lab 302` — Floor 3, Capacity `35`, Equipment: `35x High-Spec PCs, Gigabit LAN, Smartboard`.
   * `rm_lrc`: `Learning Resource Centre (LRC Lounge)` — Floor 1, Capacity `30`, Equipment: `Modular Tables, Flipcharts, Acoustic Pods`.
   * `rm_sports`: `UDEA Sports Complex` — Ground, Capacity `80`, Equipment: `Futsal Court, 4x Table Tennis Tables, Digital Scoreboard`.
   * `rm_online`: `Online / Telegram Stream / Zoom` — Capacity `500`, Equipment: `Auto-Join Link`.

---

## PART 2: DYNAMIC ROLE BUILDER, DELEGATION & EVENT TEAM SYSTEM

In `devguru7/DK`, roles are currently hardcoded to `'student' | 'club_lead' | 'admin'` with a single owner per club and event. **Replace this with a multi-tier Role & Team Delegation Engine** inspired by [Luma Co-Hosts & Check-in Staff](https://help.luma.com/p/adding-hosts-and-managers-to-your-event) and [TidyHQ Club Officer Permissions](https://gitnux.org/best/student-organization-management-software/).

### 2.1 Upgraded TypeScript Data Models (`src/types.ts`)

Add and wire up the following exact interfaces:

```ts
export type PermissionFlag =
  | 'create_events'        // Can create & edit events under this club/scope
  | 'publish_posts'        // Can create, edit & pin Campus Posts, News & Recaps
  | 'book_rooms'           // Can request official Boshlik Campus rooms & equipment
  | 'manage_registrations' // Can approve/reject screening applications & promote waitlist
  | 'scan_tickets'         // Can use QR Scanner & check in attendees at the door
  | 'send_broadcasts'      // Can send Telegram notifications to registered attendees
  | 'manage_roles';        // Can create custom roles & assign members inside the club

export interface CustomClubRole {
  id: string;
  clubId: string;
  title: string;              // e.g., "Responsible for Hackathons", "Chess Tournament Lead", "Check-in Coordinator", "SMM & Posts Lead"
  badgeColor: string;         // Semantic hex color (#10B981, #8B5CF6, #2563EB, #F97316, #EC4899)
  allowedCategories?: Category[]; // Optional scope restriction (e.g., only 'sports' or 'fintech' events)
  permissions: PermissionFlag[];
}

export interface ClubMemberAssignment {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  userTelegram: string;
  userProgramme: string;
  roleId: string;             // Links to CustomClubRole.id
  assignedBy: string;
  assignedAt: string;
}

export type EventStaffRole = 'co_host' | 'coordinator' | 'scanner_volunteer' | 'speaker';

export interface EventTeamMember {
  userId: string;
  name: string;
  telegram: string;
  programme: string;
  role: EventStaffRole;
  customLabel: string;        // e.g., "Responsible for Registration", "Stage & Mics Setup", "Tournament Referee"
  permissions: PermissionFlag[];
  showOnEventPage: boolean;
}
```

Update `Club` to include:
* `customRoles: CustomClubRole[]`
* `roster: ClubMemberAssignment[]`

Update `EventItem` to include:
* `coHostClubIds?: string[]` (allows 2 clubs to co-host a joint event)
* `teamMembers: EventTeamMember[]` (people connected to run this specific event)
* `createdByRoleTitle?: string` (displays the exact custom role of the creator, e.g., *"Created by Soliyev Firdavs • FinTech Case Coordinator"*)

### 2.2 Permission Resolution Engine (`src/lib/logic.ts`)

Write centralized permission resolver helpers `getUserPermissionsForClub(user, club)` and `getUserPermissionsForEvent(user, event, clubs)`:
1. **Campus Coordinator / Admin (`role === 'admin'`)**: Has all `PermissionFlag` capabilities across the entire platform, can create new clubs, appoint Club Presidents, pin global announcements, and approve/reject room requests.
2. **Club President (`club.leadId === user.id`)**: Has all `PermissionFlag` capabilities within their club, including `manage_roles` to create custom roles and assign responsible students.
3. **Assigned Club Role Holder**: Any student present in `club.roster` inherits the exact `permissions` array of their `CustomClubRole`! For example, if a student is assigned the custom role *"Responsible for FinTech Workshops"* with `['create_events', 'publish_posts', 'book_rooms', 'scan_tickets']`, the platform automatically unlocks the **Host Studio**, **Post Creator**, and **Organizer Scanner** for them for that club!
4. **Event-Level Connected Team Member**: Any student added to `event.teamMembers` automatically sees that event in their **Organizer Studio** and can perform the exact actions allowed by their `EventTeamMember.permissions` (e.g., a `scanner_volunteer` can open the QR Scanner and check in guests at the door, but cannot delete the event or change the room).

### 2.3 Interactive UI for Role Creation & Team Delegation

#### A. Upgraded `Clubs.tsx` — "Club Command Center & Role Builder"
When viewing a club card or opening a club's management modal:
1. **Public Roster & Leadership View**: Shows the Club President + all appointed officers/coordinators with their custom role badges (e.g., `Malika Karimova • President`, `Soliyev Firdavs • FinTech Case Coordinator`, `Diyora Rustamova • Head of Media & Posts`).
2. **"Manage Roles & Team" Modal/Drawer (Unlocked for Admin, Club President, or anyone with `manage_roles`)**:
   * **Tab 1: Custom Role Architect**:
     * Create a new custom role: Input `Role Title` (e.g., *"Responsible for AI Seminars"*, *"Sports Referee"*, *"SMM & Post Editor"*), pick a `Badge Color`, optionally limit to specific event categories, and toggle the 7 `PermissionFlag` checkboxes (`Create Events`, `Publish Posts`, `Book Boshlik Rooms`, `Approve Applicants`, `Scan QR Tickets`, `Send Broadcasts`, `Manage Team`).
     * Lists existing custom roles with instant edit/delete.
   * **Tab 2: Assign & Connect Students**:
     * Select any student from the UDEA student directory (or add a student by Name + `@telegram_handle` + Programme), pick one of the club's custom roles, and click **`Assign Role & Notify via Telegram`**.
     * **Live Persona Verification**: Pre-assign `Soliyev Firdavs (usr_1)` as `"FinTech Case Coordinator"` in `UDEA FinTech Society`, and add a 4th persona in the Topbar switcher (`"Jasur Rakhimov • Regular Student"`) so switching personas immediately demonstrates the difference between a regular student, a student with a delegated custom role, a Club President, and a Campus Admin.

#### B. Upgraded `HostStudio.tsx` — "Edit Existing Events + Connect Event Team"
1. **Support Both Creating AND Editing Events**: Currently `HostStudio.tsx` only creates new events. Add an **`Edit Event`** mode so any authorized coordinator/president can click `"Edit Event & Team"` on an existing event card or drawer, load its data into `HostStudio`, modify the description, time, room, cover, or team members, and save changes!
2. **Connect Team Members to This Event**:
   * Search/pick students from the directory to attach them directly to the event.
   * Assign their event responsibility (`Co-Organizer`, `Responsible Coordinator`, `Check-in Volunteer`, `Featured Speaker / Mentor`) + custom responsibility label (e.g., *"Responsible for Stage & Microphones"*, *"Responsible for Team Registration"*).
   * Quick-add button right inside `Organizer.tsx` as well (`+ Add Door Volunteer / Co-Host`).

---

## PART 3: CAMPUS POSTS, TELEGRAM POST STUDIO & EVENT RECAPS (NEW CORE MODULE)

Right now `devguru7/DK` only has one-line plain-text `Broadcast` strings buried inside `Organizer.tsx`. Build a complete, rich **Campus Posts, Announcements & Event Recaps System** so presidents, coordinators, and assigned SMM/Media role holders can publish, edit, and preview rich posts linked to events or clubs!

### 3.1 New Data Models in `src/types.ts`

```ts
export type PostType =
  | 'announcement'   // Official club or university news / call for volunteers / recruitment
  | 'event_promo'    // Rich promotional post spotlighting an upcoming Event with 1-Click RSVP card
  | 'event_recap'    // Post-event photo & summary report with winners, stats, and highlights
  | 'discussion';    // Campus poll or open student question (e.g., "Which workshop topic next Friday?")

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  votedByMe?: boolean;
}

export interface CampusPost {
  id: string;
  type: PostType;
  title: string;
  body: string;                // Supports clean formatted paragraphs & bullet highlights
  authorId: string;
  authorName: string;
  authorRoleTitle: string;     // e.g., "FinTech Case Coordinator" or "Campus Admin"
  clubId?: string;
  linkedEventId?: string;      // Embedded interactive mini-event card inside the post!
  coverStyle?: string;         // Generative gradient poster or custom media banner
  badgeText?: string;          // e.g., "🔥 WINNERS ANNOUNCED", "📢 CALL FOR VOLUNTEERS", "⚡ LAST 5 SEATS"
  pinned?: boolean;
  createdAt: string;
  updatedAt?: string;
  reactions: {
    fire: number;
    heart: number;
    rocket: number;
    myReactions: ('fire' | 'heart' | 'rocket')[];
  };
  pollOptions?: PollOption[];
  recapStats?: {
    attendedCount: number;
    photosCount: number;
    winnerTeam?: string;
    highlights: string[];
  };
  comments: {
    id: string;
    authorName: string;
    authorProgramme: string;
    text: string;
    createdAt: string;
  }[];
  telegramSynced?: boolean;
}
```

### 3.2 Where Posts Live & How Users Interact With Them

1. **In `Explore.tsx` ("Campus Pulse Feed & Pinned Announcements")**:
   * Add a prominent view mode switcher right above the feed:
     * **`📅 Events Calendar & Grid`** (All upcoming events with Bento spotlight & filters)
     * **`📰 Campus Feed & Posts (Live)`** (Rich stream of Club Announcements, Event Promos with embedded 1-Click RSVP cards, Post-Event Recaps with winner highlights, and Interactive Campus Polls)
     * **`⚡ Combined Pulse`** (Shows Pinned Announcements at top + Events Grid below)
2. **Rich Post Card Component (`PostCard` in `src/components/Posts.tsx`)**:
   * **Header**: Club logo + Author Name + Custom Role Badge (`"Diyora Rustamova • Head of Media & Posts"`) + Timestamp + `📌 Pinned` badge + **`Edit Post` / `Pin` / `Delete`** action menu (visible to the author, club president, or anyone with `publish_posts` permission).
   * **Visual Banner / Generative Poster**: Optional gradient banner or recap highlight card.
   * **Content Body**: Crisp typography, formatted highlights, and tags.
   * **Embedded Interactive Event Card (if `linkedEventId` is set)**: Renders a sleek embedded event widget right inside the post showing the linked event's date, Boshlik room, live seat counter (`58/60 Seats`), and a working **`1-Click RSVP`** button!
   * **Interactive Poll (if `pollOptions` is present)**: Students can click an option to vote live and see animated percentage bars.
   * **Event Recap Showcase (if `type === 'event_recap'`)**: Displays verified turnout metrics (`42 Students Checked In`), winner badges (`🏆 1st Place: Team FinAI`), and key takeaways.
   * **Interactive Footer**:
     * Live emoji reaction pills (`🔥 28`, `❤️ 19`, `🚀 14`) that toggle and increment on click.
     * Expandable **Comments & Discussion thread** where students can write a comment and post it immediately.
     * **`📲 Preview & Copy Telegram Post`** button.

3. **Full Post Creator, Editor & Telegram Preview Studio (`PostModal` in `src/components/Posts.tsx`)**:
   * Accessible via a **`+ Create Post / Announcement`** button in the Topbar/Explore view, inside `HostStudio`, and inside `Organizer.tsx` (`"Create Promo Post or Recap for this Event"`).
   * **Features of the Post Studio**:
     * **Create OR Edit**: Supports creating a new post or editing any existing post in place!
     * **Post Type Selector**: `📢 Announcement / Call for Team`, `🎟️ Event Promo (with Embedded RSVP)`, `🏆 Post-Event Recap & Winners`, or `📊 Interactive Student Poll`.
     * **Link to Any Event**: Dropdown to attach an upcoming or past UDEA event so the post automatically embeds the live RSVP button or attendance stats.
     * **Smart Template Generator ("✨ Auto-Write Draft")**: A 1-click helper button that automatically generates a punchy, well-structured post text based on the selected event (e.g., *"🚨 Only a few seats left for Agrobank x UDEA FinTech Hackathon in Auditorium A1! Join now or find teammates..."*) so organizers don't have to write from scratch.
     * **Live Telegram Channel Preview Bubble**: Side-by-side (or tabbed on mobile) preview showing the exact formatted Telegram post for `@udeauz` with bold headers, bullet points, room code, deep-link URL, and inline Telegram buttons (`[🎟️ Register in 1 Click]`, `[💬 Open in UDEA Pulse]`), plus a **`Copy Formatted Telegram Post`** button and a **`Publish to Campus Feed & Sync to Telegram`** button.

---

## PART 4: FIXING ALL 9 IDENTIFIED CODE, LOGIC & CSS FLAWS IN `devguru7/DK`

Every single bug found in the audit of `devguru7/DK` must be fixed cleanly:

1. **Fix Dead Telegram Back Button (`src/components/Topbar.tsx`, line 236)**:
   * Replace `onClick={() => undefined}` on the Telegram header back button with working navigation state: if `selectedEventId`, `activePostModal`, or `certTicketId` is open, close it; otherwise, if on a secondary tab (`clubs`, `passes`, `studio`, `organizer`), navigate back to `explore`. Hide or dim the back button when already on `explore` with no modal open.
2. **Fix Persona Selector & Header Text Overflow (`src/components/Topbar.tsx`, `src/styles/shell.css`)**:
   * Add `min-width: 0; max-width: 175px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` to `.persona-info` and its child title/subtitle spans so long names or custom role badges never push header buttons off-screen on 320px–375px screens.
3. **Fix iOS Safe Area Bottom Navigation Overlap (`src/styles/shell.css`)**:
   * Update `.mobile-nav` with `padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));` and ensure `.app-main` has sufficient `padding-bottom: 96px;` so bottom cards and buttons are never covered by the fixed navigation bar.
4. **Fix Z-Index Collisions & Background Scroll Bleed (`src/styles/base.css`, `src/styles/drawer.css`, `src/components/EventDrawer.tsx`, `src/components/UI.tsx`)**:
   * Define strict z-index tokens in `src/styles/base.css`:
     * `--z-topbar: 100;`
     * `--z-bottom-nav: 200;`
     * `--z-drawer-backdrop: 1100;`
     * `--z-drawer-panel: 1110;`
     * `--z-modal-backdrop: 1200;`
     * `--z-modal-panel: 1210;`
     * `--z-toast: 1300;`
   * Lock `document.body.style.overflow = 'hidden'` whenever a drawer or modal is open, and restore it on cleanup so background lists never scroll underneath an active sheet.
5. **Fix Room Conflict Bypass on Pending Events (`src/lib/logic.ts`)**:
   * In `findRoomConflicts()`, check against **both** `e.approvalStatus === 'approved'` **AND** `e.approvalStatus === 'pending'` (ignoring only `'rejected'` or `'cancelled'`, and excluding the current event's own `id` when editing an existing event!). Visually differentiate between a **Confirmed Booking Conflict** and a **Pending Request Hold**, preventing double-booking of Boshlik Campus rooms.
6. **Fix Role-Aware Notification Badges (`src/App.tsx`, `src/components/Topbar.tsx`)**:
   * Only show the `pendingApprovals` badge count on the Organizer/Admin tab when the active persona is `admin`, and show a badge for managed/assigned events when a student holds a delegated club role or event staff assignment.
7. **Fix Time Span & Form Validation in `HostStudio.tsx`**:
   * Strictly validate that `endTime > startTime` (at least 30 minutes duration), `capacity >= 2`, and `title.trim().length >= 4`. Show clear inline validation messages and prevent invalid submissions.
8. **Fix QR Ticket Stub Overflow on Mobile (`src/components/Passes.tsx`, `src/styles/passes.css`)**:
   * Style `.pass-card` with `display: grid; grid-template-columns: minmax(0, 1fr) auto;` and enforce `min-width: 0; overflow-wrap: anywhere;` on `.pass-stub` and title elements so long event titles never cross the dashed perforation line or collide with the QR code on narrow viewports.
9. **Fix Printable Certificate Clipping & Dynamic Role Printing (`src/components/Certificate.tsx`)**:
   * Keep all decorative corner seals and borders strictly inside the certificate container (`inset: 12px`, `overflow: hidden`, `box-sizing: border-box`) with clean `@media print` styling. Print the student's exact role on the event (`"Official Event Coordinator"`, `"Co-Host & Organizer"`, `"Featured Speaker"`, or `"Verified Participant"`).

---

## PART 5: PRE-SEEDED POSTS, ROLES & DEMO DATA (`src/lib/seed.ts`)

Pre-populate `src/lib/seed.ts` with rich, immediately testable data for Boshlik Campus:
* **4 Switchable Personas in Topbar**:
  1. `Soliyev Firdavs` (`student`, pre-assigned custom role **`"FinTech Case Coordinator"`** in `UDEA FinTech Society` with permissions to create events, publish posts, and scan tickets).
  2. `Malika Karimova` (`club_lead`, President of `UDEA FinTech Society` with full role-builder access).
  3. `Timur Alimov` (`admin`, Campus Coordinator & Student Affairs Admin with room approval & global post pinning).
  4. `Jasur Rakhimov` (`student`, regular student with no admin roles — to test pure attendee view, team-finding, voting in polls, and 1-click RSVP).
* **4 Pre-Loaded Campus Posts in `seed.ts`**:
  1. **Pinned Event Promo Post**: *"🚨 Last 2 Spots for Agrobank x UDEA FinTech & AI Challenge in Auditorium A1!"* (Linked to `evt_1` with embedded 1-Click RSVP card and Telegram preview).
  2. **Recruitment / Role Call Announcement**: *"📢 Coventry Debate & Diplomacy Club is recruiting 3 Tournament Coordinators & Media Leads for November!"* (Allows testing comments and reactions).
  3. **Post-Event Recap Post**: *"🏆 Recap: Agrobank Scholarship Induction & FinTech Forum — 94% Turnout & Best Pitch Winners!"* (Shows verified turnout stats, winner highlights, and certificate reminder).
  4. **Interactive Student Poll Post**: *"📊 What topic should UDEA IT & Data Club host next Thursday in Lab 302?"* with 4 clickable voting options (`Python for FinTech & Algo Trading`, `SQL & PowerBI Crash Prep`, `Building Telegram Mini Apps with React`, `AI Agents & Prompt Engineering`).