import React from 'react';
import type { EventItem } from '../types';
import { useApp } from '../lib/store';
import { Avatar, CapacityBar, CategoryBadge, Icon, Mono, Poster } from './UI';
import { ROOMS } from '../lib/seed';
import { CATEGORY_LABEL, capacityState, dayLabel, firstName } from '../lib/utils';
import { canManage } from '../lib/logic';

export default function EventCard({ event }: { event: EventItem }) {
  const app = useApp();
  const ticket = app.myTicket(event.id);
  const saved = app.isEventSaved(event.id);
  const manage = canManage(event, app.persona, app.state.clubs);
  const full = event.registeredCount >= event.capacity;
  const club = app.state.clubs.find((c) => c.id === event.hostClubId);
  const coHostClubs = (event.coHostClubIds ?? [])
    .map((id) => app.state.clubs.find((c) => c.id === id))
    .filter(Boolean);
  const room = ROOMS.find((r) => r.id === event.roomId);
  const teamCount = event.attendees.filter((a) => a.lookingForTeam).length;
  const peers = event.attendees.filter((a) => !a.self);
  const proofNames = peers.slice(0, 2).map((p) => firstName(p.name)).join(', ');
  const programmes = Array.from(new Set(peers.map((p) => p.programmeShort))).slice(0, 2).join(' & ');
  const others = Math.max(0, event.registeredCount - 2);

  let actionLabel = '1-Click RSVP';
  let actionTone: 'primary' | 'ghost' | 'warn' | 'violet' = 'primary';
  let onAction = () => app.rsvp(event.id);
  let icon = 'ticket';

  if (ticket) {
    if (ticket.status === 'waitlisted') {
      actionLabel = `Waitlist #${ticket.waitlistPosition} • View Pass`;
      actionTone = 'warn';
      icon = 'clock';
      onAction = () => app.setView('passes');
    } else if (ticket.status === 'external_saved') {
      actionLabel = 'Partner Registration Saved ↗';
      actionTone = 'ghost';
      icon = 'external';
      onAction = () => app.openEvent(event.id);
    } else {
      actionLabel = ticket.status === 'checked_in' ? '✓ Checked In • Show QR' : '✓ Ticket Ready (Show QR)';
      actionTone = 'violet';
      icon = 'qr';
      onAction = () => app.setView('passes');
    }
  } else if (event.registrationMode === 'external_link') {
    actionLabel = 'Open Partner Form ↗';
    actionTone = 'ghost';
    icon = 'external';
  } else if (full) {
    actionLabel = event.waitlistEnabled ? `Join Waitlist (#${event.waitlistCount + 1})` : 'Event Full';
    actionTone = 'warn';
    icon = 'clock';
    onAction = () => app.rsvp(event.id);
  } else if (event.registrationMode === 'internal_screening') {
    actionLabel = 'Apply to Join';
    actionTone = 'primary';
    icon = 'flag';
    onAction = () => app.openEvent(event.id);
  }

  const state = capacityState(event);

  return (
    <article
      className={`event-card cat-${event.category} ${state === 'full' ? 'is-full' : ''}`}
      onClick={() => app.openEvent(event.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          app.openEvent(event.id);
        }
      }}
    >
      <div className="event-cover">
        <Poster event={event} />
        <button
          type="button"
          className={`bookmark-btn ${saved ? 'is-saved' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            app.toggleSaveEvent(event.id);
          }}
          aria-label={saved ? 'Remove from saved events' : 'Save event'}
          title={saved ? 'Saved to bookmarks' : 'Save event'}
        >
          <Icon name="bookmark" size={14} />
        </button>
        <span className="cover-room-pill mono">
          {event.campus === 'Online' ? 'ONLINE' : `BOSHLIK • ${room?.code ?? 'TBA'}`}
        </span>
      </div>

      <div className="event-body">
        <div className="event-host">
          <Avatar name={club?.name ?? event.hostName} color={club?.color ?? '#525860'} size={24} />
          <span className="host-name">{event.hostName}</span>
          {coHostClubs.length > 0 && (
            <span className="badge badge-sm badge-muted" title={`Co-hosted with ${coHostClubs.map((c) => c?.name).join(', ')}`}>
              + {coHostClubs[0]?.short}
            </span>
          )}
          <span className="verified" title="Verified UDEA host">
            <Icon name="check" size={11} />
          </span>
          {event.createdByRoleTitle && (
            <span className="badge badge-sm badge-success" title={`Published as ${event.createdByRoleTitle}`}>
              {event.createdByRoleTitle}
            </span>
          )}
          <span className="host-sep" />
          <span className={`host-cat cat-${event.category}`}>
            <i className="dot" />
            {CATEGORY_LABEL[event.category]}
          </span>
        </div>

        <h3 className="event-title">{event.title}</h3>
        <p className="event-sub">{event.subtitle}</p>

        <div className="event-proof">
          <span className="proof-avatars">
            {peers.slice(0, 3).map((p) => (
              <Avatar key={p.id} name={p.name} color={p.color} size={24} ring />
            ))}
          </span>
          <span className="proof-text">
            {proofNames || 'Be the first to join'}
            {others > 0 ? ` + ${others} students` : ''}
            {programmes ? <em> from {programmes}</em> : null}
          </span>
          {teamCount > 0 && event.teamFinder && (
            <span className="team-flag" title={`${teamCount} attendees are looking for teammates`}>
              <Icon name="users" size={11} /> {teamCount} looking for teammates
            </span>
          )}
          {event.teamMembers.length > 0 && (
            <span className="badge badge-sm badge-muted" title="Connected student staff & coordinators">
              👥 {event.teamMembers.length} staff
            </span>
          )}
        </div>

        <CapacityBar event={event} />

        <div className="event-footer">
          <div className="event-meta">
            <Mono>{dayLabel(event.date)}</Mono>
            <span className="meta-sep">•</span>
            <Mono>{event.startTime}–{event.endTime}</Mono>
            <CategoryBadge category={event.category} small />
            {manage && (
              <span className="card-quick-tools" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => app.openOrganizer(event.id)}
                  title="Open QR Scanner & Organizer Console"
                >
                  <Icon name="qr" size={12} /> QR
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => app.openEditEvent(event.id)}
                  title="Edit Event in Host Studio"
                >
                  <Icon name="edit" size={12} />
                </button>
              </span>
            )}
          </div>
          <button
            className={`btn btn-${actionTone} card-action`}
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
          >
            <Icon name={icon} size={15} />
            <span>{actionLabel}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
