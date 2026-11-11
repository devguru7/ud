# Визуальный и технический аудит v4.0 (`ud-main(2).zip` / `github.com/devguru7/ud`) + Master Prompt до идеала (v5.0)

Я распаковал `ud-main(2).zip`, проверил все изменения кода и изучил реальные рендеры экранов (`r1-cards.png`, `r1-timeline-scrolled.png`, `v3-post-modal.png`, `v4-role-modal.png`, `s3-clubs.png`, `s4-organizer.png`, `s6-mobile.png`).

Все 14 багов прошлой версии (кнопки `QR`/`Edit` на карточках, сетка часов таймлайна Бошлик, Firebase повторная синхронизация, ID координатора Фирдавса `usr_1` и анимации `motion/react`) успешно внедрены. Но на реальных скриншотах рендера стали видны **12 тонких визуальных дефектов верстки (наезды плашек, слипание заголовков, обрезка чипов)** и **8 функциональных точек роста**, которые отделяют сайт от уровня дорогого коммерческого продукта.

---

## ЧАСТЬ 1. 12 визуальных дефектов, обнаруженных прямо на скриншотах рендера

| № | Где видно (скриншот + файл) | Что именно сломано визуально | Как исправить в CSS/JSX |
| :--- | :--- | :--- | :--- |
| **1** | Скриншот `r1-cards.png`<br>(`UI.tsx` + `EventCard.tsx` + `base.css`) | **Плашка `EN` на обложке карточки прыгает на второй этаж**:<br>В правом верхнем углу обложки `.poster-top-right` лежат два чипа (`BOSHLIK` и `EN`), а справа от них добавлен `padding-right: 38px` под кнопку закладки `.bookmark-btn`. Из-за нехватки места `.poster-top-right` (`flex-wrap: wrap`) переносит чип `EN` на вторую строчку вниз, и он висит посередине обложки! Кроме того, слово `BOSHLIK` дублируется дважды на одной и той же обложке (сверху `BOSHLIK` и снизу `BOSHLIK • ROOM 204`). | В `UI.tsx` в компоненте `Poster` убрать лишний дублирующий чип `BOSHLIK` из `.poster-top-right` (оставив там только аккуратный чип языка `EN` или `UZ` + закладку `.bookmark-btn` рядом в одну линию без `flex-wrap`), так как точная локация `BOSHLIK • ROOM 204` уже красиво выведена на обложке! |
| **2** | Скриншот `r1-cards.png`<br>(`EventCard.tsx` + `shell.css`) | **Переполнение строки организатора `.event-host` на карточке**:<br>Когда у события длинный бейдж роли (`FINTECH CASE COORDINATOR` или `SPORTS UNION PRESIDENT`) + соорганизатор (`+ AGROBANK HUB`), имя клуба сжимается до `UF Soli...`, а правая рубрика обрезается на полуслове (`• Acade`, `• Debate & S`, `• Spo`). | Разделить `.event-host` или вынести бейдж роли создателя (`createdByRoleTitle`) и категорию в аккуратную компактную подстроку либо скрывать текстовый дубль категории в `.event-host`, так как цветной `CategoryBadge` уже стоит в футере карточки! Тогда имя организатора (`Soliyev Firdavs` / `UDEA FinTech Society`) никогда не будет обрезаться до `Soli...`. |
| **3** | Скриншоты `v3-post-modal.png` и `v4-role-modal.png`<br>(`Posts.tsx`, `Clubs.tsx`, `drawer.css`) | **Слипание надзаголовка `span.mono.subtle` и заголовка `h2` в шапке модальных окон**:<br>На скриншоте `v4-role-modal.png` видно: `PART 2 · DYNAMIC ROLE BUILDER & DELEGATION ENGINEUDEA FinTech & Quant Society` — оба элемента идут в одну строку без пробела! То же самое в `v3-post-modal.png`: `BOSHLIK CAMPUS FEED & TELEGRAM STUDIOPublish Campus Post / Recap`. Причина: у `div` внутри `.panel-head` нет `display: flex; flex-direction: column;`, а `span` и `h2` рендерятся в потоке впритык. | В `src/styles/drawer.css` (и `organizer.css`) добавить:<br>`.panel-head > div:first-child { display: flex; flex-direction: column; gap: 3px; }`<br>`.panel-head .mono.subtle { display: block; }` |
| **4** | Скриншот `r1-timeline-scrolled.png`<br>(`Explore.tsx` + `shell.css`) | **Обрезка текста по вертикали внутри цветных блоков расписания `.timeline-event-block`**:<br>Полоса `.timeline-bar-track` имеет высоту всего `36px`, а блок `.timeline-event-block` внутри (`height: 30px`) пытается вместить 2 строки (`strong` 10.5px + `span.mono` 8.5px). Из-за этого верхняя и нижняя часть букв (`ACCA F3 Financial Accountin`, `Python, Pandas & SQ`) срезается! | Увеличить высоту `.timeline-bar-track` с `36px` до `46px` и задать для `.timeline-event-block` `padding: 4px 10px; line-height: 1.2; gap: 2px;`, чтобы и название ивента, и время `16:00–18:00` читались свободно с запасом воздуха. |
| **5** | Скриншот `r1-timeline-scrolled.png`<br>(`Posts.tsx` + `shell.css`) | **Двойные иконки на бейджах постов и кнопок**:<br>На скриншоте видно: `🔔 📢 CALL FOR COORDINATORS`, `✨ ⚡ LAST SPOT LEFT`, `📲 📲 COPY TG`, `✨ ✨ Auto-Write Draft`. Причина: в `badgeText` и тексте кнопок уже стоит эмодзи (`📢`, `⚡`, `✨`), и перед ним еще раз рендерится SVG `<Icon />`! | Убрать дублирующие эмодзи из строк там, где уже стоит `<Icon />`, или не рендерить `<Icon />`, если строка уже начинается с эмодзи. |
| **6** | Скриншот `s4-organizer.png`<br>(`Organizer.tsx` + `organizer.css`) | **Слипание слов в заголовках карточек с иконками (`panel-head h2`) и селекторе ивента**:<br>На скриншоте `s4-organizer.png` видно: `InstantTelegrambroadcast` (без пробелов!) и `Python, Pandas & SQL PeerStudy Sprint —TUE10NOV`. Причина: `font-family: 'Plus Jakarta Sans'` при отрицательном `letter-spacing: -0.02em` и `display: inline-flex` в заголовках съедает пробелы. | Убрать избыточный отрицательный `letter-spacing` у `.panel-head h2` и `.org-select select`, задав `letter-spacing: -0.01em; word-spacing: 0.04em;`. |
| **7** | Скриншот `s3-clubs.png`<br>(`Clubs.tsx` + `organizer.css`) | **Сплющенная ссылка `View Roles →` в 3 этажа и обрезанные ФИО в ростере**:<br>В карточке клуба заголовок `DELEGATED ROLES & TEAM` зажимает кнопку `View Roles →` так, что она ломается на 3 узкие строчки (`View` / `Roles` / `→`). А в `v4-role-modal.png` подпись `ELECTED CLUB PRESIDENT · FULL CLUB AUTHORI...` и `BSC (HONS) INTERNATIONAL FINANCE AND BANKI...` упирается в правую границу карточки без отступа. | Задать для `.club-roster-head .link-btn { white-space: nowrap; flex-shrink: 0; }`, а для `.roster-row-head > div { min-width: 0; overflow: hidden; }` и `.roster-row-head .mono.subtle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`. |
| **8** | Скриншот `s6-mobile.png`<br>(`Topbar.tsx` + `shell.css`) | **Двойная строка шапки в режиме Telegram Mini App (`phone-frame`)**:<br>На скриншоте телефона под черной шапкой Telegram (`UDEA Pulse Bot`) идет белая шапка `.topbar`, которая переносится в 2 этажа (сверху логотип `UDEA Pulse`, а под ним 4 иконки с пустым местом справа), съедая 110px высоты экрана телефона! | В `.phone-frame .topbar-inner` запретить перенос строки (`flex-wrap: nowrap; padding: 8px 12px;`), чтобы логотип `UDEA Pulse` слева и компактные иконки `.mobile-topbar-utils` справа стояли строго в одну аккуратную линию высотой `48px`! |
| **9** | Скриншоты `s1-explore.png`, `s3-clubs.png`, `s4-organizer.png`<br>(`Topbar.tsx` + `shell.css`) | **Обрезка центральной панели вкладок `.topbar-tabs` на средних экранах**:<br>На скриншотах видно, что центральный блок навигации сжимается до одной обрезанной кнопки (`Explore`, `Clubs & Rol`, `izer & Admin`) из-за того, что на брейкпоинте `1280px` в `.topbar-inner` не хватает ширины для всех правых контролов. | В `shell.css` показывать короткие подписи вкладок `.nav-label-short` (`Explore`, `Clubs`, `Passes`, `Studio`) уже при `@media (max-width: 1720px)`, а селектор зон `.zone-select` в шапке скрывать (он уже есть в виде красивой ленты чипов прямо под календарем в `Explore.tsx`!). Тогда все 4 вкладки в шапке всегда будут видны целиком! |
| **10** | Скриншот `v3-post-modal.png`<br>(`Posts.tsx` + `organizer.css`) | **Обрезка четвертой кнопки в переключателе формата поста `.track-switch`**:<br>В `PostModal` переключатель `Post Format` содержит 4 длинных названия, и четвертая кнопка (`Campus Poll & Discussion`) обрезается справа на `Campu`. | Сократить подписи табов в `PostModal` до емких: `📢 Announcement`, `🚀 Event Promo`, `🏆 Event Recap`, `📊 Campus Poll` и добавить `flex-wrap: wrap` для `.post-studio-form .track-switch`. |
| **11** | Скриншот `r1-timeline-scrolled.png`<br>(`Explore.tsx` + `shell.css`) | **Перенос чипов языка (`UZ`, `RU`) на сиротскую вторую строку и обрезка `Search` placeholder**:<br>В `.filter-row` чипы категорий и чипы языков (`All Langs`, `EN`, `UZ`, `RU`) лежат в одном контейнере, из-за чего `UZ` и `RU` падают на новую строку, а в поле поиска текст обрезается на `Search events, clubs, rooms, speal`. | Вынести фильтр языка ивентов в компактный сегментированный переключатель рядом с поиском, а ширину `.search-wrap` увеличить до `min-width: 290px`. |
| **12** | Скриншот `r1-timeline-scrolled.png`<br>(`Explore.tsx`) | **При открытии шахматки `BoshlikRoomsTimeline` верхняя часть карточки прилипает к шапке при скролле**: | Добавить `scroll-margin-top: 84px;` и аккуратную интерактивную сетку вертикальных линий по часам (`09:00`, `11:00`, `13:00`, `15:00`, `17:00`, `19:00`, `21:00`) внутри `.timeline-bar-track`, чтобы визуально было видно деление дня по часам. |

---

## ЧАСТЬ 2. Что еще добавить из функций, чтобы платформа стала максимальной (v5.0)

Помимо визуальной чистки, давай добавим **6 мощных продуктовых функций**, которых сейчас не хватает для полного цикла работы в университете:

1. **Клик по конкретному часу на шахматке аудиторий Бошлик (`Interactive Hourly Slot Picker`)**:
   * Сейчас в `BoshlikRoomsTimeline` если в зале `ROOM 204` уже есть один ивент с `16:00` до `18:00`, остальная часть полосы с `09:00` до `16:00` и с `18:00` до `21:00` не кликабельна!
   * Сделаем каждую полосу аудитории разделенной на часовые сегменты: даже если в зале уже есть 1 лекция, организатор может кликнуть на любое свободное окно до или после нее (например, на `10:00–12:00` в том же зале), и `HostStudio` откроется с этим залом, этой датой и этим свободным временем!
2. **Генератор афиши для скачивания в PNG / Story (`Download Poster for Instagram / Telegram`)**:
   * Студенческим клубам всегда нужно выкладывать афишу в сторис или чаты. Добавим в `EventDrawer` и `HostStudio` кнопку **`🖼️ Export Poster PNG`**, которая через HTML5 `<canvas>` за 1 секунду рисует и скачивает стильный фирменный постер события (с градиентом, названием, датой, аудиторией Бошлик и QR-кодом на регистрацию)!
3. **Интерактивный план-схема кампуса Бошлик (`Boshlik Campus Interactive Floor Map`)**:
   * Рядом с `Boshlik Rooms Timeline` добавим переключатель **`🗺️ Floor Map View`** — стильную интерактивную SVG-схему этажей кампуса Бошлик (`Ground: Sports Complex`, `Floor 1: Auditorium A1 & LRC Lounge`, `Floor 2: Hall B1 & Room 204`, `Floor 3: FinTech Lab 302`). На схеме каждая комната светится зеленым (если сейчас свободна) или цветом активного ивента (если там идет мероприятие), а при клике на комнату на карте показывается ее расписание, оборудование и кнопка `Book this Room`!
4. **Таблица лидеров кампуса и клубов (`Boshlik Leaderboard & Active Coordinators`)**:
   * Во вкладке `Passes` (или `Clubs`) добавим компактный блок **`🏆 Campus Activity Leaderboard`** — топ-5 самых активных студентов и координаторов UDEA по очкам `XP` и надежности посещения (`Reliability %`), а также рейтинг самых активных клубов месяца. Когда ты переключаешь аккаунт и проводишь чек-ин или создаешь событие, твой аккаунт в реальном времени поднимается в рейтинге!
5. **Массовый чек-ин и фильтр по факультетам в `Organizer.tsx` + Звуковой/Визуальный сигнал сканера**:
   * Добавим в `Organizer.tsx` быстрые кнопки `Check In All Confirmed (Demo)` и `Send Reminder to Unconfirmed`, а также статистику распределения записавшихся студентов по программам (`Finance 45%`, `Data Analytics 30%`, `AgriTech 15%`, `Foundation 10%`), чтобы организатор видел портрет аудитории.
6. **Быстрое приглашение человека по прямой ссылке роли (`Share Role Invite Link`)**:
   * В `RoleManagerModal` и `HostStudio` добавим кнопку **`🔗 Copy Role Invite Link`** (`t.me/udea_pulse_bot/app?startapp=invite_role_...`), которая копирует готовое приглашение для пересылки однокурснику в Telegram.

---

## ЧАСТЬ 3. Готовый Мастер-Промпт для ИИ (Скопируй и отправь для сборки v5.0)

Этот промпт написан специально под текущее состояние твоего репозитория `devguru7/ud` (`ud-main(2).zip`):

```markdown
You are a Principal React/TypeScript Architect and Staff UI/UX Designer performing the **v5.0 Perfection & Feature Upgrade** on the **UDEA Pulse** codebase (`devguru7/ud`).

Based on visual inspection of the rendered application screenshots and code audit, execute every single CSS layout fix and functional enhancement below with 100% precision.

---

### PART 1: FIX ALL 12 VISUAL & CSS RENDERING DEFECTS SEEN IN SCREENSHOTS

1. **Fix `panel-head` Kicker & Title Collision (`src/styles/drawer.css`, `src/styles/organizer.css`)**:
   * In `RoleManagerModal` (`Clubs.tsx`) and `PostModal` (`Posts.tsx`), the `<span className="mono subtle">` kicker and `<h2>` title inside `.panel-head > div` render inline on the same line with zero space between them (e.g., `PART 2 · DYNAMIC ROLE BUILDER & DELEGATION ENGINEUDEA FinTech...`).
   * Fix in CSS:
     ```css
     .panel-head > div:first-child {
       display: flex;
       flex-direction: column;
       gap: 3px;
       min-width: 0;
     }
     .panel-head > div:first-child .mono {
       display: block;
     }
     ```
2. **Fix Topbar Tab Clipping on Desktop (`src/components/Topbar.tsx`, `src/styles/shell.css`)**:
   * At standard laptop widths (`1280px–1600px`), `.topbar-tabs` gets squeezed so only 1 clipped tab is visible!
   * Fix in `src/components/Topbar.tsx` & `src/styles/shell.css`:
     * Remove the redundant `.zone-select` dropdown from `Topbar.tsx` (since Boshlik Venue Zones already have a dedicated filter ribbon in `Explore.tsx`).
     * Switch `.nav-label-full` to `.nav-label-short` (`Explore`, `Clubs`, `Passes`, `Studio`) at `@media (max-width: 1760px)` so all 4 primary navigation tabs and their numeric badges remain 100% visible without horizontal scrolling or clipping on any desktop/laptop screen!
3. **Fix Mobile / Telegram Mini App 2-Row Topbar (`src/styles/organizer.css`, `src/styles/shell.css`)**:
   * In `.phone-frame .topbar-inner`, the brand logo and `.mobile-topbar-utils` currently wrap onto 2 stacked rows, wasting vertical screen space.
   * Enforce `flex-wrap: nowrap; justify-content: space-between; padding: 8px 12px;` on `.phone-frame .topbar-inner` and `@media (max-width: 620px) .topbar-inner` so the brand emblem/title and mobile utility buttons always sit cleanly on a single 48px row.
4. **Fix `Poster` Top-Right Badge Wrapping & Duplicate "BOSHLIK" Pill (`src/components/UI.tsx`, `src/styles/base.css`, `src/styles/shell.css`)**:
   * On `EventCard`, `.poster-top-right` currently renders both `BOSHLIK` and `EN`, which wraps `EN` onto a second vertical line next to `.bookmark-btn`, while `BOSHLIK • ROOM 204` is already shown at the bottom of the cover!
   * In `src/components/UI.tsx` (`Poster`), only render the language pill (`<span className="glass-pill mono-pill lang-pill">{event.language}</span>`) inside `.poster-top-right` (or only show `ONLINE` if `event.campus === 'Online'`). Keep `.poster-top` single-line (`flex-wrap: nowrap`) with `padding-right: 38px` on `.event-cover .poster-top` so the language badge and bookmark icon sit side-by-side in one crisp horizontal row.
5. **Fix `.event-host` Text Truncation on `EventCard.tsx` (`src/components/EventCard.tsx`, `src/styles/shell.css`)**:
   * Currently `.event-host` packs Avatar + Host Name + Co-host badge + Verified icon + Role badge + Dot + Category label all into one narrow line, truncating the host name to `Soli...` and the category to `• Acade`.
   * Remove the redundant trailing `.host-sep` and `.host-cat` from `.event-host` in `EventCard.tsx` (since `<CategoryBadge>` is already rendered in `.event-footer`!). Give `.host-name` clean breathing room so club and host names are readable.
6. **Fix Vertical Text Clipping in `BoshlikRoomsTimeline` Bars (`src/styles/shell.css`)**:
   * In `r1-timeline-scrolled.png`, `.timeline-bar-track` is `36px` tall, which clips the top and bottom of the 2-line `.timeline-event-block` text (`ACCA F3 Financial Accountin` / `16:00–18:00`).
   * Increase `.timeline-bar-track` height to `48px`, add subtle vertical hourly grid lines in its background (`repeating-linear-gradient(90deg, transparent, transparent calc(100% / 12 - 1px), var(--border-hairline) calc(100% / 12))`), and set `.timeline-event-block { top: 4px; bottom: 4px; padding: 3px 9px; line-height: 1.18; gap: 1px; }`.
7. **Fix Double Emojis / Icons in `Posts.tsx`**:
   * Remove duplicate leading emojis when an `<Icon />` is already rendered inside the same badge or button (e.g., change `<Icon name="spark" size={14} /> ✨ Auto-Write Draft` to `<Icon name="spark" size={14} /> Auto-Write Draft`, and in `PostCard` do not render `<Icon name={typeMeta.icon} />` if `post.badgeText` already starts with an emoji).
   * In `PostModal` (`Posts.tsx`), shorten the 4 format switch labels to `📢 Announcement`, `🚀 Event Promo`, `🏆 Event Recap`, `📊 Campus Poll` so the 4th button never clips on the right edge.
8. **Fix Word Spacing in `Organizer.tsx` Headers & Club Roster Links (`src/styles/organizer.css`, `src/styles/drawer.css`)**:
   * In `s4-organizer.png`, `<h2><Icon name="telegram" /> Instant Telegram broadcast</h2>` renders with squished spaces (`InstantTelegrambroadcast`). Fix `.panel-head h2` by setting `letter-spacing: -0.01em; word-spacing: 0.04em;` and ensuring text inside `h2` is wrapped or spaced cleanly.
   * In `Clubs.tsx` / `organizer.css`, add `white-space: nowrap; flex-shrink: 0;` to `.club-roster-head .link-btn` so `View Roles →` / `Manage Roles →` never wraps into 3 vertical lines, and add `min-width: 0; overflow: hidden; text-overflow: ellipsis;` to `.roster-row-head > div` so long degree names inside `RoleManagerModal` never overflow the right border.

---

### PART 2: ADD 5 HIGH-IMPACT CAMPUS FEATURES FOR MAXIMUM COMPLETENESS

1. **Interactive Boshlik Campus Floor Map & Free-Gap Booking (`src/components/Explore.tsx`)**:
   * Inside the `BoshlikRoomsTimeline` card, add a view mode toggle between **`📊 Hourly Timeline Matrix`** and **`🗺️ Interactive Boshlik Floor Map`**:
     * **In Hourly Timeline Matrix**: Even when a room already has 1 booked event on that day (e.g., `Room 204` booked `16:00–18:00`), make the unoccupied background track clickable so clicking on a free morning/afternoon slot opens `HostStudio` pre-filled with that room, date, and a free `startTime` (`10:00` or `14:00`)!
     * **In Interactive Boshlik Floor Map**: Render a sleek architectural floor-by-floor visual grid of Boshlik Street 3 (`Ground: Sports Complex`, `Floor 1: Auditorium A1 & LRC Lounge`, `Floor 2: Hall B1 & Seminar Room 204`, `Floor 3: Computer & FinTech Lab 302`). Each room card shows live occupancy status for the selected date (`🟢 Free All Day` or `🟠 X Sessions Scheduled`), equipment pills, capacity, and a 1-click **`+ Book This Venue`** button!
2. **Downloadable PNG Event Poster Generator (`src/lib/utils.ts`, `src/components/EventDrawer.tsx`, `src/components/HostStudio.tsx`)**:
   * Add a helper function `downloadEventPosterPNG(event, room)` using HTML5 `<canvas>` (`1080×1350` Instagram/Telegram vertical poster format) that draws the category radial gradient, grid pattern, `"UDEA PULSE • BOSHLIK CAMPUS"` header, event title, subtitle, date/time, room code, host name, and a crisp call-to-action footer, then triggers a `.png` file download!
   * Add a **`🖼️ Poster PNG`** download button in `EventDrawer.tsx` toolbar and `HostStudio.tsx` preview panel.
3. **Campus Leaderboard & Programme Breakdown Analytics (`src/components/Passes.tsx`, `src/components/Organizer.tsx`)**:
   * In `Passes.tsx`, add a **`🏆 Boshlik Campus XP & Coordinator Leaderboard`** card ranking top students and coordinators (`Timur Alimov`, `Malika Karimova`, `Soliyev Firdavs`, `Diyora Rustamova`, `Sardorbek Aliev`, plus any newly created student accounts) with their live XP, organized events count, and reliability score, highlighting the active persona's rank!
   * In `Organizer.tsx`, add a **Faculty / Programme Breakdown Bar** (`Finance`, `Data Analytics`, `Management`, `AgriTech`, `Foundation`) showing the percentage distribution of registered students for the selected event, plus a 1-click **`✓ Check In All Confirmed (Demo Batch)`** button.
4. **Shareable Role & Team Invite Links (`src/components/Clubs.tsx`, `src/components/Organizer.tsx`)**:
   * In `RoleManagerModal` (`Clubs.tsx`) and `Connected Event Team` (`Organizer.tsx`), add a **`🔗 Copy Role Invite Link`** button that copies a deep link (`https://t.me/udea_pulse_bot/app?startapp=role_invite_...`) and shows a Telegram toast.
```