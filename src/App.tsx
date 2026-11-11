import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, useApp } from './lib/store';
import Topbar, { TelegramHeader } from './components/Topbar';
import Explore from './components/Explore';
import Clubs, { RoleManagerModal } from './components/Clubs';
import Passes from './components/Passes';
import Organizer from './components/Organizer';
import HostStudio from './components/HostStudio';
import EventDrawer from './components/EventDrawer';
import CertificateModal from './components/Certificate';
import { PostModal } from './components/Posts';
import { ConfirmDialog, ToastStack } from './components/Overlays';
import { Icon } from './components/UI';
import { t } from './lib/labels';

const TAB_ICONS: Record<string, string> = {
  explore: 'compass',
  clubs: 'users',
  studio: 'plus',
  passes: 'ticket',
  organizer: 'shield',
};

function MobileNav() {
  const app = useApp();
  const passCount = app.state.tickets.filter(
    (t) => t.userId === app.persona.id && t.status !== 'cancelled',
  ).length;
  const studioBadge =
    app.persona.role === 'admin' ? app.pendingApprovals : app.managedEventsCount;
  const items = [
    { id: 'explore', label: t(app.uiLang, 'explore') },
    { id: 'clubs', label: t(app.uiLang, 'clubs') },
    { id: 'studio', label: t(app.uiLang, 'hostEvent') },
    { id: 'passes', label: t(app.uiLang, 'passes'), badge: passCount },
    { id: 'organizer', label: t(app.uiLang, 'studio'), badge: studioBadge },
  ];
  return (
    <nav className="mobile-nav" aria-label="Mini app navigation">
      {items.map((item) => (
        <button
          key={item.id}
          className={app.view === item.id ? 'is-active' : ''}
          onClick={() => {
            app.setView(item.id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <span className="mobile-nav-icon">
            <Icon name={TAB_ICONS[item.id]} size={19} />
            {Boolean(item.badge) && <b>{item.badge}</b>}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function Footer() {
  const app = useApp();
  return (
    <footer className="footer">
      <div className="footer-brand">
        <span className="brand-mark small" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
            <path d="M8 8v9a8 8 0 0 0 16 0V8" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <strong>UDEA Pulse</strong>
          <span className="mono">CAMPUS EVENT OS · BOSHLIK CAMPUS</span>
        </div>
      </div>
      <p className="footer-note">
        Boshlik Campus · 3 Boshlik Street, Yakkasaray District, Tashkent. State persists
        in <span className="mono">localStorage</span> under <span className="mono">udea_pulse_state_v1</span> &amp; Firebase Cloud.
      </p>
      <div className="footer-actions">
        <a href="https://udea.uz/" target="_blank" rel="noreferrer" className="link-btn">
          udea.uz <Icon name="external" size={12} />
        </a>
        <button className="link-btn" onClick={app.resetDemo}>
          <Icon name="refresh" size={12} /> Reset demo state
        </button>
      </div>
    </footer>
  );
}

function Shell() {
  const app = useApp();
  return (
    <div className={`app-shell ${app.mobile ? 'is-mobile' : ''}`}>
      {app.mobile && <div className="mobile-scrim" onClick={() => app.setMobile(false)} />}

      <div className={app.mobile ? 'phone-frame' : 'desktop-frame'}>
        {app.mobile && <TelegramHeader />}
        <Topbar />
        <main className="page">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={app.view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {app.view === 'explore' && <Explore />}
              {app.view === 'clubs' && <Clubs />}
              {app.view === 'passes' && <Passes />}
              {app.view === 'organizer' && <Organizer />}
              {app.view === 'studio' && <HostStudio />}
            </motion.div>
          </AnimatePresence>
        </main>
        {app.mobile ? <MobileNav /> : <Footer />}
      </div>

      <EventDrawer />
      <PostModal />
      <RoleManagerModal />
      <CertificateModal />
      <ToastStack />
      <ConfirmDialog />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
