import React, { useState } from 'react';
import type { Category, PermissionFlag } from '../types';
import { useApp } from '../lib/store';
import { ROOMS, STUDENT_DIRECTORY } from '../lib/seed';
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

  const nextEventFor = (clubId: string) =>
    approved
      .filter((e) => (e.hostClubId === clubId || e.coHostClubIds?.includes(clubId)) && e.date >= today)
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];

  const upcomingClubEvents = approved.filter((e) => e.hostClubId).length;
  const totalDelegated = app.state.clubs.reduce((acc, c) => acc + c.roster.length, 0);

  return (
    <div className="clubs-view">
      <SectionHeader
        icon="users"
        title="Boshlik Campus Clubs, Custom Roles & Delegated Teams"
        subtitle="Official UDEA student organisations, ACCA and Agrobank partners. Club presidents and admins can create custom roles (e.g. FinTech Case Coordinator), delegate permissions, and connect students to events."
        action={
          <div className="feed-actions">
            <Mono>{app.state.followedClubs.length} FOLLOWED · {totalDelegated} DELEGATED COORDINATORS</Mono>
            <button className="btn btn-ghost btn-sm" onClick={() => app.openPostModal()}>
              <Icon name="telegram" size={14} /> + Club Post
            </button>
          </div>
        }
      />

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
                <span>{approved.filter((e) => e.hostClubId === club.id).length} events this fortnight</span>
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
                    {canManageRoles ? 'Manage Roles →' : 'View Roles →'}
                  </button>
                </div>
                {club.roster.length === 0 ? (
                  <span className="mono subtle">No delegated coordinators yet — click Manage Roles to assign students.</span>
                ) : (
                  <div className="club-roster-pills">
                    {club.roster.map((m) => {
                      const roleObj = club.customRoles.find((r) => r.id === m.roleId);
                      return (
                        <span key={m.id} className="roster-chip">
                          <Avatar name={m.userName} color={roleObj?.badgeColor ?? club.color} size={20} />
                          <strong>{m.userName}</strong>
                          <span className="badge badge-sm badge-success">{roleObj?.title ?? 'Coordinator'}</span>
                        </span>
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
                  <Icon name="shield" size={13} /> Manage Roles & Team
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => app.openPostModal({ defaultClubId: club.id })}
                >
                  <Icon name="telegram" size={13} /> + Post
                </button>
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

  // Role Architect state
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
  const [selectedStudentId, setSelectedStudentId] = useState(STUDENT_DIRECTORY[0]?.id ?? 'usr_4');
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customTelegram, setCustomTelegram] = useState('');
  const [customProgramme, setCustomProgramme] = useState('BSc Digital Economics · Y2');
  const [selectedRoleId, setSelectedRoleId] = useState('');

  if (!club) return null;

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

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
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
    app.createClubRole(club.id, {
      title: roleTitle.trim(),
      badgeColor,
      permissions,
      allowedCategories: allowedCats.length > 0 ? allowedCats : undefined,
    });
    setRoleTitle('');
  };

  const handleAssignStudent = (e: React.FormEvent) => {
    e.preventDefault();
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
      const stu = STUDENT_DIRECTORY.find((s) => s.id === selectedStudentId);
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
            👥 Assign & Connect Students ({club.roster.length})
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
            <form className="card form-card" onSubmit={handleAssignStudent}>
              <Mono>ASSIGN STUDENT TO CUSTOM CLUB ROLE</Mono>
              <p className="hint">
                Assigning a student grants them the role’s capabilities immediately when you switch to their persona in the topbar.
              </p>

              <div className="track-switch">
                <button
                  type="button"
                  className={!customMode ? 'is-active' : ''}
                  onClick={() => setCustomMode(false)}
                >
                  UDEA Student Directory
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
                    {STUDENT_DIRECTORY.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.telegram} · {s.programme})
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
                      placeholder="e.g., Soliyev Firdavs"
                    />
                  </label>
                  <div className="field-row">
                    <label className="field">
                      <span className="field-label">Telegram Handle</span>
                      <input
                        value={customTelegram}
                        onChange={(e) => setCustomTelegram(e.target.value)}
                        placeholder="@firdavs_soliyev"
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
            </form>

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
                          className="btn btn-ghost btn-xs danger-text"
                          onClick={() => app.removeClubMember(club.id, item.id)}
                        >
                          Revoke
                        </button>
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
            <form className="card form-card" onSubmit={handleCreateRole}>
              <Mono>CREATE CUSTOM CLUB ROLE</Mono>
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
                <Icon name="plus" size={14} /> Create Custom Role
              </button>
            </form>

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
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs danger-text"
                        onClick={() => app.deleteClubRole(club.id, role.id)}
                      >
                        Delete
                      </button>
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
