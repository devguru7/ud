import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { ROOMS } from '../lib/seed';
import {
  canManage,
  findRoomConflicts,
  getUserRoleTitleForClub,
  hasEventPermission,
} from '../lib/logic';
import { PERMISSION_META, STAFF_ROLE_DEFAULT_PERMS, STAFF_ROLE_LABEL } from '../lib/labels';
import { Avatar, CategoryBadge, EmptyState, Icon, Mono, SectionHeader } from './UI';
import {
  buildCSV,
  dayLabel,
  downloadFile,
  isoDate,
  pct,
  relativeTime,
  uid,
} from '../lib/utils';
import type { EventItem, EventStaffRole, PermissionFlag, Person } from '../types';

type GuestTab = 'all' | 'checked' | 'not' | 'waitlist' | 'screening';

export default function Organizer() {
  const app = useApp();
  const manageable = app.state.events.filter(
    (e) => e.approvalStatus === 'approved' && canManage(e, app.persona, app.state.clubs),
  );
  const sorted = manageable
    .slice()
    .sort((a, b) =>
      `${a.past ? 1 : 0}${a.date}${a.startTime}`.localeCompare(`${b.past ? 1 : 0}${b.date}${b.startTime}`),
    );
  const [selectedId, setSelectedId] = useState('');
  const current =
    sorted.find((e) => e.id === selectedId) ??
    sorted.find((e) => e.id === app.organizerEventId) ??
    sorted[0];

  const [tab, setTab] = useState<GuestTab>('all');
  const [search, setSearch] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastScan, setLastScan] = useState<{ name: string; programme: string; hash: string } | null>(null);
  const [broadcastText, setBroadcastText] = useState('');

  // Quick team connection state
  const [selectedStudentId, setSelectedStudentId] = useState(app.directory[0]?.id ?? 'usr_4');
  const [staffRole, setStaffRole] = useState<EventStaffRole>('scanner_volunteer');
  const [staffLabel, setStaffLabel] = useState('QR Door Scanner Volunteer');
  const [customPersonMode, setCustomPersonMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customTelegram, setCustomTelegram] = useState('');

  useEffect(() => {
    setLastScan(null);
    setTab('all');
    setSearch('');
    setManualCode('');
  }, [current?.id]);

  const attendees: Person[] = current?.attendees ?? [];
  const checkedIn = attendees.filter((a) => current?.checkIns[a.id]);
  const pending = attendees.filter((a) => !current?.checkIns[a.id]);
  const ticket = current ? app.myTicket(current.id) : undefined;
  const confirmed4h = current
    ? Math.min(
        current.registeredCount,
        Math.round(current.registeredCount * (current.past ? 0.98 : 0.82)) +
          (ticket?.confirmedAttendance4h ? 1 : 0),
      )
    : 0;
  const turnout = current ? pct(checkedIn.length, Math.max(current.registeredCount, 1)) : 0;

  const canScan = current
    ? hasEventPermission(app.persona, current, app.state.clubs, 'scan_tickets') ||
      hasEventPermission(app.persona, current, app.state.clubs, 'manage_registrations')
    : false;
  const canManageReg = current
    ? hasEventPermission(app.persona, current, app.state.clubs, 'manage_registrations')
    : false;
  const canBroadcast = current
    ? hasEventPermission(app.persona, current, app.state.clubs, 'send_broadcasts')
    : false;
  const canEditEvent = current
    ? hasEventPermission(app.persona, current, app.state.clubs, 'create_events') ||
      hasEventPermission(app.persona, current, app.state.clubs, 'manage_roles') ||
      current.createdBy === app.persona.id
    : false;

  const activePermissions = useMemo(() => {
    if (!current) return [];
    return PERMISSION_META.filter((m) =>
      hasEventPermission(app.persona, current, app.state.clubs, m.id),
    );
  }, [current, app.persona, app.state.clubs]);

  const rows = useMemo(() => {
    return attendees.filter((a) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return `${a.name} ${a.programme} ${a.telegram}`.toLowerCase().includes(q);
    });
  }, [attendees, search]);

  const visibleRows = rows.filter((a) => {
    if (tab === 'checked') return Boolean(current?.checkIns[a.id]);
    if (tab === 'not') return !current?.checkIns[a.id];
    if (tab === 'waitlist' || tab === 'screening') return false;
    return true;
  });

  const screeningTickets = current
    ? app.state.tickets.filter((t) => t.eventId === current.id && t.screeningStatus === 'pending')
    : [];

  const scanNext = () => {
    if (!current || !canScan) return;
    if (pending.length === 0) {
      app.pushToast({
        tone: 'info',
        title: 'Every cached pass is already scanned',
        message: 'The offline cache is empty for this event. Manual guest check-in is still available below.',
      });
      return;
    }
    const person = pending[Math.floor(Math.random() * pending.length)];
    setScanning(true);
    window.setTimeout(() => {
      app.checkInPerson(current.id, person.id);
      setLastScan({
        name: person.name,
        programme: person.programmeShort,
        hash: `UDEA-PASS-${person.id.replace(/\D/g, '').slice(-4) || '0000'}-${person.id
          .slice(-2)
          .toUpperCase()}`,
      });
      setScanning(false);
    }, 520);
  };

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !manualCode.trim()) return;
    const res = app.verifyTicketCode(current.id, manualCode);
    if (res.ok) {
      setLastScan({
        name: res.message,
        programme: 'Verified Pass',
        hash: manualCode.trim().toUpperCase(),
      });
      setManualCode('');
    }
  };

  const exportCSV = () => {
    if (!current) return;
    const header = ['Student ID', 'Full Name', 'Programme', 'Telegram', 'Status', 'Check-In Timestamp'];
    const body = current.attendees.map((a, i) => {
      const checkAt = current.checkIns[a.id];
      const id = a.self ? app.persona.studentId : `UDEA-24-${1000 + i}`;
      return [
        id,
        a.name,
        a.programme,
        a.telegram,
        checkAt ? 'Checked In' : 'Not Arrived',
        checkAt ? new Date(checkAt).toLocaleString() : '',
      ];
    });
    current.waitlistRoster.forEach((w) => {
      body.push([w.studentId, w.name, w.programme, w.telegram, 'Waitlist', '']);
    });
    downloadFile(`udea_attendance_${current.id}_${isoDate()}.csv`, buildCSV([header, ...body]), 'text/csv;charset=utf-8');
    app.pushToast({
      tone: 'success',
      title: 'CSV attendance report downloaded',
      message: `${body.length} rows exported for university reporting.`,
    });
  };

  const pendingApprovals = app.state.events.filter((e) => e.approvalStatus === 'pending_room_approval');
  const activeRoleTitle = current
    ? getUserRoleTitleForClub(app.persona, current.hostClubId ?? null, app.state.clubs)
    : null;
  const connectedTeamRole = current?.teamMembers?.find((m) => m.userId === app.persona.id);

  return (
    <div className="organizer">
      <SectionHeader
        icon="shield"
        title="Organizer Studio & Campus Admin"
        subtitle="Live turnout telemetry, offline QR check-in, delegated event team management, Telegram broadcasts and the room approval queue."
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => app.openPostModal()}>
              <Icon name="telegram" size={14} /> + Publish Post
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => app.setView('studio')}>
              <Icon name="plus" size={14} /> Host new event
            </button>
          </div>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon="shield"
          title="You are not hosting an event yet"
          message="Create a peer meetup, get delegated a club role, or switch to Soliyev Firdavs / Malika / Timur to unlock the organizer toolkit."
          action={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => app.setView('studio')}>
                Open Host Event Studio
              </button>
              <button className="btn btn-teal" onClick={() => app.setPersona('usr_4')}>
                Switch to Soliyev Firdavs (Coordinator)
              </button>
            </div>
          }
        />
      ) : (
        <>
          <div className="org-toolbar">
            <label className="org-select">
              <span className="mono subtle">
                SELECT MANAGED EVENT ({sorted.length})
                {activeRoleTitle
                  ? ` · ${activeRoleTitle.toUpperCase()}`
                  : connectedTeamRole
                    ? ` · ${connectedTeamRole.customLabel.toUpperCase()}`
                    : ''}
              </span>
              <select value={current?.id ?? ''} onChange={(e) => setSelectedId(e.target.value)}>
                {sorted.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} — {dayLabel(e.date)}
                  </option>
                ))}
              </select>
            </label>
            <div className="org-toolbar-facts">
              <CategoryBadge category={current!.category} />
              <Mono>{dayLabel(current!.date)} • {current!.startTime}–{current!.endTime}</Mono>
              <Mono>{ROOMS.find((r) => r.id === current!.roomId)?.code}</Mono>
              {canEditEvent && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => app.openEditEvent(current!.id)}
                >
                  <Icon name="edit" size={12} /> Edit Event & Team
                </button>
              )}
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => app.openCertificate(current!.id)}
              >
                <Icon name="award" size={12} /> My Staff Certificate
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() =>
                  app.openPostModal({
                    defaultEventId: current!.id,
                    defaultClubId: current!.hostClubId ?? undefined,
                    defaultType: current!.past ? 'event_recap' : 'event_promo',
                  })
                }
              >
                <Icon name="telegram" size={12} /> + Promo / Recap Post
              </button>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '10px 14px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-teal">
                <Icon name="shield" size={11} />{' '}
                {app.persona.role === 'admin'
                  ? 'CAMPUS ADMIN ACCESS'
                  : current!.createdBy === app.persona.id
                    ? 'EVENT CREATOR'
                    : activeRoleTitle
                      ? `CLUB ROLE: ${activeRoleTitle.toUpperCase()}`
                      : connectedTeamRole
                        ? `EVENT TEAM: ${connectedTeamRole.customLabel.toUpperCase()}`
                        : 'ORGANIZER ACCESS'}
              </span>
              <span className="mono subtle">ACTIVE PERMISSIONS:</span>
              {activePermissions.map((p) => (
                <span key={p.id} className="badge badge-muted">
                  ✓ {p.short}
                </span>
              ))}
            </div>
          </div>

          <div className="metrics-row">
            <div className="metric-tile">
              <Mono>REGISTERED</Mono>
              <strong>{current!.registeredCount}</strong>
              <span>of {current!.capacity} seats</span>
            </div>
            <div className="metric-tile">
              <Mono>4H CONFIRMED</Mono>
              <strong>{confirmed4h}</strong>
              <span>Telegram bot checks</span>
            </div>
            <div className="metric-tile">
              <Mono>CHECKED IN</Mono>
              <strong>{checkedIn.length}</strong>
              <span>live at the door</span>
            </div>
            <div className="metric-tile">
              <Mono>WAITLIST</Mono>
              <strong>{current!.waitlistCount}</strong>
              <span>in queue</span>
            </div>
            <div className="metric-tile highlight">
              <Mono>TURNOUT</Mono>
              <strong>{turnout}%</strong>
              <span className="capacity-track tiny">
                <span className="capacity-fill cap-open" style={{ width: `${turnout}%` }} />
              </span>
            </div>
          </div>

          <div className="org-grid">
            <section className="card scanner-card">
              <div className="panel-head">
                <h2><Icon name="camera" size={17} /> Offline QR check-in</h2>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`btn btn-xs ${cameraMode ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCameraMode((v) => !v)}
                  >
                    <Icon name="camera" size={12} /> {cameraMode ? 'Camera Active' : 'Camera View'}
                  </button>
                  <span className="cache-badge">
                    <i /> Offline Cache ({current!.registeredCount} passes)
                  </span>
                </div>
              </div>

              <div className={`scanner-view ${scanning ? 'is-scanning' : ''}`}>
                <div className="scanner-grid" />
                <span className="scanner-corner tl" />
                <span className="scanner-corner tr" />
                <span className="scanner-corner bl" />
                <span className="scanner-corner br" />
                <span className="scanner-laser" />
                <div className="scanner-center">
                  <Icon name="qr" size={64} />
                  <span className="mono">
                    {scanning
                      ? 'VALIDATING CRYPTOGRAPHIC HASH…'
                      : cameraMode
                        ? 'CAMERA STREAM SIMULATED · HOLD QR PASS IN FRAME'
                        : 'POINT AT A STUDENT PASS OR ENTER HASH BELOW'}
                  </span>
                </div>
              </div>

              <div className="scanner-actions">
                <button className="btn btn-primary" onClick={scanNext} disabled={scanning || !canScan}>
                  <Icon name="qr" size={15} /> {scanning ? 'Scanning…' : 'Simulate Next Student QR Scan'}
                </button>
                <span className="mono subtle">{pending.length} NOT YET SCANNED</span>
              </div>

              <form onSubmit={handleManualVerify} style={{ display: 'flex', gap: 8 }}>
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  disabled={!canScan}
                  placeholder="Enter QR hash (UDEA-...), Student ID, @telegram or name…"
                />
                <button type="submit" className="btn btn-ghost btn-sm" disabled={!canScan || !manualCode.trim()}>
                  Verify & Check In
                </button>
              </form>

              {lastScan && (
                <div className="scan-result">
                  <span className="scan-check"><Icon name="check" size={16} /></span>
                  <div>
                    <strong>{lastScan.name}</strong>
                    <span>{lastScan.programme} · {lastScan.hash}</span>
                  </div>
                  <span className="badge badge-success">VALID PASS</span>
                </div>
              )}

              <div className="scanner-note mono">
                SCANNER RUNS FROM DEVICE MEMORY · NO SIGNAL REQUIRED · SYNC QUEUES ON RECONNECT
              </div>
            </section>

            <section className="card broadcast-card">
              <div className="panel-head">
                <h2><Icon name="telegram" size={17} /> Instant Telegram broadcast</h2>
                <Mono>@udea_pulse_bot</Mono>
              </div>
              <textarea
                rows={4}
                value={broadcastText}
                disabled={!canBroadcast}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder={
                  canBroadcast
                    ? 'e.g. We moved from Room 204 to Lecture Hall A1 due to high demand!'
                    : 'Your current staff role does not include broadcast permissions.'
                }
              />
              <div className="broadcast-actions">
                <button
                  className="btn btn-primary"
                  disabled={!canBroadcast || broadcastText.trim().length < 4}
                  onClick={() => {
                    if (!current) return;
                    app.broadcast(current.id, broadcastText);
                    setBroadcastText('');
                  }}
                >
                  <Icon name="telegram" size={15} /> Send via Telegram Bot to {current!.registeredCount} attendees
                </button>
                <button className="btn btn-ghost" onClick={exportCSV}>
                  <Icon name="download" size={15} /> Export CSV
                </button>
              </div>
              <div className="broadcast-history">
                <span className="mono subtle">RECENT BROADCASTS</span>
                {app.state.broadcasts.filter((b) => b.eventId === current!.id).length === 0 ? (
                  <p className="hint">No messages sent for this event yet.</p>
                ) : (
                  app.state.broadcasts
                    .filter((b) => b.eventId === current!.id)
                    .map((b) => (
                      <div key={b.id} className="broadcast-row">
                        <Icon name="telegram" size={13} />
                        <span>{b.text}</span>
                        <Mono>{b.recipients} SENT · {relativeTime(b.at)}</Mono>
                      </div>
                    ))
                )}
              </div>
            </section>
          </div>

          <section className="card guest-card" style={{ marginBottom: 16 }}>
            <div className="panel-head">
              <h2><Icon name="users" size={17} /> Connected Event Team & Volunteers ({current!.teamMembers?.length ?? 0})</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {canEditEvent && (
                  <button
                    type="button"
                    className={`btn btn-xs ${customPersonMode ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setCustomPersonMode((v) => !v)}
                  >
                    <Icon name="userPlus" size={12} /> {customPersonMode ? 'Pick Directory' : '+ New Student'}
                  </button>
                )}
                <Mono>DELEGATED EVENT STAFF</Mono>
              </div>
            </div>
            {canEditEvent && (
              <div className="field-row three" style={{ marginBottom: 12 }}>
                {customPersonMode ? (
                  <label className="field">
                    <span className="field-label">New Student Name & @Telegram</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Full Name"
                      />
                      <input
                        value={customTelegram}
                        onChange={(e) => setCustomTelegram(e.target.value)}
                        placeholder="@handle"
                      />
                    </div>
                  </label>
                ) : (
                  <label className="field">
                    <span className="field-label">Select Student</span>
                    <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                      {app.directory.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.telegram})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="field">
                  <span className="field-label">Staff Role</span>
                  <select
                    value={staffRole}
                    onChange={(e) => {
                      const r = e.target.value as EventStaffRole;
                      setStaffRole(r);
                      setStaffLabel(STAFF_ROLE_LABEL[r]);
                    }}
                  >
                    {(Object.keys(STAFF_ROLE_LABEL) as EventStaffRole[]).map((r) => (
                      <option key={r} value={r}>
                        {STAFF_ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Custom Role Badge</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={staffLabel}
                      onChange={(e) => setStaffLabel(e.target.value)}
                      placeholder="e.g. QR Door Volunteer"
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        if (!current) return;
                        if (customPersonMode) {
                          if (customName.trim().length < 2) return;
                          const tg = customTelegram.trim()
                            ? customTelegram.trim().startsWith('@')
                              ? customTelegram.trim()
                              : `@${customTelegram.trim()}`
                            : `@${customName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                          app.addEventTeamMember(current.id, {
                            userId: `stu_${uid('usr')}`,
                            name: customName.trim(),
                            telegram: tg,
                            programme: 'BSc Digital Economics (Coventry)',
                            role: staffRole,
                            customLabel: staffLabel.trim() || STAFF_ROLE_LABEL[staffRole],
                            permissions: STAFF_ROLE_DEFAULT_PERMS[staffRole],
                            showOnEventPage: true,
                          });
                          setCustomName('');
                          setCustomTelegram('');
                          return;
                        }
                        const dir = app.directory.find((s) => s.id === selectedStudentId);
                        if (!dir) return;
                        app.addEventTeamMember(current.id, {
                          userId: dir.id,
                          name: dir.name,
                          telegram: dir.telegram,
                          programme: dir.programme,
                          role: staffRole,
                          customLabel: staffLabel.trim() || STAFF_ROLE_LABEL[staffRole],
                          permissions: STAFF_ROLE_DEFAULT_PERMS[staffRole],
                          showOnEventPage: true,
                        });
                      }}
                    >
                      + Connect
                    </button>
                  </div>
                </label>
              </div>
            )}
            {(current!.teamMembers ?? []).length === 0 ? (
              <p className="hint">No additional team members connected to this event yet.</p>
            ) : (
              <div className="roster-stack">
                {(current!.teamMembers ?? []).map((tm) => (
                  <div key={tm.userId} className="roster-row-card">
                    <div className="roster-row-head">
                      <Avatar name={tm.name} color="#0D9488" size={32} />
                      <div className="roster-row-main">
                        <strong>{tm.name}</strong>
                        <span className="mono">
                          {tm.customLabel} · {tm.telegram} · {tm.programme}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {app.personas.some((p) => p.id === tm.userId) && (
                          <button
                            className="btn btn-teal btn-xs"
                            onClick={() => app.setPersona(tm.userId)}
                          >
                            ⚡ Switch
                          </button>
                        )}
                        {canEditEvent && (
                          <button
                            className="btn btn-ghost btn-xs danger-text"
                            onClick={() => app.removeEventTeamMember(current!.id, tm.userId)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card guest-card">
            <div className="panel-head">
              <h2><Icon name="users" size={17} /> Guest list & manual check-in</h2>
              <Mono>{rows.length} OF {current!.registeredCount} REGISTERED</Mono>
            </div>
            <div className="table-controls">
              <div className="search-wrap compact">
                <Icon name="search" size={15} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, ID or Telegram handle…"
                />
              </div>
              <div className="guest-tabs">
                {(
                  [
                    ['all', `All (${attendees.length})`],
                    ['checked', `Checked In (${checkedIn.length})`],
                    ['not', `Not Arrived (${pending.length})`],
                    ['waitlist', `Waitlist (${current!.waitlistRoster.length})`],
                    ['screening', `Screening Pending (${screeningTickets.length})`],
                  ] as [GuestTab, string][]
                ).map(([id, label]) => (
                  <button key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'waitlist' ? (
              <div className="guest-table">
                {current!.waitlistRoster.length === 0 ? (
                  <p className="hint">No one is waiting for a seat on this event.</p>
                ) : (
                  <>
                    {canManageReg && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 6px 10px' }}>
                        <span className="mono subtle">WAITLIST QUEUE ({current!.waitlistRoster.length} WAITING)</span>
                        <button
                          className="btn btn-teal btn-xs"
                          onClick={() => app.promoteWaitlistEntry(current!.id, current!.waitlistRoster[0].id)}
                        >
                          ⚡ Promote #1 Waitlisted Student Now
                        </button>
                      </div>
                    )}
                    {current!.waitlistRoster.map((w, i) => (
                      <div key={w.id} className="guest-row">
                        <Avatar name={w.name} color="#F97316" size={30} />
                        <div className="guest-name">
                          <strong>{w.name}</strong>
                          <span className="mono">{w.studentId} · {w.telegram}</span>
                        </div>
                        <span className="guest-prog">{w.programmeShort}</span>
                        <span className="status-chip is-waitlist">WAITLIST #{i + 1}</span>
                        {canManageReg ? (
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => app.promoteWaitlistEntry(current!.id, w.id)}
                          >
                            Promote Now
                          </button>
                        ) : (
                          <span className="guest-action mono">AUTO-PROMOTE</span>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ) : tab === 'screening' ? (
              <div className="guest-table">
                {screeningTickets.length === 0 ? (
                  <p className="hint">No screening applications are waiting for review.</p>
                ) : (
                  screeningTickets.map((t) => {
                    const p = app.personas.find((x) => x.id === t.userId);
                    return (
                      <div key={t.ticketId} className="guest-row">
                        <Avatar name={p?.name ?? 'Applicant'} color={p?.color ?? '#2563EB'} size={30} />
                        <div className="guest-name">
                          <strong>{p?.name ?? 'Applicant'}</strong>
                          <span>{t.screeningAnswer || 'No answer provided'}</span>
                        </div>
                        <span className="status-chip is-pending">SCREENING PENDING</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-primary btn-xs"
                            disabled={!canManageReg}
                            onClick={() => app.approveScreeningTicket(t.ticketId)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-ghost btn-xs danger-text"
                            disabled={!canManageReg}
                            onClick={() => app.declineScreeningTicket(t.ticketId)}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="guest-table">
                {visibleRows.length === 0 ? (
                  <p className="hint">No guests match this filter.</p>
                ) : (
                  visibleRows.map((a, i) => {
                    const checkedAt = current!.checkIns[a.id];
                    return (
                      <div key={a.id} className="guest-row">
                        <Avatar name={a.name} color={a.color} size={30} />
                        <div className="guest-name">
                          <strong>{a.name}{a.self ? ' (you)' : ''}</strong>
                          <span className="mono">
                            {a.self ? app.persona.studentId : `UDEA-24-${1000 + i}`} · {a.telegram}
                          </span>
                        </div>
                        <span className="guest-prog">{a.programmeShort}</span>
                        {checkedAt ? (
                          <span className="status-chip is-checked">
                            ✓ {new Date(checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="status-chip is-away">NOT ARRIVED</span>
                        )}
                        {checkedAt ? (
                          <button
                            className="btn btn-ghost btn-xs"
                            disabled={!canScan}
                            onClick={() => app.undoCheckIn(current!.id, a.id)}
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-xs"
                            disabled={!canScan}
                            onClick={() => app.checkInPerson(current!.id, a.id)}
                          >
                            <Icon name="check" size={12} /> Check in
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>
        </>
      )}

      <section className="admin-queue">
        <div className="panel-head">
          <h2><Icon name="shield" size={17} /> Admin room & event approval queue</h2>
          <Mono>{pendingApprovals.length} PENDING</Mono>
        </div>
        {app.persona.role !== 'admin' ? (
          <div className="admin-locked">
            <div>
              <strong>{pendingApprovals.length} request{pendingApprovals.length === 1 ? '' : 's'} waiting for Campus Operations</strong>
              <p>Room requests from non-delegated student events are reviewed by Timur Alimov. Switch persona to approve them.</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => app.setPersona('usr_3')}>
              Switch to Timur (Admin)
            </button>
          </div>
        ) : pendingApprovals.length === 0 ? (
          <p className="hint">All room requests are cleared. New submissions land here instantly.</p>
        ) : (
          <div className="approval-grid">
            {pendingApprovals.map((e) => (
              <ApprovalCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ApprovalCard({ event }: { event: EventItem }) {
  const app = useApp();
  const room = ROOMS.find((r) => r.id === event.roomId);
  const conflicts = findRoomConflicts(app.state.events, event.roomId, event.date, event.startTime, event.endTime, event.id);
  const freeRooms = ROOMS.filter(
    (r) =>
      r.campus === event.campus &&
      r.kind !== 'online' &&
      r.id !== event.roomId &&
      findRoomConflicts(app.state.events, r.id, event.date, event.startTime, event.endTime, event.id).length === 0,
  );
  const [suggested, setSuggested] = useState(freeRooms[0]?.id ?? '');
  const [adminNote, setAdminNote] = useState('');

  return (
    <div className="approval-card">
      <div className="approval-head">
        <div>
          <strong>{event.title}</strong>
          <span className="mono">{dayLabel(event.date)} • {event.startTime}–{event.endTime} • {event.hostName}</span>
        </div>
        <span className="badge badge-warn">PENDING</span>
      </div>
      <div className="approval-facts">
        <span className="mono">{room?.name}</span>
        <span className="mono">CAP {event.capacity}</span>
        <span className="mono">{event.language}</span>
      </div>
      <div className={`conflict-badge ${conflicts.length ? 'is-conflict' : 'is-free'}`}>
        <Icon name={conflicts.length ? 'x' : 'check'} size={14} />
        <span>
          {conflicts.length
            ? `Room conflict with “${conflicts[0].title}” (${conflicts[0].startTime}–${conflicts[0].endTime})`
            : 'Room free & requested equipment available'}
        </span>
      </div>
      <div className="equipment-chips">
        {event.equipmentRequested.map((eq) => (
          <span key={eq} className="equip-chip"><Icon name="check" size={11} /> {eq}</span>
        ))}
      </div>
      <input
        value={adminNote}
        onChange={(e) => setAdminNote(e.target.value)}
        placeholder="Optional admin feedback note to organizer…"
        style={{ fontSize: 11.5, padding: '6px 9px' }}
      />
      {freeRooms.length > 0 && (
        <div className="suggest-row">
          <select value={suggested} onChange={(e) => setSuggested(e.target.value)} aria-label="Suggested room">
            {freeRooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name} · cap {r.capacity}</option>
            ))}
          </select>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => app.rejectEvent(event.id, suggested || freeRooms[0].id, adminNote)}
          >
            Suggest room
          </button>
        </div>
      )}
      <div className="approval-actions">
        <button className="btn btn-primary btn-sm" onClick={() => app.approveEvent(event.id)}>
          <Icon name="check" size={14} /> Approve & Auto-Post
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => app.openEvent(event.id)}>
          Preview
        </button>
        <button
          className="btn btn-ghost btn-sm danger-text"
          onClick={async () => {
            const ok = await app.askConfirm({
              title: 'Reject this event?',
              message: `“${event.title}” will be removed from the approval queue and the organiser notified on Telegram.`,
              confirmLabel: 'Reject event',
              tone: 'danger',
            });
            if (ok) app.rejectEvent(event.id, undefined, adminNote);
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
