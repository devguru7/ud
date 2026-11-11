import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import type {
  AttachmentItem,
  Category,
  Campus,
  EventDraft,
  EventItem,
  EventStaffRole,
  EventTeamMember,
  Lang,
  PermissionFlag,
  RegistrationMode,
} from '../types';
import { ROOMS } from '../lib/seed';
import { Avatar, Icon, Mono, Poster, SectionHeader } from './UI';
import {
  CATEGORY_LABEL,
  copyText,
  dayLabel,
  downloadEventPosterPNG,
  isoOffset,
  minutesFromTime,
  pct,
  timeFromMinutes,
  uid,
} from '../lib/utils';
import { PERMISSION_META, STAFF_ROLE_DEFAULT_PERMS, STAFF_ROLE_LABEL } from '../lib/labels';
import {
  availableRooms,
  findRoomConflicts,
  getUserCanCreateOfficialEvents,
  getUserRoleTitleForClub,
  nextFreeSlot,
} from '../lib/logic';

const COVERS = [
  { id: 'emerald', label: 'Emerald Matrix' },
  { id: 'violet', label: 'Violet Cyber Mesh' },
  { id: 'blueprint', label: 'Coventry Royal Blueprint' },
  { id: 'lime', label: 'Acid Lime Arena' },
  { id: 'sunset', label: 'Sunset Terracotta' },
  { id: 'obsidian', label: 'Obsidian Minimal' },
];

const PATTERNS: { id: EventDraft['pattern']; label: string }[] = [
  { id: 'grid', label: 'Grid' },
  { id: 'dots', label: 'Dots' },
  { id: 'waves', label: 'Topographic Waves' },
  { id: 'clean', label: 'Clean' },
];

const EQUIPMENT = ['4K Projector', 'Wireless Mics', 'Whiteboard & Markers', 'Power Strips', 'LED Wall', 'Scoreboard'];

const emptyDraft = (defaultClubId: string | null = 'club_fintech'): EventDraft => ({
  title: '',
  subtitle: '',
  description: '',
  outcomes: [],
  prerequisites: '',
  agenda: [],
  attachments: [],
  track: 'official',
  category: 'fintech',
  language: 'EN',
  hostClubId: defaultClubId,
  coHostClubIds: [],
  coverStyle: 'violet',
  coverImage: '',
  pattern: 'grid',
  date: isoOffset(2),
  startTime: '14:00',
  endTime: '16:00',
  campus: 'Boshlik',
  roomId: 'rm_204',
  equipment: ['4K Projector', 'Wireless Mics'],
  registrationMode: 'internal_1click',
  externalUrl: '',
  screeningPrompt: '',
  capacity: 40,
  waitlistEnabled: true,
  teamFinder: true,
  certificate: true,
  teamMembers: [],
});

export default function HostStudio() {
  const app = useApp();
  const persona = app.persona;
  const editingEvent = app.editingEventId
    ? app.state.events.find((e) => e.id === app.editingEventId)
    : undefined;

  const [draft, setDraft] = useState<EventDraft>(() => emptyDraft(persona.clubId ?? 'club_fintech'));
  const [previewMode, setPreviewMode] = useState<'card' | 'telegram'>('card');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Outcomes & Agenda & Attachments local builders
  const [outcomeInput, setOutcomeInput] = useState('');
  const [agendaTime, setAgendaTime] = useState('14:00');
  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaSpeaker, setAgendaSpeaker] = useState('');
  const [attLabel, setAttLabel] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [attKind, setAttKind] = useState<AttachmentItem['kind']>('slides');

  // Team member builder state
  const [selectedStudentId, setSelectedStudentId] = useState(app.directory[0]?.id ?? 'usr_4');
  const [staffRole, setStaffRole] = useState<EventStaffRole>('coordinator');
  const [staffLabel, setStaffLabel] = useState('FinTech Case Coordinator');
  const [staffPerms, setStaffPerms] = useState<PermissionFlag[]>(STAFF_ROLE_DEFAULT_PERMS.coordinator);
  const [customPersonMode, setCustomPersonMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customTelegram, setCustomTelegram] = useState('');
  const [customProgramme, setCustomProgramme] = useState('BSc Finance & FinTech (Coventry)');

  useEffect(() => {
    if (editingEvent) {
      setDraft({
        id: editingEvent.id,
        title: editingEvent.title,
        subtitle: editingEvent.subtitle,
        description: editingEvent.description,
        outcomes: editingEvent.outcomes ?? [],
        prerequisites: editingEvent.prerequisites ?? '',
        agenda: editingEvent.agenda ?? [],
        attachments: editingEvent.attachments ?? [],
        track: editingEvent.eventType,
        category: editingEvent.category,
        language: editingEvent.language,
        hostClubId: editingEvent.hostClubId ?? 'club_fintech',
        coHostClubIds: editingEvent.coHostClubIds ?? [],
        coverStyle: editingEvent.coverStyle,
        coverImage: editingEvent.coverImage ?? '',
        pattern: editingEvent.pattern,
        date: editingEvent.date,
        startTime: editingEvent.startTime,
        endTime: editingEvent.endTime,
        campus: editingEvent.campus,
        roomId: editingEvent.roomId,
        equipment: editingEvent.equipmentRequested,
        registrationMode: editingEvent.registrationMode,
        externalUrl: editingEvent.externalUrl ?? '',
        screeningPrompt: editingEvent.screeningPrompt ?? '',
        capacity: editingEvent.capacity,
        waitlistEnabled: editingEvent.waitlistEnabled,
        teamFinder: editingEvent.teamFinder,
        certificate: editingEvent.issueCertificate,
        teamMembers: editingEvent.teamMembers ?? [],
      });
    } else {
      const base = emptyDraft(persona.clubId ?? 'club_fintech');
      if (app.studioPreset) {
        const start = app.studioPreset.startTime ?? base.startTime;
        const end = timeFromMinutes(Math.min(22 * 60, minutesFromTime(start) + 120));
        setDraft({
          ...base,
          campus: 'Boshlik',
          roomId: app.studioPreset.roomId ?? base.roomId,
          date: app.studioPreset.date ?? base.date,
          startTime: start,
          endTime: end,
        });
      } else {
        setDraft(base);
      }
    }
  }, [editingEvent?.id, persona.id, app.studioPreset]);

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const rooms = useMemo(
    () => ROOMS.filter((r) => r.campus === draft.campus),
    [draft.campus],
  );

  const excludeId = editingEvent?.id;
  const conflicts = findRoomConflicts(
    app.state.events,
    draft.roomId,
    draft.date,
    draft.startTime,
    draft.endTime,
    excludeId,
  );
  const hasConfirmedConflict = conflicts.some((c) => c.approvalStatus === 'approved');
  const suggestion = conflicts.length
    ? nextFreeSlot(app.state.events, draft.roomId, draft.date, draft.startTime, draft.endTime, excludeId)
    : null;
  const altRooms = conflicts.length
    ? availableRooms(
        app.state.events,
        ROOMS,
        draft.campus,
        draft.date,
        draft.startTime,
        draft.endTime,
        draft.track === 'peer_meetup' ? 30 : draft.capacity,
        excludeId,
      )
    : [];

  const selectedRoom = ROOMS.find((r) => r.id === draft.roomId);
  const canCreateOfficialDirectly = getUserCanCreateOfficialEvents(
    persona,
    app.state.clubs,
    draft.hostClubId,
    draft.category,
  );
  const studentNeedsApproval = draft.track === 'official' && !canCreateOfficialDirectly;
  const activeRoleTitle = getUserRoleTitleForClub(persona, draft.hostClubId, app.state.clubs);

  const pendingMine = app.state.events.filter(
    (e) => e.createdBy === persona.id && e.approvalStatus === 'pending_room_approval',
  );

  const hostClub = app.state.clubs.find((c) => c.id === draft.hostClubId);

  const fillDemoDraft = () => {
    setDraft({
      title: 'Treasury Liquidity & Algorithmic FX Risk Lab',
      subtitle: 'Hands-on simulation of intraday FX hedging and interbank liquidity buffers in Lab 204.',
      description:
        'Work in pairs on a real commercial bank balance-sheet dataset. We will stress-test UZS/USD volatility scenarios, compute VaR limits, and present a 3-minute treasury desk recommendation.',
      outcomes: [
        'Build an intraday FX exposure ladder in Python & Excel',
        'Understand Central Bank reserve and liquidity coverage ratios',
        'Earn verified Coventry–UDEA co-curricular credit',
      ],
      prerequisites: 'Bring a laptop with Excel or Python installed. Open to all BSc & Foundation students.',
      agenda: [
        { time: '14:00', title: 'Case Briefing & Treasury Desk Setup', speaker: persona.name },
        { time: '14:35', title: 'FX Volatility Stress-Test Sprint', speaker: 'FinTech Club Case Leads' },
        { time: '15:25', title: 'Desk Pitches & Certificate Verification', speaker: 'Guest Treasury Mentor' },
      ],
      attachments: [
        {
          id: uid('att'),
          title: 'FX_Liquidity_Case_Workbook.xlsx',
          url: 'https://udea.uz/assets/fx-liquidity-workbook.xlsx',
          kind: 'dataset',
        },
        {
          id: uid('att'),
          title: 'Treasury_Risk_Briefing_Deck.pdf',
          url: 'https://udea.uz/assets/treasury-briefing-deck.pdf',
          kind: 'slides',
        },
      ],
      track: 'official',
      category: 'fintech',
      language: 'EN',
      hostClubId: 'club_fintech',
      coHostClubIds: ['club_agrobank'],
      coverStyle: 'emerald',
      coverImage: '',
      pattern: 'grid',
      date: isoOffset(3),
      startTime: '14:00',
      endTime: '16:00',
      campus: 'Boshlik',
      roomId: 'rm_204',
      equipment: ['4K Projector', 'Wireless Mics', 'Power Strips'],
      registrationMode: 'internal_1click',
      externalUrl: '',
      screeningPrompt: '',
      capacity: 40,
      waitlistEnabled: true,
      teamFinder: true,
      certificate: true,
      teamMembers: draft.teamMembers,
    });
    app.pushToast({
      tone: 'info',
      title: 'Demo event template loaded',
      message: 'Review the pre-filled agenda, outcomes, attachments and conflict check.',
    });
  };

  const previewEvent: EventItem = {
    id: editingEvent?.id ?? 'preview',
    title: draft.title || 'Your event title appears here',
    subtitle: draft.subtitle || 'A one-line summary pulls students in — keep it concrete.',
    description: draft.description,
    outcomes: draft.outcomes ?? [],
    prerequisites: draft.prerequisites ?? '',
    agenda: draft.agenda ?? [],
    attachments: draft.attachments ?? [],
    category: draft.category,
    eventType: draft.track,
    approvalStatus: 'approved',
    campus: draft.campus,
    roomId: draft.roomId,
    date: draft.date,
    startTime: draft.startTime,
    endTime: draft.endTime,
    language: draft.language,
    hostClubId: draft.track === 'official' ? draft.hostClubId : null,
    coHostClubIds: draft.coHostClubIds,
    hostName: draft.track === 'peer_meetup' ? persona.name : hostClub?.name ?? persona.name,
    createdBy: persona.id,
    createdByRoleTitle: activeRoleTitle ?? undefined,
    registrationMode: draft.registrationMode,
    externalUrl: draft.externalUrl,
    screeningPrompt: draft.screeningPrompt,
    capacity: draft.track === 'peer_meetup' ? Math.min(30, draft.capacity) : draft.capacity,
    registeredCount: editingEvent?.registeredCount ?? 0,
    waitlistCount: editingEvent?.waitlistCount ?? 0,
    issueCertificate: draft.certificate,
    coverStyle: draft.coverStyle,
    coverImage: draft.coverImage || undefined,
    pattern: draft.pattern,
    equipmentRequested: draft.equipment,
    teamFinder: draft.teamFinder,
    waitlistEnabled: draft.waitlistEnabled,
    attendees: editingEvent?.attendees ?? [],
    questions: editingEvent?.questions ?? [],
    waitlistRoster: editingEvent?.waitlistRoster ?? [],
    checkIns: editingEvent?.checkIns ?? {},
    teamMembers: draft.teamMembers,
  };

  const toggleStaffPerm = (flag: PermissionFlag) => {
    setStaffPerms((prev) => (prev.includes(flag) ? prev.filter((p) => p !== flag) : [...prev, flag]));
  };

  const addTeamMemberToDraft = () => {
    let userId = selectedStudentId;
    let name = '';
    let telegram = '';
    let programme = '';

    if (customPersonMode) {
      if (customName.trim().length < 2) {
        setError('Please enter a valid student name (min 2 characters).');
        return;
      }
      userId = `stu_${uid('usr')}`;
      name = customName.trim();
      telegram = customTelegram.trim()
        ? customTelegram.trim().startsWith('@')
          ? customTelegram.trim()
          : `@${customTelegram.trim()}`
        : `@${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      programme = customProgramme.trim() || 'BSc Digital Economics (Coventry)';
    } else {
      const dir = app.directory.find((s) => s.id === selectedStudentId);
      if (!dir) return;
      userId = dir.id;
      name = dir.name;
      telegram = dir.telegram;
      programme = dir.programme;
    }

    const member: EventTeamMember = {
      userId,
      name,
      telegram,
      programme,
      role: staffRole,
      customLabel: staffLabel.trim() || STAFF_ROLE_LABEL[staffRole],
      permissions: staffPerms.length > 0 ? staffPerms : STAFF_ROLE_DEFAULT_PERMS[staffRole],
      showOnEventPage: true,
    };
    set(
      'teamMembers',
      [...draft.teamMembers.filter((m) => m.userId !== member.userId), member],
    );
    setCustomName('');
    setCustomTelegram('');
  };

  const removeTeamMemberFromDraft = (userId: string) => {
    set(
      'teamMembers',
      draft.teamMembers.filter((m) => m.userId !== userId),
    );
  };

  const submit = () => {
    setError('');
    setNotice('');
    if (editingEvent) {
      const result = app.updateEvent(editingEvent.id, draft);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
      app.clearEditingEvent();
      app.setView('explore');
      app.openEvent(editingEvent.id);
      return;
    }

    const result = app.createEvent(draft);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setNotice(result.message);
    const createdId = result.id;
    if (createdId) {
      setDraft(emptyDraft(persona.clubId ?? 'club_fintech'));
      app.setView('explore');
      app.openEvent(createdId);
      return;
    }
    setDraft(emptyDraft(persona.clubId ?? 'club_fintech'));
  };

  const telegramText = `${draft.track === 'peer_meetup' ? '⚡' : '🏛️'} ${draft.title || 'Your event title'}\n\n${
    draft.subtitle || 'One-line summary'
  }\n\n📅 ${dayLabel(draft.date)} · ${draft.startTime}–${draft.endTime}\n📍 ${
    selectedRoom ? `Boshlik Campus · ${selectedRoom.name}` : 'Boshlik Campus'
  }\n🎟 ${draft.track === 'peer_meetup' ? Math.min(30, draft.capacity) : draft.capacity} seats · ${
    draft.registrationMode === 'external_link'
      ? 'Partner registration'
      : draft.registrationMode === 'internal_screening'
        ? 'Screening required'
        : '1-click RSVP'
  }${draft.certificate ? '\n🎓 Verified UDEA certificate' : ''}${
    draft.teamMembers.length > 0
      ? `\n👥 Event Team: ${draft.teamMembers.map((m) => `${m.name} (${m.customLabel})`).join(', ')}`
      : ''
  }\n\nOpen the Mini App to claim your seat.`;

  return (
    <div className="studio">
      <SectionHeader
        icon={editingEvent ? 'edit' : 'plus'}
        title={editingEvent ? `Editing: ${editingEvent.title}` : 'Host Event Studio'}
        subtitle={
          editingEvent
            ? 'Modify schedule, room, agenda, attachments, capacity, or connect additional co-hosts and volunteers.'
            : 'Split-screen builder with a live poster preview, Telegram post preview, role-aware permissions and Boshlik room conflict check.'
        }
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!editingEvent && (
              <button className="btn btn-violet btn-sm" onClick={fillDemoDraft}>
                <Icon name="spark" size={14} /> Auto-Fill Demo Event
              </button>
            )}
            {editingEvent && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  app.clearEditingEvent();
                  setDraft(emptyDraft(persona.clubId ?? 'club_fintech'));
                }}
              >
                Cancel Edit
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => app.setView('explore')}>
              <Icon name="compass" size={14} /> Back to Explore
            </button>
          </div>
        }
      />

      <div className="studio-grid">
        <div className="studio-form">
          {error && (
            <div className="inline-alert is-error">
              <Icon name="x" size={15} /> {error}
            </div>
          )}
          {notice && (
            <div className="inline-alert is-success">
              <Icon name="check" size={15} /> {notice}
            </div>
          )}

          <section className="form-card">
            <div className="form-step">
              <span className="step-num mono">01</span>
              <h3>Event track, club & basics</h3>
            </div>

            <div className="track-cards">
              <button
                type="button"
                className={`track-card ${draft.track === 'official' ? 'is-active' : ''}`}
                onClick={() => set('track', 'official')}
              >
                <span className="track-icon">🏛️</span>
                <strong>Official Club / University Event</strong>
                <em>
                  Lecture hall booking, equipment requests, certificates. Club leads, delegated coordinators and admins
                  publish directly when the Boshlik room is free.
                </em>
              </button>
              <button
                type="button"
                className={`track-card ${draft.track === 'peer_meetup' ? 'is-active' : ''}`}
                onClick={() => {
                  set('track', 'peer_meetup');
                  set('capacity', 15);
                  set('roomId', 'rm_lrc');
                  set('certificate', false);
                  set('campus', 'Boshlik');
                }}
              >
                <span className="track-icon">⚡</span>
                <strong>Quick Student Peer Meetup</strong>
                <em>
                  Study groups, IELTS practice, board games or futsal. Publishes instantly with no bureaucracy and caps at
                  30 participants.
                </em>
              </button>
            </div>

            {draft.track === 'official' && (
              <div className="field-row">
                <label className="field">
                  <span className="field-label">Host Club</span>
                  <select
                    value={draft.hostClubId ?? 'club_fintech'}
                    onChange={(e) => set('hostClubId', e.target.value)}
                  >
                    {app.state.clubs.map((c) => {
                      const canDirect = getUserCanCreateOfficialEvents(persona, app.state.clubs, c.id, draft.category);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.short}) — {canDirect ? '✓ Authorized (Instant Publish)' : '⏳ Requires Approval'}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Co-Hosting Club (Optional)</span>
                  <select
                    value={draft.coHostClubIds[0] ?? ''}
                    onChange={(e) => set('coHostClubIds', e.target.value ? [e.target.value] : [])}
                  >
                    <option value="">None (Single Club Host)</option>
                    {app.state.clubs
                      .filter((c) => c.id !== draft.hostClubId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          + {c.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            )}

            <label className="field">
              <span className="field-label">Event title (min. 4 chars)</span>
              <input
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                maxLength={90}
                placeholder="e.g. FinTech & Commercial Banking Practice Case Workshop"
              />
              <span className="field-hint">{draft.title.length}/90</span>
            </label>

            <label className="field">
              <span className="field-label">Subtitle / summary</span>
              <input
                value={draft.subtitle}
                onChange={(e) => set('subtitle', e.target.value)}
                maxLength={140}
                placeholder="One concrete line about what happens in the room"
              />
            </label>

            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                rows={4}
                value={draft.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="What students will do, who it is for and what to bring."
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Category</span>
                <select value={draft.category} onChange={(e) => set('category', e.target.value as Category)}>
                  {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Language</span>
                <select value={draft.language} onChange={(e) => set('language', e.target.value as Lang)}>
                  <option value="EN">English (EN)</option>
                  <option value="UZ">Uzbek (UZ)</option>
                  <option value="RU">Russian (RU)</option>
                </select>
              </label>
            </div>

            <div className="recap-editor-box">
              <span className="mono subtle">AGENDA, LEARNING OUTCOMES & MATERIALS (OPTIONAL)</span>

              <label className="field">
                <span className="field-label">Prerequisites / What to Bring</span>
                <input
                  value={draft.prerequisites ?? ''}
                  onChange={(e) => set('prerequisites', e.target.value)}
                  placeholder="e.g. Laptop with Python or Excel installed; open to all years"
                />
              </label>

              <div className="field">
                <span className="field-label">Key Learning Outcomes ({(draft.outcomes ?? []).length})</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={outcomeInput}
                    onChange={(e) => setOutcomeInput(e.target.value)}
                    placeholder="Add a concrete takeaway or skill…"
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      if (!outcomeInput.trim()) return;
                      set('outcomes', [...(draft.outcomes ?? []), outcomeInput.trim()]);
                      setOutcomeInput('');
                    }}
                  >
                    + Add
                  </button>
                </div>
                {(draft.outcomes ?? []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {(draft.outcomes ?? []).map((o, idx) => (
                      <span key={idx} className="badge badge-teal">
                        ✓ {o}
                        <button
                          type="button"
                          style={{ marginLeft: 5 }}
                          onClick={() =>
                            set(
                              'outcomes',
                              (draft.outcomes ?? []).filter((_, i) => i !== idx),
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="field">
                <span className="field-label">Run of Show / Agenda ({(draft.agenda ?? []).length} blocks)</span>
                <div className="field-row three">
                  <input type="time" value={agendaTime} onChange={(e) => setAgendaTime(e.target.value)} />
                  <input
                    value={agendaTitle}
                    onChange={(e) => setAgendaTitle(e.target.value)}
                    placeholder="Block title (e.g. Case Intro)"
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={agendaSpeaker}
                      onChange={(e) => setAgendaSpeaker(e.target.value)}
                      placeholder="Speaker (optional)"
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        if (!agendaTitle.trim()) return;
                        set('agenda', [
                          ...(draft.agenda ?? []),
                          {
                            time: agendaTime || draft.startTime,
                            title: agendaTitle.trim(),
                            speaker: agendaSpeaker.trim() || undefined,
                          },
                        ]);
                        setAgendaTitle('');
                        setAgendaSpeaker('');
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                {(draft.agenda ?? []).length > 0 && (
                  <div className="stack-sm" style={{ marginTop: 6 }}>
                    {(draft.agenda ?? []).map((item, idx) => (
                      <div key={idx} className="roster-chip" style={{ justifyContent: 'space-between' }}>
                        <span>
                          <strong className="mono">{item.time}</strong> · {item.title}{' '}
                          {item.speaker ? `(${item.speaker})` : ''}
                        </span>
                        <button
                          type="button"
                          className="danger-text mono"
                          onClick={() =>
                            set(
                              'agenda',
                              (draft.agenda ?? []).filter((_, i) => i !== idx),
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="field">
                <span className="field-label">Slides, Datasets & Attachments ({(draft.attachments ?? []).length})</span>
                <div className="field-row three">
                  <input
                    value={attLabel}
                    onChange={(e) => setAttLabel(e.target.value)}
                    placeholder="File title (e.g. Case_Deck.pdf)"
                  />
                  <input
                    value={attUrl}
                    onChange={(e) => setAttUrl(e.target.value)}
                    placeholder="URL (https://...)"
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={attKind}
                      onChange={(e) => setAttKind(e.target.value as AttachmentItem['kind'])}
                    >
                      <option value="slides">Slides</option>
                      <option value="dataset">Dataset</option>
                      <option value="doc">Doc</option>
                      <option value="photos">Photos</option>
                      <option value="repo">Repo</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        if (!attLabel.trim()) return;
                        set('attachments', [
                          ...(draft.attachments ?? []),
                          {
                            id: uid('att'),
                            title: attLabel.trim(),
                            url: attUrl.trim() || 'https://udea.uz/',
                            kind: attKind,
                          },
                        ]);
                        setAttLabel('');
                        setAttUrl('');
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                {(draft.attachments ?? []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {(draft.attachments ?? []).map((att) => (
                      <span key={att.id} className="badge badge-muted">
                        📎 {att.title} ({att.kind.toUpperCase()})
                        <button
                          type="button"
                          style={{ marginLeft: 5 }}
                          onClick={() =>
                            set(
                              'attachments',
                              (draft.attachments ?? []).filter((x) => x.id !== att.id),
                            )
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="form-card">
            <div className="form-step">
              <span className="step-num mono">02</span>
              <h3>Generative poster studio</h3>
            </div>
            <div className="cover-grid">
              {COVERS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`cover-swatch cover-${c.id} ${draft.coverStyle === c.id ? 'is-active' : ''}`}
                  onClick={() => set('coverStyle', c.id)}
                >
                  <span>{c.label}</span>
                  {draft.coverStyle === c.id && <Icon name="check" size={13} />}
                </button>
              ))}
            </div>
            <div className="field-row">
              <label className="field">
                <span className="field-label">Pattern overlay</span>
                <select value={draft.pattern} onChange={(e) => set('pattern', e.target.value as EventDraft['pattern'])}>
                  {PATTERNS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Custom cover image URL (optional)</span>
                <input
                  value={draft.coverImage}
                  onChange={(e) => set('coverImage', e.target.value)}
                  placeholder="https://…"
                />
              </label>
            </div>
          </section>

          <section className="form-card">
            <div className="form-step">
              <span className="step-num mono">03</span>
              <h3>Date, time & Boshlik room conflict check</h3>
            </div>

            <div className="field-row three">
              <label className="field">
                <span className="field-label">Date</span>
                <input
                  type="date"
                  value={draft.date}
                  min={editingEvent ? undefined : isoOffset(0)}
                  onChange={(e) => set('date', e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Start</span>
                <input type="time" value={draft.startTime} onChange={(e) => set('startTime', e.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">End (min +30m)</span>
                <input type="time" value={draft.endTime} onChange={(e) => set('endTime', e.target.value)} />
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Venue Type</span>
                <select
                  value={draft.campus}
                  onChange={(e) => {
                    const campus = e.target.value as Campus;
                    const nextRoom = ROOMS.find((r) => r.campus === campus);
                    set('campus', campus);
                    set('roomId', nextRoom?.id ?? 'rm_online');
                  }}
                >
                  <option value="Boshlik">Boshlik Campus (3 Boshlik St, Yakkasaray)</option>
                  <option value="Online">Online / Telegram Live Stream</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">Boshlik Room / Zone</span>
                <select value={draft.roomId} onChange={(e) => set('roomId', e.target.value)}>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · cap {r.capacity}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {conflicts.length === 0 ? (
              <div className="conflict-badge is-free">
                <Icon name="check" size={15} />
                <span>
                  <strong>Room available</strong> — {selectedRoom?.name} · capacity {selectedRoom?.capacity} ·{' '}
                  {draft.date} {draft.startTime}–{draft.endTime}
                </span>
              </div>
            ) : (
              <div className={`conflict-badge ${hasConfirmedConflict ? 'is-conflict' : 'is-warn'}`}>
                <Icon name={hasConfirmedConflict ? 'x' : 'clock'} size={15} />
                <div>
                  <strong>
                    {hasConfirmedConflict
                      ? 'Confirmed Booking Conflict'
                      : 'Pending Room Hold (Awaiting Admin Review)'}
                  </strong>
                  <p>
                    {hasConfirmedConflict ? 'Occupied by confirmed event' : 'Requested by pending event'} “
                    {conflicts[0].title}” from {conflicts[0].startTime} to {conflicts[0].endTime}. Pick the next free
                    slot or switch Boshlik rooms.
                  </p>
                  <div className="conflict-actions">
                    {suggestion && (
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => {
                          const duration = minutesFromTime(draft.endTime) - minutesFromTime(draft.startTime);
                          set('startTime', suggestion);
                          set('endTime', timeFromMinutes(minutesFromTime(suggestion) + Math.max(30, duration)));
                        }}
                      >
                        Auto-Pick Next Free Slot ({suggestion})
                      </button>
                    )}
                    {altRooms.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => set('roomId', altRooms[0].id)}
                      >
                        Switch to Available Room ({altRooms[0].name})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="equipment-block">
              <span className="field-label">Equipment checklist</span>
              <div className="equipment-grid">
                {EQUIPMENT.map((eq) => {
                  const on = draft.equipment.includes(eq);
                  return (
                    <button
                      type="button"
                      key={eq}
                      className={`equip-toggle ${on ? 'is-on' : ''}`}
                      onClick={() =>
                        set('equipment', on ? draft.equipment.filter((x) => x !== eq) : [...draft.equipment, eq])
                      }
                    >
                      <span className="checkbox">{on && <Icon name="check" size={11} />}</span>
                      {eq}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="form-card">
            <div className="form-step">
              <span className="step-num mono">04</span>
              <h3>Registration & anti-ghosting rules</h3>
            </div>

            <div className="radio-stack">
              {(
                [
                  ['internal_1click', '⚡ 1-Click Internal RSVP + Holographic QR Ticket'],
                  ['internal_screening', '📋 Screening Application RSVP'],
                  ['external_link', '🔗 External Partner Link'],
                ] as [RegistrationMode, string][]
              ).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  className={`radio-card ${draft.registrationMode === id ? 'is-active' : ''}`}
                  onClick={() => set('registrationMode', id)}
                >
                  <span className="radio-dot" />
                  {label}
                </button>
              ))}
            </div>

            {draft.registrationMode === 'external_link' && (
              <label className="field">
                <span className="field-label">Partner registration URL</span>
                <input
                  value={draft.externalUrl}
                  onChange={(e) => set('externalUrl', e.target.value)}
                  placeholder="https://udea.uz/admissions"
                />
                <span className="field-hint">Students still get a Telegram reminder and calendar save.</span>
              </label>
            )}

            {draft.registrationMode === 'internal_screening' && (
              <label className="field">
                <span className="field-label">Screening question</span>
                <input
                  value={draft.screeningPrompt}
                  onChange={(e) => set('screeningPrompt', e.target.value)}
                  placeholder="e.g. Share your GitHub or your motivation in one line."
                />
              </label>
            )}

            <label className="field">
              <span className="field-label">
                Capacity — {draft.track === 'peer_meetup' ? Math.min(30, draft.capacity) : draft.capacity} seats
              </span>
              <input
                type="range"
                min={2}
                max={250}
                value={draft.capacity}
                onChange={(e) => set('capacity', Number(e.target.value))}
              />
              <span className="field-hint">
                {draft.track === 'peer_meetup' ? 'Peer meetups are capped at 30 by policy.' : '2 to 250 seats.'}
              </span>
            </label>

            <div className="toggle-stack">
              <ToggleRow
                label="Automatic waitlist queue"
                hint="Promote the first waitlisted student when a seat is released."
                on={draft.waitlistEnabled}
                onChange={(v) => set('waitlistEnabled', v)}
              />
              <ToggleRow
                label="Team finder matchmaking"
                hint="Lets attendees publish a skill tag and find teammates."
                on={draft.teamFinder}
                onChange={(v) => set('teamFinder', v)}
              />
              <ToggleRow
                label="Official UDEA co-curricular certificate"
                hint="Checked-in attendance counts toward the diploma supplement."
                on={draft.certificate}
                onChange={(v) => set('certificate', v)}
              />
            </div>
          </section>

          <section className="form-card">
            <div className="form-step" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="step-num mono">05</span>
                <h3>Connect Event Team & Volunteers</h3>
              </div>
              <button
                type="button"
                className={`btn btn-xs ${customPersonMode ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCustomPersonMode((v) => !v)}
              >
                <Icon name="userPlus" size={12} /> {customPersonMode ? 'Pick from Directory' : '+ New Person'}
              </button>
            </div>
            <p className="hint" style={{ margin: '0 0 12px' }}>
              Connect fellow students as Co-Hosts, Case Coordinators, QR Gate Scanners or Guest Speakers so they can
              help manage check-ins or appear on the event page and earn official coordinator certificates.
            </p>

            {customPersonMode ? (
              <div className="field-row three" style={{ marginBottom: 10 }}>
                <label className="field">
                  <span className="field-label">Full Name</span>
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Sardor Rahimov"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Telegram Handle</span>
                  <input
                    value={customTelegram}
                    onChange={(e) => setCustomTelegram(e.target.value)}
                    placeholder="@sardor_udea"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Programme</span>
                  <input
                    value={customProgramme}
                    onChange={(e) => setCustomProgramme(e.target.value)}
                    placeholder="BSc Finance & FinTech"
                  />
                </label>
              </div>
            ) : null}

            <div className="field-row three">
              {!customPersonMode && (
                <label className="field">
                  <span className="field-label">Student</span>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                  >
                    {app.directory.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.telegram})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="field">
                <span className="field-label">Event Role</span>
                <select
                  value={staffRole}
                  onChange={(e) => {
                    const nextRole = e.target.value as EventStaffRole;
                    setStaffRole(nextRole);
                    setStaffLabel(STAFF_ROLE_LABEL[nextRole]);
                    setStaffPerms(STAFF_ROLE_DEFAULT_PERMS[nextRole]);
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
                <input
                  value={staffLabel}
                  onChange={(e) => setStaffLabel(e.target.value)}
                  placeholder="e.g. Case Coordinator"
                />
              </label>
            </div>

            <div style={{ marginTop: 8 }}>
              <span className="field-label" style={{ display: 'block', marginBottom: 6 }}>
                Delegated Event Permissions
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PERMISSION_META.map((meta) => {
                  const on = staffPerms.includes(meta.id);
                  return (
                    <button
                      type="button"
                      key={meta.id}
                      className={`pill ${on ? 'is-active' : ''}`}
                      style={{ padding: '4px 10px', fontSize: 11 }}
                      onClick={() => toggleStaffPerm(meta.id)}
                    >
                      ✓ {meta.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addTeamMemberToDraft}>
                <Icon name="plus" size={13} /> Connect Student to Event
              </button>
            </div>

            {draft.teamMembers.length > 0 && (
              <div className="roster-stack" style={{ marginTop: 12 }}>
                {draft.teamMembers.map((tm) => (
                  <div key={tm.userId} className="roster-row-card">
                    <div className="roster-row-head">
                      <Avatar name={tm.name} color="#0D9488" size={32} />
                      <div className="roster-row-main">
                        <strong>{tm.name}</strong>
                        <span className="mono">
                          {tm.customLabel} · {tm.telegram} · {tm.permissions.length} perms
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs danger-text"
                        onClick={() => removeTeamMemberFromDraft(tm.userId)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="submit-block" style={{ marginTop: 18 }}>
              <button type="button" className="btn btn-primary btn-lg" onClick={submit}>
                <Icon name={editingEvent ? 'check' : 'plus'} size={16} />{' '}
                {editingEvent
                  ? 'Save Changes to Event'
                  : studentNeedsApproval
                    ? 'Submit for Room Approval'
                    : 'Publish Event Directly'}
              </button>
              <span className="mono subtle">
                {editingEvent
                  ? 'UPDATES EVENT + CONNECTED TEAM ROSTER'
                  : studentNeedsApproval
                    ? 'ADMIN QUEUE → TIMUR ALIMOV'
                    : activeRoleTitle
                      ? `AUTHORIZED AS ${activeRoleTitle.toUpperCase()} · PUBLISHES INSTANTLY`
                      : 'PUBLISHES INSTANTLY + TELEGRAM POST'}
              </span>
            </div>
          </section>

          {pendingMine.length > 0 && (
            <section className="form-card pending-card">
              <div className="form-step">
                <span className="step-num mono">!</span>
                <h3>Waiting on Campus Operations</h3>
              </div>
              {pendingMine.map((e) => (
                <div key={e.id} className="pending-row">
                  <div>
                    <strong>{e.title}</strong>
                    <span className="mono">
                      {dayLabel(e.date)} • {ROOMS.find((r) => r.id === e.roomId)?.code}
                    </span>
                  </div>
                  <span className="badge badge-warn">PENDING APPROVAL</span>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="studio-preview">
          <div className="preview-tabs">
            <button className={previewMode === 'card' ? 'is-active' : ''} onClick={() => setPreviewMode('card')}>
              <Icon name="ticket" size={14} /> Live Event Card
            </button>
            <button className={previewMode === 'telegram' ? 'is-active' : ''} onClick={() => setPreviewMode('telegram')}>
              <Icon name="telegram" size={14} /> Telegram Post
            </button>
          </div>

          <div className={`preview-stage ${previewMode === 'telegram' ? 'is-chat' : ''}`}>
            {previewMode === 'card' ? (
              <div className="preview-card cat-scope">
                <div className="event-cover">
                  <Poster event={previewEvent} showTitle />
                </div>
                <div className="event-body">
                  <div className="event-host">
                    <span className={`host-cat cat-${draft.category}`}>
                      <i className="dot" />
                      {CATEGORY_LABEL[draft.category]}
                    </span>
                    <span className="host-name">{previewEvent.hostName}</span>
                    {activeRoleTitle && (
                      <span className="badge badge-teal" style={{ marginLeft: 'auto', fontSize: 10 }}>
                        ✨ {activeRoleTitle}
                      </span>
                    )}
                  </div>
                  <h3 className="event-title">{previewEvent.title}</h3>
                  <p className="event-sub">{previewEvent.subtitle}</p>
                  <div className="capacity">
                    <div className="capacity-head">
                      <Mono>
                        {previewEvent.registeredCount} / {previewEvent.capacity} SEATS
                      </Mono>
                      <span className="capacity-note cap-open">Just opened</span>
                    </div>
                    <div className="capacity-track">
                      <div className="capacity-fill cap-open" style={{ width: '3%' }} />
                    </div>
                  </div>
                  <div className="preview-card-foot">
                    <span className="mono">
                      {dayLabel(draft.date)} • {draft.startTime}
                    </span>
                    <span className="btn btn-primary btn-sm">1-Click RSVP</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="tg-preview">
                <div className="tg-channel">
                  <span className="tg-avatar">U</span>
                  <div>
                    <strong>UDEA Events</strong>
                    <span>@udeauz_events · 12.4k subscribers</span>
                  </div>
                </div>
                <div className="tg-bubble">
                  <p className="tg-bubble-text">{telegramText}</p>
                  <div className="tg-buttons">
                    <span>🎟️ 1-Click RSVP in Mini App</span>
                    <span>👥 Find Teammates</span>
                  </div>
                  <span className="tg-time mono">PREVIEW · {pct(0, 1)}% SEATS FILLED</span>
                </div>
                <div className="tg-foot mono">@udea_pulse_bot PREVIEW · NOT SENT</div>
              </div>
            )}
          </div>

          <div className="preview-notes">
            <div className="preview-note">
              <Icon name="shield" size={15} />
              <span>
                <strong>Your permissions:</strong>{' '}
                {activeRoleTitle
                  ? `delegated role "${activeRoleTitle}" — official events publish directly when the room is free.`
                  : persona.role === 'student'
                    ? 'official events go to the admin room queue; peer meetups publish instantly.'
                    : persona.role === 'club_lead'
                      ? 'official club events publish directly when the room is free.'
                      : 'full publish and approval rights.'}
              </span>
            </div>
            <div className="preview-note">
              <Icon name="clock" size={15} />
              <span>
                <strong>Conflict engine:</strong>{' '}
                {conflicts.length === 0
                  ? 'Boshlik room is free for this slot.'
                  : `${conflicts.length} overlapping booking(s) found (${hasConfirmedConflict ? 'Confirmed' : 'Pending Hold'}).`}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="preview-copy"
                style={{ flex: 1 }}
                onClick={async () => {
                  const ok = await copyText(telegramText);
                  app.pushToast({
                    tone: ok ? 'success' : 'error',
                    title: ok ? 'Telegram post copied' : 'Copy blocked',
                    message: ok ? 'Paste it straight into @udeauz_events.' : 'Clipboard access was denied by the browser.',
                  });
                }}
              >
                <Icon name="copy" size={13} /> Copy Telegram post text
              </button>
              <button
                type="button"
                className="preview-copy"
                style={{ flex: 1 }}
                onClick={() => {
                  downloadEventPosterPNG(previewEvent, selectedRoom);
                  app.pushToast({
                    tone: 'success',
                    title: 'Poster PNG downloaded (1200×630)',
                    message: 'High-resolution social & Telegram banner saved.',
                  });
                }}
              >
                <Icon name="image" size={13} /> Download Poster PNG
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div>
        <strong>{label}</strong>
        <span>{hint}</span>
      </div>
      <button type="button" className={`switch ${on ? 'is-on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}>
        <i />
      </button>
    </div>
  );
}
