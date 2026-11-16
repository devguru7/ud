import React, { useMemo, useState } from 'react';
import { useApp, type AccountModalTab } from '../lib/store';
import { Avatar, Icon, Mono } from './UI';
import { PERMISSION_META, personaRoleLabel, personaSubtitle } from '../lib/labels';
import {
  getAllRoleBadgesForUser,
  getUserPermissionsForClub,
  getUserPermissionsForEvent,
} from '../lib/logic';
import { copyText } from '../lib/utils';
import type { PermissionFlag, Persona } from '../types';

const AVATAR_COLORS = [
  '#10B981',
  '#2563EB',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
  '#14B8A6',
  '#EF4444',
];

const PROGRAMMES = [
  'BSc (Hons) International Finance and Banking',
  'BSc (Hons) Business Data Analytics',
  'BA (Hons) Business Management and Leadership',
  'BSc Digital Economics & Agrotechnologies',
  'BA (Hons) English Language & TESOL',
  'Foundation Year (English & Academic Prep)',
  'Student Welfare & Campus Operations',
];

const STUDY_YEARS = ['Foundation', 'Year 1', 'Year 2', 'Year 3', 'MSc', 'Staff'];

export default function AccountModal() {
  const app = useApp();
  const activeTab = app.accountModalTab;

  // Profile editor state synced when modal opens or persona changes
  const raw = app.rawPersona;
  const [editName, setEditName] = useState(raw.name);
  const [editTelegram, setEditTelegram] = useState(raw.telegram);
  const [editProgramme, setEditProgramme] = useState(raw.programme ?? PROGRAMMES[0]);
  const [editYear, setEditYear] = useState(raw.year ?? 'Year 2');
  const [editStudentId, setEditStudentId] = useState(raw.studentId);
  const [editBio, setEditBio] = useState(raw.bio ?? '');
  const [editColor, setEditColor] = useState(raw.color);

  // Sync local form state when active persona changes
  React.useEffect(() => {
    setEditName(raw.name);
    setEditTelegram(raw.telegram);
    setEditProgramme(raw.programme ?? PROGRAMMES[0]);
    setEditYear(raw.year ?? 'Year 2');
    setEditStudentId(raw.studentId);
    setEditBio(raw.bio ?? '');
    setEditColor(raw.color);
  }, [raw.id, raw.name, raw.telegram, raw.programme, raw.year, raw.studentId, raw.bio, raw.color]);

  // Create new account state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTelegram, setNewTelegram] = useState('');
  const [newProgramme, setNewProgramme] = useState(PROGRAMMES[0]);
  const [newYear, setNewYear] = useState('Year 2');
  const [newAccountType, setNewAccountType] = useState<'student' | 'coordinator' | 'club_lead' | 'admin'>('student');
  const [newBio, setNewBio] = useState('');

  // Invite code claim state
  const [inviteInput, setInviteInput] = useState('');
  const [genClubId, setGenClubId] = useState(app.state.clubs[0]?.id ?? 'club_fintech');
  const selectedGenClub = app.state.clubs.find((c) => c.id === genClubId) ?? app.state.clubs[0];
  const [genRoleId, setGenRoleId] = useState(selectedGenClub?.customRoles[0]?.id ?? '');

  // Directory search
  const [dirSearch, setDirSearch] = useState('');

  // Compute all roles & permission sources for rawPersona and effective persona
  const clubRoleBadges = useMemo(
    () => getAllRoleBadgesForUser(raw, app.state.clubs),
    [raw, app.state.clubs],
  );

  const eventRoleEntries = useMemo(() => {
    const list: { eventId: string; eventTitle: string; roleTitle: string; permissions: PermissionFlag[] }[] = [];
    for (const evt of app.state.events) {
      if (evt.createdBy === raw.id) {
        list.push({
          eventId: evt.id,
          eventTitle: evt.title,
          roleTitle: evt.createdByRoleTitle || 'Event Creator',
          permissions: [
            'create_events',
            'publish_posts',
            'book_rooms',
            'manage_registrations',
            'scan_tickets',
            'send_broadcasts',
            'manage_roles',
          ],
        });
      }
      const member = (evt.teamMembers ?? []).find((m) => m.userId === raw.id);
      if (member) {
        list.push({
          eventId: evt.id,
          eventTitle: evt.title,
          roleTitle: member.customLabel || member.role,
          permissions: member.permissions,
        });
      }
    }
    return list;
  }, [raw.id, app.state.events]);

  const permissionSources = useMemo(() => {
    const map = new Map<PermissionFlag, string[]>();
    for (const meta of PERMISSION_META) {
      map.set(meta.id, []);
    }
    if (app.studentViewLens) {
      return map;
    }
    if (raw.role === 'admin') {
      for (const meta of PERMISSION_META) {
        map.get(meta.id)?.push('Campus Admin (Global Authority)');
      }
    }
    for (const club of app.state.clubs) {
      const perms = getUserPermissionsForClub(raw, club);
      for (const p of perms) {
        const list = map.get(p) ?? [];
        const label = club.leadId === raw.id ? `${club.short} (President)` : `${club.short} (Delegated Role)`;
        if (!list.includes(label)) list.push(label);
      }
    }
    for (const evt of app.state.events) {
      const perms = getUserPermissionsForEvent(raw, evt, app.state.clubs);
      for (const p of perms) {
        const list = map.get(p) ?? [];
        const label = `Event: ${evt.title.slice(0, 26)}`;
        if (!list.includes(label) && list.length < 3) list.push(label);
      }
    }
    return map;
  }, [raw, app.state.clubs, app.state.events, app.studentViewLens]);

  const groupedPersonas = useMemo(() => {
    const q = dirSearch.trim().toLowerCase();
    const filtered = app.personas.filter((p) => {
      if (!q) return true;
      const roleSub = personaSubtitle(p, app.state.clubs).toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.telegram.toLowerCase().includes(q) ||
        (p.programme ?? '').toLowerCase().includes(q) ||
        p.studentId.toLowerCase().includes(q) ||
        roleSub.includes(q)
      );
    });

    const admins: Persona[] = [];
    const presidents: Persona[] = [];
    const coordinators: Persona[] = [];
    const students: Persona[] = [];

    for (const p of filtered) {
      const isPresident =
        p.role === 'club_lead' || app.state.clubs.some((c) => c.leadId === p.id);
      const isCoordinator =
        app.state.clubs.some((c) => c.roster.some((r) => r.userId === p.id)) ||
        app.state.events.some((e) => (e.teamMembers ?? []).some((m) => m.userId === p.id));

      if (p.role === 'admin') {
        admins.push(p);
      } else if (isPresident) {
        presidents.push(p);
      } else if (isCoordinator) {
        coordinators.push(p);
      } else {
        students.push(p);
      }
    }

    return { admins, presidents, coordinators, students };
  }, [app.personas, app.state.clubs, app.state.events, dirSearch]);

  if (!activeTab) return null;

  const setTab = (t: AccountModalTab) => app.openAccountModal(t);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    app.updatePersonaProfile(raw.id, {
      name: editName.trim(),
      telegram: editTelegram.trim() || `@${editName.trim().toLowerCase().split(/\s+/)[0]}_udea`,
      programme: editProgramme,
      year: editYear,
      studentId: editStudentId.trim() || raw.studentId,
      bio: editBio.trim(),
      color: editColor,
    });
  };

  const handleCreateNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    app.registerStudentAccount({
      name: newName.trim(),
      telegram: newTelegram.trim() || `@${newName.trim().toLowerCase().split(/\s+/)[0]}_udea`,
      programme: newProgramme,
      year: newYear,
      role: newAccountType,
      bio: newBio.trim() || undefined,
      switchNow: true,
    });
    setNewName('');
    setNewTelegram('');
    setNewBio('');
    setShowCreateForm(false);
  };

  const handleClaimCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    const res = app.redeemRoleInviteCode(inviteInput);
    if (res.ok) {
      setInviteInput('');
    }
  };

  const handleGenerateInvite = () => {
    const roleIdToUse = genRoleId || selectedGenClub?.customRoles[0]?.id;
    if (!selectedGenClub || !roleIdToUse) return;
    const inv = app.generateRoleInviteCode(selectedGenClub.id, roleIdToUse);
    if (inv) {
      copyText(inv.code);
    }
  };

  const countPermsForPersona = (p: Persona): number => {
    if (p.role === 'admin') return 7;
    const set = new Set<PermissionFlag>();
    for (const c of app.state.clubs) {
      getUserPermissionsForClub(p, c).forEach((perm) => set.add(perm));
    }
    for (const e of app.state.events) {
      getUserPermissionsForEvent(p, e, app.state.clubs).forEach((perm) => set.add(perm));
    }
    return set.size;
  };

  return (
    <div className="modal-layer" onClick={app.closeAccountModal}>
      <div
        className="modal modal-wide account-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="UDEA Account & Identity Command Center"
      >
        <div className="panel-head">
          <div>
            <span className="mono subtle">UDEA PULSE V6.0 · MULTI-CONTEXT IDENTITY & DELEGATION ENGINE</span>
            <h2>Account, Role Context & Identity Command Center</h2>
          </div>
          <div className="feed-actions">
            <button
              type="button"
              className={`btn btn-sm ${app.studentViewLens ? 'btn-violet' : 'btn-ghost'}`}
              onClick={() => app.setStudentViewLens(!app.studentViewLens)}
              title="Toggle between acting with your full delegated roles vs previewing as a regular student"
            >
              <Icon name="eye" size={14} />{' '}
              {app.studentViewLens ? 'Lens: Regular Student Preview' : 'Lens: Full Delegated Authority'}
            </button>
            <button
              type="button"
              className="icon-btn sm"
              onClick={app.closeAccountModal}
              aria-label="Close Account Center"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>

        {/* Active Identity Summary Strip */}
        <div className="account-hero-strip">
          <div className="account-hero-left">
            <Avatar name={raw.name} color={raw.color} size={46} />
            <div className="account-hero-meta">
              <div className="account-hero-title-row">
                <strong>{raw.name}</strong>
                <span className="badge badge-success">
                  {personaRoleLabel(app.persona, app.state.clubs)}
                </span>
                <Mono>{raw.studentId}</Mono>
              </div>
              <span className="mono subtle">
                {raw.telegram} · {raw.programme} · {raw.year} · {raw.xp} XP
              </span>
              {raw.bio && <p className="account-bio-line">{raw.bio}</p>}
            </div>
          </div>

          <div className="lens-toggle-bar" role="group" aria-label="Active Role Context Lens">
            <button
              type="button"
              className={!app.studentViewLens ? 'is-active' : ''}
              onClick={() => app.setStudentViewLens(false)}
            >
              ⚡ Full Delegated Roles
            </button>
            <button
              type="button"
              className={app.studentViewLens ? 'is-active' : ''}
              onClick={() => app.setStudentViewLens(true)}
            >
              🎓 Student Preview Lens
            </button>
          </div>
        </div>

        {/* 4-Tab Navigation */}
        <div className="track-switch account-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            className={activeTab === 'profile' ? 'is-active' : ''}
            onClick={() => setTab('profile')}
          >
            👤 My Profile & Sign-In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'roles'}
            className={activeTab === 'roles' ? 'is-active' : ''}
            onClick={() => setTab('roles')}
          >
            🎩 My Hats & 7-Perm Matrix
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'invite'}
            className={activeTab === 'invite' ? 'is-active' : ''}
            onClick={() => setTab('invite')}
          >
            🔑 Claim Role Invite Code
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'directory'}
            className={activeTab === 'directory' ? 'is-active' : ''}
            onClick={() => setTab('directory')}
          >
            🔄 Accounts Directory ({app.personas.length})
          </button>
        </div>

        {/* TAB 1: MY PROFILE & SIGN-IN */}
        {activeTab === 'profile' && (
          <div className="role-modal-grid">
            <form className="card form-card" onSubmit={handleSaveProfile}>
              <div className="row-between">
                <Mono>EDIT ACTIVE CAMPUS PROFILE ({raw.studentId})</Mono>
                <span className="badge badge-sm badge-success">LIVE SYNC</span>
              </div>

              <div className="field-row">
                <label className="field">
                  <span className="field-label">Full Name *</span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span className="field-label">Telegram @handle *</span>
                  <input
                    type="text"
                    value={editTelegram}
                    onChange={(e) => setEditTelegram(e.target.value)}
                    placeholder="@handle_udea"
                    required
                  />
                </label>
              </div>

              <div className="field-row">
                <label className="field">
                  <span className="field-label">UDEA / Coventry Degree Programme</span>
                  <select
                    value={editProgramme}
                    onChange={(e) => setEditProgramme(e.target.value)}
                  >
                    {PROGRAMMES.map((prog) => (
                      <option key={prog} value={prog}>
                        {prog}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Study Cohort / Year</span>
                  <select value={editYear} onChange={(e) => setEditYear(e.target.value)}>
                    {STUDY_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="field-row">
                <label className="field">
                  <span className="field-label">Student / Staff ID</span>
                  <input
                    type="text"
                    value={editStudentId}
                    onChange={(e) => setEditStudentId(e.target.value)}
                  />
                </label>
                <div className="field">
                  <span className="field-label">Avatar Accent Color</span>
                  <div className="color-dot-picker">
                    {AVATAR_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        className={`color-dot-btn ${editColor === col ? 'is-selected' : ''}`}
                        style={{ background: col }}
                        onClick={() => setEditColor(col)}
                        aria-label={`Select color ${col}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <label className="field">
                <span className="field-label">Campus Bio & Responsibilities</span>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="e.g., FinTech Case Coordinator · Bloomberg Terminal Lab Assistant"
                />
              </label>

              <div className="feed-actions">
                <button type="submit" className="btn btn-primary btn-sm">
                  <Icon name="check" size={14} /> Save Profile Changes
                </button>
              </div>
            </form>

            <div className="stack-sm">
              {/* Google / Firebase Real Identity Link Card */}
              <div className="card form-card">
                <Mono>GOOGLE / FIREBASE & TELEGRAM IDENTITY LINK</Mono>
                <p className="hint">
                  Link your real Google account or sync your cloud profile directly into your active UDEA student persona.
                </p>

                {app.firebaseUser ? (
                  <div className="stack-sm">
                    <div className="roster-row-card">
                      <div className="roster-row-head">
                        <div>
                          <strong>{app.firebaseUser.displayName || 'Connected Google User'}</strong>
                          <span className="mono subtle">{app.firebaseUser.email}</span>
                        </div>
                        <span className="badge badge-success">FIREBASE CONNECTED</span>
                      </div>
                    </div>
                    <div className="feed-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={app.syncGoogleIdentityToPersona}
                      >
                        <Icon name="userPlus" size={14} /> Sync My Google Identity to Active UDEA Profile
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={app.syncToCloud}
                      >
                        ☁️ Backup State Now
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={app.signOutFirebase}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="feed-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={app.signInWithGoogle}
                    >
                      <Icon name="globe" size={14} /> Sign In with Google (Firebase Auth)
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={app.syncGoogleIdentityToPersona}
                    >
                      <Icon name="sparkle" size={14} /> Demo 1-Click Identity Link
                    </button>
                  </div>
                )}
              </div>

              {/* Create New Campus Account Card */}
              <div className="card form-card">
                <div className="row-between">
                  <Mono>REGISTER NEW CAMPUS ACCOUNT</Mono>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setShowCreateForm((v) => !v)}
                  >
                    {showCreateForm ? 'Hide Form' : '+ Open Registration Form'}
                  </button>
                </div>
                <p className="hint">
                  Create a fresh Student, Delegated Coordinator, Club President, or Campus Admin persona for testing or onboarding.
                </p>

                {showCreateForm ? (
                  <form className="stack-sm" onSubmit={handleCreateNewAccount}>
                    <div className="field-row">
                      <label className="field">
                        <span className="field-label">Full Name *</span>
                        <input
                          type="text"
                          placeholder="e.g., Nodirbek Karimov"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          required
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Telegram @handle</span>
                        <input
                          type="text"
                          placeholder="@nodirbek_udea"
                          value={newTelegram}
                          onChange={(e) => setNewTelegram(e.target.value)}
                        />
                      </label>
                    </div>

                    <div className="field-row">
                      <label className="field">
                        <span className="field-label">Initial Account Role</span>
                        <select
                          value={newAccountType}
                          onChange={(e) =>
                            setNewAccountType(
                              e.target.value as 'student' | 'coordinator' | 'club_lead' | 'admin',
                            )
                          }
                        >
                          <option value="student">🎓 Regular Student</option>
                          <option value="coordinator">⚡ Delegated Coordinator (FinTech Society)</option>
                          <option value="club_lead">👑 Club President</option>
                          <option value="admin">🛡 Campus Admin (Student Welfare)</option>
                        </select>
                      </label>
                      <label className="field">
                        <span className="field-label">Cohort Year</span>
                        <select value={newYear} onChange={(e) => setNewYear(e.target.value)}>
                          {STUDY_YEARS.map((yr) => (
                            <option key={yr} value={yr}>
                              {yr}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="field">
                      <span className="field-label">Degree Programme</span>
                      <select
                        value={newProgramme}
                        onChange={(e) => setNewProgramme(e.target.value)}
                      >
                        {PROGRAMMES.map((prog) => (
                          <option key={prog} value={prog}>
                            {prog}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button type="submit" className="btn btn-primary btn-sm">
                      <Icon name="userPlus" size={14} /> Create & Switch to Account
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <Icon name="userPlus" size={14} /> + Create New Student / Coordinator Account
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY ROLES & 7-PERMISSION MATRIX ("MY HATS") */}
        {activeTab === 'roles' && (
          <div className="role-modal-grid">
            <div className="card form-card">
              <div className="row-between">
                <Mono>MY ACTIVE CAMPUS ROLES ("MY HATS")</Mono>
                <span className="mono subtle">
                  {clubRoleBadges.length + eventRoleEntries.length + 1} ROLES HELD
                </span>
              </div>
              <p className="hint">
                A student at UDEA Boshlik Campus can wear multiple hats simultaneously: Regular Student for exams, Delegated Club Coordinator for society events, and Event Scanner Volunteer at the door.
              </p>

              <div className="roster-stack">
                {/* Base Global Identity Hat */}
                <div className="roster-row-card">
                  <div className="roster-row-head">
                    <div>
                      <strong>
                        {raw.role === 'admin'
                          ? '🛡 Campus Admin — Student Union & Welfare Office'
                          : raw.role === 'club_lead'
                            ? '👑 Elected Club President'
                            : '🎓 UDEA Matriculated Student'}
                      </strong>
                      <span className="mono subtle">
                        Base Campus Identity · {raw.studentId} · {raw.programme}
                      </span>
                    </div>
                    <span className="badge badge-success">PRIMARY IDENTITY</span>
                  </div>
                </div>

                {/* Club Leadership & Custom Delegated Roles */}
                {clubRoleBadges.map((b, idx) => (
                  <div key={`${b.clubId}_${idx}`} className="roster-row-card">
                    <div className="roster-row-head">
                      <div>
                        <strong>
                          ⚡ {b.title} — {b.clubShort}
                        </strong>
                        <span className="mono subtle">
                          Club-Level Delegated Authority · {b.permissions.length} capabilities granted
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          app.closeAccountModal();
                          app.setView('clubs');
                          app.openRoleModal(b.clubId);
                        }}
                      >
                        Inspect Club →
                      </button>
                    </div>
                    <div className="equipment-chips">
                      {b.permissions.map((p) => (
                        <span key={p} className="equip-chip">
                          <Icon name="check" size={11} />{' '}
                          {PERMISSION_META.find((m) => m.id === p)?.label ?? p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Event-Specific Delegated Roles */}
                {eventRoleEntries.map((evRole, idx) => (
                  <div key={`${evRole.eventId}_${idx}`} className="roster-row-card">
                    <div className="roster-row-head">
                      <div>
                        <strong>
                          🎟️ {evRole.roleTitle} — {evRole.eventTitle}
                        </strong>
                        <span className="mono subtle">
                          Event-Specific Organizing Team · {evRole.permissions.length} capabilities
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          app.closeAccountModal();
                          app.openEvent(evRole.eventId);
                        }}
                      >
                        Open Event →
                      </button>
                    </div>
                  </div>
                ))}

                {clubRoleBadges.length === 0 && eventRoleEntries.length === 0 && raw.role === 'student' && (
                  <div className="roster-row-card">
                    <p className="hint">
                      No delegated coordinator or club roles claimed yet. Switch to the{' '}
                      <strong>🔑 Claim Role Invite Code</strong> tab to unlock a coordinator role in 1 click!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 7-Permission Capability Matrix */}
            <div className="card form-card">
              <div className="row-between">
                <Mono>7-PERMISSION CAPABILITY MATRIX</Mono>
                {app.studentViewLens && (
                  <span className="badge badge-sm badge-violet">STUDENT LENS ACTIVE (MASKED)</span>
                )}
              </div>
              <p className="hint">
                Real-time breakdown of the 7 granular capabilities across UDEA Pulse and which role unlocked each capability.
              </p>

              <div className="perm-matrix-grid">
                {PERMISSION_META.map((meta) => {
                  const sources = permissionSources.get(meta.id) ?? [];
                  const unlocked = sources.length > 0;
                  return (
                    <div
                      key={meta.id}
                      className={`perm-matrix-card ${unlocked ? 'is-unlocked' : 'is-locked'}`}
                    >
                      <div className="row-between">
                        <strong>{meta.label}</strong>
                        <span className={`badge badge-sm ${unlocked ? 'badge-success' : ''}`}>
                          {unlocked ? '✓ UNLOCKED' : 'LOCKED'}
                        </span>
                      </div>
                      <p className="hint">{meta.description}</p>
                      <div className="perm-source-line">
                        <Mono>
                          {unlocked
                            ? `Granted by: ${sources.join(' · ')}`
                            : app.studentViewLens
                              ? 'Temporarily masked by Student Preview Lens'
                              : 'Claim a role invite code or apply to a club to unlock'}
                        </Mono>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLAIM ROLE INVITE CODE */}
        {activeTab === 'invite' && (
          <div className="role-modal-grid">
            <div className="card form-card">
              <Mono>REDEEM 1-CLICK ROLE INVITE TOKEN</Mono>
              <p className="hint">
                Paste an invite code shared by a Club President or Campus Admin (or click any preset code below) to immediately attach that role and its permissions to{' '}
                <strong>{raw.name}</strong>.
              </p>

              <form className="suggest-row" onSubmit={handleClaimCode}>
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                  placeholder="e.g., FINTECH-COORD-2026"
                  aria-label="Role Invite Code"
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  <Icon name="check" size={14} /> Claim Role Token
                </button>
              </form>

              <div style={{ marginTop: 10 }}>
                <Mono>ACTIVE CAMPUS INVITE TOKENS (CLICK TO CLAIM INSTANTLY)</Mono>
              </div>
              <div className="roster-stack">
                {(app.state.inviteCodes ?? []).map((inv) => {
                  const club = app.state.clubs.find((c) => c.id === inv.clubId);
                  const roleObj = club?.customRoles.find((r) => r.id === inv.roleId);
                  const alreadyHeld = club?.roster.some(
                    (m) => m.userId === raw.id && m.roleId === inv.roleId,
                  );
                  return (
                    <div key={inv.code} className="invite-code-card">
                      <div className="roster-row-head">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <code className="invite-token-pill">{inv.code}</code>
                            <strong>{inv.roleTitle}</strong>
                          </div>
                          <span className="mono subtle">
                            {club?.name ?? inv.clubShort} · Grants {(roleObj?.permissions ?? inv.permissions).length} permissions
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={async () => {
                              await copyText(inv.code);
                              app.pushToast({
                                tone: 'info',
                                title: 'Invite Token Copied',
                                message: `${inv.code} copied to clipboard.`,
                              });
                            }}
                          >
                            <Icon name="copy" size={12} /> Copy
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs ${alreadyHeld ? 'btn-ghost' : 'btn-primary'}`}
                            onClick={() => app.redeemRoleInviteCode(inv.code)}
                          >
                            {alreadyHeld ? '✓ Claimed' : '⚡ Claim Now'}
                          </button>
                        </div>
                      </div>
                      {(roleObj?.permissions ?? inv.permissions).length > 0 && (
                        <div className="equipment-chips">
                          {(roleObj?.permissions ?? inv.permissions).map((p) => (
                            <span key={p} className="equip-chip">
                              <Icon name="check" size={11} />{' '}
                              {PERMISSION_META.find((m) => m.id === p)?.label ?? p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Generate Shareable Invite Token (for Presidents / Admins / Testing) */}
            <div className="card form-card">
              <Mono>GENERATE NEW ROLE INVITE TOKEN (CLUB LEAD / ADMIN)</Mono>
              <p className="hint">
                Club Presidents and Admins can generate a shareable invite token for any custom role in their society.
              </p>

              <label className="field">
                <span className="field-label">Select Verified Boshlik Society</span>
                <select
                  value={genClubId}
                  onChange={(e) => {
                    const nextClubId = e.target.value;
                    setGenClubId(nextClubId);
                    const nextClub = app.state.clubs.find((c) => c.id === nextClubId);
                    setGenRoleId(nextClub?.customRoles[0]?.id ?? '');
                  }}
                >
                  {app.state.clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.short})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Select Custom Role to Encode in Token</span>
                <select
                  value={genRoleId || selectedGenClub?.customRoles[0]?.id || ''}
                  onChange={(e) => setGenRoleId(e.target.value)}
                >
                  {(selectedGenClub?.customRoles ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.permissions.length} permissions)
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleGenerateInvite}
              >
                <Icon name="sparkle" size={14} /> Generate & Copy Invite Code
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: CAMPUS DIRECTORY & QA PERSONA SWITCHER */}
        {activeTab === 'directory' && (
          <div className="stack-sm">
            <div className="row-between" style={{ gap: 12, flexWrap: 'wrap' }}>
              <div className="search-wrap compact" style={{ maxWidth: 420 }}>
                <Icon name="search" size={15} />
                <input
                  type="text"
                  value={dirSearch}
                  onChange={(e) => setDirSearch(e.target.value)}
                  placeholder="Search 14+ accounts by name, @telegram, role, or programme…"
                  aria-label="Search Campus Accounts"
                />
              </div>
              <div className="feed-actions">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setTab('profile')}
                >
                  <Icon name="userPlus" size={14} /> + New Account
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={app.resetDemo}
                >
                  <Icon name="refresh" size={14} /> Reset Demo State
                </button>
              </div>
            </div>

            <div className="directory-groups-grid">
              {[
                {
                  key: 'admins',
                  title: '🛡 Campus Admins (Student Welfare & Union)',
                  items: groupedPersonas.admins,
                },
                {
                  key: 'presidents',
                  title: '👑 Elected Club Presidents',
                  items: groupedPersonas.presidents,
                },
                {
                  key: 'coordinators',
                  title: '⚡ Delegated Club & Event Coordinators',
                  items: groupedPersonas.coordinators,
                },
                {
                  key: 'students',
                  title: '🎓 Regular UDEA Students',
                  items: groupedPersonas.students,
                },
              ].map((group) => (
                <div key={group.key} className="card form-card">
                  <div className="row-between">
                    <Mono>{group.title}</Mono>
                    <span className="mono subtle">{group.items.length} ACCOUNTS</span>
                  </div>
                  <div className="roster-stack">
                    {group.items.map((p) => {
                      const isCurrent = p.id === raw.id;
                      const permCount = countPermsForPersona(p);
                      return (
                        <div
                          key={p.id}
                          className={`roster-row-card ${isCurrent ? 'is-active-persona' : ''}`}
                        >
                          <div className="roster-row-head">
                            <Avatar name={p.name} color={p.color} size={34} />
                            <div>
                              <strong>{p.name}</strong>
                              <span className="mono subtle">
                                {personaSubtitle(p, app.state.clubs)}
                              </span>
                              <span className="mono subtle">
                                {p.telegram} · {p.studentId} · {permCount}/7 perms
                              </span>
                            </div>
                            <button
                              type="button"
                              className={`btn btn-xs ${isCurrent ? 'btn-ghost' : 'btn-primary'}`}
                              onClick={() => {
                                app.setPersona(p.id);
                              }}
                            >
                              {isCurrent ? '✓ Active' : '⚡ Switch'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
