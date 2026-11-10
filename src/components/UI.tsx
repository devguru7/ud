import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Category, EventItem, Lang, Person } from '../types';
import { CATEGORY_SHORT, capacityState, dayLabel, eventSeatsLeft, initials, pct } from '../lib/utils';
import { useApp } from '../lib/store';

const ICONS: Record<string, React.ReactNode> = {
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
  users: <><path d="M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19" /><circle cx="9.5" cy="7.5" r="3.2" /><path d="M17 5.2a3.2 3.2 0 0 1 0 6.1M21 19v-1.5a4 4 0 0 0-3-3.85" /></>,
  ticket: <><path d="M3 9.5V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 0 0 5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.5a2.5 2.5 0 0 0 0-5Z" /><path d="M14 6v2M14 11v2M14 16v2" /></>,
  shield: <><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 5h2M10.5 18.5h3" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  chevron: <path d="m9 6 6 6-6 6" />,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6a3 3 0 0 0-3 3v6.5A2.5 2.5 0 0 0 5.5 15" /></>,
  download: <><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" /><path d="M4 20h16" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 6.5" />,
  x: <><path d="m6 6 12 12M18 6 6 18" /></>,
  up: <path d="m6 14 6-6 6 6" />,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM20 14v2M14 20h2M19 19h2v2" /></>,
  camera: <><path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.2-2h7l1.2 2h1.8A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z" /><circle cx="12" cy="13" r="3.5" /></>,
  bell: <><path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" /><path d="M10.5 20a2 2 0 0 0 3 0" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>,
  print: <><path d="M7 8V3h10v5" /><rect x="4" y="8" width="16" height="8" rx="2" /><path d="M7 14h10v7H7z" /></>,
  telegram: <><path d="M21 4 3 11l6 2.5L11.5 21 21 4Z" /><path d="m9 13.5 8-7.5" /></>,
  chart: <><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 16v-4M12.5 16V8M17 16v-6" /></>,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>,
  map: <><path d="m9 4 6 2 6-2v14l-6 2-6-2-6 2V6l6-2Z" /><path d="M9 4v14M15 6v14" /></>,
  flag: <><path d="M5 21V4M5 4h9l-1 3 1 3H5" /></>,
};

export function Icon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden="true"
    >
      {ICONS[name] ?? ICONS.spark}
    </svg>
  );
}

export function Avatar({
  name,
  color,
  size = 32,
  ring = false,
}: {
  name: string;
  color?: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={`avatar ${ring ? 'avatar-ring' : ''}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${color ?? '#2563EB'}, ${color ?? '#2563EB'}bb)`,
        fontSize: Math.max(10, size * 0.36),
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ people, max = 4, size = 26 }: { people: Person[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  return (
    <span className="avatar-stack">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.name} color={p.color} size={size} ring />
      ))}
      {people.length > max && (
        <span className="avatar avatar-more" style={{ width: size, height: size, fontSize: 10 }}>
          +{people.length - max}
        </span>
      )}
    </span>
  );
}

export function CategoryBadge({ category, small = false }: { category: Category; small?: boolean }) {
  return (
    <span className={`badge cat-badge cat-${category} ${small ? 'badge-sm' : ''}`}>
      <i className="dot" />
      {CATEGORY_SHORT[category]}
    </span>
  );
}

export function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`mono ${className}`}>{children}</span>;
}

export function CapacityBar({ event, compact = false }: { event: EventItem; compact?: boolean }) {
  const state = capacityState(event);
  const percent = pct(event.registeredCount, event.capacity);
  const left = eventSeatsLeft(event);
  return (
    <div className={`capacity ${compact ? 'capacity-compact' : ''}`}>
      <div className="capacity-head">
        <Mono>
          {event.registeredCount} / {event.capacity} SEATS
        </Mono>
        <span className={`capacity-note cap-${state}`}>
          {state === 'full'
            ? `Full • Waitlist Open (${event.waitlistCount} waiting)`
            : state === 'almost'
              ? `Almost Full — ${left} seat${left === 1 ? '' : 's'} left`
              : `${left} seats open`}
        </span>
      </div>
      <div className="capacity-track">
        <div className={`capacity-fill cap-${state}`} style={{ width: `${Math.max(percent, 3)}%` }} />
      </div>
    </div>
  );
}

const COVER_CSS: Record<string, string> = {
  emerald: 'radial-gradient(at 15% 15%, #059669 0%, #064E3B 55%, #022C22 100%)',
  violet: 'radial-gradient(at 80% 20%, #7C3AED 0%, #3B0764 55%, #1E1B4B 100%)',
  blueprint: 'radial-gradient(at 20% 80%, #2563EB 0%, #1E3A8A 55%, #0F172A 100%)',
  lime: 'radial-gradient(at 75% 25%, #65A30D 0%, #365314 55%, #14532D 100%)',
  sunset: 'radial-gradient(at 25% 25%, #EA580C 0%, #7C2D12 55%, #431407 100%)',
  obsidian: 'radial-gradient(at 60% 10%, #2B2F3A 0%, #12141A 60%, #090A0D 100%)',
  royal: 'radial-gradient(at 20% 80%, #2563EB 0%, #1E3A8A 55%, #0F172A 100%)',
  terracotta: 'radial-gradient(at 25% 25%, #EA580C 0%, #7C2D12 55%, #431407 100%)',
};

export function Poster({
  event,
  showTitle = false,
  className = '',
  children,
}: {
  event: Pick<
    EventItem,
    'title' | 'category' | 'coverStyle' | 'coverImage' | 'pattern' | 'date' | 'startTime' | 'campus' | 'language' | 'eventType' | 'issueCertificate'
  >;
  showTitle?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const background = event.coverImage
    ? `url("${event.coverImage}") center / cover no-repeat`
    : COVER_CSS[event.coverStyle] ?? COVER_CSS.emerald;
  return (
    <div
      className={`poster cat-${event.category} pattern-${event.pattern} ${className}`}
      style={{ background }}
    >
      <div className="poster-sheen" />
      <div className="poster-top">
        <span className="glass-pill mono-pill">{dayLabel(event.date)} • {event.startTime}</span>
        <span className="poster-top-right">
          <span className="glass-pill mono-pill">{event.campus === 'Online' ? 'ONLINE' : event.campus.toUpperCase()}</span>
          <span className="glass-pill mono-pill lang-pill">{event.language}</span>
        </span>
      </div>
      <div className="poster-art">
        {showTitle ? (
          <>
            <div className="poster-kicker mono">{event.eventType === 'peer_meetup' ? 'PEER MEETUP' : 'OFFICIAL UDEA'}</div>
            <h3 className="poster-title">{event.title}</h3>
          </>
        ) : (
          <>
            <div className="poster-watermark">{CATEGORY_SHORT[event.category].toUpperCase()}</div>
            <div className="poster-emblem" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </>
        )}
      </div>
      <div className="poster-bottom">
        <span className="glass-pill poster-tag">
          {event.eventType === 'peer_meetup' ? '⚡ Peer Study Group' : event.issueCertificate ? '🎓 Verified Certificate' : '🏛️ Official Event'}
        </span>
        {children}
      </div>
    </div>
  );
}

export function TicketQR({
  value,
  size = 132,
  className = '',
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`qr-frame ${className}`}>
      <QRCodeSVG value={value} size={size} level="M" bgColor="#FFFFFF" fgColor="#111315" />
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: string;
}) {
  return (
    <div className="section-header">
      <div className="section-heading">
        {icon && (
          <span className="section-icon">
            <Icon name={icon} size={17} />
          </span>
        )}
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon = 'calendar',
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
