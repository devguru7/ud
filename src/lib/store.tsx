import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  Broadcast,
  CampusPost,
  Category,
  Club,
  ClubMemberAssignment,
  CustomClubRole,
  EventDraft,
  EventItem,
  EventTeamMember,
  ExploreFeedMode,
  Filters,
  PersistedState,
  Person,
  Persona,
  Ticket,
} from '../types';
import {
  buildSeedClubs,
  buildSeedEvents,
  buildSeedPosts,
  buildSeedTickets,
  PERSONAS,
  ROOMS,
} from './seed';
import {
  isFull,
  isoDate,
  randomHash,
  randomTicketId,
  buildICS,
  downloadFile,
  minutesFromTime,
} from './utils';
import {
  canManage,
  findRoomConflicts,
  getPrimaryRoleBadgeForUser,
  getUserPermissionsForClub,
  getUserRoleInClub,
} from './logic';

export const STORAGE_KEY = 'udea_pulse_state_v1';
export const TG_BOT = 'https://t.me/udea_pulse_bot/app';

export type ToastTone = 'success' | 'info' | 'warn' | 'error';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
  telegram?: boolean;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

interface ModalState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export type Result = { ok: boolean; message: string; id?: string };

const defaultFilters: Filters = {
  date: null,
  track: 'all',
  category: 'all',
  campus: 'all',
  zone: 'all',
  language: 'all',
  search: '',
};

const ROOM_MIGRATION_MAP: Record<string, string> = {
  rm_boshlik_hall: 'rm_a1',
  rm_boshlik_lab: 'rm_lab2',
  rm_boshlik_204: 'rm_204',
  rm_boshlik_lrc: 'rm_lrc',
  rm_boshlik_sports: 'rm_sports',
  rm_mukimi_atrium: 'rm_a1',
  rm_mukimi_a1: 'rm_a1',
  rm_mukimi_lab2: 'rm_lab2',
  rm_mukimi_cowork: 'rm_lrc',
};

function initialState(): PersistedState {
  return {
    version: 3,
    theme: 'light',
    personaId: 'usr_1',
    followedClubs: ['club_fintech', 'club_acca', 'club_debate'],
    clubs: buildSeedClubs(),
    events: buildSeedEvents(),
    posts: buildSeedPosts(),
    tickets: buildSeedTickets(),
    filters: { ...defaultFilters },
    broadcasts: [],
    createdEventIds: [],
  };
}

function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || !Array.isArray(parsed.events) || parsed.events.length === 0) return initialState();
    if ((parsed.version ?? 1) < 3) return initialState();

    const migratedEvents = parsed.events.map((e) => {
      const roomId = ROOM_MIGRATION_MAP[e.roomId] ?? e.roomId;
      return {
        ...e,
        campus: (e.campus === 'Online' ? 'Online' : 'Boshlik') as 'Boshlik' | 'Online',
        roomId: ROOMS.some((r) => r.id === roomId) ? roomId : 'rm_a1',
        teamMembers: Array.isArray(e.teamMembers) ? e.teamMembers : [],
        coHostClubIds: Array.isArray(e.coHostClubIds) ? e.coHostClubIds : [],
      };
    });

    const filters: Filters = {
      ...defaultFilters,
      ...(parsed.filters || {}),
      zone: parsed.filters?.zone ?? 'all',
    };
    if (!['all', 'Boshlik', 'Online'].includes(filters.campus)) filters.campus = 'all';

    return {
      ...initialState(),
      ...parsed,
      version: 3,
      clubs: Array.isArray(parsed.clubs) && parsed.clubs.length > 0 ? parsed.clubs : buildSeedClubs(),
      events: migratedEvents,
      posts: Array.isArray(parsed.posts) && parsed.posts.length > 0 ? parsed.posts : buildSeedPosts(),
      filters,
      tickets: Array.isArray(parsed.tickets) ? parsed.tickets : buildSeedTickets(),
      broadcasts: Array.isArray(parsed.broadcasts) ? parsed.broadcasts : [],
    };
  } catch {
    return initialState();
  }
}

function selfAttendee(persona: Persona): Person {
  return {
    id: `att_${persona.id}`,
    name: persona.name,
    programme: persona.programme ?? persona.department ?? 'UDEA Staff',
    programmeShort: persona.programmeShort ?? 'Staff',
    telegram: persona.telegram,
    color: persona.color,
    lookingForTeam: false,
    teamRole: '',
    self: true,
  };
}

export interface PostModalState {
  postId?: string;
  defaultEventId?: string;
  defaultClubId?: string;
  defaultType?: CampusPost['type'];
}

interface AppContextValue {
  state: PersistedState;
  persona: Persona;
  personas: Persona[];
  theme: 'light' | 'dark';
  view: string;
  setView: (view: string) => void;
  exploreMode: ExploreFeedMode;
  setExploreMode: (mode: ExploreFeedMode) => void;
  mobile: boolean;
  setMobile: (on: boolean) => void;
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  modal: ModalState | null;
  askConfirm: (options: ConfirmOptions) => Promise<boolean>;
  resolveModal: (value: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setPersona: (id: string) => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  resetDemo: () => void;
  drawerEventId: string | null;
  openEvent: (id: string) => void;
  closeEvent: () => void;
  editingEventId: string | null;
  openEditEvent: (eventId: string) => void;
  clearEditingEvent: () => void;
  activePostModal: PostModalState | null;
  openPostModal: (opts?: PostModalState) => void;
  closePostModal: () => void;
  roleModalClubId: string | null;
  openRoleModal: (clubId: string) => void;
  closeRoleModal: () => void;
  myTicket: (eventId: string) => Ticket | undefined;
  rsvp: (eventId: string, screeningAnswer?: string) => void;
  cancelTicket: (ticketId: string) => void;
  confirmAttendance: (ticketId: string) => void;
  releaseSpot: (ticketId: string) => void;
  setTeamOptIn: (ticketId: string, on: boolean, tag: string) => void;
  addQuestion: (eventId: string, text: string) => void;
  upvote: (eventId: string, questionId: string) => void;
  answerQuestion: (eventId: string, questionId: string, answer: string) => void;
  updateEventCapacity: (eventId: string, capacity: number) => void;
  approveEvent: (eventId: string) => void;
  rejectEvent: (eventId: string, suggestedRoomId?: string) => void;
  checkInPerson: (eventId: string, personId: string) => void;
  undoCheckIn: (eventId: string, personId: string) => void;
  approveScreeningTicket: (ticketId: string) => void;
  broadcast: (eventId: string, text: string) => void;
  followClub: (clubId: string) => void;
  exportICS: (eventId: string) => void;
  downloadEventICS: (event: EventItem) => void;
  createEvent: (draft: EventDraft) => Result;
  updateEvent: (eventId: string, draft: EventDraft) => Result;
  addEventTeamMember: (eventId: string, member: EventTeamMember) => void;
  removeEventTeamMember: (eventId: string, userId: string) => void;
  createClubRole: (clubId: string, role: Omit<CustomClubRole, 'id' | 'clubId'>) => void;
  updateClubRole: (clubId: string, role: CustomClubRole) => void;
  deleteClubRole: (clubId: string, roleId: string) => void;
  assignClubMember: (
    clubId: string,
    payload: Omit<ClubMemberAssignment, 'id' | 'clubId' | 'assignedBy' | 'assignedAt'>,
  ) => void;
  removeClubMember: (clubId: string, assignmentId: string) => void;
  savePost: (
    post: Omit<CampusPost, 'id' | 'createdAt' | 'reactions' | 'comments'> & { id?: string },
  ) => CampusPost;
  deletePost: (postId: string) => void;
  togglePinPost: (postId: string) => void;
  togglePostReaction: (postId: string, kind: 'fire' | 'heart' | 'rocket') => void;
  votePostPoll: (postId: string, optionId: string) => void;
  addPostComment: (postId: string, text: string) => void;
  certificateTicketId: string | null;
  openCertificate: (ticketId: string) => void;
  closeCertificate: () => void;
  organizerEventId: string | null;
  openOrganizer: (eventId: string) => void;
  categoryCounts: Record<Category, number>;
  pendingApprovals: number;
  managedEventsCount: number;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadState);
  const [view, setView] = useState<string>('explore');
  const [exploreMode, setExploreMode] = useState<ExploreFeedMode>('combined');
  const [mobile, setMobile] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [drawerEventId, setDrawerEventId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [activePostModal, setActivePostModal] = useState<PostModalState | null>(null);
  const [roleModalClubId, setRoleModalClubId] = useState<string | null>(null);
  const [certificateTicketId, setCertificateTicketId] = useState<string | null>(null);
  const [organizerEventId, setOrganizerEventId] = useState<string | null>(null);
  const timers = useRef<Record<string, number>>({});

  const persona = useMemo(
    () => PERSONAS.find((p) => p.id === state.personaId) ?? PERSONAS[0],
    [state.personaId],
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.theme === 'dark' ? '#090A0D' : '#F6F5F2');
  }, [state.theme]);

  // Fix #4: Lock document.body.style.overflow = 'hidden' whenever a drawer or modal is open
  const anyOverlayOpen = Boolean(
    drawerEventId || certificateTicketId || activePostModal || roleModalClubId || modal,
  );
  useEffect(() => {
    if (anyOverlayOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow || '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [anyOverlayOpen]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      window.clearTimeout(timer);
      delete timers.current[id];
    }
  };

  const pushToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    timers.current[id] = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timers.current[id];
    }, 5400);
  };

  const askConfirm = (options: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      setModal({ ...options, resolve });
    });

  const resolveModal = (value: boolean) => {
    setModal((current) => {
      current?.resolve(value);
      return null;
    });
  };

  const setTheme = (theme: 'light' | 'dark') => setState((prev) => ({ ...prev, theme }));

  const toggleTheme = () =>
    setState((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }));

  const setPersona = (id: string) => {
    const next = PERSONAS.find((p) => p.id === id);
    if (!next || next.id === state.personaId) return;
    setState((prev) => ({ ...prev, personaId: id }));
    const customBadge = getPrimaryRoleBadgeForUser(next, state.clubs);
    const permission =
      next.role === 'admin'
        ? 'Campus Admin: Approve Boshlik room requests, manage all club roles, pin global posts & scan any event.'
        : next.role === 'club_lead'
          ? 'Club President: Full Role Architect access, instant official event publishing, posts & scanner.'
          : customBadge
            ? `Delegated Role (${customBadge.title} in ${customBadge.clubShort}): Host Studio, Post Studio & QR Scanner unlocked.`
            : 'Regular Student view: 1-Click RSVP, Team Finder, Campus Poll voting, QR Passes & Certificates.';
    pushToast({
      tone: 'info',
      title: `Switched to ${next.name}`,
      message: permission,
    });
  };

  const setFilters = (patch: Partial<Filters>) =>
    setState((prev) => ({ ...prev, filters: { ...prev.filters, ...patch } }));

  const resetFilters = () => setState((prev) => ({ ...prev, filters: { ...defaultFilters } }));

  const resetDemo = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setState(initialState());
    setView('explore');
    setExploreMode('combined');
    setMobile(false);
    setDrawerEventId(null);
    setEditingEventId(null);
    setActivePostModal(null);
    setRoleModalClubId(null);
    setCertificateTicketId(null);
    setOrganizerEventId(null);
    setToasts([]);
    pushToast({
      tone: 'success',
      title: 'Demo state reset to v3.0',
      message: 'Boshlik rooms, delegated club roles, campus posts, tickets and approvals restored.',
    });
  };

  const openEvent = (id: string) => {
    setDrawerEventId(id);
    setCertificateTicketId(null);
  };
  const closeEvent = () => setDrawerEventId(null);

  const openEditEvent = (eventId: string) => {
    setEditingEventId(eventId);
    setDrawerEventId(null);
    setView('studio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const clearEditingEvent = () => setEditingEventId(null);

  const openPostModal = (opts: PostModalState = {}) => {
    setActivePostModal(opts);
  };
  const closePostModal = () => setActivePostModal(null);

  const openRoleModal = (clubId: string) => setRoleModalClubId(clubId);
  const closeRoleModal = () => setRoleModalClubId(null);

  const myTicket = (eventId: string): Ticket | undefined =>
    state.tickets.find(
      (t) => t.eventId === eventId && t.userId === persona.id && t.status !== 'cancelled',
    );

  const rsvp = (eventId: string, screeningAnswer?: string) => {
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;
    if (myTicket(eventId)) {
      pushToast({
        tone: 'info',
        title: 'You already hold a pass',
        message: 'Open My QR Passes to show the ticket or to release your seat.',
      });
      return;
    }

    if (event.registrationMode === 'external_link') {
      const ticket: Ticket = {
        ticketId: randomTicketId(),
        eventId,
        userId: persona.id,
        status: 'external_saved',
        qrHash: randomHash('UDEA-EXT'),
        confirmedAttendance4h: false,
        lookingForTeam: false,
        teamSkillTag: '',
        issuedAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        tickets: [...prev.tickets, ticket],
        events: prev.events.map((e) =>
          e.id === eventId ? { ...e, registeredCount: e.registeredCount + 1 } : e,
        ),
      }));
      const url = event.externalUrl ?? 'https://udea.uz/';
      pushToast({
        tone: 'success',
        telegram: true,
        title: 'Partner registration tracked',
        message: `Saved ${url.replace(/^https?:\/\//, '')} to your passes. Telegram reminder scheduled 4h before.`,
      });
      return;
    }

    if (isFull(event)) {
      if (!event.waitlistEnabled) {
        pushToast({
          tone: 'error',
          title: 'This event is full',
          message: 'The host did not enable a waitlist. Follow the club to hear about the next edition.',
        });
        return;
      }
      const position = event.waitlistCount + 1;
      const ticket: Ticket = {
        ticketId: randomTicketId(),
        eventId,
        userId: persona.id,
        status: 'waitlisted',
        waitlistPosition: position,
        qrHash: randomHash('UDEA-WL'),
        confirmedAttendance4h: false,
        lookingForTeam: false,
        teamSkillTag: '',
        screeningAnswer,
        issuedAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        tickets: [...prev.tickets, ticket],
        events: prev.events.map((e) =>
          e.id === eventId ? { ...e, waitlistCount: e.waitlistCount + 1 } : e,
        ),
      }));
      pushToast({
        tone: 'warn',
        telegram: true,
        title: `Waitlist #${position} secured`,
        message: `You are #${position} for “${event.title}”. The bot promotes you automatically if a seat frees up.`,
      });
      return;
    }

    const seat = event.registeredCount + 1;
    const ticket: Ticket = {
      ticketId: randomTicketId(),
      eventId,
      userId: persona.id,
      status: 'confirmed',
      seatNumber: seat,
      qrHash: randomHash(),
      confirmedAttendance4h: false,
      lookingForTeam: false,
      teamSkillTag: '',
      screeningAnswer,
      screeningStatus: event.registrationMode === 'internal_screening' ? 'pending' : undefined,
      issuedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      tickets: [...prev.tickets, ticket],
      events: prev.events.map((e) => {
        if (e.id !== eventId) return e;
        const alreadyListed = e.attendees.some((a) => a.id === `att_${persona.id}`);
        return {
          ...e,
          registeredCount: e.registeredCount + 1,
          attendees: alreadyListed ? e.attendees : [...e.attendees, selfAttendee(persona)],
        };
      }),
    }));

    if (event.registrationMode === 'internal_screening') {
      pushToast({
        tone: 'success',
        telegram: true,
        title: 'Application received — seat held',
        message: 'The host reviews your screening answer. Your QR pass activates after approval.',
      });
    } else {
      pushToast({
        tone: 'success',
        telegram: true,
        title: `Seat #${seat} confirmed`,
        message: `Holographic QR pass generated for “${event.title}”. Telegram reminder set for 4h before.`,
      });
    }
  };

  const cancelTicket = (ticketId: string) => {
    const ticket = state.tickets.find((t) => t.ticketId === ticketId);
    if (!ticket) return;
    const event = state.events.find((e) => e.id === ticket.eventId);
    if (!event) return;
    const wasConfirmed = ticket.status === 'confirmed' || ticket.status === 'checked_in';
    const promoted =
      wasConfirmed && event.registeredCount >= event.capacity && event.waitlistRoster.length > 0
        ? event.waitlistRoster[0]
        : undefined;

    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) =>
        t.ticketId === ticketId ? { ...t, status: 'cancelled' } : t,
      ),
      events: prev.events.map((e) => {
        if (e.id !== ticket.eventId) return e;
        const next: EventItem = { ...e };
        if (wasConfirmed) {
          next.registeredCount = Math.max(0, e.registeredCount - 1);
          next.attendees = e.attendees.filter((a) => a.id !== `att_${ticket.userId}`);
          const checkIns = { ...e.checkIns };
          delete checkIns[`att_${ticket.userId}`];
          next.checkIns = checkIns;
          if (promoted) {
            next.registeredCount += 1;
            next.waitlistCount = Math.max(0, e.waitlistCount - 1);
            next.waitlistRoster = e.waitlistRoster.slice(1);
            next.attendees = [
              ...next.attendees,
              {
                id: promoted.id,
                name: promoted.name,
                programme: promoted.programme,
                programmeShort: promoted.programmeShort,
                telegram: promoted.telegram,
                color: '#10B981',
              },
            ];
          }
        } else if (ticket.status === 'waitlisted') {
          next.waitlistCount = Math.max(0, e.waitlistCount - 1);
        }
        return next;
      }),
    }));

    if (promoted) {
      pushToast({
        tone: 'success',
        telegram: true,
        title: 'Waitlist promotion sent',
        message: `${promoted.name} was moved from waitlist #1 to a confirmed seat. Telegram notification delivered.`,
      });
    } else {
      pushToast({
        tone: 'info',
        title: wasConfirmed ? 'Seat released' : 'Waitlist place released',
        message: wasConfirmed
          ? 'Your QR pass is cancelled. No waitlisted student was pending for this event.'
          : 'You left the waitlist. You can rejoin at any time.',
      });
    }
  };

  const confirmAttendance = (ticketId: string) => {
    const ticket = state.tickets.find((t) => t.ticketId === ticketId);
    const event = ticket ? state.events.find((e) => e.id === ticket.eventId) : undefined;
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) =>
        t.ticketId === ticketId ? { ...t, confirmedAttendance4h: true } : t,
      ),
    }));
    pushToast({
      tone: 'success',
      telegram: true,
      title: 'Attendance confirmed',
      message: event
        ? `Your seat for “${event.title}” is locked. Door check-in opens 30 minutes before ${event.startTime}.`
        : 'Your seat is locked.',
    });
  };

  const releaseSpot = (ticketId: string) => cancelTicket(ticketId);

  const setTeamOptIn = (ticketId: string, on: boolean, tag: string) => {
    const ticket = state.tickets.find((t) => t.ticketId === ticketId);
    if (!ticket) return;
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) =>
        t.ticketId === ticketId ? { ...t, lookingForTeam: on, teamSkillTag: tag } : t,
      ),
      events: prev.events.map((e) =>
        e.id !== ticket.eventId
          ? e
          : {
              ...e,
              attendees: e.attendees.map((a) =>
                a.id === `att_${ticket.userId}`
                  ? { ...a, lookingForTeam: on, teamRole: on ? tag : '' }
                  : a,
              ),
            },
      ),
    }));
    pushToast({
      tone: on ? 'success' : 'info',
      title: on ? 'Team finder is on' : 'Team finder off',
      message: on
        ? `Classmates can now see you are looking for a team${tag ? ` as “${tag}”` : ''}.`
        : 'You are hidden from the teammate matchmaker.',
    });
  };

  const addQuestion = (eventId: string, text: string) => {
    if (!text.trim()) return;
    const question = {
      id: `q_${Date.now()}`,
      userId: persona.id,
      author: persona.name,
      programme: persona.programmeShort ?? 'Staff',
      text: text.trim(),
      upvotes: 1,
      upvotedByMe: true,
      timestamp: new Date().toISOString(),
      answered: false,
    };
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId ? { ...e, questions: [question, ...e.questions] } : e,
      ),
    }));
    pushToast({
      tone: 'success',
      title: 'Question submitted',
      message: 'It is live on the board. The speaker sees the highest-upvoted questions first.',
    });
  };

  const upvote = (eventId: string, questionId: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id !== eventId
          ? e
          : {
              ...e,
              questions: e.questions.map((q) =>
                q.id === questionId
                  ? {
                      ...q,
                      upvotes: q.upvotes + (q.upvotedByMe ? -1 : 1),
                      upvotedByMe: !q.upvotedByMe,
                    }
                  : q,
              ),
            },
      ),
    }));
  };

  const answerQuestion = (eventId: string, questionId: string, answer: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id !== eventId
          ? e
          : {
              ...e,
              questions: e.questions.map((q) =>
                q.id === questionId
                  ? { ...q, answered: true, answerText: answer.trim() || 'Answered live in the room.' }
                  : q,
              ),
            },
      ),
    }));
    pushToast({ tone: 'success', title: 'Answer pinned', message: 'Students see “Answered by Speaker” on the board.' });
  };

  const updateEventCapacity = (eventId: string, capacity: number) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId ? { ...e, capacity: Math.max(capacity, e.registeredCount, 2) } : e,
      ),
    }));
  };

  const approveEvent = (eventId: string) => {
    const event = state.events.find((e) => e.id === eventId);
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId ? { ...e, approvalStatus: 'approved' } : e,
      ),
    }));
    pushToast({
      tone: 'success',
      telegram: true,
      title: 'Approved & auto-posted',
      message: event
        ? `“${event.title}” is live on the Explore feed and announced to @udeauz_events.`
        : 'Event approved.',
    });
  };

  const rejectEvent = (eventId: string, suggestedRoomId?: string) => {
    const event = state.events.find((e) => e.id === eventId);
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id !== eventId) return e;
        if (suggestedRoomId) return { ...e, roomId: suggestedRoomId };
        return { ...e, approvalStatus: 'rejected' };
      }),
    }));
    pushToast({
      tone: suggestedRoomId ? 'warn' : 'error',
      telegram: true,
      title: suggestedRoomId ? 'Room suggestion sent' : 'Request rejected',
      message: suggestedRoomId
        ? `The organiser can re-submit “${event?.title ?? 'the event'}” with the suggested Boshlik room.`
        : `“${event?.title ?? 'The event'}” was declined; the organiser has been notified on Telegram.`,
    });
  };

  const checkInPerson = (eventId: string, personId: string) => {
    const timestamp = new Date().toISOString();
    const userId = personId.startsWith('att_') ? personId.slice(4) : null;
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId ? { ...e, checkIns: { ...e.checkIns, [personId]: timestamp } } : e,
      ),
      tickets: prev.tickets.map((t) =>
        userId && t.eventId === eventId && t.userId === userId && t.status !== 'cancelled'
          ? { ...t, status: 'checked_in', checkedInAt: timestamp }
          : t,
      ),
    }));
    const person = state.events.find((e) => e.id === eventId)?.attendees.find((a) => a.id === personId);
    pushToast({
      tone: 'success',
      title: `${person?.name ?? 'Guest'} checked in`,
      message: 'Cached pass validated offline and synced to the attendance log.',
    });
  };

  const undoCheckIn = (eventId: string, personId: string) => {
    const userId = personId.startsWith('att_') ? personId.slice(4) : null;
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id !== eventId) return e;
        const checkIns = { ...e.checkIns };
        delete checkIns[personId];
        return { ...e, checkIns };
      }),
      tickets: prev.tickets.map((t) =>
        userId &&
        t.eventId === eventId &&
        t.userId === userId &&
        t.status === 'checked_in'
          ? { ...t, status: 'confirmed', checkedInAt: undefined }
          : t,
      ),
    }));
    pushToast({ tone: 'info', title: 'Check-in undone', message: 'The guest is back on the not-arrived list.' });
  };

  const approveScreeningTicket = (ticketId: string) => {
    const tkt = state.tickets.find((t) => t.ticketId === ticketId);
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) =>
        t.ticketId === ticketId ? { ...t, screeningStatus: 'approved' } : t,
      ),
    }));
    const p = PERSONAS.find((x) => x.id === tkt?.userId);
    pushToast({
      tone: 'success',
      telegram: true,
      title: 'Application approved',
      message: `${p?.name ?? 'The student'} received a confirmed QR pass on Telegram.`,
    });
  };

  const broadcast = (eventId: string, text: string) => {
    if (!text.trim()) return;
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;
    const record: Broadcast = {
      id: `bc_${Date.now()}`,
      eventId,
      text: text.trim(),
      at: new Date().toISOString(),
      recipients: event.registeredCount,
    };
    setState((prev) => ({ ...prev, broadcasts: [record, ...prev.broadcasts] }));
    pushToast({
      tone: 'success',
      telegram: true,
      title: `Broadcast sent to ${event.registeredCount} attendees`,
      message: `@udea_pulse_bot · “${record.text}”`,
    });
  };

  const followClub = (clubId: string) => {
    const following = state.followedClubs.includes(clubId);
    setState((prev) => ({
      ...prev,
      followedClubs: following
        ? prev.followedClubs.filter((id) => id !== clubId)
        : [...prev.followedClubs, clubId],
    }));
    pushToast({
      tone: following ? 'info' : 'success',
      title: following ? 'Unfollowed club' : 'Following club',
      message: following
        ? 'You will stop receiving Telegram announcements from this club.'
        : 'Every new event and post from this club now pings your Telegram.',
    });
  };

  const downloadEventICS = (event: EventItem) => {
    const room = ROOMS.find((r) => r.id === event.roomId);
    downloadFile(`${event.id}.ics`, buildICS(event, room), 'text/calendar;charset=utf-8');
    pushToast({
      tone: 'success',
      title: '.ics calendar file downloaded',
      message: 'Open it to add the event to Google Calendar, Apple Calendar or Outlook.',
    });
  };

  const exportICS = (eventId: string) => {
    const event = state.events.find((e) => e.id === eventId);
    if (event) downloadEventICS(event);
  };

  // Fix #7: Strict validation in createEvent & updateEvent
  const validateDraft = (draft: EventDraft, excludeEventId?: string): Result | null => {
    if (draft.title.trim().length < 4) {
      return { ok: false, message: 'Event title must be at least 4 characters long.' };
    }
    if (!draft.subtitle.trim()) {
      return { ok: false, message: 'Add a one-line summary for the event card.' };
    }
    if (!draft.date) {
      return { ok: false, message: 'Pick an event date.' };
    }
    const startMins = minutesFromTime(draft.startTime);
    const endMins = minutesFromTime(draft.endTime);
    if (endMins - startMins < 30) {
      return { ok: false, message: 'End time must be at least 30 minutes after start time.' };
    }
    if (!Number.isFinite(draft.capacity) || draft.capacity < 2) {
      return { ok: false, message: 'Capacity must be at least 2 seats.' };
    }
    if (!draft.roomId) {
      return { ok: false, message: 'Select a Boshlik Campus room or Online stream.' };
    }
    if (draft.registrationMode === 'external_link' && !/^https?:\/\/.+\..+/.test(draft.externalUrl)) {
      return { ok: false, message: 'Enter a valid https:// partner registration link.' };
    }
    if (draft.registrationMode === 'internal_screening' && !draft.screeningPrompt.trim()) {
      return { ok: false, message: 'Add the screening question students must answer.' };
    }
    const conflicts = findRoomConflicts(
      state.events,
      draft.roomId,
      draft.date,
      draft.startTime,
      draft.endTime,
      excludeEventId,
    );
    if (conflicts.length > 0) {
      const c = conflicts[0];
      const isPending = c.approvalStatus === 'pending_room_approval' || c.approvalStatus === 'pending';
      return {
        ok: false,
        message: `${isPending ? 'Pending Room Hold' : 'Confirmed Schedule Conflict'}: “${c.title}” occupies this room (${c.startTime}–${c.endTime}). Use Auto-Pick or switch rooms.`,
      };
    }
    return null;
  };

  const resolveCreatorMeta = (draft: EventDraft) => {
    const club = state.clubs.find((c) => c.id === draft.hostClubId);
    const clubRole = club ? getUserRoleInClub(persona, club) : null;
    const clubPerms = club ? getUserPermissionsForClub(persona, club) : [];
    const canBookDirectly =
      persona.role === 'admin' ||
      persona.role === 'club_lead' ||
      (clubPerms.includes('create_events') && clubPerms.includes('book_rooms'));

    const createdByRoleTitle =
      clubRole?.title ??
      getPrimaryRoleBadgeForUser(persona, state.clubs)?.title ??
      (persona.role === 'admin' ? 'Campus Admin' : persona.role === 'club_lead' ? 'Club President' : 'Student Host');

    const hostName =
      draft.track === 'official' && club
        ? club.name
        : persona.name;

    return { canBookDirectly, createdByRoleTitle, hostName };
  };

  const createEvent = (draft: EventDraft): Result => {
    const invalid = validateDraft(draft);
    if (invalid) return invalid;

    const { canBookDirectly, createdByRoleTitle, hostName } = resolveCreatorMeta(draft);
    const needsRoomApproval = draft.track === 'official' && !canBookDirectly;
    const id = `evt_${Date.now()}`;
    const capacity = draft.track === 'peer_meetup' ? Math.min(30, draft.capacity) : draft.capacity;

    const event: EventItem = {
      id,
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      description: draft.description.trim() || draft.subtitle.trim(),
      outcomes: [],
      agenda: [
        { time: draft.startTime, title: 'Doors open & QR check-in', speaker: persona.name },
        { time: draft.startTime, title: 'Main session begins', speaker: hostName },
      ],
      category: draft.category,
      eventType: draft.track,
      approvalStatus: needsRoomApproval ? 'pending_room_approval' : 'approved',
      campus: draft.campus,
      roomId: draft.roomId,
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      language: draft.language,
      hostClubId: draft.hostClubId,
      coHostClubIds: draft.coHostClubIds,
      hostName,
      createdBy: persona.id,
      createdByRoleTitle,
      teamMembers: draft.teamMembers ?? [],
      registrationMode: draft.registrationMode,
      externalUrl: draft.externalUrl || undefined,
      screeningPrompt: draft.screeningPrompt || undefined,
      capacity,
      registeredCount: 0,
      waitlistCount: 0,
      issueCertificate: draft.certificate,
      coverStyle: draft.coverStyle,
      coverImage: draft.coverImage || undefined,
      pattern: draft.pattern,
      equipmentRequested: draft.equipment,
      teamFinder: draft.teamFinder,
      waitlistEnabled: draft.waitlistEnabled,
      attendees: [],
      questions: [],
      waitlistRoster: [],
      checkIns: {},
    };

    setState((prev) => ({
      ...prev,
      events: [...prev.events, event],
      createdEventIds: [...prev.createdEventIds, id],
    }));

    pushToast({
      tone: needsRoomApproval ? 'warn' : 'success',
      telegram: true,
      title: needsRoomApproval ? 'Submitted to admin approval' : 'Event published instantly',
      message: needsRoomApproval
        ? 'Campus Operations reviews the Boshlik room request. Switch to Timur (Admin) to approve it now.'
        : `“${event.title}” is live (${createdByRoleTitle}) and synced to @udeauz_events.`,
    });

    return {
      ok: true,
      message: needsRoomApproval
        ? 'Event submitted — waiting on Campus Operations room approval.'
        : 'Event published.',
      id,
    };
  };

  const updateEvent = (eventId: string, draft: EventDraft): Result => {
    const invalid = validateDraft(draft, eventId);
    if (invalid) return invalid;

    const { hostName } = resolveCreatorMeta(draft);
    const capacity = draft.track === 'peer_meetup' ? Math.min(30, draft.capacity) : draft.capacity;

    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          title: draft.title.trim(),
          subtitle: draft.subtitle.trim(),
          description: draft.description.trim() || draft.subtitle.trim(),
          category: draft.category,
          eventType: draft.track,
          language: draft.language,
          hostClubId: draft.hostClubId,
          coHostClubIds: draft.coHostClubIds,
          hostName: draft.hostClubId ? hostName : e.hostName,
          coverStyle: draft.coverStyle,
          coverImage: draft.coverImage || undefined,
          pattern: draft.pattern,
          date: draft.date,
          startTime: draft.startTime,
          endTime: draft.endTime,
          campus: draft.campus,
          roomId: draft.roomId,
          equipmentRequested: draft.equipment,
          registrationMode: draft.registrationMode,
          externalUrl: draft.externalUrl || undefined,
          screeningPrompt: draft.screeningPrompt || undefined,
          capacity: Math.max(capacity, e.registeredCount),
          waitlistEnabled: draft.waitlistEnabled,
          teamFinder: draft.teamFinder,
          issueCertificate: draft.certificate,
          teamMembers: draft.teamMembers,
        };
      }),
    }));

    setEditingEventId(null);
    pushToast({
      tone: 'success',
      telegram: true,
      title: 'Event & team updated',
      message: `Changes to “${draft.title.trim()}” and its connected team are live.`,
    });

    return { ok: true, message: 'Event updated.', id: eventId };
  };

  const addEventTeamMember = (eventId: string, member: EventTeamMember) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id !== eventId) return e;
        const filtered = (e.teamMembers ?? []).filter((m) => m.userId !== member.userId);
        return { ...e, teamMembers: [...filtered, member] };
      }),
    }));
    pushToast({
      tone: 'success',
      telegram: true,
      title: `${member.name} connected to event team`,
      message: `${member.customLabel} (${member.telegram}) now has organizer access for this event.`,
    });
  };

  const removeEventTeamMember = (eventId: string, userId: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId
          ? { ...e, teamMembers: (e.teamMembers ?? []).filter((m) => m.userId !== userId) }
          : e,
      ),
    }));
    pushToast({
      tone: 'info',
      title: 'Team member removed',
      message: 'Their event-level permissions were revoked.',
    });
  };

  const createClubRole = (clubId: string, role: Omit<CustomClubRole, 'id' | 'clubId'>) => {
    const newRole: CustomClubRole = {
      ...role,
      id: `role_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      clubId,
    };
    setState((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) =>
        c.id === clubId ? { ...c, customRoles: [...c.customRoles, newRole] } : c,
      ),
    }));
    pushToast({
      tone: 'success',
      title: `Custom role “${role.title}” created`,
      message: `${role.permissions.length} permission flag(s) configured. You can now assign students to this role.`,
    });
  };

  const updateClubRole = (clubId: string, role: CustomClubRole) => {
    setState((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) =>
        c.id === clubId
          ? { ...c, customRoles: c.customRoles.map((r) => (r.id === role.id ? role : r)) }
          : c,
      ),
    }));
    pushToast({
      tone: 'success',
      title: `Role “${role.title}” updated`,
      message: 'Assigned students immediately inherit the updated permissions.',
    });
  };

  const deleteClubRole = (clubId: string, roleId: string) => {
    setState((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) =>
        c.id === clubId
          ? {
              ...c,
              customRoles: c.customRoles.filter((r) => r.id !== roleId),
              roster: c.roster.filter((m) => m.roleId !== roleId),
            }
          : c,
      ),
    }));
    pushToast({
      tone: 'info',
      title: 'Custom role deleted',
      message: 'Role and its active member assignments were removed.',
    });
  };

  const assignClubMember = (
    clubId: string,
    payload: Omit<ClubMemberAssignment, 'id' | 'clubId' | 'assignedBy' | 'assignedAt'>,
  ) => {
    const club = state.clubs.find((c) => c.id === clubId);
    const role = club?.customRoles.find((r) => r.id === payload.roleId);
    const assignment: ClubMemberAssignment = {
      ...payload,
      id: `asg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      clubId,
      assignedBy: persona.name,
      assignedAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) => {
        if (c.id !== clubId) return c;
        const filtered = c.roster.filter(
          (m) => !(m.userId === payload.userId && m.roleId === payload.roleId),
        );
        return { ...c, roster: [...filtered, assignment] };
      }),
    }));
    pushToast({
      tone: 'success',
      telegram: true,
      title: `${payload.userName} assigned as ${role?.title ?? 'Coordinator'}`,
      message: `Notified ${payload.userTelegram} via @udea_pulse_bot with their newly unlocked permissions.`,
    });
  };

  const removeClubMember = (clubId: string, assignmentId: string) => {
    setState((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) =>
        c.id === clubId
          ? { ...c, roster: c.roster.filter((m) => m.id !== assignmentId) }
          : c,
      ),
    }));
    pushToast({
      tone: 'info',
      title: 'Member role unassigned',
      message: 'Student removed from the club officer roster.',
    });
  };

  const savePost = (
    draft: Omit<CampusPost, 'id' | 'createdAt' | 'reactions' | 'comments'> & { id?: string },
  ): CampusPost => {
    const existing = draft.id ? state.posts.find((p) => p.id === draft.id) : undefined;
    const post: CampusPost = existing
      ? {
          ...existing,
          ...draft,
          id: existing.id,
          updatedAt: new Date().toISOString(),
        }
      : {
          ...draft,
          id: `post_${Date.now()}`,
          createdAt: new Date().toISOString(),
          reactions: { fire: 1, heart: 0, rocket: 0, myReactions: ['fire'] },
          comments: [],
        };

    setState((prev) => ({
      ...prev,
      posts: existing
        ? prev.posts.map((p) => (p.id === post.id ? post : p))
        : [post, ...prev.posts],
    }));

    pushToast({
      tone: 'success',
      telegram: true,
      title: existing ? 'Campus post updated' : 'Published to Campus Feed & Telegram',
      message: `“${post.title}” is live on the UDEA Pulse stream${post.telegramSynced ? ' and synced to @udeauz_events' : ''}.`,
    });

    return post;
  };

  const deletePost = (postId: string) => {
    setState((prev) => ({
      ...prev,
      posts: prev.posts.filter((p) => p.id !== postId),
    }));
    pushToast({
      tone: 'info',
      title: 'Post deleted',
      message: 'Removed from the Campus Pulse feed.',
    });
  };

  const togglePinPost = (postId: string) => {
    const target = state.posts.find((p) => p.id === postId);
    setState((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => (p.id === postId ? { ...p, pinned: !p.pinned } : p)),
    }));
    pushToast({
      tone: 'info',
      title: target?.pinned ? 'Post unpinned' : '📌 Post pinned to top of Explore',
      message: target?.pinned
        ? 'Returned to chronological order.'
        : 'All students now see this announcement at the top of the Campus Pulse.',
    });
  };

  const togglePostReaction = (postId: string, kind: 'fire' | 'heart' | 'rocket') => {
    setState((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => {
        if (p.id !== postId) return p;
        const has = p.reactions.myReactions.includes(kind);
        const myReactions = has
          ? p.reactions.myReactions.filter((k) => k !== kind)
          : [...p.reactions.myReactions, kind];
        return {
          ...p,
          reactions: {
            ...p.reactions,
            [kind]: Math.max(0, p.reactions[kind] + (has ? -1 : 1)),
            myReactions,
          },
        };
      }),
    }));
  };

  const votePostPoll = (postId: string, optionId: string) => {
    setState((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => {
        if (p.id !== postId || !p.pollOptions) return p;
        return {
          ...p,
          pollOptions: p.pollOptions.map((opt) => {
            if (opt.id === optionId) {
              return opt.votedByMe
                ? opt
                : { ...opt, votes: opt.votes + 1, votedByMe: true };
            }
            if (opt.votedByMe) {
              return { ...opt, votes: Math.max(0, opt.votes - 1), votedByMe: false };
            }
            return opt;
          }),
        };
      }),
    }));
    pushToast({
      tone: 'success',
      title: 'Poll vote recorded',
      message: 'Live campus poll percentages updated.',
    });
  };

  const addPostComment = (postId: string, text: string) => {
    if (!text.trim()) return;
    const comment = {
      id: `cm_${Date.now()}`,
      authorName: persona.name,
      authorProgramme: persona.programmeShort ?? 'Staff',
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      posts: prev.posts.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, comment] } : p,
      ),
    }));
    pushToast({
      tone: 'success',
      title: 'Comment posted',
      message: 'Your reply is live in the discussion thread.',
    });
  };

  const openCertificate = (ticketId: string) => setCertificateTicketId(ticketId);
  const closeCertificate = () => setCertificateTicketId(null);
  const openOrganizer = (eventId: string) => {
    setOrganizerEventId(eventId);
    setView('organizer');
    setDrawerEventId(null);
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      fintech: 0,
      tech: 0,
      academic: 0,
      sports: 0,
      culture: 0,
    };
    state.events
      .filter((e) => e.approvalStatus === 'approved' && !e.past)
      .forEach((e) => {
        counts[e.category] += 1;
      });
    return counts;
  }, [state.events]);

  const pendingApprovals = state.events.filter(
    (e) => e.approvalStatus === 'pending_room_approval' || e.approvalStatus === 'pending',
  ).length;

  // Fix #6: Role-aware notification badge count for managed/assigned events
  const managedEventsCount = useMemo(
    () =>
      state.events.filter(
        (e) => !e.past && e.approvalStatus === 'approved' && canManage(e, persona, state.clubs),
      ).length,
    [state.events, persona, state.clubs],
  );

  const value: AppContextValue = {
    state,
    persona,
    personas: PERSONAS,
    theme: state.theme,
    view,
    setView,
    exploreMode,
    setExploreMode,
    mobile,
    setMobile,
    toasts,
    pushToast,
    dismissToast,
    modal,
    askConfirm,
    resolveModal,
    setTheme,
    toggleTheme,
    setPersona,
    setFilters,
    resetFilters,
    resetDemo,
    drawerEventId,
    openEvent,
    closeEvent,
    editingEventId,
    openEditEvent,
    clearEditingEvent,
    activePostModal,
    openPostModal,
    closePostModal,
    roleModalClubId,
    openRoleModal,
    closeRoleModal,
    myTicket,
    rsvp,
    cancelTicket,
    confirmAttendance,
    releaseSpot,
    setTeamOptIn,
    addQuestion,
    upvote,
    answerQuestion,
    updateEventCapacity,
    approveEvent,
    rejectEvent,
    checkInPerson,
    undoCheckIn,
    approveScreeningTicket,
    broadcast,
    followClub,
    exportICS,
    downloadEventICS,
    createEvent,
    updateEvent,
    addEventTeamMember,
    removeEventTeamMember,
    createClubRole,
    updateClubRole,
    deleteClubRole,
    assignClubMember,
    removeClubMember,
    savePost,
    deletePost,
    togglePinPost,
    togglePostReaction,
    votePostPoll,
    addPostComment,
    certificateTicketId,
    openCertificate,
    closeCertificate,
    organizerEventId,
    openOrganizer,
    categoryCounts,
    pendingApprovals,
    managedEventsCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
