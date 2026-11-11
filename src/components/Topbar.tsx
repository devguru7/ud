import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../lib/store';
import { Avatar, Icon, Mono } from './UI';
import { personaRoleLabel, personaSubtitle, t } from '../lib/labels';
import { firstName, relativeTime } from '../lib/utils';
import { getUserCanPublishPosts } from '../lib/logic';
import { springs } from '../lib/motionConfig';
import type { Lang } from '../types';

const UI_LANGS: Lang[] = ['EN', 'UZ', 'RU'];

export default function Topbar() {
  const app = useApp();
  const [personaOpen, setPersonaOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTelegram, setNewTelegram] = useState('');
  const [newProg, setNewProg] = useState('BSc (Hons) International Finance and Banking');
  const [newYear, setNewYear] = useState('Year 2');

  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const activeEvents = app.state.events.filter((e) => e.approvalStatus === 'approved' && !e.past).length;
  const passCount = app.state.tickets.filter(
    (tkt) => tkt.userId === app.persona.id && tkt.status !== 'cancelled',
  ).length;

  const studioBadge =
    app.persona.role === 'admin'
      ? app.pendingApprovals
      : app.managedEventsCount > 0
        ? app.managedEventsCount
        : 0;

  useEffect(() => {
    if (!personaOpen && !notifOpen) return;
    const onDown = (ev: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) setPersonaOpen(false);
      if (notifRef.current && !notifRef.current.contains(ev.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [personaOpen, notifOpen]);

  const nav = useMemo(
    () => [
      { id: 'explore', label: 'Explore & Feed', short: t(app.uiLang, 'explore'), icon: 'compass', badge: 0 },
      { id: 'clubs', label: 'Clubs & Roles', short: t(app.uiLang, 'clubs'), icon: 'users', badge: 0 },
      { id: 'passes', label: 'My QR Passes & Passport', short: t(app.uiLang, 'passes'), icon: 'ticket', badge: passCount },
      { id: 'organizer', label: 'Organizer & Admin Studio', short: t(app.uiLang, 'studio'), icon: 'shield', badge: studioBadge },
    ],
    [app.uiLang, passCount, studioBadge],
  );

  const go = (id: string) => {
    if (id === 'studio') {
      app.clearEditingEvent();
    }
    app.setView(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeRoleText = personaRoleLabel(app.persona, app.state.clubs);
  const canPublish = getUserCanPublishPosts(app.persona, app.state.clubs);

  const myNotifications = useMemo(
    () =>
      (app.state.notifications ?? []).filter(
        (n) => n.userId === 'all' || n.userId === app.persona.id,
      ),
    [app.state.notifications, app.persona.id],
  );

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    app.registerStudentAccount({
      name: newName.trim(),
      telegram: newTelegram.trim() || `@${newName.trim().toLowerCase().split(/\s+/)[0]}_udea`,
      programme: newProg,
      year: newYear,
      switchNow: true,
    });
    setNewName('');
    setNewTelegram('');
    setShowNewAccount(false);
    setPersonaOpen(false);
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" onClick={() => go('explore')} aria-label="UDEA Pulse home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
              <path d="M8 8v9a8 8 0 0 0 16 0V8" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
              <circle cx="8" cy="6" r="2" fill="currentColor" opacity=".55" />
            </svg>
          </span>
          <span className="brand-text">
            <strong>UDEA Pulse</strong>
            <em>Boshlik Campus OS · Tashkent</em>
          </span>
          <span className="live-pill">
            <i />
            {activeEvents} Boshlik Events
          </span>
        </button>

        <nav className="topbar-tabs" aria-label="Primary">
          {nav.map((item) => {
            const active = app.view === item.id;
            return (
              <button
                key={item.id}
                className={`nav-tab ${active ? 'is-active' : ''}`}
                onClick={() => go(item.id)}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
              >
                {active && (
                  <motion.span
                    layoutId="topbar-nav-pill"
                    className="liquid-pill-bg"
                    transition={springs.liquidPill}
                  />
                )}
                <Icon name={item.icon} size={15} />
                <span className="nav-label-full">{item.label}</span>
                <span className="nav-label-short">{item.short}</span>
                {item.badge > 0 && <b className="nav-badge">{item.badge}</b>}
              </button>
            );
          })}
        </nav>

        <div className="topbar-utils">
          <button
            className={`mini-toggle ${app.mobile ? 'is-on' : ''}`}
            onClick={() => app.setMobile(!app.mobile)}
            title="Toggle the Telegram Mini App viewport"
          >
            <Icon name="phone" size={14} />
            <span>{app.mobile ? 'Desktop' : 'TG Mini App'}</span>
          </button>

          <label className="quick-select lang-select" title="Interface Language (EN / UZ / RU)">
            <Icon name="globe" size={14} />
            <select
              value={app.uiLang}
              onChange={(e) => app.setUiLang(e.target.value as Lang)}
              aria-label="Interface Language"
            >
              {UI_LANGS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          {/* Notification Bell Popover */}
          <div className="persona-wrap" ref={!app.mobile ? notifRef : undefined}>
            <button
              className="icon-btn notif-btn"
              onClick={() => {
                setNotifOpen((v) => !v);
                if (!notifOpen) app.markAllNotificationsRead();
              }}
              aria-label="Campus Notifications"
              title="Campus Notifications & Role Updates"
            >
              <Icon name="bell" size={17} />
              {app.unreadNotificationsCount > 0 && (
                <span className="notif-dot">{app.unreadNotificationsCount}</span>
              )}
            </button>

            {notifOpen && !app.mobile && (
              <div className="persona-menu notif-popover">
                <div className="persona-menu-head">
                  <div className="row-between">
                    <span className="mono">CAMPUS NOTIFICATIONS</span>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={app.markAllNotificationsRead}
                    >
                      Mark all read
                    </button>
                  </div>
                  <p>Live updates for {app.persona.name} ({app.persona.telegram})</p>
                </div>
                <div className="notif-list">
                  {myNotifications.length === 0 ? (
                    <p className="muted-note" style={{ padding: '12px' }}>
                      No notifications yet.
                    </p>
                  ) : (
                    myNotifications.slice(0, 8).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`notif-item ${n.read ? '' : 'is-unread'}`}
                        onClick={() => {
                          setNotifOpen(false);
                          if (n.linkEventId) app.openEvent(n.linkEventId);
                          else if (n.linkClubId) {
                            app.setView('clubs');
                            app.openRoleModal(n.linkClubId);
                          }
                        }}
                      >
                        <div className="row-between">
                          <strong>{n.title}</strong>
                          <Mono>{relativeTime(n.createdAt)}</Mono>
                        </div>
                        <p>{n.message}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            className="icon-btn theme-btn"
            onClick={app.toggleTheme}
            title={app.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle theme"
          >
            <Icon name={app.theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>

          {/* Persona / Account Switcher */}
          <div className="persona-wrap" ref={!app.mobile ? menuRef : undefined}>
            <button
              className={`persona-btn ${personaOpen ? 'is-open' : ''}`}
              onClick={() => setPersonaOpen((v) => !v)}
              aria-expanded={personaOpen}
              title={`${app.persona.name} — ${activeRoleText}`}
            >
              <Avatar name={app.persona.name} color={app.persona.color} size={27} />
              <span className="persona-btn-text">
                <strong>{firstName(app.persona.name)}</strong>
                <em>{activeRoleText}</em>
              </span>
              <Icon name="chevron" size={13} className="rot-90" />
            </button>

            {personaOpen && !app.mobile && (
              <div className="persona-menu">
                <div className="persona-menu-head">
                  <div className="row-between">
                    <span className="mono">SWITCH CAMPUS ACCOUNT ({app.personas.length})</span>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setShowNewAccount((v) => !v)}
                    >
                      {showNewAccount ? 'Cancel' : '+ New Account'}
                    </button>
                  </div>
                  <p>Test Student, Delegated Coordinator, President & Admin permissions instantly.</p>
                </div>

                {showNewAccount && (
                  <form className="new-account-form" onSubmit={handleCreateAccount}>
                    <input
                      type="text"
                      placeholder="Full Name (e.g., Nodirbek Karimov)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                    <div className="form-row-2">
                      <input
                        type="text"
                        placeholder="@telegram_handle"
                        value={newTelegram}
                        onChange={(e) => setNewTelegram(e.target.value)}
                      />
                      <select value={newYear} onChange={(e) => setNewYear(e.target.value)}>
                        <option value="Foundation">Foundation</option>
                        <option value="Year 1">Year 1</option>
                        <option value="Year 2">Year 2</option>
                        <option value="Year 3">Year 3</option>
                        <option value="MSc">MSc / MBA</option>
                      </select>
                    </div>
                    <select value={newProg} onChange={(e) => setNewProg(e.target.value)}>
                      <option value="BSc (Hons) International Finance and Banking">BSc International Finance</option>
                      <option value="BSc (Hons) Business Data Analytics">BSc Business Data Analytics</option>
                      <option value="BA (Hons) Business Management and Leadership">BA Business Management</option>
                      <option value="BSc Digital Economics & Agrotechnologies">BSc Digital Economics & AgriTech</option>
                      <option value="Foundation Year (English & Academic Prep)">Foundation Year</option>
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm btn-block">
                      <Icon name="userPlus" size={14} /> Create & Switch to Account
                    </button>
                  </form>
                )}

                <div className="persona-scroll-list">
                  {app.personas.map((p) => (
                    <button
                      key={p.id}
                      className={`persona-option ${p.id === app.persona.id ? 'is-active' : ''}`}
                      onClick={() => {
                        app.setPersona(p.id);
                        setPersonaOpen(false);
                      }}
                    >
                      <Avatar name={p.name} color={p.color} size={30} />
                      <span>
                        <strong>{p.name}</strong>
                        <em>{personaSubtitle(p, app.state.clubs)}</em>
                      </span>
                      {p.id === app.persona.id && <Icon name="check" size={15} />}
                    </button>
                  ))}
                </div>

                <div className="persona-cloud-bar">
                  {app.firebaseUser ? (
                    <div className="row-between" style={{ width: '100%', gap: 8 }}>
                      <span className="mono subtle" style={{ color: 'var(--signal-green)' }}>
                        ☁️ {app.firebaseUser.email?.split('@')[0]}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-ghost btn-xs" onClick={app.syncToCloud}>
                          Sync Now
                        </button>
                        <button type="button" className="btn btn-ghost btn-xs" onClick={app.signOutFirebase}>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-block"
                      onClick={app.signInWithGoogle}
                    >
                      <Icon name="globe" size={13} /> Connect Google / Firebase Cloud Sync
                    </button>
                  )}
                </div>

                <div className="persona-menu-foot">
                  <button className="link-btn" onClick={app.resetDemo}>
                    <Icon name="refresh" size={14} /> Reset demo state
                  </button>
                  <span className="mono subtle">FIRESTORE + LOCAL V4.0</span>
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => app.openPostModal(canPublish ? {} : { defaultType: 'discussion' })}
            title={
              canPublish
                ? 'Publish an Official Campus Post, Poll, or Event Recap'
                : 'Start a Campus Discussion or Poll'
            }
          >
            <Icon name="telegram" size={15} /> + {canPublish ? t(app.uiLang, 'newPost') : 'Discuss'}
          </button>

          <button className="btn btn-primary host-btn" onClick={() => go('studio')}>
            <Icon name="plus" size={16} /> {t(app.uiLang, 'hostEvent')}
          </button>
        </div>

        <div className="mobile-topbar-utils" ref={app.mobile ? menuRef : undefined}>
          <label className="quick-select lang-select" title="Interface Language (EN / UZ / RU)" style={{ height: 32, padding: '0 6px' }}>
            <Icon name="globe" size={13} />
            <select
              value={app.uiLang}
              onChange={(e) => app.setUiLang(e.target.value as Lang)}
              aria-label="Mobile Interface Language"
              style={{ fontSize: 11, paddingRight: 14 }}
            >
              {UI_LANGS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <div className="persona-wrap" ref={app.mobile ? notifRef : undefined}>
            <button
              className="icon-btn notif-btn"
              onClick={() => {
                setNotifOpen((v) => !v);
                if (!notifOpen) app.markAllNotificationsRead();
              }}
              aria-label="Mobile Campus Notifications"
              title="Campus Notifications & Role Updates"
            >
              <Icon name="bell" size={16} />
              {app.unreadNotificationsCount > 0 && (
                <span className="notif-dot">{app.unreadNotificationsCount}</span>
              )}
            </button>
            {notifOpen && (
              <div className="persona-menu notif-popover" style={{ right: -60, width: 300 }}>
                <div className="persona-menu-head">
                  <div className="row-between">
                    <span className="mono">CAMPUS NOTIFICATIONS</span>
                    <button type="button" className="link-btn" onClick={app.markAllNotificationsRead}>
                      Mark all read
                    </button>
                  </div>
                  <p>Live updates for {app.persona.name}</p>
                </div>
                <div className="notif-list">
                  {myNotifications.slice(0, 6).map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`notif-item ${n.read ? '' : 'is-unread'}`}
                      onClick={() => {
                        setNotifOpen(false);
                        if (n.linkEventId) app.openEvent(n.linkEventId);
                        else if (n.linkClubId) {
                          app.setView('clubs');
                          app.openRoleModal(n.linkClubId);
                        }
                      }}
                    >
                      <div className="row-between">
                        <strong>{n.title}</strong>
                        <Mono>{relativeTime(n.createdAt)}</Mono>
                      </div>
                      <p>{n.message}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            className="icon-btn"
            onClick={() => app.openPostModal(canPublish ? {} : { defaultType: 'discussion' })}
            aria-label="Create Campus Post"
            title="Create Campus Post"
          >
            <Icon name="telegram" size={16} />
          </button>
          <button className="icon-btn" onClick={app.toggleTheme} aria-label="Toggle theme">
            <Icon name={app.theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>
          {app.mobile && (
            <button
              className="icon-btn"
              onClick={() => app.setMobile(false)}
              aria-label="Exit mini app view"
              title="Exit mini app view"
            >
              <Icon name="external" size={17} />
            </button>
          )}
          <button className="avatar-btn" onClick={() => setPersonaOpen((v) => !v)} aria-label="Switch persona">
            <Avatar name={app.persona.name} color={app.persona.color} size={28} />
          </button>
          {personaOpen && (
            <div className="persona-menu" style={{ right: 0, width: 300 }}>
              <div className="persona-menu-head">
                <div className="row-between">
                  <span className="mono">SWITCH ACCOUNT ({app.personas.length})</span>
                  <button type="button" className="link-btn" onClick={() => setShowNewAccount((v) => !v)}>
                    {showNewAccount ? 'Cancel' : '+ New'}
                  </button>
                </div>
              </div>
              <div className="persona-scroll-list">
                {app.personas.map((p) => (
                  <button
                    key={p.id}
                    className={`persona-option ${p.id === app.persona.id ? 'is-active' : ''}`}
                    onClick={() => {
                      app.setPersona(p.id);
                      setPersonaOpen(false);
                    }}
                  >
                    <Avatar name={p.name} color={p.color} size={28} />
                    <span>
                      <strong>{p.name}</strong>
                      <em>{personaSubtitle(p, app.state.clubs)}</em>
                    </span>
                    {p.id === app.persona.id && <Icon name="check" size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function TelegramHeader() {
  const app = useApp();

  const canGoBack =
    Boolean(app.certificateTicketId) ||
    Boolean(app.activePostModal) ||
    Boolean(app.roleModalClubId) ||
    Boolean(app.drawerEventId) ||
    app.view !== 'explore';

  const handleBack = () => {
    if (app.certificateTicketId) {
      app.closeCertificate();
      return;
    }
    if (app.activePostModal) {
      app.closePostModal();
      return;
    }
    if (app.roleModalClubId) {
      app.closeRoleModal();
      return;
    }
    if (app.drawerEventId) {
      app.closeEvent();
      return;
    }
    if (app.view !== 'explore') {
      app.setView('explore');
    }
  };

  return (
    <div className="tg-header">
      <div className="tg-handle" />
      <div className="tg-row">
        <button
          type="button"
          className="tg-back"
          onClick={handleBack}
          disabled={!canGoBack}
          aria-label="Mini app back"
          style={{ opacity: canGoBack ? 1 : 0.45 }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m14 6-6 6 6 6" />
          </svg>
        </button>
        <div className="tg-titles">
          <strong>UDEA Pulse Bot</strong>
          <span>Boshlik Mini App · @udea_pulse_bot</span>
        </div>
        <span className="tg-dots" aria-hidden="true">•••</span>
      </div>
    </div>
  );
}
