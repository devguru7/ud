import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../lib/store';
import { springs } from '../lib/motionConfig';
import { Icon } from './UI';

export function ToastStack() {
  const app = useApp();
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      <AnimatePresence mode="popLayout">
        {app.toasts.map((t, idx) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -24, scale: 0.86, filter: 'blur(6px)' }}
            animate={{
              opacity: 1,
              y: 0,
              scale: Math.max(0.92, 1 - idx * 0.025),
              filter: 'blur(0px)',
            }}
            exit={{ opacity: 0, y: -16, scale: 0.9, filter: 'blur(4px)' }}
            transition={springs.snappy}
            className={`toast toast-${t.tone}`}
          >
            <span className="toast-icon">
              <Icon
                name={
                  t.tone === 'success' ? 'check' : t.tone === 'error' ? 'x' : t.tone === 'warn' ? 'clock' : 'bell'
                }
                size={16}
              />
            </span>
            <div className="toast-body">
              <strong>
                {t.title}
                {t.telegram && <span className="tg-chip"><Icon name="telegram" size={11} /> TELEGRAM</span>}
              </strong>
              {t.message && <p>{t.message}</p>}
            </div>
            <button className="toast-close" onClick={() => app.dismissToast(t.id)} aria-label="Dismiss notification">
              <Icon name="close" size={13} />
            </button>
            <span className="toast-progress" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ConfirmDialog() {
  const app = useApp();
  const modal = app.modal;

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') app.resolveModal(false);
      if (e.key === 'Enter') app.resolveModal(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, app]);

  return (
    <AnimatePresence>
      {modal && (
        <motion.div
          className="modal-layer"
          onClick={() => app.resolveModal(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={springs.sheet}
          >
            <div className={`modal-icon ${modal.tone === 'danger' ? 'is-danger' : ''}`}>
              <Icon name={modal.tone === 'danger' ? 'x' : 'shield'} size={22} />
            </div>
            <h2>{modal.title}</h2>
            <p>{modal.message}</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => app.resolveModal(false)}>
                {modal.cancelLabel ?? 'Cancel'}
              </button>
              <button
                className={`btn ${modal.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => app.resolveModal(true)}
                autoFocus
              >
                {modal.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
