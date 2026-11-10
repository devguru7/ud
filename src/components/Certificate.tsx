import React from 'react';
import { useApp } from '../lib/store';
import { Icon, TicketQR } from './UI';
import { ROOMS } from '../lib/seed';
import { getCertificateRoleTitle } from '../lib/logic';
import { longDate, minutesFromTime } from '../lib/utils';

export default function CertificateModal() {
  const app = useApp();
  const ticket = app.state.tickets.find((t) => t.ticketId === app.certificateTicketId);
  const event = ticket ? app.state.events.find((e) => e.id === ticket.eventId) : undefined;
  if (!ticket || !event) return null;

  const room = ROOMS.find((r) => r.id === event.roomId);
  const hours = ((minutesFromTime(event.endTime) - minutesFromTime(event.startTime)) / 60).toFixed(1);
  const verification = `https://udea.uz/verify/${ticket.qrHash}`;
  const recognizedRole = getCertificateRoleTitle(app.persona, event, app.state.clubs);

  return (
    <div className="cert-layer" onClick={app.closeCertificate}>
      <div className="cert-shell" onClick={(e) => e.stopPropagation()}>
        <div className="cert-toolbar">
          <div>
            <span className="mono subtle">OFFICIAL UDEA CO-CURRICULAR RECORD</span>
            <strong>Certificate preview ({recognizedRole})</strong>
          </div>
          <div className="cert-toolbar-actions">
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <Icon name="print" size={14} /> Print / Save as PDF
            </button>
            <button className="icon-btn" onClick={app.closeCertificate} aria-label="Close certificate">
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        <div className="certificate" id="udea-certificate">
          <div className="cert-border">
            <div className="cert-head">
              <div className="cert-brand">
                <span className="cert-emblem">
                  <svg viewBox="0 0 32 32" width="30" height="30" fill="none">
                    <path d="M8 8v9a8 8 0 0 0 16 0V8" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
                  </svg>
                </span>
                <div>
                  <strong>UNIVERSITY OF DIGITAL ECONOMICS<br />AND AGROTECHNOLOGIES</strong>
                  <span className="mono">BOSHLIK CAMPUS · TASHKENT</span>
                </div>
              </div>
              <div className="cert-partner">
                <span className="mono">IN PARTNERSHIP WITH</span>
                <strong>COVENTRY UNIVERSITY</strong>
                <span className="mono">UNITED KINGDOM</span>
              </div>
            </div>

            <div className="cert-body">
              <span className="cert-kicker mono">CERTIFICATE OF CO-CURRICULAR ACHIEVEMENT</span>
              <p className="cert-lead">This is to certify that</p>
              <h1 className="cert-name">{app.persona.name}</h1>
              <p className="cert-programme">
                {app.persona.programme ?? app.persona.department} · Student ID {app.persona.studentId}
              </p>
              <p className="cert-lead">
                served as <strong>{recognizedRole}</strong> and completed
              </p>
              <h2 className="cert-event">{event.title}</h2>
              <p className="cert-meta">
                {longDate(event.date)} · {event.startTime}–{event.endTime} · Boshlik Campus
                {room ? `, ${room.name}` : ''}
              </p>
              <div className="cert-stats">
                <div><span className="mono">VERIFIED HOURS</span><strong>{hours}h</strong></div>
                <div><span className="mono">RECOGNIZED ROLE</span><strong>{recognizedRole.toUpperCase()}</strong></div>
                <div><span className="mono">HOST</span><strong>{event.hostName}</strong></div>
                <div><span className="mono">STATUS</span><strong>✓ VERIFIED</strong></div>
              </div>
            </div>

            <div className="cert-foot">
              <div className="cert-sign">
                <span className="sign-line" />
                <strong>Dr. Nodira Karimova</strong>
                <span className="mono">DEAN OF STUDENT AFFAIRS</span>
              </div>
              <div className="cert-verify">
                <TicketQR value={verification} size={72} />
                <div>
                  <span className="mono">VERIFY THIS CERTIFICATE</span>
                  <span className="cert-serial mono">SERIAL {ticket.qrHash}</span>
                  <span className="cert-serial mono">ISSUED {longDate(new Date().toISOString().slice(0, 10))}</span>
                </div>
              </div>
              <div className="cert-sign">
                <span className="sign-line" />
                <strong>Prof. James Whitfield</strong>
                <span className="mono">COVENTRY LINK TUTOR</span>
              </div>
            </div>

            <div className="cert-footnote mono">
              UDEA PULSE · CO-CURRICULAR DIPLOMA SUPPLEMENT · VERIFY AT UDEA.UZ/VERIFY · REF {ticket.qrHash}
            </div>
          </div>
        </div>

        <p className="cert-note">
          <Icon name="print" size={13} /> The print dialog opens your system’s “Save as PDF” option — the certificate is
          formatted for A4 landscape with print-safe borders.
        </p>
      </div>
    </div>
  );
}
