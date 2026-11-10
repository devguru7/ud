import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import EventCard from './EventCard';
import { PostCard } from './Posts';
import { Avatar, CapacityBar, CategoryBadge, Icon, Mono, SectionHeader } from './UI';
import {
  CATEGORY_LABEL,
  MONTHS,
  MONTHS_SHORT,
  addDays,
  dayLabel,
  eventSeatsLeft,
  fmtCountdown,
  isFull,
  isoDate,
  longDate,
  monthMatrix,
  parseDateTime,
  pct,
  WEEKDAYS,
} from '../lib/utils';
import type { Category, EventItem, ExploreFeedMode } from '../types';
import { ROOMS } from '../lib/seed';
import { BOSHLIK_ZONES } from '../lib/labels';

const CATEGORIES: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'All Categories' },
  { id: 'fintech', label: 'FinTech & Agrobank' },
  { id: 'tech', label: 'IT, AI & AgriTech' },
  { id: 'academic', label: 'Academic & ACCA' },
  { id: 'sports', label: 'Sports & Cybersport' },
  { id: 'culture', label: 'Debate & Social' },
];

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Spotlight() {
  const app = useApp();
  const now = useNow();
  const event = app.state.events.find((e) => e.featured) ?? app.state.events[0];
  if (!event) return null;
  const ticket = app.myTicket(event.id);
  const room = ROOMS.find((r) => r.id === event.roomId);
  const start = parseDateTime(event.date, event.startTime);
  const countdown = fmtCountdown(start.getTime() - now);
  const speakers = event.agenda.map((a) => a.speaker).filter((s, i, arr) => s && arr.indexOf(s) === i).slice(0, 3);
  const seatsLeft = eventSeatsLeft(event);
  const percent = pct(event.registeredCount, event.capacity);
  const full = isFull(event);

  const handleClaim = () => {
    if (ticket) {
      app.setView('passes');
      return;
    }
    app.rsvp(event.id);
  };

  return (
    <section className={`spotlight cat-${event.category}`} aria-label="Flagship spotlight">
      <div className="spotlight-bg">
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className="spotlight-grid" />
      </div>
      <div className="spotlight-content">
        <div className="spotlight-eyebrow">
          <span className="partner-chip">BOSHLIK CAMPUS FLAGSHIP</span>
          <span className="partner-chip">COVENTRY VALIDATED</span>
          <span className="partner-chip">CERTIFICATE + 15M UZS PRIZE POOL</span>
        </div>

        <h1 className="spotlight-title">{event.title}</h1>
        <p className="spotlight-sub">{event.subtitle}</p>

        <div className="spotlight-countdown">
          <span className="mono countdown-label">STARTS IN</span>
          <span className="mono countdown-value">{countdown}</span>
          <span className="mono countdown-date">{dayLabel(event.date)} • {event.startTime}–{event.endTime}</span>
        </div>

        <div className="spotlight-chips">
          {speakers.map((s) => (
            <span key={s} className="speaker-chip">
              <Avatar name={s ?? 'UDEA'} color="#10B981" size={20} />
              {s}
            </span>
          ))}
          <span className="speaker-chip ghost-chip">
            <Icon name="pin" size={13} /> {room?.name ?? 'Boshlik Campus'}
          </span>
        </div>

        <div className="spotlight-capacity">
          <div className="spotlight-capacity-head">
            <Mono>{event.registeredCount} / {event.capacity} REGISTERED</Mono>
            <span className={`capacity-note ${full ? 'cap-full' : seatsLeft <= 2 ? 'cap-almost' : 'cap-open'}`}>
              {full ? 'Full • waitlist open' : `${seatsLeft} spot${seatsLeft === 1 ? '' : 's'} left!`}
            </span>
          </div>
          <div className="capacity-track on-dark">
            <div className={`capacity-fill ${full ? 'cap-full' : seatsLeft <= 2 ? 'cap-almost' : 'cap-open'}`} style={{ width: `${Math.max(percent, 4)}%` }} />
          </div>
        </div>

        <div className="spotlight-actions">
          <button className={`btn ${ticket ? 'btn-glass' : 'btn-primary'} btn-lg`} onClick={handleClaim}>
            {ticket ? (
              <>
                <Icon name="qr" size={17} /> {ticket.status === 'waitlisted' ? 'View Waitlist Pass' : 'Your Pass Is Ready'}
              </>
            ) : (
              <>
                Claim My Spot <Icon name="arrow" size={17} />
              </>
            )}
          </button>
          <button className="btn btn-ghost-glass btn-lg" onClick={() => app.openEvent(event.id)}>
            Event details <Icon name="chevron" size={14} />
          </button>
        </div>

        <div className="spotlight-foot mono">
          <span>BOSHLIK CAMPUS • {room?.code ?? 'TBA'}</span>
          <span className="dotsep" />
          <span>{event.language}</span>
          <span className="dotsep" />
          <span>TEAM FINDER ON</span>
          <span className="dotsep" />
          <span>CAP {event.capacity}</span>
        </div>
      </div>
    </section>
  );
}

function CalendarCard() {
  const app = useApp();
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const cells = monthMatrix(cursor.year, cursor.month);
  const selected = app.state.filters.date;

  const approved = app.state.events.filter((e) => e.approvalStatus === 'approved' && !e.past);
  const byDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    approved.forEach((e) => {
      map[e.date] = map[e.date] ? [...map[e.date], e] : [e];
    });
    return map;
  }, [approved]);

  const shift = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  return (
    <div className="card calendar-card">
      <div className="calendar-head">
        <div>
          <span className="mono subtle">BOSHLIK CAMPUS CALENDAR</span>
          <h2>{MONTHS[cursor.month]} {cursor.year}</h2>
        </div>
        <div className="calendar-nav">
          <button className="icon-btn sm" onClick={() => shift(-1)} aria-label="Previous month">
            <Icon name="chevron" size={14} className="rot-180" />
          </button>
          <button className="icon-btn sm" onClick={() => shift(1)} aria-label="Next month">
            <Icon name="chevron" size={14} />
          </button>
        </div>
      </div>

      <div className="calendar-grid calendar-weekdays">
        {WEEKDAYS.map((d) => (
          <span key={d} className="mono">{d.slice(0, 1)}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`empty-${i}`} className="cal-day is-empty" />;
          const dayEvents = byDate[iso] ?? [];
          const cats = Array.from(new Set(dayEvents.map((e) => e.category))).slice(0, 3);
          const isToday = iso === isoDate();
          const isSelected = selected === iso;
          return (
            <button
              key={iso}
              className={`cal-day ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${dayEvents.length ? 'has-events' : ''}`}
              onClick={() => app.setFilters({ date: isSelected ? null : iso })}
              title={`${dayLabel(iso)} • ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
            >
              <span>{Number(iso.slice(-2))}</span>
              <span className="cal-dots">
                {cats.map((c) => (
                  <i key={c} className={`cal-dot cat-${c}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="calendar-foot">
        {selected ? (
          <button className="date-chip" onClick={() => app.setFilters({ date: null })}>
            {dayLabel(selected)} <span className="mono">{approved.filter((e) => e.date === selected).length} EVENTS</span>
            <Icon name="close" size={12} />
          </button>
        ) : (
          <span className="calendar-hint">Tap any date to filter the feed.</span>
        )}
        <div className="cal-legend">
          {(['fintech', 'tech', 'academic', 'sports', 'culture'] as Category[]).map((c) => (
            <span key={c} className={`legend-dot cat-${c}`} title={CATEGORY_LABEL[c]} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Radar() {
  const app = useApp();
  const now = useNow(30000);
  const approved = app.state.events
    .filter((e) => e.approvalStatus === 'approved' && !e.past)
    .map((e) => ({ e, start: parseDateTime(e.date, e.startTime).getTime() }))
    .filter((x) => x.start + 3 * 3600 * 1000 >= now)
    .sort((a, b) => a.start - b.start);
  const next24 = approved.filter((x) => x.start - now <= 24 * 3600 * 1000);
  const list = (next24.length ? next24 : approved).slice(0, 4);

  return (
    <div className="card radar-card">
      <div className="radar-head">
        <div className="radar-title">
          <span className="pulse-dot" />
          <h2>Happening Next on Boshlik Campus</h2>
        </div>
        <span className="mono subtle">{next24.length ? 'NEXT 24H' : 'UPCOMING'}</span>
      </div>
      {list.length === 0 && <p className="radar-empty">No upcoming sessions in the window. Check the calendar for later dates.</p>}
      <div className="radar-list">
        {list.map(({ e }) => {
          const room = ROOMS.find((r) => r.id === e.roomId);
          return (
            <button key={e.id} className={`radar-item cat-${e.category}`} onClick={() => app.openEvent(e.id)}>
              <span className="radar-time mono">{e.startTime}</span>
              <span className="radar-main">
                <strong>{e.title}</strong>
                <span className="radar-meta mono">
                  BOSHLIK • {room?.code ?? 'ONLINE'}
                  <i className="dotsep" />
                  {e.language}
                </span>
              </span>
              <span className="radar-cat" title={CATEGORY_LABEL[e.category]} />
            </button>
          );
        })}
      </div>
      <div className="radar-foot mono">
        <span className="live-mini"><i /> LIVE FEED SYNCED</span>
        <span>{app.state.events.filter((e) => e.approvalStatus === 'approved').length} APPROVED</span>
      </div>
    </div>
  );
}

function DateRibbon() {
  const app = useApp();
  const selected = app.state.filters.date;
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(i);
    return { iso: isoDate(d), date: d };
  });
  const approved = app.state.events.filter((e) => e.approvalStatus === 'approved' && !e.past);

  return (
    <div className="ribbon-wrap">
      <div className="ribbon">
        <button
          className={`ribbon-day all-day ${selected === null ? 'is-selected' : ''}`}
          onClick={() => app.setFilters({ date: null })}
        >
          <span className="mono">ALL</span>
          <strong>14</strong>
          <em>days</em>
        </button>
        {days.map(({ iso, date }) => {
          const events = approved.filter((e) => e.date === iso);
          const cats = Array.from(new Set(events.map((e) => e.category))).slice(0, 3);
          return (
            <button
              key={iso}
              className={`ribbon-day ${selected === iso ? 'is-selected' : ''} ${iso === isoDate() ? 'is-today' : ''}`}
              onClick={() => app.setFilters({ date: selected === iso ? null : iso })}
            >
              <span className="mono">{WEEKDAYS[date.getDay()]}</span>
              <strong>{date.getDate()}</strong>
              <span className="mono">{MONTHS_SHORT[date.getMonth()]}</span>
              <em>{events.length} event{events.length === 1 ? '' : 's'}</em>
              <span className="ribbon-dots">
                {cats.map((c) => (
                  <i key={c} className={`cat-${c}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Explore() {
  const app = useApp();
  const { filters } = app.state;
  const approved = app.state.events.filter((e) => e.approvalStatus === 'approved' && !e.past);

  const scoped = approved.filter((e) => {
    if (filters.date && e.date !== filters.date) return false;
    if (filters.category !== 'all' && e.category !== filters.category) return false;
    if (filters.campus !== 'all' && e.campus !== filters.campus) return false;
    // Part 1: Boshlik Venue Zone Filter
    if (filters.zone !== 'all') {
      const rm = ROOMS.find((r) => r.id === e.roomId);
      if (rm?.zone !== filters.zone) return false;
    }
    if (filters.language !== 'all' && e.language !== filters.language) return false;
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const room = ROOMS.find((r) => r.id === e.roomId);
      const haystack = [
        e.title,
        e.subtitle,
        e.description,
        e.hostName,
        e.createdByRoleTitle ?? '',
        room?.name ?? '',
        room?.code ?? '',
        CATEGORY_LABEL[e.category],
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const filteredPosts = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return [...app.state.posts]
      .filter((p) => {
        if (filters.category !== 'all') {
          const club = p.clubId ? app.state.clubs.find((c) => c.id === p.clubId) : undefined;
          const ev = p.linkedEventId ? app.state.events.find((e) => e.id === p.linkedEventId) : undefined;
          const cat = club?.category ?? ev?.category;
          if (cat && cat !== filters.category) return false;
        }
        if (q) {
          const hay = `${p.title} ${p.body} ${p.authorName} ${p.authorRoleTitle}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [app.state.posts, filters.category, filters.search, app.state.clubs, app.state.events]);

  const trackCounts = {
    all: scoped.length,
    official: scoped.filter((e) => e.eventType === 'official').length,
    peer: scoped.filter((e) => e.eventType === 'peer_meetup').length,
  };

  const feed = scoped
    .filter((e) => (filters.track === 'all' ? true : e.eventType === filters.track))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  const activeFilterCount =
    (filters.date ? 1 : 0) +
    (filters.category !== 'all' ? 1 : 0) +
    (filters.campus !== 'all' ? 1 : 0) +
    (filters.zone !== 'all' ? 1 : 0) +
    (filters.language !== 'all' ? 1 : 0) +
    (filters.search.trim() ? 1 : 0) +
    (filters.track !== 'all' ? 1 : 0);

  return (
    <div className="explore">
      <div className="bento-hero">
        <Spotlight />
        <aside className="hero-side">
          <CalendarCard />
          <Radar />
        </aside>
      </div>

      <section className="feed-section">
        <SectionHeader
          icon="calendar"
          title="Boshlik Campus Activity & Community Pulse"
          subtitle="Official university events, delegated coordinator sessions, student peer meetups, and Telegram announcements."
          action={
            <div className="feed-actions">
              <div className="track-switch" role="tablist" aria-label="Feed mode switcher">
                {(
                  [
                    { id: 'combined', label: '⚡ Combined Pulse' },
                    { id: 'events', label: `🗓️ Events (${feed.length})` },
                    { id: 'posts', label: `📢 Posts & Recaps (${filteredPosts.length})` },
                  ] as { id: ExploreFeedMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={app.exploreMode === m.id ? 'is-active' : ''}
                    onClick={() => app.setExploreMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => app.openPostModal()}>
                <Icon name="telegram" size={14} /> + Publish Post
              </button>
              {activeFilterCount > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={app.resetFilters}>
                  <Icon name="close" size={13} /> Clear filters ({activeFilterCount})
                </button>
              )}
            </div>
          }
        />

        <DateRibbon />

        {/* Part 1: Boshlik Venue Zone Filter Ribbon */}
        <div className="zone-ribbon" role="group" aria-label="Boshlik Campus Venue Zones">
          {BOSHLIK_ZONES.map((z) => (
            <button
              key={z.id}
              type="button"
              className={`pill ${filters.zone === z.id ? 'is-active' : ''}`}
              onClick={() => app.setFilters({ zone: z.id })}
            >
              <Icon name="pin" size={12} /> {z.label}
            </button>
          ))}
        </div>

        <div className="filter-bar">
          <div className="track-switch" role="tablist" aria-label="Event track">
            <button
              className={filters.track === 'all' ? 'is-active' : ''}
              onClick={() => app.setFilters({ track: 'all' })}
              role="tab"
              aria-selected={filters.track === 'all'}
            >
              All Campus Activity <b className="count">{trackCounts.all}</b>
            </button>
            <button
              className={filters.track === 'official' ? 'is-active' : ''}
              onClick={() => app.setFilters({ track: 'official' })}
              role="tab"
              aria-selected={filters.track === 'official'}
            >
              🏛️ Official University & Club Events <b className="count">{trackCounts.official}</b>
            </button>
            <button
              className={filters.track === 'peer' ? 'is-active' : ''}
              onClick={() => app.setFilters({ track: 'peer' })}
              role="tab"
              aria-selected={filters.track === 'peer'}
            >
              ⚡ Student Peer Meetups <b className="count">{trackCounts.peer}</b>
            </button>
          </div>

          <div className="filter-row">
            <div className="category-pills">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className={`pill ${c.id !== 'all' ? `cat-${c.id}` : ''} ${filters.category === c.id ? 'is-active' : ''}`}
                  onClick={() => app.setFilters({ category: c.id })}
                >
                  {c.id !== 'all' && <i className="dot" />}
                  {c.label}
                </button>
              ))}
            </div>

            <div className="search-wrap">
              <Icon name="search" size={16} />
              <input
                value={filters.search}
                onChange={(e) => app.setFilters({ search: e.target.value })}
                placeholder="Search Boshlik events, posts, rooms, hosts…"
                aria-label="Search events and posts"
              />
              {filters.search && (
                <button className="search-clear" onClick={() => app.setFilters({ search: '' })} aria-label="Clear search">
                  <Icon name="close" size={13} />
                </button>
              )}
            </div>
          </div>

          {filters.date && (
            <div className="active-filter-row">
              <span className="mono subtle">FILTERED BY DATE</span>
              <button className="date-chip" onClick={() => app.setFilters({ date: null })}>
                {longDate(filters.date)} <Icon name="close" size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Part 3: Campus Posts in Combined or Posts Mode */}
        {app.exploreMode === 'combined' && filteredPosts.length > 0 && (
          <div className="combined-posts-section">
            <div className="pass-section-head">
              <h2>📌 Pinned Campus Updates, Polls & Event Recaps</h2>
              <button className="link-btn" onClick={() => app.setExploreMode('posts')}>
                View all {filteredPosts.length} posts <Icon name="arrow" size={13} />
              </button>
            </div>
            <div className="posts-grid">
              {filteredPosts.slice(0, 2).map((p) => (
                <PostCard key={p.id} post={p} compact />
              ))}
            </div>
          </div>
        )}

        {app.exploreMode === 'posts' ? (
          filteredPosts.length === 0 ? (
            <div className="empty-card">
              <span className="empty-icon">
                <Icon name="telegram" size={24} />
              </span>
              <h3>No campus posts match this filter</h3>
              <p>Clear your filters or publish a new announcement, poll, or event recap for Boshlik Campus.</p>
              <div className="empty-actions">
                <button className="btn btn-primary" onClick={() => app.openPostModal()}>
                  <Icon name="plus" size={15} /> Publish Campus Post
                </button>
              </div>
            </div>
          ) : (
            <div className="posts-feed-stack">
              {filteredPosts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )
        ) : feed.length === 0 ? (
          <div className="empty-card">
            <span className="empty-icon">
              <Icon name="filter" size={24} />
            </span>
            <h3>No Boshlik events match this combination</h3>
            <p>Try a different date, venue zone, track or category — Boshlik Campus has activity every day this fortnight.</p>
            <div className="empty-actions">
              <button className="btn btn-primary" onClick={app.resetFilters}>
                Reset filters
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  app.clearEditingEvent();
                  app.setView('studio');
                }}
              >
                <Icon name="plus" size={15} /> Create the event yourself
              </button>
            </div>
          </div>
        ) : (
          <div className="event-grid">
            {feed.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
