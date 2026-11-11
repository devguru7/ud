# UDEA Pulse v5.0 — Master Architectural, Design System & UI Motion Prompt

> **Copy-Paste Instruction:** Paste this entire document into Google AI Studio (`aistudio.google.com/apps/bb5d1bd4-a97f-4c9d-8e3c-504c741e5c57`), Cursor, Claude Code, Lovable, or Windsurf along with the `github.com/devguru7/ud` repository. It contains the complete audit of the live AI Studio app (`bb5d1bd4-a97f-4c9d-8e3c-504c741e5c57`), the analysis of **[UI Motion Prompts](https://ui-motion-prompts.pages.dev/?utm_source=ig&utm_medium=social&utm_content=link_in_bio)** (438 micro-interaction specifications across 73 sets), the architectural synthesis of **12 world-class design galleries**, all **16 screenshot-verified layout/CSS/code fixes** from the current AI Studio build, and the ready-to-execute **Master Engineering Prompt**.

---

## PART A — Complete Audit of Your Google AI Studio App (`bb5d1bd4-a97f-4c9d-8e3c-504c741e5c57`)

We inspected the exact codebase and all 20 rendered preview screenshots captured inside your AI Studio workspace (`.aistudio/artifacts/brain/bb5d1bd4-a97f-4c9d-8e3c-504c741e5c57/`). Below is every single visual, layout, UX, and motion issue that still needs to be fixed so the app looks and feels 100% agency-grade:

### 1. Topbar & Mobile Viewport Issues (`src/components/Topbar.tsx` & `src/styles/shell.css`)
1. **`+ Host Event` Button Clips Off the Right Edge (`v1-topbar.png`, `v2-posts-feed.png`, `media_1794389811340_aafb110f.jpg`):**
   - Because `.topbar-inner` packs `.brand` (with `.live-pill`), `.topbar-tabs`, `.mini-toggle` (`TG Mini App`), `.zone-select` (`All Zones`), `.lang-select` (`EN`), `.notif-btn`, `.theme-btn`, `.persona-btn` (`Firdavs · FINTECH CASE COORDINATOR`), `+ Post`, and `+ Host Event` on a single row (`max-width: 1380px`), the rightmost `+ Host Event` button gets pushed off-screen or squished, and on medium viewports (`s1-explore.png`, `s5-passes.png`) `.topbar-tabs` collapses so only 1 clipped tab (`Explore` or `R Passes & Pa`) is visible!
   - **Exact Fix:** Remove the duplicate `.zone-select` (`All Zones`) from `Topbar.tsx` (since Boshlik Venue Zones already have a dedicated filter ribbon in `Explore.tsx`), hide `.live-pill` below `1520px`, and use `.nav-label-short` (`Explore`, `Clubs`, `Passes`, `Studio`) by default so all 4 navigation tabs and `+ Host Event` fit with zero clipping at every desktop width.
2. **Mobile `TG Mini App` Frame Wraps Header into 3 Rows (`media_1794390226831_5b68d0e9.jpg`, `s6-mobile.png`):**
   - In mobile preview mode, `.topbar-inner` wraps into 3 stacked rows (Row 1: Logo + 4 tabs; Row 2: Bell + Moon + Firdavs dropdown; Row 3: `+ Post` + `+ Host Event`), eating 170px of vertical phone screen height before the content even starts.
   - **Exact Fix:** When `.phone-frame` / `app.mobile` is active, render a compact 1-row top bar (`Logo + Lang + Bell + Persona Avatar`) and move the 4 main navigation tabs (`Explore`, `Clubs`, `Passes`, `Studio`) + central `+` action into a native **Bottom Glass Dock (`position: sticky; bottom: 0`)** inside `.phone-frame`.

### 2. Explore View, Date Ribbon & Boshlik Rooms Timeline Issues (`src/components/Explore.tsx` & `src/styles/shell.css`)
3. **Invisible Text on Selected `ALL 14 days` Button in `DateRibbon` (`v2-posts-feed.png`):**
   - Look at the first card in `DateRibbon` (`button.ribbon-day.all-day.is-selected`) on `v2-posts-feed.png`: the background is light gray/white while the text (`ALL / 14 / days`) is also white, making the label completely invisible (a blank white rectangle with a black border).
   - **Exact Fix:** Give `.ribbon-day.is-selected` explicit high-contrast colors (`background: var(--text-primary); color: var(--bg-surface);`) and ensure child `.mono`, `strong`, and `em` inherit `color: inherit`.
4. **Clipped 2-Line Event Blocks & Non-Clickable Free Gaps in `BoshlikRoomsTimeline` (`r1-timeline-scrolled.png`):**
   - `.timeline-bar-track` is `36px` tall, which vertically clips the 2-line event title + time inside `.timeline-event-block`. Furthermore, when a room has 1 event (e.g., `16:00–18:00`), the remaining 10 hours of free space on that row are not clickable.
   - **Exact Fix:** Increase `.timeline-bar-track` height to `48px`, add hourly grid lines (`09:00`–`21:00`), add a live red **"NOW" vertical laser needle**, and compute the free time intervals around booked events so clicking any open gap on a row opens `HostStudio` pre-filled with that room and free time slot.
5. **Orphan Language Pills (`UZ`, `RU`) & Crowded Category Row (`r1-timeline-scrolled.png`):**
   - Putting both `CATEGORIES` (6 pills) and `['all', 'EN', 'UZ', 'RU']` (4 language pills) inside `.category-pills` causes `🌐 UZ` and `🌐 RU` to wrap onto an awkward second orphan line while squeezing `.search-wrap`.
   - **Exact Fix:** Since interface/event language is already in `Topbar` or can sit in a compact segmented pill group next to `.search-wrap`, separate the language segmented switch from `.category-pills` so categories stay on a single clean row.

### 3. Event Cards & Post Cards Issues (`src/components/EventCard.tsx`, `src/components/UI.tsx`, `src/components/Posts.tsx`)
6. **Duplicate `BOSHLIK` Badge & Wrapped `EN` Pill on `EventCard` (`r1-cards.png`):**
   - In `UI.tsx` (`Poster`), `.poster-top-right` renders both `BOSHLIK` and `EN`, which collides with the absolute-positioned `.bookmark-btn` in the top-right corner and forces `EN` onto a second line—even though `BOSHLIK • ROOM 204` is already shown in `.cover-room-pill` at the bottom of the cover!
   - **Exact Fix:** Remove `<span className="glass-pill mono-pill">{event.campus...}</span>` from `.poster-top-right` in `UI.tsx`, leaving only the compact language pill neatly aligned next to `.bookmark-btn`.
7. **Truncated Host Name & Duplicate Category in `.event-host` (`r1-cards.png`):**
   - `.event-host` in `EventCard.tsx` packs Avatar + `event.hostName` + `+ coHost` + Verified check + `createdByRoleTitle` badge + `.host-cat` (`• Academic & ACCA`) onto a single line, crushing the host name into `UF Soli...` and clipping the category into `• Acade`, while `<CategoryBadge />` is already in `.event-footer`.
   - **Exact Fix:** Remove `.host-sep` and `.host-cat` from `.event-host` in `EventCard.tsx` and stack `hostName` + `createdByRoleTitle` cleanly so neither truncates.
8. **Double Icons/Emojis on Pinned Post Badges (`v2-posts-feed.png`):**
   - In `Posts.tsx` line 68, `<Icon name={typeMeta.icon} /> {post.badgeText}` renders an SVG icon right next to `post.badgeText` which already starts with an emoji (`⚡ LAST SPOT LEFT` -> `✨ ⚡ LAST SPOT LEFT`; `📢 CALL FOR COORDINATORS` -> `🔔 📢 CALL FOR COORDINATORS`), and in the Post Modal (`v3-post-modal.png`) `✨ ✨ Auto-Write Draft` renders two sparkles.
   - **Exact Fix:** Strip leading emojis from `badgeText` or omit `<Icon />` when `post.badgeText` is custom, and remove the duplicate `✨` text inside the `Auto-Write Draft` button.

### 4. Modals, Clubs & Organizer Studio Issues (`src/components/Clubs.tsx`, `src/components/Organizer.tsx`, `src/styles/organizer.css`)
9. **Kicker & `<h2>` Heading Collision on the Same Line (`v3-post-modal.png`, `v4-role-modal.png`):**
   - In the Create Post Modal (`BROADCAST · RECAP · POLL PUBLISH CAMPUS POST & TELEGRAM UPDATE`) and Role Builder Modal (`PART 2 · DYNAMIC ROLE BUILDER & DELEGATION ENGINEUDEA FinTech & Quant Society`), the `.mono.subtle` kicker and `<h2>` run together on the same horizontal line because their parent `div` in `.panel-head` is not a vertical flex column.
   - **Exact Fix:** Set `.panel-head > div:first-child { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }` in `organizer.css` and `drawer.css`.
10. **4th Button Clipped (`Campu...`) in Create Post Modal (`v3-post-modal.png`):**
    - The 4-option `Post Format` `.track-switch` overflows horizontally inside the modal, cutting off `💬 Campus Poll & Discussion` as `💬 Campu`.
    - **Exact Fix:** Make `.modal .track-switch` a 4-column CSS grid (`display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); width: 100%;`) with concise labels (`Announcement`, `Event Promo`, `Event Recap`, `Campus Poll`).
11. **`View Roles →` Wrapping into 3 Vertical Lines in `Clubs.tsx` (`s3-clubs.png`) & Cramped Roster Rows (`v4-role-modal.png`):**
    - On club cards, the button `View Roles →` wraps across 3 lines (`View / Roles / →`). In the Role Modal, `BSc Accounting & Finance (ACCA)` touches the right border with zero gap after the student's name.
    - **Exact Fix:** Add `white-space: nowrap; flex-shrink: 0;` to `.club-actions .btn` and add `justify-content: space-between; gap: 12px;` to `.roster-row-head`.
12. **Squished Letter/Word Spacing in `Organizer.tsx` (`s4-organizer.png`):**
    - In `Organizer.tsx`, headings like `InstantTelegrambroadcast` and the `<select>` box (`AgrobankxUDEAFinTech&AIHackathon2026`) have overly tight negative tracking or font rendering that visually merges words together.
    - **Exact Fix:** Set `letter-spacing: -0.015em; word-spacing: 0.02em;` on headings and `letter-spacing: normal;` on `<select>` elements.

---

## PART B — Synthesis of `ui-motion-prompts.pages.dev` & the 12 Design Galleries

### 1. Curated Motion Recipes from **[UI Motion Prompts (`ui-motion-prompts.pages.dev`)](https://ui-motion-prompts.pages.dev/?utm_source=ig&utm_medium=social&utm_content=link_in_bio)** & **[UI Motion Guide (`uimotionprompts.com`)](https://uimotionprompts.com/blog/ui-animation-best-practices-ai-apps)**

| # | UI Motion Prompts Category & Pattern | Exact Choreography & Physics Specification | Where to Apply in **UDEA Pulse (`devguru7/ud`)** |
|---|---|---|---|
| **1** | **Tab Bar — Sliding Pill, Liquid Bulge & Spotlight** (*Set 1–5*) | Active tab background uses `layoutId` with a liquid stretch spring (`stiffness: 380, damping: 28, mass: 0.8`). While moving between tabs, the pill stretches horizontally (`scaleX: 1.08`) mid-flight and settles with a top ambient spotlight glow. | **`Topbar.tsx` (`.topbar-tabs`)**, **`Explore.tsx` (`.track-switch`)**, and **`EventDrawer.tsx` (`.drawer-tabs`)** |
| **2** | **Segmented Control — Sliding Thumb & Clip Text** (*Set 23*) | Four-way switch whose thumb glides with `layoutId` (`stiffness: 420, damping: 30`) while the active label transitions weight and contrast cleanly without shifting container width. | **`Posts.tsx` (`Post Format` switch)** and **`Organizer.tsx` (Guest filter tabs)** |
| **3** | **Like & Bookmark — Jelly Squish, Star Burst & Count Roll** (*Set 5 & Set 35*) | Clicking `.bookmark-btn` or post reaction triggers a 3-stage sequence: press down (`scale: 0.82`), jelly rebound (`scale: [0.82, 1.24, 0.94, 1.0]`, `stiffness: 500, damping: 14`), 6 radial particle dots bursting outward `18px` over `380ms`, and **Odometer Count Roll** on the counter number. | **`EventCard.tsx` (`.bookmark-btn`)**, **`Posts.tsx` (Reactions & Poll votes)** |
| **4** | **Done & RSVP — Button Morph, Check Draw & Confetti Burst** (*Set 4 & Set 9*) | Primary RSVP button (`1-Click RSVP` / `Claim My Spot`) uses **Press Down** (`whileTap={{ scale: 0.96 }}`), morphs width smoothly via `layout`, draws an SVG checkmark (`pathLength: 0 -> 1` in `260ms`), and emits an emerald **Ripple Ring**. | **`EventCard.tsx`**, **`Explore.tsx` (`Spotlight`)**, and **`EventDrawer.tsx`** |
| **5** | **Thinking & AI Co-Pilot — Breathing Orb & Shimmer Text** (*Set 3*) | AI Co-Pilot buttons (`Auto-Write Draft`, `Smart Fill`) show a **Breathing Orb** (blurred violet `#6E5BFF`, cyan `#38C6FF`, and emerald swirls pulsing every `2.2s`) + **Shimmer Text** sweep while generating content. | **`Posts.tsx` (`Auto-Write Draft`)**, **`HostStudio.tsx` (`Fill Demo Draft`)** |
| **6** | **Notifications — Island Expand & Stacked Toasts** (*Set 10*) | Toasts enter from top-right/top-center like a Dynamic Island (`borderRadius: 999px -> 16px`, spring `stiffness: 360, damping: 26`), stack with `scale: 1 - index * 0.04`, and support swipe-to-dismiss. | **`Overlays.tsx` (`ToastStack`)** |
| **7** | **Bottom Sheet & Dialog — Spring Pop, Glass Blur & Rubber Band** (*Set 20 & Set 31*) | Drawers and modals open with coordinated backdrop blur (`backdropFilter: blur(0px) -> blur(16px)` in `200ms`) and sheet spring (`damping: 28, stiffness: 340`), plus faster exit (`180ms ease-out`). | **`EventDrawer.tsx`**, **`Overlays.tsx` (`RoleModal`, `PostModal`, `ConfirmModal`)** |
| **8** | **Error & Validation — Shake Input & Warning Pulse** (*Set 6 & Set 37*) | Invalid ticket code, room conflict, or missing required field triggers horizontal keyframe shake (`x: [0, -10, 10, -7, 7, -3, 3, 0]` over `380ms`) and crimson border glow pulse. | **`Organizer.tsx` (Manual Ticket Code input)** and **`HostStudio.tsx` (Conflict box)** |
| **9** | **Number Counter — Odometer Roll** (*Set 35*) | Whenever KPIs change (Registered count, Seats left, Checked-in count, Campus XP, Poll votes), digits roll vertically (`AnimatePresence mode="popLayout"`). | **`Explore.tsx` (`Spotlight` countdown & capacity)**, **`Passes.tsx` (`XP`)**, **`Organizer.tsx`** |
| **10** | **3D Holographic Tilt & Border Beam** (*Set 41 & `hoverstat.es`*) | Cursor-tracked 3D tilt (`rotateX`, `rotateY` max `±5deg`) with dynamic specular glare and a continuous 1px **Border Beam** on the Student Passport and QR Pass cards. | **`Passes.tsx` (`.passport-card`, `.pass-card`)** and **`Explore.tsx` (`.spotlight`)** |

### 2. Design Principles Synthesized from All 12 Curated Galleries
- **[Minimal Gallery (`minimal.gallery`)](https://minimal.gallery/)**: Swiss grid discipline, exposed `1px` hairlines, and removal of duplicate badges on cards.
- **[Httpster (`httpster.net`)](https://httpster.net/)**: High-contrast editorial display typography (`Plus Jakarta Sans` / `Inter Display`) paired with compact pill badges.
- **[Siteinspire (`siteinspire.com`)](https://www.siteinspire.com/)**: Clean component boundaries so `Topbar`, `DateRibbon`, and `FilterBar` never crowd or clip on laptop screens.
- **[Fonts In Use (`fontsinuse.com`)](https://fontsinuse.com/)**: Strict pairing of geometric Neo-Grotesk headlines with `JetBrains Mono` (`font-variant-numeric: tabular-nums`) for all timestamps, room codes (`ROOM 204`), ticket hashes, and countdowns.
- **[Landing Love (`landing.love`)](https://www.landing.love/)**: Choreographed section reveals (`staggerChildren: 0.055`) across the Bento Hero, Date Ribbon, and Event Grid.
- **[Lapa Ninja (`lapa.ninja`)](https://www.lapa.ninja/)**: High-conversion Bento Hero hierarchy (`Spotlight` + `CalendarCard` + `Radar` live 24h feed).
- **[Dark Mode Design (`darkmodedesign.com`)](https://www.darkmodedesign.com/)**: Stepped obsidian surface luminance (`#06080E` -> `#0C101A` -> `#121826`) with top-edge inner specular highlight (`inset 0 1px 0 rgba(255,255,255,0.08)`).
- **[Hoverstat.es (`hoverstat.es`)](https://www.hoverstat.es/)**: Interactive timeline scrubber with live red "NOW" laser needle and 3D holographic pass tilt.
- **[Land-book (`land-book.com`)](https://land-book.com/)**: Breathable SaaS card density with `min-width: 0` truncation guards and single-line action footers.
- **[Design Made in Germany (`designmadeingermany.de`)](https://designmadeingermany.de/sites-we-like/)**: Precision Bauhaus utility in the Boshlik Room Conflict Matrix and Organizer Check-In console.
- **[One Page Love (`onepagelove.com`)](https://onepagelove.com/)**: Zero dead ends—every timeline gap, poll option, role badge, and certificate button performs a complete inline or modal flow.
- **[Best Website Gallery (`bestwebsite.gallery`)](https://bestwebsite.gallery/)**: Unified border-radius scale, single clean icons (no double emojis), and native-feeling mobile bottom dock inside `.phone-frame`.

---

## PART C — Ready-to-Paste Master Prompt for Google AI Studio / Cursor / Claude

Copy the prompt block below and paste it directly into the Google AI Studio assistant for your app (`bb5d1bd4-a97f-4c9d-8e3c-504c741e5c57`):

```markdown
# MASTER UPGRADE PROMPT — UDEA PULSE v5.0 (BOSHLIK CAMPUS OS)

You are a Principal Design Engineer and Creative Technologist. Upgrade this UDEA Pulse app (`React 19`, `TypeScript`, `motion/react`) to **v5.0 Production Perfection** by executing all 12 visual/CSS bug fixes from our screenshot audit, wiring the `ui-motion-prompts.pages.dev` animation system, and adding interactive Boshlik Campus timeline & holographic pass polish.

## 1. STRICT CAMPUS & ARCHITECTURE RULES
- UDEA has ONLY ONE physical campus: **Boshlik Campus** (`Boshlik Street 3, Yakkasaray District, Tashkent`), plus `Online` streams. Never add multi-campus selectors.
- Preserve all existing state in `src/lib/store.tsx`, `src/lib/logic.ts`, and `src/lib/seed.ts` (`localStorage` key `udea_pulse_state_v1`, custom club roles, delegated permissions, campus posts/polls/recaps, QR tickets, and certificates).

## 2. FIX ALL 12 VERIFIED VISUAL & LAYOUT BUGS IMMEDIATELY

1. **Fix `Topbar.tsx` Horizontal Overflow & Clipped `+ Host Event` Button (`src/components/Topbar.tsx` & `src/styles/shell.css`):**
   - Remove the duplicate `<label className="quick-select zone-select">` dropdown from `Topbar.tsx` (venue zones are already filtered in `Explore.tsx`'s `.zone-ribbon`).
   - In `Topbar.tsx`, render concise tab labels (`Explore`, `Clubs`, `Passes`, `Studio`) so `.topbar-tabs` never collapses to 1 clipped tab, and ensure `+ Post` and `+ Host Event` have `flex-shrink: 0; white-space: nowrap;` so `+ Host Event` never clips off the right edge of the screen.
   - Hide `.live-pill` below `1480px` width so `.topbar-inner` breathes cleanly on 1280px–1440px laptops.

2. **Fix Mobile `TG Mini App` `.phone-frame` Header Wrapping (`src/components/Topbar.tsx` & `src/styles/shell.css`):**
   - When `app.mobile` (`.phone-frame`) is active, do NOT wrap `.topbar-inner` into 3 stacked rows. Render a compact 1-row mobile top header (`Brand + Lang + Notification Bell + Theme + Persona Avatar`) and render `.topbar-tabs` (`Explore`, `Clubs`, `Passes`, `Studio`, `+ Host`) as a sleek fixed/sticky **Bottom Glass Tab Bar** at the bottom of `.phone-frame`.

3. **Fix Invisible White-on-White Text on `ALL 14 days` Button in `DateRibbon` (`src/styles/shell.css`):**
   - Currently `.ribbon-day.all-day.is-selected` renders white text on a light background, making `ALL / 14 / days` invisible!
   - Fix `.ribbon-day.is-selected` and `.ribbon-day.all-day.is-selected` in `src/styles/shell.css` so background is `#111315` (or `#10B981` in dark mode) with `color: #FFFFFF !important`, and force `.ribbon-day.is-selected .mono, .ribbon-day.is-selected strong, .ribbon-day.is-selected em { color: inherit !important; }`.

4. **Fix Duplicate `BOSHLIK` Pill & Wrapped `EN` Badge on `EventCard` Cover (`src/components/UI.tsx`):**
   - In `Poster` (`src/components/UI.tsx` lines 190–193), `.poster-top-right` renders both `BOSHLIK` and `EN`, which collides with `.bookmark-btn` in the top-right corner and wraps `EN` onto a second line—while `BOSHLIK • ROOM 204` is ALREADY shown in `.cover-room-pill` at the bottom of the cover.
   - Remove `<span className="glass-pill mono-pill">{event.campus === 'Online' ? 'ONLINE' : event.campus.toUpperCase()}</span>` from `.poster-top-right` in `src/components/UI.tsx`, leaving only `<span className="glass-pill mono-pill lang-pill">{event.language}</span>` with `margin-right: 36px` so it sits cleanly to the left of `.bookmark-btn`.

5. **Fix Truncated Host Name & Redundant Category in `.event-host` (`src/components/EventCard.tsx` & `src/styles/shell.css`):**
   - In `src/components/EventCard.tsx` lines 115–119, remove `<span className="host-sep" />` and `<span className="host-cat">...</span>` (because `<CategoryBadge category={event.category} small />` is already rendered in `.event-footer`).
   - Allow `.event-host` to wrap cleanly with `flex-wrap: wrap; row-gap: 4px;` so `event.hostName` (`Soliyev Firdavs`) and `event.createdByRoleTitle` (`FinTech Case Coordinator`) are 100% readable without truncating into `UF Soli...`.

6. **Fix Kicker + Heading Same-Line Collision in `.panel-head` (`src/styles/organizer.css` & `src/styles/drawer.css`):**
   - In `RoleModal` (`Clubs.tsx`), `PostModal` (`Posts.tsx`), and `Organizer.tsx`, `.panel-head > div:first-child` lacks vertical flex direction, causing `<span className="mono subtle">PART 2 · DYNAMIC ROLE BUILDER</span>` and `<h2>UDEA FinTech...</h2>` to collide inline on the same line.
   - Add `.panel-head > div:first-child { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }` in `src/styles/organizer.css` and `src/styles/shell.css`.

7. **Fix 4th Button Clipping (`Campu...`) in Create Post Modal (`src/components/Posts.tsx` & `src/styles/organizer.css`):**
   - In `PostModal` (`src/components/Posts.tsx`), style the 4-button `Post Format` `.track-switch` with `display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); width: 100%; gap: 4px;` and use concise button labels (`📢 Announcement`, `✨ Event Promo`, `🏆 Event Recap`, `📊 Campus Poll`) so the 4th button never clips.

8. **Fix Double Emojis / Icons on Post Badges & AI Draft Button (`src/components/Posts.tsx`):**
   - In `PostCard` (`src/components/Posts.tsx` line 68), when `post.badgeText` is present and already contains an emoji (like `⚡ LAST SPOT LEFT` or `📢 CALL FOR COORDINATORS`), do NOT render `<Icon name={typeMeta.icon} />` in front of it (or strip leading emojis), eliminating `✨ ⚡` and `🔔 📢`.
   - In `PostModal` (`src/components/Posts.tsx`), fix the AI draft button so it renders a single icon (`<Icon name="spark" size={13} /> Auto-Write Draft`) instead of `✨ ✨ Auto-Write Draft`.

9. **Fix `BoshlikRoomsTimeline` Clipped 2-Line Blocks & Add Clickable Free Gaps + Live Red "NOW" Laser (`src/components/Explore.tsx` & `src/styles/shell.css`):**
   - Increase `.timeline-bar-track` height from `36px` to `48px` (`padding: 4px`), add subtle hourly vertical grid lines, and render a live red **"NOW" vertical laser line** (`width: 2px; background: #EF4444; box-shadow: 0 0 8px #EF4444;`) when `selectedDate === isoDate()`.
   - For rooms that have 1 or 2 events on `selectedDate`, compute the remaining free intervals between `09:00` and `21:00` (at least 60 mins long) and render clickable translucent `.timeline-gap-btn` slots (`+ Free 11:00–14:00`) so users can click any open gap on a partially booked room to book it in `HostStudio`.

10. **Fix `View Roles →` 3-Line Button Wrap in `Clubs.tsx` & Roster Degree Spacing (`src/styles/organizer.css`):**
    - Add `white-space: nowrap; flex-shrink: 0;` to all `.btn` inside `.club-card` and `.roster-row` so `View Roles →` never wraps into 3 vertical lines. Add `display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;` to `.roster-row-head`.

11. **Fix Squished Word Spacing in `Organizer.tsx` Selects & Headings (`src/styles/organizer.css` & `src/styles/base.css`):**
    - Ensure all `h1, h2, h3` use `letter-spacing: -0.02em; word-spacing: normal;` and all `select, input, button` use `letter-spacing: normal; word-spacing: normal;` so words like `Instant Telegram broadcast` and event titles inside `<select>` never look glued together.

12. **Separate Language Filter Pills from Category Pills in `Explore.tsx` (`src/components/Explore.tsx` & `src/styles/shell.css`):**
    - Move the `['all', 'EN', 'UZ', 'RU']` language filter pills out of `.category-pills` into a compact `flex-shrink: 0` segmented pill group right next to `.search-wrap` so `🌐 UZ` and `🌐 RU` never wrap onto an orphan line.

## 3. ADD `ui-motion-prompts.pages.dev` MICRO-INTERACTIONS (`motion/react`)

Create `src/lib/motion.ts` with reusable spring configs (`snappy: { type: 'spring', stiffness: 420, damping: 26 }`, `liquidPill: { type: 'spring', stiffness: 380, damping: 28 }`, `card: { type: 'spring', stiffness: 280, damping: 24 }`, `jelly: { type: 'spring', stiffness: 520, damping: 14 }`) and wire:
1. **Sliding Pill Navigation (`layoutId`)**: Add `<motion.span layoutId="topbar-pill" transition={springs.liquidPill} />` in `Topbar.tsx` and segmented switches so active tabs glide like liquid.
2. **Bookmark & Poll Jelly Squish**: Animate `.bookmark-btn` and `.poll-option` with tactile spring press (`whileTap={{ scale: 0.92 }}`) and animated poll percentage bars (`transition={{ type: 'spring', stiffness: 260, damping: 26 }}`).
3. **3D Holographic Tilt & Glare on Student Passport & Active QR Passes (`Passes.tsx`)**: Add subtle pointer-tracked 3D tilt (`rotateX`, `rotateY` max `±4deg`) and a moving radial glare overlay on `.passport-card` and `.pass-card`.
4. **Error Shake on Invalid Ticket Code (`Organizer.tsx`)**: Shake the manual verification input (`x: [0, -10, 10, -6, 6, 0]`) when `verifyTicketCode` returns `ok: false`.
```