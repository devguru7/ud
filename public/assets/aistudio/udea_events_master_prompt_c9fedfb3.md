# Master Architecture, Design System (`DESIGN.md`) & Full-Stack Implementation Prompt: UDEA Pulse

You are an Elite Staff Product Designer, Principal Frontend Engineer, and Systems Architect. Your objective is to build **UDEA Pulse** — the flagship campus event discovery, calendar, room booking, QR ticketing, and student community platform for the [University of Digital Economics and Agrotechnologies (UDEA)](https://udea.uz/) in Tashkent, Uzbekistan.

You must deliver a **100% functional, interactive, state-driven, production-grade web application** that runs seamlessly both as a widescreen Desktop Web Portal and as a mobile-first [Telegram Mini App](https://dev.to/devflex-pro/introducing-tma-starter-kit-your-fast-track-to-building-telegram-mini-apps-9ge).

**STRICT EXECUTION DIRECTIVE**:
* Zero placeholders, zero `"Coming Soon"` modals, zero dead links, and zero static non-clickable buttons.
* Every single user flow — filtering by date/campus/language, 1-click RSVP, external link tracking, automatic waitlist promotion, team formation, live Q&A upvoting, room conflict detection, offline-cached QR check-in scanning, Telegram announcement previewing, and PDF/printable certificate generation — must work interactively in real time with full state persistence (`localStorage` + instant `"Reset Demo State"` control).

---

## 1. Domain Context & Institutional DNA

[UDEA](https://udea.uz/) is a modern university in Tashkent offering British higher education in partnership with [Coventry University (UK)](https://www.coventry.ac.uk/news/2023/coventry-university-and-udea-join-forces-to-offer-a-range-of-courses-in-uzbekistan/), supported by strategic scholarship and industry partners like [JSCB Agrobank](https://udea.uz/admissions/scholarship-programme/agrobank) and [ACCA](https://udea.uz/news).
* **Physical Campuses**:
  1. **Mukimi Campus** (`43 Mukimi Street, Tashkent` — 9,000 m² modern hub, Atrium, Tech Labs, Coworking Lounge, Auditorium A1/A2).
  2. **Boshlik Campus** (`Boshlik Street 3, Yakkasaray District, Tashkent` — Learning Resource Centre, Lecture Halls 101–305, Debate Hall B1, UDEA Sports Centre).
* **Academic Programmes**:
  * `Foundation Year (English & Academic Prep)`
  * `BSc (Hons) International Finance and Banking`
  * `BSc (Hons) Business Data Analytics`
  * `BA (Hons) Business Management and Leadership`
  * `BSc Digital Economics & Agrotechnologies`
  * `MSc / MBA Project Management & FinTech`
* **Campus Languages**: Events are hosted in **English (`EN`)**, **Uzbek (`UZ`)**, and **Russian (`RU`)**. Both the UI and event filters must support instant language switching and filtering.

---

## 2. Visual Language & Exhaustive `DESIGN.md` Specification

This design system synthesizes four premier visual directions from [GradientDeck UI](https://ui.gradientdeck.com/) and its [Palettes Library](https://ui.gradientdeck.com/palettes):
1. **Joi & Heptabase** (`Planner Black`, `Warm Paper`, `Research Blue`): Crisp editorial grid structure, zero eye-strain daytime surfaces, and tactile calendar cells.
2. **Railway & OpenCode** (`Void Black`, `Deploy Violet`, `Signal Green`, `Carbon Ink`): High-contrast dark mode with `1px` translucent borders, radial ambient glows, and developer-grade precision.
3. **Family & Cuberto** (`Signal Orange`, `Mint Wash`, `Periwinkle Wash`): Playful spring physics, squircle border radii (`24px`), overlapping avatar stacks, and tactile button press states.
4. **Rauno Freiberg & The Pudding** (`Signal Yellow`, `Pudding Charcoal`): High-density monospace micro-badges for timestamps, room codes, seat counters, and cryptographic ticket hashes.

### 2.1 Exact CSS Custom Properties & Color Tokens

Implement an instant, zero-flicker **Light / Dark Theme Engine** using CSS variables on `:root` and `[data-theme="dark"]`:

```css
:root {
  /* Light Theme: "Editorial Paper & Blueprint Cobalt" */
  --bg-canvas: #F6F5F2;
  --bg-surface: #FFFFFF;
  --bg-elevated: #EEECE6;
  --bg-subtle: #FAF9F6;
  --bg-glass: rgba(255, 255, 255, 0.82);
  --bg-glass-heavy: rgba(255, 255, 255, 0.94);

  --text-primary: #111315;
  --text-secondary: #525860;
  --text-tertiary: #878E96;
  --text-inverted: #FFFFFF;

  --border-hairline: rgba(17, 19, 21, 0.08);
  --border-strong: rgba(17, 19, 21, 0.16);
  --border-glass: rgba(255, 255, 255, 0.65);

  --shadow-card: 0 2px 6px -1px rgba(17, 19, 21, 0.04), 0 12px 28px -6px rgba(17, 19, 21, 0.06);
  --shadow-hover: 0 14px 36px -8px rgba(17, 19, 21, 0.12), 0 4px 12px -2px rgba(17, 19, 21, 0.06);
  --shadow-modal: 0 24px 64px -12px rgba(17, 19, 21, 0.22);
}

[data-theme="dark"] {
  /* Dark Theme: "Carbon Obsidian & Neon Signal" */
  --bg-canvas: #090A0D;
  --bg-surface: #12141A;
  --bg-elevated: #1A1D26;
  --bg-subtle: #0E1015;
  --bg-glass: rgba(18, 20, 26, 0.76);
  --bg-glass-heavy: rgba(18, 20, 26, 0.92);

  --text-primary: #F3F4F6;
  --text-secondary: #9CA3AF;
  --text-tertiary: #646B78;
  --text-inverted: #090A0D;

  --border-hairline: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.18);
  --border-glass: rgba(255, 255, 255, 0.14);

  --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
  --shadow-hover: 0 16px 40px -8px rgba(0, 0, 0, 0.7), inset 0 1px 0 0 rgba(255, 255, 255, 0.12);
  --shadow-modal: 0 28px 80px -12px rgba(0, 0, 0, 0.85);
}
```

### 2.2 Category Semantic Signal Tokens
Every event belongs to one of 5 core campus verticals, each with its own accent hex, soft translucent badge fill, border tint, and generative mesh gradient:
1. **`fintech` (FinTech, Banking & Agrobank Grants)**:
   * Accent: `#10B981` | Badge BG: `rgba(16, 185, 129, 0.14)` | Border: `rgba(16, 185, 129, 0.35)`
   * Poster Gradient: `radial-gradient(at 15% 15%, #059669 0%, #064E3B 55%, #022C22 100%)`
2. **`tech` (IT, AI, Data Analytics & AgriTech IoT)**:
   * Accent: `#8B5CF6` | Badge BG: `rgba(139, 92, 246, 0.15)` | Border: `rgba(139, 92, 246, 0.35)`
   * Poster Gradient: `radial-gradient(at 80% 20%, #7C3AED 0%, #3B0764 55%, #1E1B4B 100%)`
3. **`academic` (Coventry Degrees, ACCA Prep & Guest Lectures)**:
   * Accent: `#2563EB` | Badge BG: `rgba(37, 99, 235, 0.14)` | Border: `rgba(37, 99, 235, 0.35)`
   * Poster Gradient: `radial-gradient(at 20% 80%, #2563EB 0%, #1E3A8A 55%, #0F172A 100%)`
4. **`sports` (Futsal, Cybersport, Chess & Table Tennis)**:
   * Accent: `#84CC16` | Badge BG: `rgba(132, 204, 22, 0.16)` | Border: `rgba(132, 204, 22, 0.38)`
   * Poster Gradient: `radial-gradient(at 75% 25%, #65A30D 0%, #365314 55%, #14532D 100%)`
5. **`culture` (Debate Club, IELTS Speaking, Movie Nights & Socials)**:
   * Accent: `#F97316` | Badge BG: `rgba(249, 115, 22, 0.15)` | Border: `rgba(249, 115, 22, 0.35)`
   * Poster Gradient: `radial-gradient(at 25% 25%, #EA580C 0%, #7C2D12 55%, #431407 100%)`

### 2.3 Typography Scale & Font Pairings
Load from Google Fonts: `Plus Jakarta Sans` (Weights: 600, 700, 800), `Inter` (Weights: 400, 500, 600), and `JetBrains Mono` (Weights: 500, 600, 700).
* **Hero Spotlight Title**: `clamp(1.75rem, 2.8vw, 2.5rem)`, `Plus Jakarta Sans`, `800`, line-height `1.12`, letter-spacing `-0.03em`.
* **Section Header**: `1.35rem` (`21.6px`), `Plus Jakarta Sans`, `700`, letter-spacing `-0.02em`.
* **Event Card Title**: `1.125rem` (`18px`), `Plus Jakarta Sans`, `700`, line-height `1.3`, max 2 lines (`line-clamp-2`).
* **Body Copy**: `0.9375rem` (`15px`), `Inter`, `400`, line-height `1.55`.
* **Monospace Technical Metadata**: `0.75rem` (`12px`), `JetBrains Mono`, `600`, uppercase, letter-spacing `0.05em`. Mandatory for:
  * Date & time pills (`THU 12 NOV • 15:00–17:30`)
  * Room & campus codes (`MUKIMI • ATRIUM H1`)
  * Seat counters (`58 / 60 SEATS • 2 LEFT`)
  * Ticket cryptographic serials (`UDEA-PASS-9941-X7`)
  * Countdown timers (`01D : 08H : 42M : 19S`)

### 2.4 Layout Grid, Radii, Glassmorphism & Do's/Don'ts
* **Container Width**: `max-width: 1380px`, centered with `24px` horizontal padding on desktop, `16px` on mobile.
* **Bento Grid System**: 12-column CSS Grid (`gap: 20px`).
* **Card Geometry**: Outer card `border-radius: 24px`, internal padding `16px`, inner cover container `border-radius: 16px` with `overflow: hidden` and `aspect-ratio: 16 / 9`.
* **Holographic Foil Effect (for QR Tickets)**: CSS animated diagonal linear-gradient overlay (`linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.25) 45%, rgba(139,92,246,0.25) 50%, rgba(16,185,129,0.25) 55%, transparent 80%)`) with `background-size: 200% 200%`.
* **Strict Visual Guardrails**:
  * **NEVER** place raw unstyled text over busy images; always use `--bg-glass` with `backdrop-filter: blur(16px)` and `1px solid var(--border-glass)`.
  * **NEVER** use generic browser `alert()` or `confirm()` popups; build custom animated toast notifications (top-right stacked toasts with auto-dismiss progress bars) and custom confirmation dialogs.

---

## 3. Data Architecture & State Schema

Initialize and manage a comprehensive relational state object in JavaScript/TypeScript persisted to `localStorage` under key `udea_pulse_state_v1`:

1. **`currentUser` (Active Persona with 1-Click Role Switcher)**:
   * Switchable at any time in the header between three realistic personas to test all platform permissions:
     * **Student Persona**: `Soliyev Firdavs` (`id: "usr_1"`, `role: "student"`, `programme: "BSc (Hons) International Finance & Banking"`, `year: "Year 2"`, `telegram: "@firdavs_udea"`, `studentId: "UDEA-24-1089"`, `xp: 450`, `reliabilityScore: 98`).
     * **Club Leader Persona**: `Malika Karimova` (`id: "usr_2"`, `role: "club_lead"`, `clubId: "club_fintech"`, `programme: "BSc (Hons) Business Data Analytics"`, `year: "Year 3"`, `telegram: "@malika_analytics"`, `studentId: "UDEA-23-0412"`, `xp: 820`, `reliabilityScore: 100`).
     * **Campus Admin Persona**: `Timur Alimov` (`id: "usr_3"`, `role: "admin"`, `department: "UDEA Student Affairs & Campus Operations"`, `telegram: "@udea_admin"`, `studentId: "STAFF-009"`).
2. **`campusRooms` (Real-Time Room & Equipment Inventory)**:
   * `rm_mukimi_atrium`: Mukimi Campus • Main Innovation Atrium (Capacity: `200`, Equipment: `LED Wall, 4x Wireless Mics, Stage Audio`).
   * `rm_mukimi_a1`: Mukimi Campus • Lecture Auditorium A1 (Capacity: `120`, Equipment: `4K Laser Projector, Lecture Capture, 2x Mics`).
   * `rm_mukimi_lab2`: Mukimi Campus • Tech & IoT Lab 204 (Capacity: `35`, Equipment: `35x Workstations, High-Speed VLAN, Smartboard`).
   * `rm_mukimi_cowork`: Mukimi Campus • Student Coworking Lounge (Capacity: `45`, Equipment: `Modular Tables, Whiteboards, Coffee Station`).
   * `rm_boshlik_204`: Boshlik Campus • Seminar Room 204 (Capacity: `40`, Equipment: `Projector, HDMI, Glass Whiteboard`).
   * `rm_boshlik_lrc`: Boshlik Campus • Learning Resource Centre Zone B (Capacity: `25`, Equipment: `Roundtable, Quiet Acoustic Pods`).
   * `rm_boshlik_sports`: Boshlik Campus • UDEA Sports Complex (Capacity: `80`, Equipment: `Futsal Court, 4x Table Tennis Tables, Scoreboard`).
3. **`clubs` (Official Student Organizations & Partners)**:
   * Includes `Agrobank Innovation Hub`, `UDEA FinTech & Quant Society`, `Coventry Debate & Diplomacy Club`, `ACCA Silver Partner Study Circle`, `UDEA AgriTech & Robotics Lab`, `Academic Writing & IELTS Center`, and `UDEA Sports & Cybersport Union`.
4. **`events` (Rich Event Objects)**:
   * Fields: `id`, `title`, `subtitle`, `description`, `agenda` (array of `{time, title, speaker}`), `category` (`fintech` | `tech` | `academic` | `sports` | `culture`), `eventType` (`official` | `peer_meetup`), `approvalStatus` (`approved` | `pending_room_approval`), `campus` (`Mukimi` | `Boshlik` | `Online`), `roomId`, `date` (ISO date string within the current 14-day window), `startTime`, `endTime`, `language` (`EN` | `UZ` | `RU`), `hostClubId`, `hostName`, `registrationMode` (`internal_1click` | `internal_screening` | `external_link`), `externalUrl`, `capacity`, `registeredCount`, `waitlistCount`, `issueCertificate` (boolean), `coverStyle` (preset gradient ID or image URL), `equipmentRequested` (array), `attendees` (array of student objects with `lookingForTeam` boolean and `teamRole` string), `questions` (array of `{id, author, programme, text, upvotes, upvotedByMe, timestamp, answered, answerText}`).
5. **`tickets` (User Registrations & QR Passes)**:
   * Fields: `ticketId`, `eventId`, `userId`, `status` (`confirmed` | `waitlisted` | `checked_in` | `cancelled` | `external_saved`), `seatNumber`, `waitlistPosition`, `qrHash`, `confirmedAttendance4h` (boolean), `checkedInAt`, `screeningAnswer`, `lookingForTeam` (boolean), `teamSkillTag` (string).

---

## 4. Exhaustive Screen-by-Screen & Component Specifications

### 4.1 Sticky Glass Topbar & Telegram Mini App Frame Switcher
1. **Brand & Live Pulse**:
   * UDEA Pulse geometric emblem + title + live emerald status pill (`● 10 Active Campus Events`).
2. **Primary Navigation Tabs**:
   * `Explore & Calendar` (Main Bento discovery + interactive calendar).
   * `Clubs & Partners` (Directory of UDEA clubs with `Follow Club` notification toggles).
   * `My QR Passes & Passport` (Shows live badge count of active tickets, e.g., `3`).
   * `Organizer & Admin Studio` (Shows live badge count of pending room approvals or check-in queues).
3. **Global Utility Controls**:
   * **Mobile / Telegram Mini App Simulator Toggle (`📱 TG Mini App View`)**: A standout button in the header. When toggled ON, the entire interface smoothly animates into a centered `420px × 840px` iPhone / Telegram Mini App viewport frame complete with the Telegram native top header (`UDEA Pulse Bot • Mini App`), haptic feedback animations, and a sticky 4-tab bottom bar. When toggled OFF, it expands back into the full 1380px Desktop Bento Workspace.
   * **Campus Quick Filter**: `All Campuses`, `Mukimi St`, `Boshlik St`, `Online`.
   * **Language Quick Filter**: `ALL`, `EN`, `UZ`, `RU`.
   * **Theme Toggle**: Sun / Moon icon button with smooth rotation.
   * **Persona Switcher Dropdown**: Switch between `Firdavs (Student)`, `Malika (Club President)`, and `Timur (Campus Admin)` with an instant toast explaining the newly unlocked permissions.
   * **`+ Create Event` CTA**: High-contrast primary button (`+ Host Event`).

---

### 4.2 View 1: Explore & Interactive Calendar (The Main Workspace)

#### A. Top 12-Column Bento Hero Section
* **Left 8 Columns — Flagship Spotlight Card**:
  * Highlights *"Agrobank x UDEA FinTech & AI Challenge 2026"*.
  * Features an animated mesh gradient background, partner badges (`AGROBANK GRANT PARTNER`, `COVENTRY VALIDATED`, `CERTIFICATE + 15M UZS PRIZE POOL`), live ticking countdown timer (`02D : 11H : 45M : 12S`), speaker chips, capacity bar (`58 / 60 Registered • 2 Spots Left!`), and an instant `Claim My Spot →` CTA button.
* **Right 4 Columns — Dual Calendar & Live Campus Radar**:
  * **Interactive Monthly Calendar Widget**: Full month grid for November 2026. Dates with events show up to 3 color-coded semantic dots underneath the date number. Clicking any date filters the feed to that date (with a `"Clear Date Filter"` chip).
  * **Live Campus Radar ("Happening Next on Campus")**: Compact vertical timeline showing events starting within the next 24 hours, with room code badges (`MUKIMI • A1`) and a pulsing green indicator.

#### B. 14-Day Horizontal Date Ribbon & Smart Filter Bar
* **14-Day Interactive Strip**: Horizontal scrollable row of day cards (`TUE 10 NOV`, `WED 11 NOV`, `THU 12 NOV`...) with event count badges (`3 events`) and category color bars.
* **Dual-Track Switcher (Solves the Empty-Calendar Problem)**:
  * `All Campus Activity (10)`
  * `🏛️ Official University & Club Events (6)` (Verified conferences, workshops, guest lectures)
  * `⚡ Student Peer Meetups & Study Groups (4)` (Instant student-created study sessions, IELTS speaking, futsal, coding)
* **Category Filter Pills**: `All Categories`, `FinTech & Agrobank`, `IT, AI & AgriTech`, `Academic & ACCA`, `Sports & Cybersport`, `Debate & Social`.
* **Live Search Input**: Instant client-side search across event titles, descriptions, room numbers, and host names.

#### C. Responsive Event Card Grid
Each card is a masterclass in information hierarchy:
1. **Top Cover Area (`16:9`)**:
   * Displays custom typography poster or rich visual graphic.
   * **Top-Left Glass Pill**: Monospace date & time (`WED 11 NOV • 14:00`).
   * **Top-Right Glass Pills**: Campus/Room badge (`MUKIMI • LAB 204`) + Language pill (`EN`).
   * **Bottom-Left Overlay**: If `peer_meetup`, shows `"⚡ Peer Study Group"`; if `official` with certificate, shows `"🎓 Verified Certificate"`.
2. **Card Body**:
   * **Host Row**: Mini club avatar + club/student name + verified badge + category dot.
   * **Headline**: Bold 18px title + concise 2-line preview.
   * **Classmate Social Proof & Team Finder Indicator**: Overlapping circular avatars + text like `"Firdavs, Jasur + 26 students from Finance & IT"` and a purple badge `"4 looking for teammates"` if team-finding is active.
   * **Capacity Progress Bar**: Smooth horizontal bar. Green when `<75%`, Amber when `75%–99%` (`"Almost Full — 2 seats left"`), Coral/Violet when `100%` (`"Full • Waitlist Open (4 waiting)"`).
3. **Interactive Card Footer**:
   * Dynamic primary action button that reflects the current user's exact state (`1-Click RSVP`, `Apply to Join`, `Join Waitlist (#5)`, `Open Partner Form ↗`, or `✓ Ticket Ready (Show QR)`).

---

### 4.3 Deep Event Drawer / Modal (4 Interactive Tabs)

Clicking any card opens a rich slide-over panel with:
1. **Sticky Top Action Bar**: Category badge, `Copy Telegram Mini App Link` button (copies `https://t.me/udea_pulse_bot/app?startapp=event_...` and shows a toast), `Export to Google / Apple Calendar (.ics)` button (generates and downloads a real `.ics` calendar file!), and close button.
2. **Tab 1: Overview, Schedule & Smart Commitment**:
   * Full description, learning outcomes, and prerequisites.
   * **Timeline Agenda**: Structured time blocks (`14:00 — Registration & Welcome Coffee`, `14:30 — Keynote by Agrobank FinTech Lead`, `15:30 — Hands-on Case Sprint`).
   * **Campus Location Card**: Shows building address (`43 Mukimi Street` or `3 Boshlik Street`), floor, room code, capacity, and confirmed equipment icons (`Projector Ready`, `Wi-Fi High-Density`).
   * **Smart 4-Hour Pre-Event Attendance Confirmation Widget (Anti-Ghosting Engine)**:
     * If the user is registered, display an interactive banner simulating the automated Telegram Bot check-in 4 hours before start: *"🔔 Telegram Bot Check: Are you still attending today at 15:00? Confirming locks your seat; cancelling gives your spot to #1 on the waitlist."* with working **`[✓ Confirm I'm Coming]`** and **`[✕ Release My Spot to Waitlist]`** buttons.
3. **Tab 2: Attendees & "Find a Team / Study Buddy" Matchmaker**:
   * Filter attendees by programme (`International Finance`, `Business Data Analytics`, `AgriTech`, `Foundation`) or by **`🔍 Looking for Teammates`**.
   * Interactive toggle for the current user: **`[Toggle] I am looking for a team / study partner for this event`** + input for skill/role tag (e.g., `"Python / Data Analysis"`, `"Pitch Deck & Finance"`, `"UI/UX Designer"`).
   * Clicking `Connect in Telegram` on any classmate card opens a simulated Telegram direct message handshake toast.
4. **Tab 3: Live Speaker Q&A & Upvoting Board**:
   * Allows students to submit questions before or during the event.
   * Every question card shows author name, programme badge, timestamp, upvote button with live counter (`▲ 24`), and an `"Answered by Speaker"` pin if the user is a Club Lead or Admin.
   * Questions automatically sort by highest upvotes.
5. **Tab 4: Instant Organizer Controls (Visible if Current User is Host, Club Lead, or Admin)**:
   * Quick jump to QR Scanner for this event, capacity editor, and instant Telegram announcement generator.

---

### 4.4 View 2: "+ Host Event" Studio (Live Split-Screen Builder + Conflict Engine)

An intuitive, zero-friction creation studio with a **Left Form Panel** and a **Right Live Preview Panel** (switching between **Live Event Card Preview** and **Live Telegram Channel Post Preview**):

1. **Step 1 — Event Track & Basics**:
   * Choose track:
     * **`🏛️ Official Club / University Event`**: Enables full lecture hall booking, equipment requests, and optional certificate issuance. If the current user is a regular student, submitting sends it to the **Admin Room Approval Queue**; if Club Lead/Admin, can publish directly if the room is free.
     * **`⚡ Quick Student Peer Meetup`**: For study groups, IELTS speaking practice, board games, or sports. Publishes **instantly** without bureaucracy (capped at 30 participants in coworking/library/sports areas).
   * Inputs: Event Title, Subtitle/Summary, Category (`fintech`, `tech`, `academic`, `sports`, `culture`), Language (`EN`, `UZ`, `RU`).
2. **Step 2 — Luma-Style Generative Poster Studio**:
   * 6 clickable visual theme presets (`Emerald Matrix`, `Violet Cyber Mesh`, `Coventry Royal Blueprint`, `Acid Lime Arena`, `Sunset Terracotta`, `Obsidian Minimal`) + option to paste a custom cover image URL + pattern overlay selector (`Grid`, `Dots`, `Topographic Waves`, `Clean`).
   * The poster updates live with the typed title, host badge, and glassmorphic date/room pills.
3. **Step 3 — Date, Time & Smart Room Conflict Detector**:
   * Pick Date, Start Time, End Time, and Campus (`Mukimi Campus`, `Boshlik Campus`, `Online Link`).
   * **Real-Time Room Conflict Engine**: When selecting a room from the dropdown, the app checks existing events on that date/time.
     * If free: Shows green badge `✓ Room Available (Capacity: 120)`.
     * If occupied: Shows red alert `⚠️ Schedule Conflict: Occupied by "ACCA Workshop" from 14:00 to 16:00` and provides a 1-click button: **`Auto-Pick Next Free Slot (16:30)`** or **`Switch to Available Room (Auditorium A2)`**.
   * Equipment checklist (`4K Projector`, `Wireless Mics`, `Whiteboard & Markers`, `Power Strips`).
4. **Step 4 — Hybrid Registration & Anti-Ghosting Rules**:
   * Select registration mode:
     * **`⚡ 1-Click Internal RSVP + Holographic QR Ticket`**
     * **`📋 Screening Application RSVP`** (Adds a custom question prompt, e.g., *"Share your GitHub or motivation"*).
     * **`🔗 External Partner Link`** (Input URL for Google Form / Agrobank / Coventry portal; still enables Telegram reminder + calendar save for students).
   * Set Capacity Slider (`5` to `250`), toggle `Automatic Waitlist Queue`, toggle `Team Finder Matchmaking`, and toggle `Official UDEA Co-Curricular Certificate`.
5. **Live Telegram Bot Announcement Preview**:
   * Shows an authentic Telegram message bubble preview (`@udeauz_events`) with formatted markdown, emojis, seat counter, and inline buttons (`[🎟️ 1-Click RSVP in Mini App]`, `[👥 Find Teammates]`).

---

### 4.5 View 3: "My QR Passes & Student Co-Curricular Passport"

1. **Active Holographic Ticket Passes**:
   * Displays all upcoming events the user has registered for or saved.
   * **Perforated Pass UI**: Features ticket notch cutouts on left/right edges, dashed tear line, holographic foil animation on hover, dynamic SVG QR code encoding the student ID + ticket hash, seat number (`SEAT #14` or `WAITLIST POSITION #1`), and 4-hour confirmation status badge (`✓ Attendance Confirmed`).
   * **Interactive Waitlist Demo**: If the user cancels a confirmed ticket on a full event, automatically promote the first waitlisted student (`Waitlist #1 → Confirmed Seat!`) and trigger a visible toast notification demonstrating how the Telegram bot notifies the promoted student.
2. **UDEA Co-Curricular Student Passport & XP Gamification**:
   * Displays student profile card with **Reliability Score (`98% — Trusted Attendee`)**, **Total Campus XP (`450 XP`)**, skill badges (`FinTech Explorer`, `Hackathon Finalist`, `Debate Speaker`), and progress toward the **"UDEA Gold Co-Curricular Diploma Supplement"**.
3. **Instant Printable Certificate Modal**:
   * For past/checked-in events, clicking **`🎓 View & Print Official Certificate`** opens a high-resolution, print-ready certificate featuring the official UDEA & Coventry partnership header, student full name, programme, event title, date, verified hours, digital signature block, and verification QR code, with a working `Print / Save as PDF` button (`window.print()`).

---

### 4.6 View 4: Organizer Studio, Offline QR Check-In Scanner & Campus Admin

1. **Event Selector & Live Turnout Telemetry**:
   * Select any hosted event to see real-time metrics: `Total Registered`, `Confirmed (4h Check)`, `Checked In at Door`, `Waitlist Queue`, and `Turnout %`.
2. **Offline-First QR Scanner & 1-Tap Guest Check-In**:
   * Displays an interactive camera scanner viewport with animated laser scan line + status badge: **`🟢 Offline Crypto-Hash Cache Ready (58/58 Passes Stored in Device Memory)`** — proving the scanner works instantly even in basement halls with weak cellular signal.
   * **`[⚡ Simulate Next Student QR Scan]`** button: Clicking this scans the next registered student in the list, plays a visual green check-in pulse, displays their name, programme, and ticket hash, and increments the live check-in counter.
   * **Manual Guest List Table**: Searchable by student name, ID, or Telegram handle, with 1-tap `Check In` / `Undo` buttons and filter tabs (`All`, `Checked In`, `Not Arrived`, `Waitlist`, `Screening Pending`).
3. **Telegram Broadcast & CSV Export**:
   * **Instant Telegram Broadcast**: Type an urgent update (e.g., *"We moved from Room 204 to Main Atrium due to high demand!"*) and click `Send via Telegram Bot to 58 Attendees` — triggers a live simulated Telegram notification banner.
   * **1-Click CSV Export**: Generates and downloads a real `.csv` file containing the full attendance report (`Student ID, Full Name, Programme, Telegram, Status, Check-In Timestamp`) for university administration reporting.
4. **Admin Room & Event Approval Queue**:
   * Lists pending official event submissions requesting campus rooms or equipment.
   * Shows automated conflict check status (`✓ Room Free & Equipment Available`) and 1-click **`Approve & Auto-Post to Telegram`** or **`Reject / Suggest New Room`** buttons.

---

## 5. Pre-Populated Authentic UDEA Seed Dataset (Minimum 8 Events)

Ensure all 8 events below are pre-loaded with rich agendas, realistic Uzbek/international student attendees (`Soliyev Firdavs`, `Amirbek Ne'matilloyev`, `Malika Karimova`, `Jasur Rakhimov`, `Diyora Rustamova`, `Sardorbek Aliev`, `Kamola Yusupova`), and initial Q&A questions:

1. **`evt_1` — Agrobank x UDEA FinTech & AI Hackathon 2026**
   * *Category*: `fintech` | *Type*: `official` | *Campus*: `Mukimi` (`rm_mukimi_atrium`) | *Lang*: `EN`
   * *Date*: Tomorrow, `10:00–18:00` | *Mode*: `internal_1click` + Team Finder + Certificate
   * *Capacity*: `60`, *Registered*: `59` (1 spot left! Enables easy testing of taking the last spot and triggering the waitlist).
2. **`evt_2` — AgriTech & Smart Farming IoT Sensor Workshop**
   * *Category*: `tech` | *Type*: `official` | *Campus*: `Mukimi` (`rm_mukimi_lab2`) | *Lang*: `UZ`
   * *Date*: In 2 days, `14:00–16:30` | *Mode*: `internal_1click` + Certificate
   * *Capacity*: `25`, *Registered*: `25`, *Waitlist*: `4` (100% Full — lets user test joining the waitlist or promoting waitlisted students).
3. **`evt_3` — Coventry University UK Mobility & Dual-Degree Briefing**
   * *Category*: `academic` | *Type*: `official` | *Campus*: `Mukimi` (`rm_mukimi_a1`) | *Lang*: `EN`
   * *Date*: In 3 days, `15:00–16:30` | *Mode*: `external_link` (`https://udea.uz/admissions`)
   * *Capacity*: `120`, *Registered*: `84` (Lets user test External Link mode + Telegram reminder tracking).
4. **`evt_4` — ACCA F3 Financial Accounting Mock Exam & Crash Review**
   * *Category*: `academic` | *Type*: `official` | *Campus*: `Boshlik` (`rm_boshlik_204`) | *Lang*: `EN`
   * *Date*: Today, `16:00–18:00` | *Mode*: `internal_1click` + Certificate
   * *Capacity*: `40`, *Registered*: `34` (User `Firdavs` is already registered — pre-populates an active QR ticket in his wallet!).
5. **`evt_5` — Python, Pandas & SQL Peer Study Sprint (Data Analytics)**
   * *Category*: `tech` | *Type*: `peer_meetup` | *Campus*: `Mukimi` (`rm_mukimi_cowork`) | *Lang*: `EN`
   * *Date*: Today, `17:30–19:00` | *Mode*: `internal_1click` + Team Finder
   * *Capacity*: `15`, *Registered*: `11` (Created by a student peer — shows the instant peer meetup badge).
6. **`evt_6` — Academic Writing & IELTS 8.0+ Speaking Mock Club**
   * *Category*: `culture` | *Type*: `peer_meetup` | *Campus*: `Boshlik` (`rm_boshlik_lrc`) | *Lang*: `EN`
   * *Date*: In 4 days, `13:30–15:00` | *Mode*: `internal_1click`
   * *Capacity*: `20`, *Registered*: `16`.
7. **`evt_7` — UDEA Cup: Inter-Faculty Futsal & Table Tennis Night**
   * *Category*: `sports` | *Type*: `official` | *Campus*: `Boshlik` (`rm_boshlik_sports`) | *Lang*: `RU`
   * *Date*: In 5 days, `18:00–21:00` | *Mode*: `internal_1click` + Team Finder
   * *Capacity*: `64`, *Registered*: `52`.
8. **`evt_8` — British Parliamentary Debate: CBDCs & Digital Som Future**
   * *Category*: `culture` | *Type*: `official` | *Campus*: `Boshlik` (`rm_boshlik_204`) | *Lang*: `EN`
   * *Date*: In 6 days, `15:30–17:30` | *Mode*: `internal_screening` (Requires answering a 1-line debate role prompt: Speaker vs. Adjudicator vs. Spectator)
   * *Capacity*: `40`, *Registered*: `29`.

*(Also include 1 completed past event in Firdavs's history — `"Agrobank Scholarship Induction & FinTech Forum"` — with status `checked_in` so the user can immediately test and print an Official UDEA Certificate on first load, plus 1 pending event in the Admin Queue so the Admin persona has an item ready to approve!)*