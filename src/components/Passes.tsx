import React from 'react';
import { useApp } from '../lib/store';
import type { EventItem, Ticket } from '../types';
import { Avatar, Icon, Mono, SectionHeader, TicketQR, EmptyState } from './UI';
import { ROOMS } from '../lib/seed';
import {
  getAllRoleBadgesForUser,
  getCertificateRoleTitle,
  getUserRoleTitleForClub,
} from '../lib/logic';
import { dayLabel, longDate, minutesFromTime, isoDate } from '../lib/utils';

const BASE_BADGES: Record<string, string[]> = {
  usr_4: ['FinTech Case Coordinator', 'Practice Session Lead', 'QR Door Verifier'],
  usr_1: ['FinTech Explorer', 'Hackathon Finalist', 'Debate Speaker'],
  usr_2: ['Data Analytics Lead', 'Hackathon Mentor', 'Community Builder'],
  usr_3: ['Campus Operations', 'Room Approvals', 'Event Safety'],
};

export default function Passes() {
  const app = useApp();
  const persona = app.persona;
  const today = isoDate();

  const rows = app.state.tickets
    .filter((t) => t.userId === persona.id && t.status !== 'cancelled')
    .map((t) => ({ ticket: t, event: app.state.events.find((e) => e.id === t.eventId) }))
    .filter((r): r is { ticket: Ticket; event: EventItem } => Boolean(r.event))
    .sort((a, b) => `${a.event.date}${a.event.startTime}`.localeCompare(`${b.event.date}${b.event.startTime}`));

  const upcoming = rows.filter(({ event }) => event.date >= today && !event.past);
  const past = rows.filter(({ event }) => event.date < today || event.past);

  // Events where user is organizer, delegated club coordinator, or connected team member/speaker
  const organizedEvents = app.state.events.filter((e) => {
    if (e.approvalStatus !== 'approved') return false;
    if (e.createdBy === persona.id) return true;
    if (e.teamMembers?.some((m) => m.userId === persona.id)) return true;
    const clubRole = getUserRoleTitleForClub(persona, e.hostClubId ?? null, app.state.clubs);
    return Boolean(clubRole);
  });

  const attended = past.filter(({ ticket }) => ticket.status === 'checked_in').length;
  const xp = persona.xp + upcoming.length * 15 + organizedEvents.length * 35;
  const goldTarget = 1000;
  const progress = Math.min(100, Math.round((xp / goldTarget) * 100));

  const dynamicClubBadges = getAllRoleBadgesForUser(persona, app.state.clubs).map(
    (b) => `${b.title} (${b.clubName})`,
  );
  const eventStaffBadges = app.state.events
    .flatMap((e) => e.teamMembers ?? [])
    .filter((m) => m.userId === persona.id)
    .map((m) => m.customLabel);

  const badges = Array.from(
    new Set([...dynamicClubBadges, ...eventStaffBadges, ...(BASE_BADGES[persona.id] ?? ['Campus Explorer'])]),
  );

  return (
    <div className="passes-view">
      <SectionHeader
        icon="ticket"
        title="My QR Passes & Student Passport"
        subtitle="Holographic passes, waitlist positions, delegated organizing roles and your verified Coventry–UDEA co-curricular record."
        action={
          <span className="mono subtle">
            {upcoming.length} ACTIVE PASS{upcoming.length === 1 ? '' : 'ES'} · {organizedEvents.length} ORGANIZED
          </span>
        }
      />

      <div className="passport-grid">
        <div className="passport-card">
          <div className="passport-top">
            <Avatar name={persona.name} color={persona.color} size={64} />
            <div className="passport-id">
              <span className="mono subtle">UDEA CO-CURRICULAR PASSPORT</span>
              <h2>{persona.name}</h2>
              <p>{persona.programme ?? persona.department}</p>
              <div className="passport-mono">
                <Mono>{persona.studentId}</Mono>
                <span className="dotsep" />
                <Mono>{persona.telegram}</Mono>
                {persona.year && (
                  <>
                    <span className="dotsep" />
                    <Mono>{persona.year}</Mono>
                  </>
                )}
              </div>
            </div>
            <div className="passport-score">
              <span className="score-value">{persona.reliabilityScore}%</span>
              <span className="mono">RELIABILITY</span>
              <em>{persona.reliabilityScore >= 95 ? 'Trusted Attendee' : 'Building trust'}</em>
            </div>
          </div>

          <div className="passport-stats">
            <div className="pstat">
              <span className="mono">CAMPUS XP</span>
              <strong>{xp}</strong>
              <em>+15 RSVP · +35 Host</em>
            </div>
            <div className="pstat">
              <span className="mono">EVENTS ATTENDED</span>
              <strong>{attended}</strong>
              <em>verified check-ins</em>
            </div>
            <div className="pstat">
              <span className="mono">ORGANIZED / STAFF</span>
              <strong>{organizedEvents.length}</strong>
              <em>leadership record</em>
            </div>
          </div>

          <div className="passport-badges">
            {badges.map((b) => (
              <span key={b} className="skill-badge">
                <Icon name="spark" size={12} /> {b}
              </span>
            ))}
          </div>

          <div className="gold-progress">
            <div className="gold-head">
              <span>
                <Icon name="spark" size={14} /> UDEA Gold Co-Curricular Diploma Supplement
              </span>
              <Mono>{xp} / {goldTarget} XP</Mono>
            </div>
            <div className="capacity-track">
              <div className="capacity-fill gold-fill" style={{ width: `${Math.max(progress, 4)}%` }} />
            </div>
            <p>{progress}% complete · attend or coordinate {Math.max(0, 8 - attended - organizedEvents.length)} more verified events this semester to qualify.</p>
          </div>
        </div>

        <div className="passport-side">
          <div className="mini-info-card">
            <span className="mono subtle">HOW PASSES & CREDITS WORK</span>
            <ul>
              <li><Icon name="qr" size={14} /> QR passes are cached offline — scanning works in basement halls.</li>
              <li><Icon name="bell" size={14} /> The bot checks 4h before start; confirm to lock your seat.</li>
              <li><Icon name="award" size={14} /> Delegated coordinators & speakers earn official leadership certificates.</li>
            </ul>
          </div>
          <button className="btn btn-primary btn-lg block" onClick={() => app.setView('explore')}>
            <Icon name="compass" size={16} /> Find your next event
          </button>
        </div>
      </div>

      {organizedEvents.length > 0 && (
        <div className="pass-section">
          <div className="pass-section-head">
            <h2>🎖️ My Organizing, Speaking & Coordinator Record</h2>
            <Mono>{organizedEvents.length} LEADERSHIP CREDITS</Mono>
          </div>
          <div className="history-list">
            {organizedEvents.map((event) => {
              const roleTitle = getCertificateRoleTitle(persona, event, app.state.clubs);
              const room = ROOMS.find((r) => r.id === event.roomId);
              return (
                <div key={event.id} className="history-row">
                  <span className={`history-stripe cat-${event.category}`} />
                  <div className="history-main">
                    <strong>{event.title}</strong>
                    <span className="mono">
                      {dayLabel(event.date)} • {room?.code ?? 'BOSHLIK'} • ROLE: {roleTitle.toUpperCase()}
                    </span>
                  </div>
                  <span className="badge badge-teal">✨ {roleTitle}</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => app.openOrganizer(event.id)}
                    >
                      <Icon name="shield" size={13} /> Console
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => app.openCertificate(event.id)}
                    >
                      <Icon name="print" size={14} /> Print Role Certificate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pass-section">
        <div className="pass-section-head">
          <h2>Active passes</h2>
          <Mono>{upcoming.length} UPCOMING</Mono>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon="ticket"
            title="No active passes yet"
            message="Claim a seat on any event and the holographic QR pass appears here instantly."
            action={<button className="btn btn-primary" onClick={() => app.setView('explore')}>Explore events</button>}
          />
        ) : (
          <div className="pass-list">
            {upcoming.map(({ ticket, event }) => (
              <PassCard key={ticket.ticketId} event={event} ticket={ticket} />
            ))}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <div className="pass-section">
          <div className="pass-section-head">
            <h2>Attendance history & certificates</h2>
            <Mono>{past.length} RECORDS</Mono>
          </div>
          <div className="history-list">
            {past.map(({ ticket, event }) => {
              const roleTitle = getCertificateRoleTitle(persona, event, app.state.clubs);
              return (
                <div key={ticket.ticketId} className="history-row">
                  <span className={`history-stripe cat-${event.category}`} />
                  <div className="history-main">
                    <strong>{event.title}</strong>
                    <span className="mono">
                      {dayLabel(event.date)} • BOSHLIK CAMPUS • {roleTitle.toUpperCase()} • {ticket.qrHash}
                    </span>
                  </div>
                  <span className={`badge ${ticket.status === 'checked_in' ? 'badge-success' : 'badge-muted'}`}>
                    {ticket.status === 'checked_in' ? '✓ ATTENDED' : ticket.status.toUpperCase()}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={ticket.status !== 'checked_in'}
                    onClick={() => app.openCertificate(ticket.ticketId)}
                  >
                    <Icon name="print" size={14} /> View & Print Certificate
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PassCard({ event, ticket }: { event: EventItem; ticket: Ticket }) {
  const app = useApp();
  const room = ROOMS.find((r) => r.id === event.roomId);
  const club = app.state.clubs.find((c) => c.id === event.hostClubId);
  const hours = (minutesFromTime(event.endTime) - minutesFromTime(event.startTime)) / 60;
  const confirmed = ticket.confirmedAttendance4h;
  const roleTitle = getCertificateRoleTitle(app.persona, event, app.state.clubs);

  return (
    <article className={`pass cat-${event.category} ${ticket.status === 'waitlisted' ? 'is-waitlist' : ''}`}>
      <div className="pass-main">
        <div className="pass-head">
          <div className="pass-host">
            <Avatar name={club?.name ?? event.hostName} color={club?.color ?? '#525860'} size={22} />
            <span>{event.hostName}</span>
            {event.issueCertificate && <span className="badge badge-muted">🎓 CERTIFICATE</span>}
            {roleTitle !== 'Verified Participant' && (
              <span className="badge badge-teal">✨ {roleTitle}</span>
            )}
          </div>
          <span className={`pass-status ${ticket.status}`}>
            {ticket.status === 'waitlisted' ? 'WAITLISTED' : ticket.status === 'external_saved' ? 'EXTERNAL SAVED' : '✓ CONFIRMED'}
          </span>
        </div>

        <h3 className="pass-title">{event.title}</h3>

        <div className="pass-facts">
          <div>
            <Mono>DATE</Mono>
            <strong>{longDate(event.date)}</strong>
          </div>
          <div>
            <Mono>TIME</Mono>
            <strong>{event.startTime}–{event.endTime}</strong>
          </div>
          <div>
            <Mono>VENUE</Mono>
            <strong>Boshlik · {room?.code}</strong>
          </div>
          <div>
            <Mono>LANGUAGE</Mono>
            <strong>{event.language}</strong>
          </div>
        </div>

        <div className="pass-tags">
          <span className={`badge cat-${event.category}`}>{event.category === 'fintech' ? 'FinTech' : event.category.toUpperCase()}</span>
          <span className="badge badge-muted">{event.eventType === 'peer_meetup' ? '⚡ PEER MEETUP' : '🏛️ OFFICIAL'}</span>
          <span className="badge badge-muted">{hours}h VERIFIED</span>
          {confirmed && <span className="badge badge-success">✓ ATTENDANCE CONFIRMED</span>}
          {ticket.screeningStatus === 'pending' && <span className="badge badge-warn">SCREENING PENDING</span>}
        </div>

        <div className="pass-actions">
          {ticket.status === 'confirmed' && !confirmed && (
            <button className="btn btn-primary btn-sm" onClick={() => app.confirmAttendance(ticket.ticketId)}>
              <Icon name="check" size={14} /> Confirm attendance
            </button>
          )}
          {ticket.status === 'waitlisted' && (
            <span className="waitlist-note">
              <Icon name="clock" size={14} /> Position #{ticket.waitlistPosition} · auto-promotion on seat release
            </span>
          )}
          {ticket.status === 'external_saved' && (
            <a className="btn btn-ghost btn-sm" href={event.externalUrl} target="_blank" rel="noreferrer">
              Open partner portal <Icon name="external" size={13} />
            </a>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => app.openEvent(event.id)}>
            Event details
          </button>
          <button
            className="btn btn-ghost btn-sm danger-text"
            onClick={async () => {
              const ok = await app.askConfirm({
                title: ticket.status === 'waitlisted' ? 'Leave the waitlist?' : 'Cancel this pass?',
                message:
                  ticket.status === 'waitlisted'
                    ? 'Your waitlist position is released. You can rejoin if seats remain.'
                    : 'Your seat is released and the first waitlisted student is promoted immediately.',
                confirmLabel: ticket.status === 'waitlisted' ? 'Leave waitlist' : 'Release seat',
                tone: 'danger',
              });
              if (ok) app.cancelTicket(ticket.ticketId);
            }}
          >
            {ticket.status === 'waitlisted' ? 'Leave waitlist' : 'Release seat'}
          </button>
        </div>
      </div>

      <div className="pass-stub">
        <div className="stub-notch notch-top" />
        <div className="stub-notch notch-bottom" />
        {ticket.status === 'external_saved' ? (
          <div className="stub-external">
            <Icon name="external" size={22} />
            <span className="mono">PARTNER<br />REGISTRATION</span>
          </div>
        ) : (
          <TicketQR
            value={`https://t.me/udea_pulse_bot/app?startapp=checkin_${event.id}_${ticket.qrHash}`}
            size={112}
          />
        )}
        <span className="stub-label mono">
          {ticket.status === 'waitlisted' ? `WAITLIST #${ticket.waitlistPosition}` : ticket.seatNumber ? `SEAT #${ticket.seatNumber}` : 'EXTERNAL'}
        </span>
        <span className="stub-hash mono">{ticket.qrHash}</span>
        <span className="stub-hint mono">SCAN AT DOOR</span>
      </div>
      <div className="pass-foil" aria-hidden="true" />
    </article>
  );
}
