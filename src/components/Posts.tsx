import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { AttachmentItem, CampusPost, PostType } from '../types';
import { ROOMS } from '../lib/seed';
import { useApp, TG_BOT } from '../lib/store';
import { copyText, dayLabel, eventSeatsLeft, isFull, relativeTime } from '../lib/utils';
import { getPrimaryRoleBadgeForUser, getUserPermissionsForClub } from '../lib/logic';
import { springs } from '../lib/motionConfig';
import { Avatar, CategoryBadge, Icon, Mono, OdometerNumber } from './UI';

const POST_TYPE_META: Record<PostType, { label: string; shortLabel: string; icon: string; badgeClass: string }> = {
  announcement: {
    label: 'Official Announcement',
    shortLabel: '📢 Announcement',
    icon: 'bell',
    badgeClass: 'post-badge-announcement',
  },
  event_promo: {
    label: 'Event Promo',
    shortLabel: '🚀 Event Promo',
    icon: 'spark',
    badgeClass: 'post-badge-promo',
  },
  event_recap: {
    label: 'Event Recap & Highlights',
    shortLabel: '🏆 Event Recap',
    icon: 'flag',
    badgeClass: 'post-badge-recap',
  },
  discussion: {
    label: 'Campus Poll & Discussion',
    shortLabel: '📊 Campus Poll',
    icon: 'users',
    badgeClass: 'post-badge-discussion',
  },
};

const COVER_BG: Record<string, string> = {
  emerald: 'radial-gradient(at 15% 15%, #059669 0%, #064E3B 55%, #022C22 100%)',
  violet: 'radial-gradient(at 80% 20%, #7C3AED 0%, #3B0764 55%, #1E1B4B 100%)',
  blueprint: 'radial-gradient(at 20% 80%, #2563EB 0%, #1E3A8A 55%, #0F172A 100%)',
  lime: 'radial-gradient(at 75% 25%, #65A30D 0%, #365314 55%, #14532D 100%)',
  sunset: 'radial-gradient(at 25% 25%, #EA580C 0%, #7C2D12 55%, #431407 100%)',
  obsidian: 'radial-gradient(at 60% 10%, #2B2F3A 0%, #12141A 60%, #090A0D 100%)',
};

export function PostCard({ post, compact = false }: { post: CampusPost; compact?: boolean }) {
  const app = useApp();
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(!compact && post.comments.length > 0);

  const club = post.clubId ? app.state.clubs.find((c) => c.id === post.clubId) : undefined;
  const linkedEvent = post.linkedEventId ? app.state.events.find((e) => e.id === post.linkedEventId) : undefined;
  const linkedRoom = linkedEvent ? ROOMS.find((r) => r.id === linkedEvent.roomId) : undefined;
  const ticket = linkedEvent ? app.myTicket(linkedEvent.id) : undefined;
  const typeMeta = POST_TYPE_META[post.type] ?? POST_TYPE_META.announcement;
  const badgeStr = (post.badgeText ?? typeMeta.label.toUpperCase()).trim();
  const hasLeadingEmoji = /^[^\w\s]/u.test(badgeStr);

  const clubPerms = club ? getUserPermissionsForClub(app.persona, club) : [];
  const canModify =
    app.persona.role === 'admin' ||
    post.authorId === app.persona.id ||
    Boolean(club && club.leadId === app.persona.id) ||
    clubPerms.includes('publish_posts');

  const totalVotes = (post.pollOptions ?? []).reduce((acc, o) => acc + o.votes, 0);

  const copyTelegramFormatted = async () => {
    const text = `📢 ${post.title}\n\n${post.body}${
      linkedEvent ? `\n\n🎟 Event: ${linkedEvent.title} (${dayLabel(linkedEvent.date)} • ${linkedEvent.startTime})` : ''
    }\n🔗 Open in UDEA Pulse: ${TG_BOT}?startapp=post_${post.id}`;
    const ok = await copyText(text);
    app.pushToast({
      tone: ok ? 'success' : 'info',
      telegram: true,
      title: 'Copied formatted Telegram post',
      message: 'Ready to paste into @udeauz_events or any faculty group chat.',
    });
  };

  return (
    <article className={`card post-card ${post.pinned ? 'is-pinned' : ''} ${compact ? 'is-compact' : ''}`}>
      <div
        className="post-banner"
        style={{ background: COVER_BG[post.coverStyle ?? 'emerald'] ?? COVER_BG.emerald }}
      >
        <div className="post-banner-top">
          <div className="post-badges">
            {post.pinned && <span className="glass-pill mono-pill">📌 PINNED</span>}
            <span className={`glass-pill mono-pill ${typeMeta.badgeClass}`}>
              {!hasLeadingEmoji && <Icon name={typeMeta.icon} size={12} />} {badgeStr}
            </span>
            {club && <span className="glass-pill mono-pill">{club.short} · BOSHLIK</span>}
            {post.telegramSynced && <span className="glass-pill mono-pill">TG SYNCED</span>}
          </div>

          <div className="post-owner-actions">
            <button
              type="button"
              className="glass-pill mono-pill post-action-pill"
              onClick={copyTelegramFormatted}
              title="Copy formatted Telegram message"
            >
              📲 Copy TG
            </button>
            {canModify && (
              <>
                <button
                  type="button"
                  className="glass-pill mono-pill post-action-pill"
                  onClick={() => app.togglePinPost(post.id)}
                >
                  {post.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  type="button"
                  className="glass-pill mono-pill post-action-pill"
                  onClick={() => app.openPostModal({ postId: post.id })}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="glass-pill mono-pill post-action-pill"
                  onClick={async () => {
                    const ok = await app.askConfirm({
                      title: 'Delete campus post?',
                      message: `“${post.title}” will be removed from the Boshlik campus feed.`,
                      confirmLabel: 'Delete Post',
                      tone: 'danger',
                    });
                    if (ok) app.deletePost(post.id);
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
        <h3 className="post-banner-title">{post.title}</h3>
      </div>

      <div className="post-body">
        <div className="post-author-row">
          <div className="post-author">
            <Avatar name={post.authorName} color={club?.color ?? '#10B981'} size={34} />
            <div>
              <div className="post-author-name">
                <strong>{post.authorName}</strong>
                <span className="badge badge-success">{post.authorRoleTitle}</span>
              </div>
              <span className="mono subtle">
                {club ? `${club.name} • ` : 'UDEA Boshlik Campus • '}
                {relativeTime(post.createdAt)}
              </span>
            </div>
          </div>
          {club && <CategoryBadge category={club.category} small />}
        </div>

        <p className="post-text">{post.body}</p>

        {post.attachments && post.attachments.length > 0 && (
          <div className="equipment-chips" style={{ marginBottom: 10 }}>
            {post.attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noreferrer"
                className="equip-chip"
                style={{ textDecoration: 'none' }}
              >
                <Icon name="paperclip" size={11} /> {att.title}
              </a>
            ))}
          </div>
        )}

        {post.recapStats && (
          <div className="post-recap-box">
            <div className="post-recap-metrics">
              <div>
                <Mono>VERIFIED ATTENDEES</Mono>
                <strong>{post.recapStats.attendedCount} Students</strong>
              </div>
              <div>
                <Mono>EVENT PHOTOS</Mono>
                <strong>{post.recapStats.photosCount} Captured</strong>
              </div>
              {post.recapStats.winnerTeam && (
                <div>
                  <Mono>TOP RECOGNITION</Mono>
                  <strong>🏆 {post.recapStats.winnerTeam}</strong>
                </div>
              )}
            </div>
            {post.recapStats.highlights.length > 0 && (
              <ul className="post-recap-highlights">
                {post.recapStats.highlights.map((h, i) => (
                  <li key={i}>
                    <Icon name="check" size={13} /> {h}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {post.pollOptions && post.pollOptions.length > 0 && (
          <div className="post-poll">
            <div className="post-poll-head">
              <Mono>LIVE CAMPUS POLL • TAP TO VOTE</Mono>
              <Mono><OdometerNumber value={totalVotes} /> VOTES</Mono>
            </div>
            <div className="post-poll-options">
              {post.pollOptions.map((opt) => {
                const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    className={`poll-option ${opt.votedByMe ? 'is-voted' : ''}`}
                    onClick={() => app.votePostPoll(post.id, opt.id)}
                  >
                    <motion.span
                      className="poll-bar"
                      initial={false}
                      animate={{ width: `${percent}%` }}
                      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    />
                    <span className="poll-option-label">
                      {opt.votedByMe && <Icon name="check" size={13} />}
                      {opt.text}
                    </span>
                    <Mono className="poll-option-pct">
                      {percent}% (<OdometerNumber value={opt.votes} />)
                    </Mono>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {linkedEvent && (
          <div className="post-linked-event">
            <div
              className="post-linked-info"
              onClick={() => app.openEvent(linkedEvent.id)}
              role="button"
              tabIndex={0}
            >
              <div className="post-linked-kicker">
                <Mono>LINKED BOSHLIK EVENT</Mono>
                <CategoryBadge category={linkedEvent.category} small />
              </div>
              <h4>{linkedEvent.title}</h4>
              <div className="post-linked-meta mono">
                <span>{dayLabel(linkedEvent.date)} • {linkedEvent.startTime}–{linkedEvent.endTime}</span>
                <span>•</span>
                <span>{linkedRoom?.name ?? 'Boshlik Campus'}</span>
                <span>•</span>
                <span>{linkedEvent.registeredCount}/{linkedEvent.capacity} SEATS</span>
              </div>
            </div>
            <div className="post-linked-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => app.openEvent(linkedEvent.id)}
              >
                Details
              </button>
              {!linkedEvent.past && (
                <button
                  type="button"
                  className={`btn btn-sm ${ticket ? 'btn-violet' : isFull(linkedEvent) ? 'btn-warn' : 'btn-primary'}`}
                  onClick={() => (ticket ? app.setView('passes') : app.rsvp(linkedEvent.id))}
                >
                  <Icon name={ticket ? 'qr' : 'ticket'} size={14} />
                  <span>
                    {ticket
                      ? ticket.status === 'waitlisted'
                        ? `Waitlist #${ticket.waitlistPosition}`
                        : '✓ Pass Ready'
                      : isFull(linkedEvent)
                        ? 'Join Waitlist'
                        : `1-Click RSVP (${eventSeatsLeft(linkedEvent)} left)`}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="post-footer">
          <div className="post-reactions">
            <button
              type="button"
              className={`reaction-pill ${post.reactions.myReactions.includes('fire') ? 'is-active' : ''}`}
              onClick={() => app.togglePostReaction(post.id, 'fire')}
            >
              🔥 <Mono><OdometerNumber value={post.reactions.fire} /></Mono>
            </button>
            <button
              type="button"
              className={`reaction-pill ${post.reactions.myReactions.includes('heart') ? 'is-active' : ''}`}
              onClick={() => app.togglePostReaction(post.id, 'heart')}
            >
              ❤️ <Mono><OdometerNumber value={post.reactions.heart} /></Mono>
            </button>
            <button
              type="button"
              className={`reaction-pill ${post.reactions.myReactions.includes('rocket') ? 'is-active' : ''}`}
              onClick={() => app.togglePostReaction(post.id, 'rocket')}
            >
              🚀 <Mono><OdometerNumber value={post.reactions.rocket} /></Mono>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-xs"
            onClick={() => setShowComments((v) => !v)}
          >
            💬 {post.comments.length} {post.comments.length === 1 ? 'Comment' : 'Comments'}
          </button>
        </div>

        {showComments && (
          <div className="post-comments">
            {post.comments.length > 0 && (
              <div className="post-comment-list">
                {post.comments.map((c) => (
                  <div key={c.id} className="post-comment-item">
                    <Avatar name={c.authorName} size={26} />
                    <div className="post-comment-bubble">
                      <div className="post-comment-head">
                        <strong>{c.authorName}</strong>
                        {c.authorRoleTitle && (
                          <span className="badge badge-sm badge-success">{c.authorRoleTitle}</span>
                        )}
                        <span className="mono subtle">{c.authorProgramme} • {relativeTime(c.createdAt)}</span>
                        {(canModify || c.authorId === app.persona.id) && (
                          <button
                            type="button"
                            className="link-btn danger-text"
                            onClick={() => app.deletePostComment(post.id, c.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p>{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form
              className="post-comment-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!commentText.trim()) return;
                app.addPostComment(post.id, commentText);
                setCommentText('');
              }}
            >
              <input
                placeholder={`Reply as ${app.persona.name}…`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Reply
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

export function PostModal() {
  const app = useApp();
  const modalCfg = app.activePostModal;

  const existing = modalCfg?.postId
    ? app.state.posts.find((p) => p.id === modalCfg.postId)
    : undefined;

  const roleBadge = getPrimaryRoleBadgeForUser(app.persona, app.state.clubs);

  const [type, setType] = useState<PostType>('announcement');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [clubId, setClubId] = useState<string>('');
  const [linkedEventId, setLinkedEventId] = useState<string>('');
  const [coverStyle, setCoverStyle] = useState<string>('emerald');
  const [badgeText, setBadgeText] = useState('');
  const [pinned, setPinned] = useState(false);
  const [telegramSynced, setTelegramSynced] = useState(true);
  const [attTitle, setAttTitle] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [pollOpts, setPollOpts] = useState<string[]>([
    'Payme & Click Merchant API Deep-Dive',
    'IFRS & ACCA F3 Audit Case Study',
    'Python & LangChain RAG Agents Workshop',
  ]);
  const [attendedCount, setAttendedCount] = useState(48);
  const [photosCount, setPhotosCount] = useState(24);
  const [winnerTeam, setWinnerTeam] = useState('');
  const [highlightsText, setHighlightsText] = useState(
    'Verified QR attendance recorded on Boshlik Campus\nKeynote deck & code notebooks shared in @udeauz_events',
  );

  useEffect(() => {
    if (!modalCfg) return;
    if (existing) {
      setType(existing.type);
      setTitle(existing.title);
      setBody(existing.body);
      setClubId(existing.clubId ?? '');
      setLinkedEventId(existing.linkedEventId ?? '');
      setCoverStyle(existing.coverStyle ?? 'emerald');
      setBadgeText(existing.badgeText ?? '');
      setPinned(Boolean(existing.pinned));
      setTelegramSynced(existing.telegramSynced !== false);
      setAttachments(existing.attachments ?? []);
      if (existing.pollOptions && existing.pollOptions.length > 0) {
        setPollOpts(existing.pollOptions.map((o) => o.text));
      }
      if (existing.recapStats) {
        setAttendedCount(existing.recapStats.attendedCount);
        setPhotosCount(existing.recapStats.photosCount);
        setWinnerTeam(existing.recapStats.winnerTeam ?? '');
        setHighlightsText(existing.recapStats.highlights.join('\n'));
      }
    } else {
      const defType = modalCfg.defaultType ?? 'announcement';
      const defClub =
        modalCfg.defaultClubId ??
        roleBadge?.clubId ??
        app.persona.clubId ??
        'club_fintech';
      const defEvent = modalCfg.defaultEventId ?? '';
      setType(defType);
      setClubId(defClub);
      setLinkedEventId(defEvent);
      setCoverStyle(defType === 'event_recap' ? 'violet' : defType === 'event_promo' ? 'emerald' : 'blueprint');
      setBadgeText(
        defType === 'event_recap'
          ? 'EVENT RECAP'
          : defType === 'event_promo'
            ? 'EVENT PROMO'
            : defType === 'discussion'
              ? 'CAMPUS POLL'
              : 'OFFICIAL UPDATE',
      );
      setPinned(false);
      setTelegramSynced(true);
      setAttachments([]);

      if (defEvent) {
        const ev = app.state.events.find((e) => e.id === defEvent);
        if (ev) {
          setTitle(
            defType === 'event_recap'
              ? `Recap & Highlights: ${ev.title}`
              : `Seats Open: ${ev.title}`,
          );
          setBody(
            defType === 'event_recap'
              ? `Thank you to everyone who joined ${ev.title} at UDEA Boshlik Campus! Check out key takeaways and claim your verified attendance certificate in My Passes.`
              : `${ev.subtitle} Reserve your QR pass below for instant entry at Boshlik Campus.`,
          );
        }
      } else {
        setTitle('');
        setBody('');
      }
    }
  }, [modalCfg, existing]);

  if (!modalCfg) return null;

  const selectedEvent = linkedEventId ? app.state.events.find((e) => e.id === linkedEventId) : undefined;
  const selectedClub = clubId ? app.state.clubs.find((c) => c.id === clubId) : undefined;
  const authorRoleTitle =
    roleBadge?.title ??
    (app.persona.role === 'admin'
      ? 'Campus Admin'
      : app.persona.role === 'club_lead'
        ? 'Club President'
        : 'Student Host');

  const autoWriteTemplate = () => {
    const ev = selectedEvent ?? app.state.events[0];
    const cl = selectedClub ?? app.state.clubs[0];
    if (type === 'event_promo' && ev) {
      setTitle(`🚀 ${ev.title} — RSVP Now Open`);
      setBody(
        `${ev.subtitle}\n\nJoin ${cl?.name ?? 'UDEA'} at Boshlik Campus on ${dayLabel(ev.date)} (${ev.startTime}–${ev.endTime}). Seats are limited to ${ev.capacity} participants — tap 1-Click RSVP below to get your instant QR pass!`,
      );
      setBadgeText('SEATS FILLING FAST');
    } else if (type === 'event_recap' && ev) {
      setTitle(`🏆 Recap: ${ev.title} at Boshlik Campus`);
      setBody(
        `An electric session hosted by ${cl?.name ?? 'UDEA'}! Over ${attendedCount} students checked in via QR scanner. Presentation slides, code repositories, and verified certificates are now live.`,
      );
      setBadgeText('POST-EVENT RECAP');
    } else if (type === 'discussion') {
      setTitle(`📊 ${cl?.short ?? 'Campus'} Poll: Which workshop topic should we host next Friday?`);
      setBody(
        `We are booking Lab 204 on Boshlik Campus for next Friday at 15:00. Vote below so our coordinators can prepare the lab environment and guest mentors!`,
      );
      setBadgeText('STUDENT POLL');
    } else {
      setTitle(`📢 ${cl?.name ?? 'UDEA Boshlik Campus'}: Weekly Schedule & Coordinator Update`);
      setBody(
        `Our student coordinators have opened new slots for upcoming workshops and case practices on Boshlik Campus. Connect with our team or RSVP to upcoming sessions directly in the feed.`,
      );
      setBadgeText('OFFICIAL ANNOUNCEMENT');
    }
  };

  const handleAddAttachment = () => {
    if (!attTitle.trim() || !attUrl.trim()) return;
    setAttachments((prev) => [
      ...prev,
      {
        id: `att_post_${Date.now()}`,
        title: attTitle.trim(),
        url: attUrl.trim(),
        kind: 'doc',
      },
    ]);
    setAttTitle('');
    setAttUrl('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 4 || body.trim().length < 8) {
      app.pushToast({
        tone: 'warn',
        title: 'Complete headline & body',
        message: 'Enter a clear headline and post body before publishing.',
      });
      return;
    }

    const pollOptions =
      type === 'discussion'
        ? pollOpts
            .map((t) => t.trim())
            .filter(Boolean)
            .map((text, idx) => ({
              id: existing?.pollOptions?.[idx]?.id ?? `opt_${idx + 1}_${Date.now()}`,
              text,
              votes: existing?.pollOptions?.[idx]?.votes ?? (idx === 0 ? 12 : 7),
              votedByMe: existing?.pollOptions?.[idx]?.votedByMe ?? false,
            }))
        : undefined;

    const recapStats =
      type === 'event_recap'
        ? {
            attendedCount: Math.max(1, Number(attendedCount) || 25),
            photosCount: Math.max(0, Number(photosCount) || 12),
            winnerTeam: winnerTeam.trim() || undefined,
            highlights: highlightsText
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : undefined;

    app.savePost({
      id: existing?.id,
      type,
      title: title.trim(),
      body: body.trim(),
      authorId: app.persona.id,
      authorName: app.persona.name,
      authorRoleTitle,
      clubId: clubId || undefined,
      linkedEventId: linkedEventId || undefined,
      coverStyle,
      badgeText: badgeText.trim() || undefined,
      pinned,
      attachments,
      pollOptions,
      recapStats,
      telegramSynced,
    });
    app.closePostModal();
  };

  return (
    <div className="modal-layer" onClick={app.closePostModal}>
      <div
        className="modal modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Campus Post & Telegram Studio"
      >
        <div className="panel-head">
          <div>
            <span className="mono subtle">BOSHLIK CAMPUS FEED & TELEGRAM STUDIO</span>
            <h2>{existing ? 'Edit Campus Post' : 'Publish Campus Post / Recap'}</h2>
          </div>
          <div className="feed-actions">
            <button type="button" className="btn btn-ghost btn-sm ai-copilot-btn" onClick={autoWriteTemplate}>
              <span className="ai-orb" aria-hidden="true" />
              <span className="ai-shimmer-text">Auto-Write Draft</span>
            </button>
            <button type="button" className="icon-btn sm" onClick={app.closePostModal} aria-label="Close modal">
              <Icon name="close" size={16} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="post-studio-grid">
          <div className="post-studio-form">
            <div className="field">
              <span className="field-label">Post Format</span>
              <div className="track-switch">
                {(['announcement', 'event_promo', 'event_recap', 'discussion'] as PostType[]).map((t) => {
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      className={active ? 'is-active' : ''}
                      onClick={() => setType(t)}
                    >
                      {active && (
                        <motion.span
                          layoutId="post-format-pill"
                          className="liquid-pill-bg"
                          transition={springs.liquidPill}
                        />
                      )}
                      {POST_TYPE_META[t].shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Publishing Club / Channel</span>
                <select value={clubId} onChange={(e) => setClubId(e.target.value)}>
                  <option value="">Boshlik Campus Student Community</option>
                  {app.state.clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.short})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Link Interactive Event Card (Optional)</span>
                <select value={linkedEventId} onChange={(e) => setLinkedEventId(e.target.value)}>
                  <option value="">— No linked event —</option>
                  {app.state.events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({dayLabel(ev.date)})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Headline *</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Payme FinTech Case Practice: Team Spots Open"
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Kicker Badge</span>
                <input
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g., OFFICIAL ANNOUNCEMENT"
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Post Body *</span>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share updates, agenda highlights, recap metrics, or instructions for Boshlik Campus students…"
                required
              />
            </label>

            <div className="field">
              <span className="field-label">Attach Slides, Dataset or Photo Album Link (Optional)</span>
              <div className="qa-answer-form">
                <input
                  value={attTitle}
                  onChange={(e) => setAttTitle(e.target.value)}
                  placeholder="Resource title (e.g., Keynote Slides PDF)"
                />
                <input
                  value={attUrl}
                  onChange={(e) => setAttUrl(e.target.value)}
                  placeholder="https://udea.uz/..."
                />
                <button type="button" className="btn btn-ghost btn-xs" onClick={handleAddAttachment}>
                  + Attach
                </button>
              </div>
              {attachments.length > 0 && (
                <div className="equipment-chips" style={{ marginTop: 6 }}>
                  {attachments.map((a) => (
                    <span key={a.id} className="equip-chip">
                      <Icon name="paperclip" size={11} /> {a.title}
                      <button
                        type="button"
                        className="link-btn danger-text"
                        onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {type === 'discussion' && (
              <div className="field">
                <span className="field-label">Interactive Poll Options (2–4 options)</span>
                <div className="stack-sm">
                  {pollOpts.map((opt, idx) => (
                    <div key={idx} className="suggest-row">
                      <input
                        value={opt}
                        onChange={(e) =>
                          setPollOpts((prev) => prev.map((item, i) => (i === idx ? e.target.value : item)))
                        }
                        placeholder={`Poll Option ${idx + 1}`}
                      />
                      {pollOpts.length > 2 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setPollOpts((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOpts.length < 4 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setPollOpts((prev) => [...prev, `Option ${prev.length + 1}`])}
                    >
                      + Add Poll Option
                    </button>
                  )}
                </div>
              </div>
            )}

            {type === 'event_recap' && (
              <div className="recap-editor-box">
                <Mono>EVENT RECAP METRICS & HIGHLIGHTS</Mono>
                <div className="field-row">
                  <label className="field">
                    <span className="field-label">Verified Attendees</span>
                    <input
                      type="number"
                      min={1}
                      value={attendedCount}
                      onChange={(e) => setAttendedCount(Number(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Photos Captured</span>
                    <input
                      type="number"
                      min={0}
                      value={photosCount}
                      onChange={(e) => setPhotosCount(Number(e.target.value))}
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Winner / Top Team</span>
                  <input
                    value={winnerTeam}
                    onChange={(e) => setWinnerTeam(e.target.value)}
                    placeholder="e.g., Team AlphaPay"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Key Highlights (one per line)</span>
                  <textarea
                    rows={2}
                    value={highlightsText}
                    onChange={(e) => setHighlightsText(e.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="field-row">
              <label className="field">
                <span className="field-label">Banner Theme</span>
                <select value={coverStyle} onChange={(e) => setCoverStyle(e.target.value)}>
                  <option value="emerald">Emerald Matrix</option>
                  <option value="violet">Violet Cyber Mesh</option>
                  <option value="blueprint">Royal Blueprint</option>
                  <option value="lime">Acid Lime</option>
                  <option value="sunset">Sunset Terracotta</option>
                  <option value="obsidian">Obsidian Minimal</option>
                </select>
              </label>

              <div className="field">
                <span className="field-label">Feed & Telegram Options</span>
                <div className="feed-actions">
                  <button
                    type="button"
                    className={`pill ${pinned ? 'is-active' : ''}`}
                    onClick={() => setPinned((v) => !v)}
                  >
                    📌 {pinned ? 'Pinned to Top' : 'Pin to Top'}
                  </button>
                  <button
                    type="button"
                    className={`pill ${telegramSynced ? 'is-active' : ''}`}
                    onClick={() => setTelegramSynced((v) => !v)}
                  >
                    <Icon name="telegram" size={13} /> {telegramSynced ? 'Sync to @udeauz_events' : 'Local Only'}
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={app.closePostModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Icon name="telegram" size={15} /> {existing ? 'Save Changes' : 'Publish to Feed & Telegram'}
              </button>
            </div>
          </div>

          <aside className="post-studio-preview">
            <span className="mono subtle">LIVE TELEGRAM CHANNEL PREVIEW</span>
            <div className="tg-preview">
              <div className="tg-channel">
                <span className="tg-avatar">U</span>
                <div>
                  <strong>{selectedClub?.name ?? 'UDEA Events · Boshlik'}</strong>
                  <span>@udeauz_events · Author: {app.persona.name} ({authorRoleTitle})</span>
                </div>
              </div>
              <div className="tg-bubble">
                <p className="tg-bubble-text">
                  <strong>{title || 'Your post headline will appear here…'}</strong>
                  {'\n\n'}
                  {body || 'Write your announcement or click “✨ Auto-Write Draft” above.'}
                  {selectedEvent ? `\n\n🎟 Linked Event: ${selectedEvent.title} (${dayLabel(selectedEvent.date)} · ${selectedEvent.startTime})` : ''}
                </p>
                <div className="tg-buttons">
                  <span>⚡ Open in UDEA Pulse Mini App</span>
                  {selectedEvent && <span>🎟️ 1-Click RSVP</span>}
                </div>
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
