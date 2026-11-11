import React, { useState } from 'react';
import type { Category, CustomClubRole, PermissionFlag } from '../types';
import { useApp } from '../lib/store';
import { ROOMS } from '../lib/seed';
import { Avatar, CategoryBadge, Icon, Mono, SectionHeader } from './UI';
import { CATEGORY_SHORT, dayLabel, isoDate } from '../lib/utils';
import { PERMISSION_META } from '../lib/labels';
import { getUserPermissionsForClub } from '../lib/logic';

const ROLE_COLORS = ['#10B981', '#8B5CF6', '#2563EB', '#F59E0B', '#EC4899', '#06B6D4'];
const ALL_CATEGORIES: Category[] = ['fintech', 'tech', 'academic', 'sports', 'culture'];

export default function Clubs() {
  const app = useApp();
  const today = isoDate();
  const approved = app.state.events.filter((e) => e.approvalStatus === 'approved' && !e.past);

  const [showCreateClub, setShowCreateClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubShort, setNewClubShort] = useState('');
  const [newClubCat, setNewClubCat] = useState<Category>('tech');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [newClubPartner, setNewClubPartner] = useState('Coventry University');
  const [newClubColor, setNewClubColor] = useState('#8B5CF6');

  const nextEventFor = (clubId: string) =>
    approved
      .filter((e) => (e.hostClubId === clubId || e.coHostClubIds?.includes(clubId)) && e.date >= today)
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];

  const upcomingClubEvents = approved.filter((e) => e.hostClubId).length;
  const totalDelegated = app.state.clubs.reduce((acc, c) => acc + c.roster.length, 0);

  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClubName.trim().length < 3) return;
    app.createClub({
      name: newClubName,
      short: newClubShort || newClubName.slice(0, 14),
      category: newClubCat,
      description: newClubDesc || 'Official student society on UDEA Boshlik Campus.',
      partner: newClubPartner,
      color: newClubColor,
    });
    setNewClubName('');
    setNewClubShort('');
    setNewClubDesc('');
    setShowCreateClub(false);
  };

  return (
    <div className="clubs-view">
      <SectionHeader
        icon="users"
        title="Boshlik Campus Clubs, Custom Roles & Delegated Teams"
        subtitle="Official UDEA student organisations, ACCA and Agrobank partners. Club presidents and admins can create custom roles (e.g. FinTech Case Coordinator), delegate permissions, and connect students to events."
        action={
          <div className="feed-actions">
            <Mono>{app.state.followedClubs.length} FOLLOWED · {totalDelegated} DELEGATED COORDINATORS</Mono>
            {app.persona.role === 'admin' && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateClub((v) => !v)}>
                <Icon name="plus" size={14} /> {showCreateClub ? 'Close Form' : '+ Launch New Club'}
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => app.openPostModal()}>
              <Icon name="telegram" size={14} /> + Club Post
            </button>
          </div>
        }
      />

      {showCreateClub && (
        <form className="card form-card" onSubmit={handleCreateClub} style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <div>
              <span className="mono subtle">STUDENT UNION · LAUNCH NEW VERIFIED SOCIETY</span>
              <h3>Create Official Boshlik Campus Club</h3>
            </div>
          </div>
          <div className="field-row">
            <label className="field">
              <span className="field-label">Club Full Name *</span>
              <input
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                placeholder="e.g., UDEA AI & Data Science Society"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Short Badge Name *</span>
              <input
                value={newClubShort}
                onChange={(e) => setNewClubShort(e.target.value)}
                placeholder="e.g., AI Society"
                required
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span className="field-label">Category</span>
              <select value={newClubCat} onChange={(e) => setNewClubCat(e.target.value as Category)}>
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_SHORT[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Industry / Academic Partner</span>
              <input
                value={newClubPartner}
                onChange={(e) => setNewClubPartner(e.target.value)}
                placeholder="e.g., Coventry University / Agrobank"
              />
            </label>
            <label className="field">
              <span className="field-label">Brand Color</span>
              <select value={newClubColor} onChange={(e) => setNewClubColor(e.target.value)}>
                {ROLE_COLORS.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span className="field-label">Mission & Campus Activities *</span>
            <textarea
              rows={2}
              value={newClubDesc}
              onChange={(e) => setNewClubDesc(e.target.value)}
              placeholder="Describe regular workshops, competitions and Boshlik rooms used…"
              required
            />
          </label>
          <div className="feed-actions">
            <button type="submit" className="btn btn-primary btn-sm">
              <Icon name="check" size={14} /> Launch Verified Club
            </button>
          </div>
        </form>
      )}

      <div className="clubs-stats">
        <div className="clubs-stat">
          <Mono>STUDENT ORGANISATIONS</Mono>
          <strong>{app.state.clubs.length}</strong>
          <span>verified on Boshlik Campus</span>
        </div>
        <div className="clubs-stat">
          <Mono>DELEGATED COORDINATORS</Mono>
          <strong>{totalDelegated}</strong>
          <span>active custom student roles</span>
        </div>
        <div className="clubs-stat">
          <Mono>CLUB EVENTS LIVE</Mono>
          <strong>{upcomingClubEvents}</strong>
          <span>in the next 14 days</span>
        </div>
        <div className="clubs-stat">
          <Mono>INDUSTRY PARTNERS</Mono>
          <strong>Agrobank · ACCA · Coventry</strong>
          <span>grant, certification & validation partners</span>
        </div>
      </div>

      <div className="club-grid">
        {app.state.clubs.map((club) => {
          const following = app.state.followedClubs.includes(club.id);
          const next = nextEventFor(club.id);
          const room = next ? ROOMS.find((r) => r.id === next.roomId) : undefined;
          const myPerms = getUserPermissionsForClub(app.persona, club);
          const canManageRoles =
            myPerms.includes('manage_roles') ||
            app.persona.role === 'admin' ||
            club.leadId === app.persona.id;
          const canPublishClubPost =
            myPerms.includes('publish_posts') ||
            app.persona.role === 'admin' ||
            club.leadId === app.persona.id;

          return (
            <article key={club.id} className={`club-card cat-${club.category} ${following ? 'is-following' : ''}`}>
              <div className="club-top">
                <span className="club-emblem" style={{ background: `linear-gradient(140deg, ${club.color}, ${club.color}88)` }}>
                  {club.short.slice(0, 2).toUpperCase()}
                </span>
                <div className="club-id">
                  <h3>{club.name}</h3>
                  <div className="club-meta">
                    <CategoryBadge category={club.category} small />
                    <span className="verified-label"><Icon name="check" size={11} /> Verified</span>
                    {club.partner && <Mono>{club.partner}</Mono>}
                  </div>
                </div>
              </div>

              <p className="club-desc">{club.description}</p>

              <div className="club-numbers">
                <span><Mono>{club.members}</Mono> members</span>
                <span className="dotsep" />
                <span>{approved.filter((e) => e.hostClubId === club.id || e.coHostClubIds?.includes(club.id)).length} events this fortnight</span>
                {club.leadName && (
                  <>
                    <span className="dotsep" />
                    <span>Lead: <strong>{club.leadName}</strong></span>
                  </>
                )}
              </div>

              {/* Part 2: Delegated Student Roles & Connected Roster Preview */}
              <div className="club-roster-box">
                <div className="club-roster-head">
                  <Mono>DELEGATED ROLES & TEAM ({club.roster.length} ASSIGNED · {club.customRoles.length} ROLES)</Mono>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => app.openRoleModal(club.id)}
                  >
                    {canManageRoles ? 'Manage Roles →' : 'View / Apply →'}
                  </button>
                </div>
                {club.roster.length === 0 ? (
                  <span className="mono subtle">No delegated coordinators yet — click Manage Roles to assign students.</span>
                ) : (
                  <div className="club-roster-pills">
                    {club.roster.map((m) => {
                      const roleObj = club.customRoles.find((r) => r.id === m.roleId);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className="roster-chip"
                          onClick={() => app.setPersona(m.userId)}
                          title={`Click to switch to ${m.userName} (${roleObj?.title ?? 'Coordinator'})`}
                        >
                          <Avatar name={m.userName} color={roleObj?.badgeColor ?? club.color} size={20} />
                          <strong>{m.userName}</strong>
                          <span className="badge badge-sm badge-success">{roleObj?.title ?? 'Coordinator'}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {next ? (
                <button className="club-next" onClick={() => app.openEvent(next.id)}>
                  <span className="club-next-dot" />
                  <span>
                    <strong>{next.title}</strong>
                    <em className="mono">{dayLabel(next.date)} • {next.startTime} • {room?.code}</em>
                  </span>
                  <Icon name="chevron" size={14} />
                </button>
              ) : (
                <div className="club-next is-empty">
                  <span className="club-next-dot" />
                  <span>
                    <strong>No events scheduled</strong>
                    <em className="mono">Follow to hear first</em>
                  </span>
                </div>
              )}

              <div className="club-actions">
                <button
                  className={`btn ${following ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                  onClick={() => app.followClub(club.id)}
                >
                  <Icon name={following ? 'check' : 'bell'} size={13} /> {following ? 'Following' : 'Follow Club'}
                </button>
                <button
                  className="btn btn-violet btn-sm"
                  onClick={() => app.openRoleModal(club.id)}
                >
                  <Icon name="shield" size={13} /> {canManageRoles ? 'Manage Roles & Team' : 'Roles & Apply'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    app.setFilters({ clubId: club.id });
                    app.setView('explore');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <Icon name="calendar" size={13} /> All Activity
                </button>
                {canPublishClubPost && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => app.openPostModal({ defaultClubId: club.id })}
                  >
                    <Icon name="telegram" size={13} /> + Post
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="partner-strip">
        <div className="partner-logo">UDEA</div>
        <div className="partner-logo">COVENTRY<br />UNIVERSITY</div>
        <div className="partner-logo">AGROBANK</div>
        <div className="partner-logo">ACCA<br />SILVER</div>
        <p className="mono">STRATEGIC SCHOLARSHIP & INDUSTRY PARTNERS OF UDEA BOSHLIK CAMPUS</p>
      </div>
    </div>
  );
}

export function RoleManagerModal() {
  const app = useApp();
  const club = app.state.clubs.find((c) => c.id === app.roleModalClubId);

  const [tab, setTab] = useState<'roster' | 'roles'>('roster');

  // Role Architect state (supports both create and edit)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleTitle, setRoleTitle] = useState('');
  const [badgeColor, setBadgeColor] = useState(ROLE_COLORS[0]);
  const [permissions, setPermissions] = useState<PermissionFlag[]>([
    'create_events',
    'publish_posts',
    'book_rooms',
    'manage_registrations',
    'scan_tickets',
  ]);
  const [allowedCats, setAllowedCats] = useState<Category[]>([]);

  // Student Assignment state
  const [selectedStudentId, setSelectedStudentId] = useState(app.directory[0]?.id ?? 'usr_4');
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customTelegram, setCustomTelegram] = useState('');
  const [customProgramme, setCustomProgramme] = useState('BSc Digital Economics · Y2');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [applyNote, setApplyNote] = useState('');

  if (!club) return null;

  const myPerms = getUserPermissionsForClub(app.persona, club);
  const canManageRoles =
    myPerms.includes('manage_roles') ||
    app.persona.role === 'admin' ||
    club.leadId === app.persona.id;

  const activeRoleId = selectedRoleId || club.customRoles[0]?.id || '';

  const togglePerm = (perm: PermissionFlag) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const toggleCat = (cat: Category) => {
    setAllowedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const startEditRole = (role: CustomClubRole) => {
    setEditingRoleId(role.id);
    setRoleTitle(role.title);
    setBadgeColor(role.badgeColor || ROLE_COLORS[0]);
    setPermissions([...role.permissions]);
    setAllowedCats([...(role.allowedCategories ?? [])]);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRoles) return;
    if (roleTitle.trim().length < 2) {
      app.pushToast({
        tone: 'warn',
        title: 'Role title required',
        message: 'Enter a role title such as “FinTech Case Coordinator” or “Lead Mentor”.',
      });
      return;
    }
    if (permissions.length === 0) {
      app.pushToast({
        tone: 'warn',
        title: 'Select at least 1 permission',
        message: 'Check one or more permission flags to delegate to this role.',
      });
      return;
    }
    if (editingRoleId) {
      app.updateClubRole(club.id, {
        id: editingRoleId,
        clubId: club.id,
        title: roleTitle.trim(),
        badgeColor,
        permissions,
        allowedCategories: allowedCats.length > 0 ? allowedCats : undefined,
      });
      setEditingRoleId(null);
    } else {
      app.createClubRole(club.id, {
        title: roleTitle.trim(),
        badgeColor,
        permissions,
        allowedCategories: allowedCats.length > 0 ? allowedCats : undefined,
      });
    }
    setRoleTitle('');
  };

  const handleAssignStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRoles) return;
    if (!activeRoleId) {
      app.pushToast({
        tone: 'warn',
        title: 'Create a custom role first',
        message: 'Switch to Custom Role Architect to create a role before assigning students.',
      });
      return;
    }

    if (customMode) {
      if (customName.trim().length < 2) {
        app.pushToast({
          tone: 'warn',
          title: 'Student name required',
          message: 'Enter the student’s full name.',
        });
        return;
      }
      app.assignClubMember(club.id, {
        userId: `usr_custom_${Date.now()}`,
        userName: customName.trim(),
        userTelegram: customTelegram.trim() || '@udea_student',
        userProgramme: customProgramme.trim() || 'UDEA Student',
        roleId: activeRoleId,
      });
      setCustomName('');
      setCustomTelegram('');
    } else {
      const stu = app.directory.find((s) => s.id === selectedStudentId);
      if (!stu) return;
      app.assignClubMember(club.id, {
        userId: stu.id,
        userName: stu.name,
        userTelegram: stu.telegram,
        userProgramme: stu.programme,
        roleId: activeRoleId,
      });
    }
  };

  const handleApplyForRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoleId) return;
    app.applyForClubRole(club.id, activeRoleId, applyNote);
    setApplyNote('');
  };

  const pendingApps = (club.applications ?? []).filter((a) => a.status === 'pending');

  return (
    <div className="modal-layer" onClick={app.closeRoleModal}>
      <div
        className="modal modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Manage Roles & Team — ${club.name}`}
      >
        <div className="panel-head">
          <div>
            <span className="mono subtle">PART 2 · DYNAMIC ROLE BUILDER & DELEGATION ENGINE</span>
            <h2>{club.name} — Custom Roles & Student Team</h2>
          </div>
          <button type="button" className="icon-btn sm" onClick={app.closeRoleModal} aria-label="Close modal">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="track-switch" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={tab === 'roster' ? 'is-active' : ''}
            onClick={() => setTab('roster')}
          >
            👥 {canManageRoles ? `Assign & Connect Students (${club.roster.length})` : `Active Team & Apply (${club.roster.length})`}
          </button>
          <button
            type="button"
            className={tab === 'roles' ? 'is-active' : ''}
            onClick={() => setTab('roles')}
          >
            🛠️ Custom Role Architect ({club.customRoles.length})
          </button>
        </div>

        {tab === 'roster' ? (
          <div className="role-modal-grid">
            {canManageRoles ? (
              <form className="card form-card" onSubmit={handleAssignStudent}>
                <Mono>ASSIGN STUDENT TO CUSTOM CLUB ROLE</Mono>
                <p className="hint">
                  Assigning a student grants them the role’s capabilities immediately and adds them to the Account Switcher.
                </p>

                <div className="track-switch">
                  <button
                    type="button"
                    className={!customMode ? 'is-active' : ''}
                    onClick={() => setCustomMode(false)}
                  >
                    UDEA Student Directory ({app.directory.length})
                  </button>
                  <button
                    type="button"
                    className={customMode ? 'is-active' : ''}
                    onClick={() => setCustomMode(true)}
                  >
                    + Custom Student
                  </button>
                </div>

                {!customMode ? (
                  <label className="field">
                    <span className="field-label">Select UDEA Student</span>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                      {app.directory.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.telegram} · {s.programmeShort})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <label className="field">
                      <span className="field-label">Student Full Name *</span>
                      <input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="e.g., Nodirbek Karimov"
                      />
                    </label>
                    <div className="field-row">
                      <label className="field">
                        <span className="field-label">Telegram Handle</span>
                        <input
                          value={customTelegram}
                          onChange={(e) => setCustomTelegram(e.target.value)}
                          placeholder="@nodirbek_udea"
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Programme</span>
                        <input
                          value={customProgramme}
                          onChange={(e) => setCustomProgramme(e.target.value)}
                        />
                      </label>
                    </div>
                  </>
                )}

                <label className="field">
                  <span className="field-label">Select Custom Role to Delegate</span>
                  <select
                    value={activeRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                  >
                    {club.customRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.permissions.length} permissions)
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" className="btn btn-primary">
                  <Icon name="check" size={14} /> Assign & Connect Student
                </button>

                {pendingApps.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <Mono>PENDING STUDENT APPLICATIONS ({pendingApps.length})</Mono>
                    <div className="stack-sm" style={{ marginTop: 8 }}>
                      {pendingApps.map((a) => {
                        const rObj = club.customRoles.find((r) => r.id === a.roleId);
                        return (
                          <div key={a.id} className="roster-row-card">
                            <div className="roster-row-head">
                              <strong>{a.userName}</strong>
                              <span className="badge badge-sm badge-success">{rObj?.title}</span>
                              <button
                                type="button"
                                className="btn btn-primary btn-xs"
                                onClick={() => app.approveRoleApplication(club.id, a.id)}
                              >
                                Approve & Assign
                              </button>
                            </div>
                            <p className="hint">{a.note}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <form className="card form-card" onSubmit={handleApplyForRole}>
                <Mono>🙋 APPLY FOR A DELEGATED COORDINATOR ROLE</Mono>
                <p className="hint">
                  You are viewing as <strong>{app.persona.name}</strong>. Apply below for a coordinator role or switch to{' '}
                  <strong>{club.leadName || 'Malika Karimova'}</strong> / <strong>Timur Alimov (Admin)</strong> to assign roles directly.
                </p>
                <label className="field">
                  <span className="field-label">Role You Want to Apply For</span>
                  <select
                    value={activeRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                  >
                    {club.customRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} ({r.permissions.length} permissions)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Short Note to Club President</span>
                  <textarea
                    rows={3}
                    value={applyNote}
                    onChange={(e) => setApplyNote(e.target.value)}
                    placeholder="Share how you want to help organize events, workshops or media…"
                  />
                </label>
                <div className="feed-actions">
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Icon name="telegram" size={14} /> Submit Role Application
                  </button>
                  {club.leadId && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => app.setPersona(club.leadId!)}
                    >
                      Switch to {club.leadName} (President)
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="card form-card">
              <Mono>ACTIVE CLUB LEADERSHIP & DELEGATED ROSTER</Mono>
              <div className="roster-stack">
                {club.leadName && (
                  <div className="roster-row-card">
                    <div className="roster-row-head">
                      <Avatar name={club.leadName} color={club.color} size={32} />
                      <div>
                        <strong>{club.leadName}</strong>
                        <span className="mono subtle">Elected Club President · Full Club Authority</span>
                      </div>
                      <span className="badge badge-success">CLUB PRESIDENT</span>
                      {club.leadId && club.leadId !== app.persona.id && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            app.setPersona(club.leadId!);
                            app.closeRoleModal();
                          }}
                        >
                          ⚡ Switch
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {club.roster.map((item) => {
                  const roleObj = club.customRoles.find((r) => r.id === item.roleId);
                  return (
                    <div key={item.id} className="roster-row-card">
                      <div className="roster-row-head">
                        <Avatar name={item.userName} color={roleObj?.badgeColor ?? club.color} size={32} />
                        <div>
                          <strong>{item.userName}</strong>
                          <span className="mono subtle">
                            {item.userProgramme} · {item.userTelegram}
                          </span>
                        </div>
                        <span className="badge badge-success">{roleObj?.title ?? 'Coordinator'}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            app.setPersona(item.userId);
                            app.closeRoleModal();
                          }}
                          title={`Switch active account to ${item.userName}`}
                        >
                          ⚡ Switch
                        </button>
                        {canManageRoles && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs danger-text"
                            onClick={() => app.removeClubMember(club.id, item.id)}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                      {roleObj && (
                        <div className="equipment-chips">
                          {roleObj.permissions.map((p) => (
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
          </div>
        ) : (
          <div className="role-modal-grid">
            {canManageRoles ? (
              <form className="card form-card" onSubmit={handleSaveRole}>
                <div className="row-between">
                  <Mono>{editingRoleId ? 'EDIT CUSTOM CLUB ROLE' : 'CREATE CUSTOM CLUB ROLE'}</Mono>
                  {editingRoleId && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setEditingRoleId(null);
                        setRoleTitle('');
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <label className="field">
                  <span className="field-label">Role Title *</span>
                  <input
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g., FinTech Case Coordinator, Lead Mentor, Workshop Host"
                    required
                  />
                </label>

                <div className="field">
                  <span className="field-label">Badge Color</span>
                  <div className="feed-actions">
                    {ROLE_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        className={`pill ${badgeColor === col ? 'is-active' : ''}`}
                        onClick={() => setBadgeColor(col)}
                      >
                        <i className="dot" style={{ background: col }} /> {col}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <span className="field-label">Granular Permissions ({permissions.length} selected)</span>
                  <div className="perm-grid">
                    {PERMISSION_META.map((meta) => {
                      const on = permissions.includes(meta.id);
                      return (
                        <button
                          key={meta.id}
                          type="button"
                          className={`equip-toggle ${on ? 'is-on' : ''}`}
                          onClick={() => togglePerm(meta.id)}
                        >
                          <span className="checkbox">{on && <Icon name="check" size={11} />}</span>
                          <span>
                            <strong>{meta.label}</strong> — {meta.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="field">
                  <span className="field-label">Category Scope (leave empty for all categories)</span>
                  <div className="feed-actions">
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`pill ${allowedCats.includes(cat) ? 'is-active' : ''}`}
                        onClick={() => toggleCat(cat)}
                      >
                        {CATEGORY_SHORT[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Icon name={editingRoleId ? 'check' : 'plus'} size={14} />{' '}
                  {editingRoleId ? 'Save Role Changes' : 'Create Custom Role'}
                </button>
              </form>
            ) : (
              <div className="card form-card">
                <Mono>ROLE ARCHITECT LOCKED (READ-ONLY)</Mono>
                <p className="hint">
                  Only the Club President ({club.leadName || 'Club Lead'}), Campus Admin, or a member with{' '}
                  <code>manage_roles</code> permission can create or edit custom roles.
                </p>
              </div>
            )}

            <div className="card form-card">
              <Mono>DEFINED ROLES IN {club.short.toUpperCase()} ({club.customRoles.length})</Mono>
              <div className="roster-stack">
                {club.customRoles.map((role) => (
                  <div key={role.id} className="roster-row-card">
                    <div className="roster-row-head">
                      <span className="badge badge-success">{role.title}</span>
                      <span className="mono subtle">
                        Scope:{' '}
                        {!role.allowedCategories || role.allowedCategories.length === 0
                          ? 'All Categories'
                          : role.allowedCategories.map((c) => CATEGORY_SHORT[c]).join(', ')}
                      </span>
                      {canManageRoles && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => startEditRole(role)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs danger-text"
                            onClick={() => app.deleteClubRole(club.id, role.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="equipment-chips">
                      {role.permissions.map((p) => (
                        <span key={p} className="equip-chip">
                          <Icon name="check" size={11} />{' '}
                          {PERMISSION_META.find((m) => m.id === p)?.label ?? p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
