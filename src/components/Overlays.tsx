import React, { useEffect } from 'react';
import { useApp } from '../lib/store';
import { Icon } from './UI';

export function ToastStack() {
  const app = useApp();
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {app.toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
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
        </div>
      ))}
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

  if (!modal) return null;

  return (
    <div className="modal-layer" onClick={() => app.resolveModal(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
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
      </div>
    </div>
  );
}
