import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { Avatar, Icon } from './UI';
import { BOSHLIK_ZONES, personaRoleLabel, personaSubtitle } from '../lib/labels';

const LANGS = ['all', 'EN', 'UZ', 'RU'] as const;

export default function Topbar() {
  const app = useApp();
  const [personaOpen, setPersonaOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeEvents = app.state.events.filter((e) => e.approvalStatus === 'approved' && !e.past).length;
  const passCount = app.state.tickets.filter(
    (t) => t.userId === app.persona.id && t.status !== 'cancelled',
  ).length;

  // Fix #6: Role-aware notification badge on Organizer/Studio tab
  const studioBadge =
    app.persona.role === 'admin'
      ? app.pendingApprovals
      : app.managedEventsCount > 0
        ? app.managedEventsCount
        : 0;

  useEffect(() => {
    if (!personaOpen) return;
    const onDown = (ev: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) setPersonaOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [personaOpen]);

  const nav = useMemo(
    () => [
      { id: 'explore', label: 'Explore & Feed', short: 'Explore', icon: 'compass', badge: 0 },
      { id: 'clubs', label: 'Clubs & Roles', short: 'Clubs', icon: 'users', badge: 0 },
      { id: 'passes', label: 'My QR Passes & Passport', short: 'Passes', icon: 'ticket', badge: passCount },
      { id: 'organizer', label: 'Organizer & Admin Studio', short: 'Studio', icon: 'shield', badge: studioBadge },
    ],
    [passCount, studioBadge],
  );

  const go = (id: string) => {
    if (id === 'studio') {
      app.clearEditingEvent();
    }
    app.setView(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeRoleText = personaRoleLabel(app.persona, app.state.clubs);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" onClick={() => go('explore')} aria-label="UDEA Pulse home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="26" height="26" fill="none">
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
          {nav.map((item) => (
            <button
              key={item.id}
              className={`nav-tab ${app.view === item.id ? 'is-active' : ''}`}
              onClick={() => go(item.id)}
              aria-current={app.view === item.id ? 'page' : undefined}
              aria-label={item.label}
              title={item.label}
            >
              <Icon name={item.icon} size={16} />
              <span className="nav-label-full">{item.label}</span>
              <span className="nav-label-short">{item.short}</span>
              {item.badge > 0 && <b className="nav-badge">{item.badge}</b>}
            </button>
          ))}
        </nav>

        <div className="topbar-utils">
          <button
            className={`mini-toggle ${app.mobile ? 'is-on' : ''}`}
            onClick={() => app.setMobile(!app.mobile)}
            title="Toggle the Telegram Mini App viewport"
          >
            <Icon name="phone" size={15} />
            <span>{app.mobile ? 'Desktop View' : 'TG Mini App'}</span>
          </button>

          {/* Part 1: Boshlik Campus Venue / Zone Filter */}
          <label className="quick-select" title="Boshlik Campus Venue Zone filter">
            <Icon name="pin" size={14} />
            <select
              value={app.state.filters.zone}
              onChange={(e) => app.setFilters({ zone: e.target.value as never })}
              aria-label="Boshlik Campus Venue Zone filter"
            >
              {BOSHLIK_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.short}
                </option>
              ))}
            </select>
          </label>

          <label className="quick-select" title="Language quick filter">
            <Icon name="flag" size={14} />
            <select
              value={app.state.filters.language}
              onChange={(e) => app.setFilters({ language: e.target.value as never })}
              aria-label="Language quick filter"
            >
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {l === 'all' ? 'ALL' : l}
                </option>
              ))}
            </select>
          </label>

          <button
            className="icon-btn theme-btn"
            onClick={app.toggleTheme}
            title={app.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle theme"
          >
            <Icon name={app.theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>

          <div className="persona-wrap" ref={menuRef}>
            <button
              className={`persona-btn ${personaOpen ? 'is-open' : ''}`}
              onClick={() => setPersonaOpen((v) => !v)}
              aria-expanded={personaOpen}
              title={`${app.persona.name} — ${activeRoleText}`}
            >
              <Avatar name={app.persona.name} color={app.persona.color} size={28} />
              <span className="persona-btn-text">
                <strong>{app.persona.name.split(' ').slice(-1)[0]}</strong>
                <em>{activeRoleText}</em>
              </span>
              <Icon name="chevron" size={13} className="rot-90" />
            </button>

            {personaOpen && (
              <div className="persona-menu">
                <div className="persona-menu-head">
                  <span className="mono">SWITCH PERSONA</span>
                  <p>Test Student, Delegated Coordinator, President & Admin permissions instantly.</p>
                </div>
                {app.personas.map((p) => (
                  <button
                    key={p.id}
                    className={`persona-option ${p.id === app.persona.id ? 'is-active' : ''}`}
                    onClick={() => {
                      app.setPersona(p.id);
                      setPersonaOpen(false);
                    }}
                  >
                    <Avatar name={p.name} color={p.color} size={32} />
                    <span>
                      <strong>{p.name}</strong>
                      <em>{personaSubtitle(p, app.state.clubs)}</em>
                    </span>
                    {p.id === app.persona.id && <Icon name="check" size={15} />}
                  </button>
                ))}
                <div className="persona-menu-foot">
                  <button className="link-btn" onClick={app.resetDemo}>
                    <Icon name="refresh" size={14} /> Reset demo state
                  </button>
                  <span className="mono subtle">LOCALSTORAGE V3</span>
                </div>
              </div>
            )}
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => app.openPostModal()}
            title="Publish a Campus Announcement, Poll, or Event Recap"
          >
            <Icon name="telegram" size={15} /> + Post
          </button>

          <button className="btn btn-primary host-btn" onClick={() => go('studio')}>
            <Icon name="plus" size={16} /> Host Event
          </button>
        </div>

        <div className="mobile-topbar-utils">
          <button className="icon-btn" onClick={() => app.openPostModal()} aria-label="Create Campus Post" title="Create Campus Post">
            <Icon name="telegram" size={17} />
          </button>
          <button className="icon-btn" onClick={app.toggleTheme} aria-label="Toggle theme">
            <Icon name={app.theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
          <button
            className="icon-btn"
            onClick={() => app.setMobile(false)}
            aria-label="Exit mini app view"
            title="Exit mini app view"
          >
            <Icon name="external" size={18} />
          </button>
          <button className="avatar-btn" onClick={() => setPersonaOpen((v) => !v)} aria-label="Switch persona">
            <Avatar name={app.persona.name} color={app.persona.color} size={30} />
          </button>
          {personaOpen && (
            <div className="persona-menu mobile-persona">
              <div className="persona-menu-head">
                <span className="mono">SWITCH PERSONA</span>
              </div>
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
                </button>
              ))}
              <div className="persona-menu-foot">
                <button className="link-btn" onClick={app.resetDemo}>
                  <Icon name="refresh" size={14} /> Reset demo state
                </button>
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

  // Fix #1: Working Telegram Back Button
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
