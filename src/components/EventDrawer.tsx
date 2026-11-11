import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { EventItem } from '../types';
import { useApp, TG_BOT } from '../lib/store';
import { Avatar, CapacityBar, CategoryBadge, Icon, Mono, Poster } from './UI';
import { ROOMS } from '../lib/seed';
import { canManage, hasEventPermission } from '../lib/logic';
import { STAFF_ROLE_LABEL } from '../lib/labels';
import {
  copyText,
  dayLabel,
  downloadEventPosterPNG,
  eventSeatsLeft,
  firstName,
  pct,
  relativeTime,
  timeRange,
} from '../lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview & Schedule', icon: 'calendar' },
  { id: 'people', label: 'Attendees & Team Finder', icon: 'users' },
  { id: 'qa', label: 'Live Q&A', icon: 'spark' },
  { id: 'host', label: 'Organizer', icon: 'shield' },
];

export default function EventDrawer() {
  const app = useApp();
  const event = app.state.events.find((e) => e.id === app.drawerEventId);
  return (
    <AnimatePresence>
      {event && <DrawerBody key={event.id} event={event} />}
    </AnimatePresence>
  );
}

function DrawerBody({ event }: { event: EventItem }) {
  const app = useApp();
  const [tab, setTab] = useState('overview');
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const ticket = app.myTicket(event.id);
  const room = ROOMS.find((r) => r.id === event.roomId);
  const manage = canManage(event, app.persona, app.state.clubs);
  const canEdit = hasEventPermission(app.persona, event, app.state.clubs, 'create_events');
  const canPublish = hasEventPermission(app.persona, event, app.state.clubs, 'publish_posts');
  const full = event.registeredCount >= event.capacity;

  const linkedPosts = app.state.posts.filter((p) => p.linkedEventId === event.id);
  const eventBroadcasts = app.state.broadcasts.filter((b) => b.eventId === event.id);

  const copyLink = async () => {
    const ok = await copyText(`${TG_BOT}?startapp=event_${event.id}`);
    app.pushToast({
      tone: ok ? 'success' : 'error',
      title: ok ? 'Mini App link copied' : 'Copy failed',
      message: ok
        ? `${TG_BOT}?startapp=event_${event.id}`
        : 'Your browser blocked clipboard access. Long-press the link in the address bar instead.',
    });
  };

  const close = app.closeEvent;
  const visibleStaff = event.teamMembers.filter((m) => m.showOnEventPage);

  return (
    <motion.div
      className="drawer-layer"
      onClick={close}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={event.title}
        initial={app.mobile ? { y: 80, opacity: 0.8 } : { x: 60, opacity: 0.8 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        exit={app.mobile ? { y: 80, opacity: 0 } : { x: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      >
        <div className="drawer-head">
          <Poster event={event} showTitle />
          <button className="drawer-close" onClick={close} aria-label="Close event">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="drawer-toolbar">
          <div className="drawer-toolbar-left">
            <CategoryBadge category={event.category} />
            <span className="mono subtle">{event.eventType === 'peer_meetup' ? 'PEER MEETUP' : 'OFFICIAL EVENT'}</span>
            <span className="mono subtle">
              {event.approvalStatus === 'pending_room_approval' ? 'PENDING ROOM APPROVAL' : 'PUBLISHED'}
            </span>
            {event.createdByRoleTitle && (
              <span className="badge badge-sm badge-success">{event.createdByRoleTitle}</span>
            )}
          </div>
          <div className="drawer-toolbar-right">
            {canEdit && (
              <button
                className="tool-btn"
                onClick={() => app.openEditEvent(event.id)}
                title="Edit event schedule, room, or connected student team"
              >
                <Icon name="edit" size={14} /> Edit Event & Team
              </button>
            )}
            {canPublish && (
              <button
                className="tool-btn"
                onClick={() =>
                  app.openPostModal({
                    defaultEventId: event.id,
                    defaultClubId: event.hostClubId ?? undefined,
                    defaultType: event.past ? 'event_recap' : 'event_promo',
                  })
                }
                title="Publish a promo or recap post for this event"
              >
                <Icon name="telegram" size={14} /> + {event.past ? 'Recap' : 'Promo'} Post
              </button>
            )}
            <button
              className="tool-btn"
              onClick={() => {
                downloadEventPosterPNG(event, room);
                app.pushToast({
                  tone: 'success',
                  title: 'Poster PNG downloaded (1200×630)',
                  message: `High-resolution Boshlik poster saved for ${event.title}.`,
                });
              }}
              title="Download 1200×630 PNG Event Poster for Telegram & Instagram"
            >
              <Icon name="image" size={15} /> Poster PNG
            </button>
            <button className="tool-btn" onClick={copyLink} title="Copy Telegram Mini App link">
              <Icon name="telegram" size={15} /> Copy TG link
            </button>
            <button className="tool-btn" onClick={() => app.exportICS(event.id)} title="Download .ics calendar file">
              <Icon name="download" size={15} /> .ics
            </button>
            <button className="tool-btn" onClick={close} aria-label="Close">
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>

        <div className="drawer-title-block">
          <h2>{event.title}</h2>
          <p>{event.subtitle}</p>
          <div className="drawer-facts">
            <span className="mono">{dayLabel(event.date)} • {timeRange(event.startTime, event.endTime)}</span>
            <span className="mono">BOSHLIK • {room?.code ?? 'ONLINE'}</span>
            <span className="mono">{event.language}</span>
            <span className="mono">{event.issueCertificate ? '🎓 CERTIFICATE' : 'NO CERTIFICATE'}</span>
          </div>
        </div>

        <div className="drawer-tabs" role="tablist">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                className={`drawer-tab ${active ? 'is-active' : ''}`}
                onClick={() => setTab(t.id)}
                role="tab"
                aria-selected={active}
              >
                <Icon name={t.icon} size={14} />
                {t.label}
                {t.id === 'qa' && event.questions.length > 0 && <b className="tab-count">{event.questions.length}</b>}
                {t.id === 'people' && <b className="tab-count">{event.attendees.filter((a) => a.lookingForTeam).length}</b>}
                {active && (
                  <motion.span
                    layoutId="drawer-tab-underline"
                    className="drawer-tab-underline"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="drawer-scroll">
          {tab === 'overview' && (
            <div className="tab-pane">
              {eventBroadcasts.length > 0 && (
                <div className="commit-widget is-confirmed">
                  <div className="commit-icon">
                    <Icon name="telegram" size={18} />
                  </div>
                  <div className="commit-body">
                    <strong>📣 Live Organizer Broadcast ({relativeTime(eventBroadcasts[0].at)})</strong>
                    <p>{eventBroadcasts[0].text}</p>
                  </div>
                </div>
              )}

              {ticket?.status === 'confirmed' || ticket?.status === 'checked_in' ? (
                <div className={`commit-widget ${ticket.confirmedAttendance4h ? 'is-confirmed' : ''}`}>
                  <div className="commit-icon">
                    <Icon name={ticket.confirmedAttendance4h ? 'check' : 'bell'} size={18} />
                  </div>
                  <div className="commit-body">
                    <strong>
                      {ticket.confirmedAttendance4h
                        ? '✓ Attendance confirmed — your seat is locked'
                        : `🔔 Telegram Bot Check: Are you still attending today at ${event.startTime}?`}
                    </strong>
                    <p>
                      {ticket.confirmedAttendance4h
                        ? `Check-in opens 30 minutes before ${event.startTime} at ${room?.code ?? 'the venue'}. Show your QR pass at the door.`
                        : 'Confirming locks your seat. Releasing your spot gives it to the first person on the waitlist.'}
                    </p>
                    <div className="commit-actions">
                      {!ticket.confirmedAttendance4h && (
                        <button className="btn btn-primary btn-sm" onClick={() => app.confirmAttendance(ticket.ticketId)}>
                          <Icon name="check" size={14} /> Confirm I’m Coming
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm danger-text"
                        onClick={async () => {
                          const ok = await app.askConfirm({
                            title: 'Release your seat?',
                            message:
                              'Your confirmed seat will be offered to the first waitlisted student immediately, and your QR pass will be cancelled.',
                            confirmLabel: 'Release my spot',
                            tone: 'danger',
                          });
                          if (ok) app.releaseSpot(ticket.ticketId);
                        }}
                      >
                        <Icon name="x" size={14} /> Release My Spot to Waitlist
                      </button>
                    </div>
                  </div>
                </div>
              ) : ticket?.status === 'waitlisted' ? (
                <div className="commit-widget is-waitlist">
                  <div className="commit-icon">
                    <Icon name="clock" size={18} />
                  </div>
                  <div className="commit-body">
                    <strong>Waitlist position #{ticket.waitlistPosition}</strong>
                    <p>
                      {Math.max(0, event.waitlistCount - 1)} student{event.waitlistCount - 1 === 1 ? '' : 's'} ahead of you. If a
                      confirmed attendee releases a seat, the bot promotes you and sends a Telegram pass instantly.
                    </p>
                    <div className="commit-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          const ok = await app.askConfirm({
                            title: 'Leave the waitlist?',
                            message: 'You will lose your place in the queue for this event.',
                            confirmLabel: 'Leave waitlist',
                          });
                          if (ok) app.cancelTicket(ticket.ticketId);
                        }}
                      >
                        Leave waitlist
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="prose-block">
                <h3>About this event</h3>
                <p>{event.description}</p>
              </div>

              {/* Event Resources & Attachments */}
              {event.attachments && event.attachments.length > 0 && (
                <div className="agenda">
                  <div className="panel-head">
                    <h3>📎 Event Materials, Datasets & Slides</h3>
                    <Mono>{event.attachments.length} FILES</Mono>
                  </div>
                  <div className="stack-sm">
                    {event.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="person-card"
                        style={{ textDecoration: 'none' }}
                      >
                        <span className="section-icon">
                          <Icon name={att.kind === 'photos' ? 'image' : 'file'} size={16} />
                        </span>
                        <div className="person-main">
                          <strong>{att.title}</strong>
                          <span className="mono subtle">{att.kind.toUpperCase()} • {att.url}</span>
                        </div>
                        <span className="btn btn-ghost btn-xs">
                          <Icon name="download" size={12} /> Open
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Part 2: Connected Event Team & Student Coordinators */}
              {visibleStaff.length > 0 && (
                <div className="agenda">
                  <div className="panel-head">
                    <h3>Connected Event Team & Student Coordinators</h3>
                    <Mono>{visibleStaff.length} STAFF</Mono>
                  </div>
                  <div className="people-grid">
                    {visibleStaff.map((m) => (
                      <div key={m.userId} className="person-card is-team">
                        <Avatar name={m.name} color="#10B981" size={36} />
                        <div className="person-main">
                          <strong>{m.name}</strong>
                          <span className="person-prog">{m.programme} · {m.telegram}</span>
                          <span className="person-skill">
                            <Icon name="shield" size={11} /> {m.customLabel || STAFF_ROLE_LABEL[m.role]}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => app.setPersona(m.userId)}
                          title={`Switch to ${m.name}'s account`}
                        >
                          Switch
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {event.outcomes.length > 0 && (
                <div className="outcomes">
                  <span className="mono subtle">WHAT YOU’LL TAKE AWAY</span>
                  <ul>
                    {event.outcomes.map((o) => (
                      <li key={o}>
                        <Icon name="check" size={14} /> {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {event.prerequisites && (
                <div className="prereq">
                  <Icon name="flag" size={15} />
                  <span><strong>Prerequisites:</strong> {event.prerequisites}</span>
                </div>
              )}

              <div className="agenda">
                <div className="panel-head">
                  <h3>Timeline agenda</h3>
                  <Mono>{event.agenda.length} BLOCKS</Mono>
                </div>
                <ol className="timeline">
                  {event.agenda.map((item, i) => (
                    <li key={`${item.time}-${i}`}>
                      <span className="timeline-time mono">{item.time}</span>
                      <span className="timeline-line">
                        <i />
                      </span>
                      <span className="timeline-body">
                        <strong>{item.title}</strong>
                        {item.speaker && <em>{item.speaker}</em>}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              {linkedPosts.length > 0 && (
                <div className="agenda">
                  <div className="panel-head">
                    <h3>📢 Linked Campus Feed Posts & Recaps</h3>
                    <Mono>{linkedPosts.length} POSTS</Mono>
                  </div>
                  <div className="stack-sm">
                    {linkedPosts.map((p) => (
                      <div key={p.id} className="person-card">
                        <div className="person-main">
                          <strong>{p.title}</strong>
                          <span className="person-prog">
                            By {p.authorName} ({p.authorRoleTitle}) • {relativeTime(p.createdAt)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            app.closeEvent();
                            app.setExploreMode('posts');
                            app.setView('explore');
                          }}
                        >
                          View in Feed
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="location-card">
                <div className="location-main">
                  <span className="location-icon"><Icon name="pin" size={18} /></span>
                  <div>
                    <strong>{room?.name ?? (event.campus === 'Online' ? 'Telegram Live Stream' : 'Boshlik Campus Venue')}</strong>
                    <p>{room?.address ?? '3 Boshlik Street, Tashkent'}{room?.floor ? ` · ${room.floor}` : ''}</p>
                  </div>
                  <span className="mono room-code">{room?.code}</span>
                </div>
                <div className="location-equipment">
                  <Mono>CAPACITY {event.capacity}</Mono>
                  {(event.equipmentRequested.length ? event.equipmentRequested : room?.equipment ?? []).map((eq) => (
                    <span key={eq} className="equip-chip">
                      <Icon name="check" size={12} /> {eq}
                    </span>
                  ))}
                  <span className="equip-chip"><Icon name="check" size={12} /> Wi-Fi High-Density</span>
                </div>
              </div>

              {event.past && (
                <div className="agenda">
                  <div className="panel-head">
                    <h3>⭐ Post-Event Ratings & Student Reviews ({(event.feedback ?? []).length})</h3>
                    {event.issueCertificate && (
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => app.openCertificate(event.id)}
                      >
                        <Icon name="award" size={13} /> Open My Certificate
                      </button>
                    )}
                  </div>
                  <div className="stack-sm">
                    {(event.feedback ?? []).map((fb) => (
                      <div key={fb.id} className="person-card">
                        <Avatar name={fb.userName} size={32} />
                        <div className="person-main">
                          <strong>
                            {fb.userName} • {'★'.repeat(fb.rating)}
                          </strong>
                          <span className="person-prog">{fb.comment}</span>
                        </div>
                      </div>
                    ))}
                    <div className="qa-answer-form" style={{ marginTop: 8 }}>
                      <select
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        aria-label="Star rating"
                      >
                        <option value={5}>★★★★★ (5/5)</option>
                        <option value={4}>★★★★☆ (4/5)</option>
                        <option value={3}>★★★☆☆ (3/5)</option>
                      </select>
                      <input
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Share your takeaway from this Boshlik session…"
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => {
                          app.addEventFeedback(event.id, rating, feedbackComment);
                          setFeedbackComment('');
                        }}
                      >
                        Submit Review
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="register-panel">
                <div className="register-head">
                  <div>
                    <span className="mono subtle">REGISTRATION</span>
                    <h3>
                      {event.registrationMode === 'external_link'
                        ? 'External partner registration'
                        : event.registrationMode === 'internal_screening'
                          ? 'Screening application'
                          : '1-click internal RSVP'}
                    </h3>
                  </div>
                  <span className={`seat-chip ${full ? 'is-full' : ''}`}>
                    {full ? `${event.waitlistCount} WAITING` : `${eventSeatsLeft(event)} LEFT`}
                  </span>
                </div>
                <CapacityBar event={event} />
                {!ticket ? (
                  <RegisterFlow event={event} />
                ) : (
                  <div className="ticket-summary">
                    <div className="ticket-summary-main">
                      <Icon name="ticket" size={18} />
                      <div>
                        <strong>
                          {ticket.status === 'waitlisted'
                            ? `Waitlisted • position #${ticket.waitlistPosition}`
                            : ticket.status === 'external_saved'
                              ? 'Partner registration saved'
                              : `Pass confirmed • seat #${ticket.seatNumber}`}
                        </strong>
                        <span className="mono">{ticket.qrHash}</span>
                      </div>
                    </div>
                    <div className="ticket-summary-actions">
                      {ticket.status === 'external_saved' ? (
                        <a className="btn btn-ghost btn-sm" href={event.externalUrl} target="_blank" rel="noreferrer">
                          Open partner form <Icon name="external" size={13} />
                        </a>
                      ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => { app.setView('passes'); app.closeEvent(); }}>
                          <Icon name="qr" size={14} /> Show QR pass
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm danger-text"
                        onClick={async () => {
                          const ok = await app.askConfirm({
                            title: 'Cancel this pass?',
                            message: 'Your seat is released and the waitlist promotion engine runs immediately.',
                            confirmLabel: 'Cancel pass',
                            tone: 'danger',
                          });
                          if (ok) app.cancelTicket(ticket.ticketId);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'people' && <PeopleTab event={event} ticket={ticket} />}
          {tab === 'qa' && <QATab event={event} manage={manage} />}
          {tab === 'host' && <HostTab event={event} manage={manage} />}
        </div>
      </motion.div>
    </motion.div>
  );
}

function RegisterFlow({ event }: { event: EventItem }) {
  const app = useApp();
  const [answer, setAnswer] = useState('');
  const full = event.registeredCount >= event.capacity;

  if (event.registrationMode === 'external_link') {
    return (
      <div className="register-flow">
        <p className="register-note">
          Registration runs on the partner portal. Saving here adds the event to your calendar and schedules the
          Telegram reminder — no separate UDEA pass is issued.
        </p>
        <div className="register-actions">
          <button className="btn btn-primary" onClick={() => app.rsvp(event.id)}>
            Continue to partner form <Icon name="external" size={14} />
          </button>
          <span className="mono subtle">{event.registeredCount}/{event.capacity} TRACKED</span>
        </div>
      </div>
    );
  }

  if (event.registrationMode === 'internal_screening') {
    return (
      <div className="register-flow">
        <label className="field">
          <span className="field-label">Screening question</span>
          <span className="field-help">{event.screeningPrompt}</span>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={3}
            placeholder="Type your answer here — the host reviews it before the event."
          />
        </label>
        <div className="register-actions">
          <button className="btn btn-primary" disabled={answer.trim().length < 4} onClick={() => app.rsvp(event.id, answer)}>
            <Icon name="flag" size={14} /> Submit application
          </button>
          <span className="mono subtle">{event.registeredCount}/{event.capacity} APPLIED</span>
        </div>
      </div>
    );
  }

  if (full) {
    return (
      <div className="register-flow">
        <div className="full-banner">
          <Icon name="clock" size={16} />
          <span>
            This event is full. {event.waitlistEnabled
              ? `Joining the waitlist puts you at #${event.waitlistCount + 1}; the bot promotes you automatically when a seat frees up.`
              : 'The host did not open a waitlist for this edition.'}
          </span>
        </div>
        <div className="register-actions">
          <button className="btn btn-warn" onClick={() => app.rsvp(event.id)} disabled={!event.waitlistEnabled}>
            <Icon name="clock" size={14} /> Join waitlist (#{event.waitlistCount + 1})
          </button>
          <span className="mono subtle">{event.waitlistCount} WAITING</span>
        </div>
      </div>
    );
  }

  return (
    <div className="register-flow">
      <p className="register-note">
        One click reserves seat #{event.registeredCount + 1}, issues a holographic QR pass and schedules a Telegram
        reminder 4 hours before the start. No forms, no queue.
      </p>
      <div className="register-actions">
        <button className="btn btn-primary" onClick={() => app.rsvp(event.id)}>
          <Icon name="ticket" size={14} /> Claim seat #{event.registeredCount + 1}
        </button>
        <span className="mono subtle">{eventSeatsLeft(event)} LEFT</span>
      </div>
    </div>
  );
}

function PeopleTab({ event, ticket }: { event: EventItem; ticket?: ReturnType<ReturnType<typeof useApp>['myTicket']> }) {
  const app = useApp();
  const [programme, setProgramme] = useState('All programmes');
  const [teamOnly, setTeamOnly] = useState(false);
  const [skill, setSkill] = useState(ticket?.teamSkillTag ?? '');
  const [optIn, setOptIn] = useState(ticket?.lookingForTeam ?? false);

  const [squadName, setSquadName] = useState('');
  const [squadIdea, setSquadIdea] = useState('');
  const [squadNeeded, setSquadNeeded] = useState('UI/UX Designer, Backend Python');

  const programmes = useMemo(
    () => ['All programmes', ...Array.from(new Set(event.attendees.map((a) => a.programmeShort)))],
    [event.attendees],
  );

  const people = event.attendees.filter((a) => {
    if (programme !== 'All programmes' && a.programmeShort !== programme) return false;
    if (teamOnly && !a.lookingForTeam) return false;
    return true;
  });

  const teamCount = event.attendees.filter((a) => a.lookingForTeam).length;

  const handleCreateSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadName.trim()) return;
    app.addEventSquad(event.id, {
      name: squadName.trim(),
      projectIdea: squadIdea.trim() || 'Building a prototype for this session.',
      neededRoles: squadNeeded.split(',').map((s) => s.trim()).filter(Boolean),
      members: [
        {
          userId: app.persona.id,
          name: app.persona.name,
          telegram: app.persona.telegram,
          role: skill || app.persona.programmeShort || 'Squad Lead',
        },
      ],
    });
    setSquadName('');
    setSquadIdea('');
  };

  return (
    <div className="tab-pane">
      <div className="team-panel">
        <div className="team-panel-head">
          <div>
            <h3>Find a team / study buddy</h3>
            <p>Turn this on and your skill tag appears on your classmate card for this event.</p>
          </div>
          <span className="team-count">{teamCount} looking</span>
        </div>
        <div className="team-controls">
          <button
            className={`switch ${optIn ? 'is-on' : ''}`}
            disabled={!ticket || ticket.status === 'waitlisted'}
            onClick={() => {
              const next = !optIn;
              setOptIn(next);
              if (ticket) app.setTeamOptIn(ticket.ticketId, next, skill);
            }}
            aria-pressed={optIn}
            title={!ticket ? 'Claim a seat first to join the matchmaker' : 'Toggle team finder'}
          >
            <i />
            <span>{optIn ? 'I’m looking for a team' : 'Team finder off'}</span>
          </button>
          <input
            className="team-skill-input"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            onBlur={() => ticket && optIn && app.setTeamOptIn(ticket.ticketId, true, skill)}
            placeholder="Skill / role tag — e.g. Python / Data Analysis"
            disabled={!ticket}
          />
        </div>
        {!ticket && <p className="hint">Claim a seat to unlock the matchmaker and connect with classmates.</p>}
      </div>

      {/* Squads & Teams Forming */}
      {event.teamFinder && (
        <div className="agenda">
          <div className="panel-head">
            <h3>🤝 Squads & Study Teams Forming ({(event.squads ?? []).length})</h3>
            <Mono>MAX 4 MEMBERS / SQUAD</Mono>
          </div>
          <div className="stack-sm">
            {(event.squads ?? []).map((sq) => {
              const isMember = sq.members.some((m) => m.userId === app.persona.id);
              return (
                <div key={sq.id} className="roster-row-card">
                  <div className="roster-row-head">
                    <strong>{sq.name}</strong>
                    <span className="badge badge-success">{sq.members.length}/4 members</span>
                    {!isMember && sq.members.length < 4 && (
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => app.joinEventSquad(event.id, sq.id, sq.neededRoles[0] || 'Builder')}
                      >
                        <Icon name="userPlus" size={12} /> Join Squad
                      </button>
                    )}
                  </div>
                  <p className="hint">{sq.projectIdea}</p>
                  <div className="equipment-chips">
                    {sq.members.map((m) => (
                      <span key={m.userId} className="equip-chip">
                        <Icon name="check" size={11} /> {m.name} ({m.role})
                      </span>
                    ))}
                    {sq.neededRoles.map((r) => (
                      <span key={r} className="badge badge-sm badge-muted">
                        Need: {r}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            <form className="qa-answer-form" onSubmit={handleCreateSquad}>
              <input
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                placeholder="New Squad Name (e.g., AgroQuant AI)"
              />
              <input
                value={squadIdea}
                onChange={(e) => setSquadIdea(e.target.value)}
                placeholder="Project idea or study focus…"
              />
              <input
                value={squadNeeded}
                onChange={(e) => setSquadNeeded(e.target.value)}
                placeholder="Needed roles (comma-separated)"
              />
              <button type="submit" className="btn btn-ghost btn-xs">
                + Start Squad
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="people-filters">
        <select value={programme} onChange={(e) => setProgramme(e.target.value)} aria-label="Filter by programme">
          {programmes.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button className={`pill ${teamOnly ? 'is-active' : ''}`} onClick={() => setTeamOnly((v) => !v)}>
          <Icon name="search" size={13} /> Looking for teammates
        </button>
        <span className="mono subtle">
          {people.length} SHOWN • {event.registeredCount} REGISTERED
        </span>
      </div>

      {event.attendees.length === 0 ? (
        <p className="hint">No classmates have registered yet. Claim the first seat.</p>
      ) : (
        <div className="people-grid">
          {people.map((p) => (
            <div key={p.id} className={`person-card ${p.lookingForTeam ? 'is-team' : ''}`}>
              <Avatar name={p.name} color={p.color} size={38} />
              <div className="person-main">
                <strong>{p.name}{p.self ? ' (you)' : ''}</strong>
                <span className="person-prog">{p.programmeShort}</span>
                {p.lookingForTeam && (
                  <span className="person-skill">
                    <Icon name="users" size={11} /> {p.teamRole || 'Looking for a team'}
                  </span>
                )}
              </div>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() =>
                  app.pushToast({
                    tone: 'success',
                    telegram: true,
                    title: `Telegram chat opened with ${firstName(p.name)}`,
                    message: `${p.telegram} · “Hi! We met on the UDEA Pulse attendee list for ${event.title}.”`,
                  })
                }
              >
                <Icon name="telegram" size={12} /> Connect
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QATab({ event, manage }: { event: EventItem; manage: boolean }) {
  const app = useApp();
  const [text, setText] = useState('');
  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const sorted = event.questions.slice().sort((a, b) => b.upvotes - a.upvotes);

  return (
    <div className="tab-pane">
      <div className="qa-compose">
        <h3>Ask the speaker</h3>
        <p>Questions are upvoted by the room. The speaker answers the top ones live and pins replies here.</p>
        <div className="qa-input-row">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="What do you want the speaker to answer?"
          />
          <button
            className="btn btn-primary"
            disabled={text.trim().length < 4}
            onClick={() => {
              app.addQuestion(event.id, text);
              setText('');
            }}
          >
            Post question
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="hint">No questions yet — post the first one and the room can upvote it.</p>
      ) : (
        <div className="qa-list">
          {sorted.map((q) => (
            <div key={q.id} className={`qa-card ${q.answered ? 'is-answered' : ''}`}>
              <button
                className={`upvote ${q.upvotedByMe ? 'is-on' : ''}`}
                onClick={() => app.upvote(event.id, q.id)}
                aria-label="Upvote question"
              >
                <Icon name="up" size={14} />
                <span className="mono">{q.upvotes}</span>
              </button>
              <div className="qa-body">
                <p>{q.text}</p>
                <div className="qa-meta">
                  <span>{q.author}</span>
                  <span className="prog-badge">{q.programme}</span>
                  <Mono>{relativeTime(q.timestamp)}</Mono>
                </div>
                {q.answered && q.answerText && (
                  <div className="qa-answer">
                    <span className="mono">ANSWERED BY SPEAKER</span>
                    <p>{q.answerText}</p>
                  </div>
                )}
                {manage && !q.answered && (
                  <div className="qa-host">
                    {answerFor === q.id ? (
                      <div className="qa-answer-form">
                        <input
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Type the answer students will see…"
                        />
                        <button
                          className="btn btn-primary btn-xs"
                          onClick={() => {
                            app.answerQuestion(event.id, q.id, answerText);
                            setAnswerFor(null);
                            setAnswerText('');
                          }}
                        >
                          Pin answer
                        </button>
                      </div>
                    ) : (
                      <button className="link-btn" onClick={() => setAnswerFor(q.id)}>
                        <Icon name="check" size={12} /> Answer as host
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HostTab({ event, manage }: { event: EventItem; manage: boolean }) {
  const app = useApp();
  const ticket = app.myTicket(event.id);
  const confirmed = app.state.tickets.filter(
    (t) => t.eventId === event.id && t.status !== 'cancelled' && t.confirmedAttendance4h,
  ).length;
  const checked = Object.keys(event.checkIns).length;
  const seated = ticket?.status === 'confirmed' || ticket?.status === 'checked_in';

  const canScan = hasEventPermission(app.persona, event, app.state.clubs, 'scan_tickets');
  const canEdit = hasEventPermission(app.persona, event, app.state.clubs, 'create_events');
  const canPublish = hasEventPermission(app.persona, event, app.state.clubs, 'publish_posts');

  if (!manage) {
    return (
      <div className="tab-pane">
        <div className="permission-card">
          <span className="permission-icon"><Icon name="shield" size={22} /></span>
          <h3>Organizer controls are locked</h3>
          <p>
            Only the host club, connected event team coordinators, and Campus Admin can open the scanner, edit capacity or send
            Telegram announcements. Switch persona to test delegated permissions.
          </p>
          <div className="permission-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                app.setPersona('usr_1');
                app.setView('organizer');
                app.openOrganizer(event.id);
              }}
            >
              Continue as Soliyev Firdavs (Coordinator)
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                app.setPersona('usr_2');
                app.setView('organizer');
                app.openOrganizer(event.id);
              }}
            >
              Continue as Malika (Club President)
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                app.setPersona('usr_3');
                app.setView('organizer');
                app.openOrganizer(event.id);
              }}
            >
              Continue as Timur (Admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-pane">
      <div className="host-metrics">
        <div><Mono>REGISTERED</Mono><strong>{event.registeredCount}</strong></div>
        <div><Mono>4H CONFIRMED</Mono><strong>{confirmed}</strong></div>
        <div><Mono>CHECKED IN</Mono><strong>{checked}</strong></div>
        <div><Mono>WAITLIST</Mono><strong>{event.waitlistCount}</strong></div>
      </div>
      <div className="host-actions">
        {canScan && (
          <button className="btn btn-primary" onClick={() => app.openOrganizer(event.id)}>
            <Icon name="qr" size={15} /> Open QR scanner
          </button>
        )}
        {canEdit && (
          <button className="btn btn-ghost" onClick={() => app.openEditEvent(event.id)}>
            <Icon name="edit" size={15} /> Edit Event & Team
          </button>
        )}
        {canPublish && (
          <button
            className="btn btn-ghost"
            onClick={() =>
              app.openPostModal({
                defaultEventId: event.id,
                defaultClubId: event.hostClubId ?? undefined,
                defaultType: event.past ? 'event_recap' : 'event_promo',
              })
            }
          >
            <Icon name="telegram" size={15} /> + {event.past ? 'Recap' : 'Promo'} Post
          </button>
        )}
      </div>
      {canEdit && (
        <label className="field">
          <span className="field-label">Capacity editor</span>
          <span className="field-help">
            Current capacity {event.capacity}; {seated ? 'you hold a seat here.' : 'you do not hold a seat here.'}
          </span>
          <input
            type="range"
            min={Math.max(event.registeredCount, 5)}
            max={250}
            value={event.capacity}
            onChange={(e) => app.updateEventCapacity(event.id, Number(e.target.value))}
          />
          <Mono>{event.capacity} SEATS • {pct(event.registeredCount, event.capacity)}% FILLED</Mono>
        </label>
      )}
      <div className="host-scan-preview">
        <div className="scan-frame mini">
          <span className="scan-line" />
          <Icon name="qr" size={40} />
        </div>
        <div>
          <strong>Offline scanner cache active</strong>
          <p className="mono">{event.registeredCount}/{event.registeredCount} PASSES STORED IN DEVICE MEMORY</p>
          <button className="link-btn" onClick={() => app.openOrganizer(event.id)}>
            Open full scanner <Icon name="chevron" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
