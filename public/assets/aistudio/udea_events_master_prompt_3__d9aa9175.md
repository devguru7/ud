# Полный технический разбор версии v3.5 (`ud-main(1).zip` / `github.com/devguru7/ud`) и промпт для финальной полировки до v4.0

Я проверил каждую строчку нового архива `ud-main(1).zip`. В этой версии уже внедрены многие крупные блоки: удален сломанный `src/index.css`, подключены Firebase Auth + Firestore (`src/firebase.ts` и `firestore.rules`), добавлен колокольчик уведомлений, создание новых студенческих аккаунтов на лету, шахматка аудиторий Бошлик (`BoshlikRoomsTimeline`), создание команд (`Squads`), отзывы (`Feedback`), закладки и динамический паспорт студента.

Однако при построчной сверке JSX-компонентов, стилей `src/styles/shell.css`, логики `store.tsx` и правил `firestore.rules` обнаружились **14 конкретных багов верстки, логики и облачной синхронизации**, которые сейчас ломают внешний вид некоторых новых карточек и мешают сохранению данных в Firebase.

---

## ЧАСТЬ 1. 14 найденных багов в коде `ud-main(1).zip` и как их исправить

### А. Визуальные баги и наложения элементов (CSS vs JSX)

| № | Файл и строка | Что именно сломано в коде | Как исправить |
| :--- | :--- | :--- | :--- |
| **1** | `EventCard.tsx` (стр. 76, 146) + `shell.css` (стр. 1846, 1871) | **Тройное наложение кнопок на карточке события**:<br>1) Кнопка закладки `.bookmark-btn` имеет `position: absolute; top: 10px; right: 10px;` и ложится прямо поверх стеклянных бейджей `BOSHLIK` и `EN` внутри `.poster-top` (`top: 12px; right: 12px;`).<br>2) Блок быстрых кнопок организатора `.card-quick-tools` вставлен внутрь нижнего `.event-meta`, но в `shell.css` у `.card-quick-tools` стоит `position: absolute; left: 10px; bottom: 10px;`, из-за чего кнопки `QR` и `Edit` улетают в левый нижний угол всей карточки прямо поверх даты `THU 12 NOV`! | 1) Перенести `.bookmark-btn` в строку `.event-host` справа или сдвинуть `.poster-top-right` левее (`padding-right: 36px`), чтобы закладка никогда не перекрывала бейдж языка.<br>2) Убрать `position: absolute; left: 10px; bottom: 10px;` у `.card-quick-tools` в `shell.css`, сделав его аккуратным `display: inline-flex; margin-left: auto;`, либо разместить его внутри `.event-cover` в правом верхнем углу рядом с закладкой. |
| **2** | `Explore.tsx` (стр. 342–390) + `shell.css` (стр. 1922–1960) | **Поехавшая сетка шахматки аудиторий (`BoshlikRoomsTimeline`)**:<br>1) В `shell.css` у `.timeline-ruler` задано `grid-template-columns: 190px repeat(7, minmax(0, 1fr))` (ожидается 8 дочерних элементов), но в `Explore.tsx` внутри `.timeline-ruler` лежат только **2 элемента** (`span.timeline-room-col` и `div.timeline-track-head`), поэтому все 7 часов сжимаются в узкую первую колонку шириной 1/7 экрана!<br>2) У `.timeline-room-row` задано 3 колонки (`190px minmax(0, 1fr) auto`), хотя внутри только 2 элемента.<br>3) Кнопка `.timeline-free-btn` не имеет стилей в `shell.css` (в CSS написан класс `.timeline-empty-slot`, а в JSX — `.timeline-free-btn`). | В `shell.css` задать `.timeline-ruler { display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 12px; }`, добавить `.timeline-track-head { display: flex; justify-content: space-between; }`, изменить `.timeline-room-row` на `grid-template-columns: 190px minmax(0, 1fr);`, и прописать стили для `.timeline-free-btn` (на всю ширину полосы с пунктирной рамкой и подсветкой при наведении) и `.timeline-event-block.is-pending`. |
| **3** | `Topbar.tsx` (стр. 166, 208, 223, 255) + `shell.css` | **Отсутствуют CSS-классы `.row-between`, `.form-row-2`, `.btn-block`, `.muted-note`**:<br>В JSX-коде `Topbar.tsx` и `Clubs.tsx` активно используются классы `row-between`, `form-row-2`, `btn-block` и `muted-note`, но ни в одном CSS-файле они не объявлены! Из-за этого заголовки в колокольчике уведомлений и меню аккаунтов слипаются, а поля создания аккаунта не выстраиваются в 2 колонки. | Добавить в `src/styles/base.css`:<br>`.row-between { display: flex; align-items: center; justify-content: space-between; gap: 10px; }`<br>`.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }`<br>`.btn-block { width: 100%; }` |
| **4** | `Topbar.tsx` (стр. 270) | **Невидимый текст email в облачной панели**:<br>В `persona-cloud-bar` написано `style={{ color: 'var(--emerald)' }}`, но в `base.css` переменная называется `--signal-green`, а `--emerald` не существует! | Заменить `var(--emerald)` на `var(--signal-green)`. |

---

### Б. Логические баги в компонентах и хранилище (`src/components/*.tsx`, `src/lib/store.tsx`)

| № | Файл и строка | Что именно сломано в коде | Как исправить |
| :--- | :--- | :--- | :--- |
| **5** | `Organizer.tsx` (стр. 180) + `Passes.tsx` (стр. 15) | **Остался старый перепутанный ID `usr_4` в двух местах**:<br>1) В `Organizer.tsx` на пустом экране кнопка `"Switch to Soliyev Firdavs (Coordinator)"` все еще вызывает `app.setPersona('usr_4')` (переключая на Джасура Рахимова без прав!).<br>2) В `Passes.tsx` в константе `BASE_BADGES` бейджи `['FinTech Case Coordinator', 'Practice Session Lead', 'QR Door Verifier']` привязаны к `usr_4` (Джасуру) вместо `usr_1` (Фирдавсу). | 1) В `Organizer.tsx` (стр. 180) заменить `'usr_4'` на `'usr_1'`.<br>2) В `Passes.tsx` (стр. 15–16) поменять местами списки базовых бейджей для `usr_1` и `usr_4`. |
| **6** | `HostStudio.tsx` (стр. 221) | **Несуществующий ID клуба в `fillDemoDraft()`**:<br>При нажатии на кнопку `Auto-Fill Demo Event` в `coHostClubIds` записывается `['club_data']`, но в `seed.ts` такого клуба нет (есть `club_agrobank`, `club_agritech`, `club_acca`, `club_debate`). | Заменить `'club_data'` на `'club_agrobank'` в `fillDemoDraft()`. |
| **7** | `store.tsx` (стр. 956–966) | **Одинаковое время у автоматических пунктов расписания в `createEvent`**:<br>Если пользователь создал событие, не добавив вручную блоки в `Agenda`, код ставит обоим пунктам (`Doors open` и `Main session`) одно и то же время `draft.startTime`. | Вычислять время второго блока через `timeFromMinutes(minutesFromTime(draft.startTime) + 15)` и добавлять третий завершающий блок `Q&A & Networking` за 20 минут до `draft.endTime`. |
| **8** | `store.tsx` (стр. 566–605) | **Пропуск обновления билета в `promoteWaitlistEntry`**:<br>Когда организатор вручную нажимает кнопку `Promote Now` во вкладке `Waitlist` в `Organizer.tsx`, функция `promoteWaitlistEntry` переносит человека из `waitlistRoster` в `attendees`, но забывает обновить статус его билета в `state.tickets` с `'waitlisted'` на `'confirmed'`! | В `promoteWaitlistEntry` также обновлять соответствующий билет в `prev.tickets` (`status: 'confirmed'`, `seatNumber: e.registeredCount + 1`, `waitlistPosition: undefined`) и отправлять персональное уведомление `pushNotification`. |
| **9** | `Explore.tsx` (стр. 380–405) | **Клик по свободному залу в `BoshlikRoomsTimeline` не подставляет этот зал в `HostStudio`**:<br>Когда нажимаешь `Click to book AUDITORIUM A1` на таймлайне комнат, открывается `HostStudio`, но там по умолчанию остается выбранным `Room 204` (`rm_204`) и дата через 2 дня! | Добавить функцию `openStudioWithPreset({ roomId, date, startTime })` в `store.tsx`, чтобы клик по любой свободной полосе в `BoshlikRoomsTimeline` сразу открывал `HostStudio` с уже выбранной аудиторией и датой! |
| **10** | `Topbar.tsx` (стр. 295–315) | **На мобильном экране (`.mobile-topbar-utils`) пропал колокольчик уведомлений и переключатель языка**:<br>На десктопе колокольчик и язык `EN/UZ/RU` есть, а в мобильной шапке и в режиме `TG Mini App` они скрыты через `display: none` у `.topbar-utils`, а внутрь `.mobile-topbar-utils` их не добавили! | Добавить кнопку колокольчика уведомлений и компактный переключатель языка `EN/UZ/RU` внутрь `.mobile-topbar-utils` и мобильного меню профиля, чтобы в режиме Telegram Mini App все функции были доступны. |

---

### В. Критические баги облачной синхронизации Firebase / Firestore (`src/lib/store.tsx` + `firestore.rules`)

| № | Файл и строка | Что именно сломано в коде | Как исправить |
| :--- | :--- | :--- | :--- |
| **11** | `store.tsx` (стр. 415–432) + `firestore.rules` (стр. 253–275) | **Вторая и все последующие синхронизации с облаком (`Sync Now`) падают с `PERMISSION_DENIED`!**<br>Посмотри на `firestore.rules` для `/workspaces/{userId}`:<br>При `update` правило требует: `incoming().createdAt == existing().createdAt` и `affectedKeys().hasOnly(['personaId', 'theme', 'uiLang', 'payloadJson', 'updatedAt'])`.<br>Но в `store.tsx` функция `syncToCloud()` всегда вызывает `setDoc(doc(db, 'workspaces', uid), { ..., createdAt: serverTimestamp(), updatedAt: serverTimestamp() })` без проверки, существует ли документ! При втором клике на `Sync Now` `createdAt` перезаписывается новым `serverTimestamp()`, что нарушает правило неизменности `createdAt` в `firestore.rules`, и Firestore блокирует запрос! | В `syncToCloud()` сначала проверять существование документа (или хранить флаг `workspaceCreated`), либо при обновлении передавать `{ merge: true }` без перезаписи `createdAt`, а еще лучше — в `firestore.rules` в `match /workspaces/{userId}` разрешить `allow create, update: if isVerifiedUser() && request.auth.uid == userId && isValidWorkspace(incoming());` без блокировки повторного `setDoc`. |
| **12** | `store.tsx` (стр. 420–428) | **Облако сохраняет только счетчики вместо реальных данных, и нет загрузки из облака при входе (`loadFromCloud`)**:<br>Сейчас `syncToCloud` сохраняет в `payloadJson` только `{ followedClubs, savedEventIds, ticketsCount, eventsCount }`, но НЕ сохраняет созданные ивенты, посты, роли и билеты, а при входе в аккаунт ничего не загружает обратно из Firestore! | Сохранять в `payloadJson` полный слепок состояния `JSON.stringify(state)` и при входе пользователя (`onAuthStateChanged`) подгружать сохраненный слепок из `doc(db, 'workspaces', u.uid)`, чтобы данные реально синхронизировались между устройствами. |
| **13** | `index.html` + `store.tsx` | **Скрипт Telegram Mini App подключен в `index.html`, но нигде не вызывается в React**:<br>В `index.html` добавлен `<script src="https://telegram.org/js/telegram-web-app.js" async></script>`, но в `store.tsx` нет чтения `window.Telegram?.WebApp`. | В `AppProvider` при монтировании проверять `window.Telegram?.WebApp`: вызывать `.ready()`, `.expand()`, подхватывать цветовую схему Telegram и, если открыто внутри реального Telegram с `initDataUnsafe.user`, автоматически приветствовать пользователя по его Telegram-аккаунту и обрабатывать параметр `start_param` (`event_evt_1` или `checkin_...`) для мгновенного открытия нужного события! |
| **14** | `package.json` + `App.tsx` | **Библиотека `motion` установлена, но плавные анимации переходов еще не подключены в `App.tsx`, `EventDrawer.tsx` и `Explore.tsx`**: | Подключить `AnimatePresence` и `motion.div` из `motion/react` для плавной смены экранов в `App.tsx`, пружинного выезда шторки `EventDrawer.tsx` (справа на ПК и снизу вверх как Bottom Sheet в режиме `TG Mini App`) и анимированного раскрытия шахматки `BoshlikRoomsTimeline`. |

---

## ЧАСТЬ 2. Готовый мастер-промпт для финальной доводки `devguru7/ud` до идеала (v4.0)

Скопируй весь блок ниже и отправь его своему ИИ-кодеру — он точечно исправит все 14 пунктов в репозитории `devguru7/ud`:

```markdown
You are a Principal React/TypeScript Architect and Staff UI/UX Designer performing the final v4.0 perfection pass on the **UDEA Pulse** repository (`devguru7/ud`). Fix all 14 visual, state, CSS, and Firebase/Telegram integration bugs identified in the code audit below. Do not remove any existing features.

### 1. FIX CSS LAYOUT COLLISIONS & MISSING UTILITY CLASSES (`src/styles/base.css`, `src/styles/shell.css`, `src/components/EventCard.tsx`, `src/components/Explore.tsx`)
1. **Add Missing Utility Classes in `src/styles/base.css`**:
   * `Topbar.tsx` and `Clubs.tsx` use `.row-between`, `.form-row-2`, `.btn-block`, and `.muted-note`, which are currently missing from CSS! Add them cleanly to `src/styles/base.css`:
     ```css
     .row-between { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
     .form-row-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
     .btn-block { width: 100%; }
     .muted-note { font-size: 12px; color: var(--text-tertiary); }
     ```
   * In `src/components/Topbar.tsx` (line 270), replace `color: 'var(--emerald)'` with `color: 'var(--signal-green)'`.
2. **Fix Badge & Button Collisions on `EventCard.tsx` (`src/styles/shell.css`)**:
   * Currently `.bookmark-btn` (`position: absolute; top: 10px; right: 10px;`) overlaps on top of `.poster-top-right` (`BOSHLIK` and `EN` pills)! Fix this by adding `padding-right: 38px;` to `.event-cover .poster-top` so the language pill sits cleanly to the left of the bookmark button without ever colliding.
   * Currently `.card-quick-tools` (`QR` and `Edit` buttons) is rendered inside `.event-footer .event-meta`, but `shell.css` gives `.card-quick-tools` `position: absolute; left: 10px; bottom: 10px;`, causing the buttons to float directly over the date text! Remove `position: absolute; left: 10px; bottom: 10px;` from `.card-quick-tools` in `shell.css` and style it as an inline flex group (`display: inline-flex; align-items: center; gap: 4px; margin-left: 4px;`) with clean theme-aware pill styling.
3. **Fix Broken Grid in `BoshlikRoomsTimeline` (`src/components/Explore.tsx` & `src/styles/shell.css`)**:
   * In `shell.css`, `.timeline-ruler` has `grid-template-columns: 190px repeat(7, minmax(0, 1fr))` (expecting 8 children), while `Explore.tsx` renders 2 children (`.timeline-room-col` and `.timeline-track-head`), squishing all 7 hour labels into 1/7th of the bar!
   * Fix `.timeline-ruler` to `display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 12px; align-items: center;` and style `.timeline-track-head { display: flex; justify-content: space-between; padding: 0 6px; }`.
   * Fix `.timeline-room-row` to `display: grid; grid-template-columns: 190px minmax(0, 1fr); gap: 12px; align-items: center;`.
   * Add complete styling for `.timeline-free-btn` (full width/height inside `.timeline-bar-track`, dashed emerald border on hover, cursor pointer, subtle text) and `.timeline-event-block.is-pending` (amber dashed border).
   * When clicking a room's free bar in `BoshlikRoomsTimeline`, pass the selected `roomId` and `selectedDate` into `HostStudio` (via a `studioPreset` state in `store.tsx`) so `HostStudio` opens with that exact Boshlik room and date pre-selected!

### 2. FIX PERSONA ID BUGS, WAITLIST PROMOTION & AGENDA TIMESTAMPS (`src/components/Organizer.tsx`, `src/components/Passes.tsx`, `src/components/HostStudio.tsx`, `src/lib/store.tsx`)
1. **Fix Swapped `usr_4` / `usr_1` IDs**:
   * In `src/components/Organizer.tsx` (line 180), the empty-state button `"Switch to Soliyev Firdavs (Coordinator)"` calls `app.setPersona('usr_4')` (Jasur). Change it to `app.setPersona('usr_1')`.
   * In `src/components/Passes.tsx` (lines 14–16), swap `BASE_BADGES['usr_1']` and `BASE_BADGES['usr_4']` so Coordinator `Soliyev Firdavs (usr_1)` gets `['FinTech Case Coordinator', 'Practice Session Lead', 'QR Door Verifier']` and regular student `Jasur Rakhimov (usr_4)` gets `['Campus Explorer', 'Data Analytics Cohort']`.
2. **Fix Demo Draft Co-Host Club ID in `src/components/HostStudio.tsx` (Line 221)**:
   * In `fillDemoDraft()`, change `coHostClubIds: ['club_data']` to `coHostClubIds: ['club_agrobank']` (matching the actual club ID in `seed.ts`).
3. **Fix Default Agenda Timestamps in `src/lib/store.tsx` (`createEvent`)**:
   * When creating an event with no custom agenda items, compute distinct sequential times (`draft.startTime`, `timeFromMinutes(minutesFromTime(draft.startTime) + 15)`, and `timeFromMinutes(Math.max(minutesFromTime(draft.startTime) + 30, minutesFromTime(draft.endTime) - 20))`) instead of repeating `draft.startTime` twice.
4. **Fix Ticket Promotion in `promoteWaitlistEntry` (`src/lib/store.tsx`)**:
   * When manually promoting a waitlisted student in `promoteWaitlistEntry(eventId, waitlistId)`, also check `prev.tickets` for any waitlisted ticket matching `eventId` (and user ID extracted from `waitlistId` if `wl_usr_...`), flip its status from `'waitlisted'` to `'confirmed'`, assign a `seatNumber`, decrement remaining `waitlistPosition` numbers, and call `pushNotification()`.
5. **Mobile & Telegram Mini App Topbar Parity (`src/components/Topbar.tsx`)**:
   * Add the Notification Bell button (with unread badge count) and UI Language switcher (`EN / UZ / RU`) to `.mobile-topbar-utils` / mobile menu so mobile and Telegram Mini App users have 100% feature parity with desktop.

### 3. FIX FIREBASE FIRESTORE SYNC & TELEGRAM MINI APP SDK INTEGRATION (`src/lib/store.tsx`, `firestore.rules`)
1. **Fix Second-Sync `PERMISSION_DENIED` Bug in `syncToCloud` (`src/lib/store.tsx` & `firestore.rules`)**:
   * Currently `syncToCloud()` calls `setDoc(doc(db, 'workspaces', uid), { ..., createdAt: serverTimestamp(), updatedAt: serverTimestamp() })` on every click. On the second sync, `createdAt` changes, which violates `incoming().createdAt == existing().createdAt` in `firestore.rules`!
   * Fix `syncToCloud()` in `src/lib/store.tsx` to check if the document already exists (or use `getDocFromServer`/`getDoc` first): on first creation, set both `createdAt: serverTimestamp()` and `updatedAt: serverTimestamp()`; on subsequent updates, preserve `createdAt` (or use `updateDoc` with `{ personaId, theme, uiLang, payloadJson, updatedAt: serverTimestamp() }`), AND update `firestore.rules` so workspace upserts by the verified owner always succeed cleanly.
   * Also allow loading the saved workspace snapshot from Firestore when the user signs in!
2. **Wire Up Telegram WebApp SDK & Deep-Link Start Params (`src/lib/store.tsx`)**:
   * On app mount, check `const tg = (window as any).Telegram?.WebApp`. If present, call `tg.ready()` and `tg.expand()`.
   * Also check `URLSearchParams(window.location.search).get('startapp')` or `tg?.initDataUnsafe?.start_param`:
     * If it starts with `event_`, automatically open that event in `EventDrawer`!
     * If it starts with `post_`, switch `exploreMode` to `'posts'`!
3. **Smooth Animations with `motion/react` & Bottom-Sheet Mobile Drawer**:
   * In `.app-shell.is-mobile .drawer` (`src/styles/organizer.css`), style the event drawer as a sleek bottom sheet (`align-self: flex-end; border-radius: 28px 28px 0 0; max-height: 88%;`) and add smooth view transitions.
```