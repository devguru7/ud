import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  AppNotification,
  Broadcast,
  CampusPost,
  Category,
  Club,
  ClubMemberAssignment,
  CustomClubRole,
  EventDraft,
  EventItem,
  EventSquad,
  EventTeamMember,
  ExploreFeedMode,
  Filters,
  Lang,
  PersistedState,
  Person,
  Persona,
  StudentDirectoryItem,
  Ticket,
} from '../types';
import {
  buildSeedClubs,
  buildSeedEvents,
  buildSeedNotifications,
  buildSeedPosts,
  buildSeedTickets,
  PERSONAS,
  ROOMS,
  STUDENT_DIRECTORY,
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
import {
  auth,
  db,
  doc,
  firebaseSignOut,
  googleProvider,
  handleFirestoreError,
  onAuthStateChanged,
  OperationType,
  serverTimestamp,
  setDoc,
  signInWithPopup,
  User,
} from '../firebase';

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
  sort: 'soonest',
  clubId: null,
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

function buildAllPersonasFromDirectory(
  basePersonas: Persona[],
  directory: StudentDirectoryItem[],
): Persona[] {
  const map = new Map<string, Persona>();
  basePersonas.forEach((p) => map.set(p.id, p));
  directory.forEach((d) => {
    if (!map.has(d.id)) {
      map.set(d.id, {
        id: d.id,
        name: d.name,
        role: 'student',
        programme: d.programme,
        programmeShort: d.programmeShort,
        year: d.year ?? 'Year 2',
        telegram: d.telegram,
        studentId: d.studentId ?? `UDEA-25-${Math.floor(1000 + Math.random() * 8999)}`,
        xp: 240,
        reliabilityScore: 98,
        color: d.color || '#2563EB',
        headlineRole: `${d.programmeShort} · Student`,
      });
    }
  });
  return Array.from(map.values());
}

function initialState(): PersistedState {
  const directory = [...STUDENT_DIRECTORY];
  return {
    version: 4,
    theme: 'light',
    uiLang: 'EN',
    personaId: 'usr_1',
    personas: buildAllPersonasFromDirectory(PERSONAS, directory),
    directory,
    followedClubs: ['club_fintech', 'club_acca', 'club_debate'],
    savedEventIds: ['evt_1'],
    notifications: buildSeedNotifications(),
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
        attachments: Array.isArray(e.attachments) ? e.attachments : [],
        squads: Array.isArray(e.squads) ? e.squads : [],
        feedback: Array.isArray(e.feedback) ? e.feedback : [],
      };
    });

    const filters: Filters = {
      ...defaultFilters,
      ...(parsed.filters || {}),
      zone: parsed.filters?.zone ?? 'all',
      sort: parsed.filters?.sort ?? 'soonest',
      clubId: parsed.filters?.clubId ?? null,
    };
    if (!['all', 'Boshlik', 'Online'].includes(filters.campus)) filters.campus = 'all';

    const directory =
      Array.isArray(parsed.directory) && parsed.directory.length > 0
        ? parsed.directory
        : [...STUDENT_DIRECTORY];
    const personas = buildAllPersonasFromDirectory(
      Array.isArray(parsed.personas) && parsed.personas.length > 0 ? parsed.personas : PERSONAS,
      directory,
    );

    return {
      ...initialState(),
      ...parsed,
      version: 4,
      uiLang: parsed.uiLang ?? 'EN',
      personas,
      directory,
      savedEventIds: Array.isArray(parsed.savedEventIds) ? parsed.savedEventIds : ['evt_1'],
      notifications:
        Array.isArray(parsed.notifications) && parsed.notifications.length > 0
          ? parsed.notifications
          : buildSeedNotifications(),
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
  directory: StudentDirectoryItem[];
  theme: 'light' | 'dark';
  uiLang: Lang;
  setUiLang: (lang: Lang) => void;
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
  registerStudentAccount: (payload: {
    name: string;
    telegram: string;
    programme: string;
    programmeShort?: string;
    year?: string;
    switchNow?: boolean;
  }) => Persona;
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
  toggleSaveEvent: (eventId: string) => void;
  isEventSaved: (eventId: string) => boolean;
  markAllNotificationsRead: () => void;
  unreadNotificationsCount: number;
  addQuestion: (eventId: string, text: string) => void;
  upvote: (eventId: string, questionId: string) => void;
  answerQuestion: (eventId: string, questionId: string, answer: string) => void;
  addEventSquad: (eventId: string, squad: Omit<EventSquad, 'id'>) => void;
  joinEventSquad: (eventId: string, squadId: string, role: string) => void;
  addEventFeedback: (eventId: string, rating: number, comment: string) => void;
  updateEventCapacity: (eventId: string, capacity: number) => void;
  approveEvent: (eventId: string) => void;
  rejectEvent: (eventId: string, suggestedRoomId?: string, note?: string) => void;
  checkInPerson: (eventId: string, personId: string) => void;
  undoCheckIn: (eventId: string, personId: string) => void;
  verifyTicketCode: (eventId: string, code: string) => Result;
  promoteWaitlistEntry: (eventId: string, waitlistId: string) => void;
  approveScreeningTicket: (ticketId: string) => void;
  declineScreeningTicket: (ticketId: string) => void;
  broadcast: (eventId: string, text: string) => void;
  followClub: (clubId: string) => void;
  createClub: (payload: {
    name: string;
    short: string;
    category: Category;
    description: string;
    partner?: string;
    color: string;
    leadId?: string;
    leadName?: string;
  }) => Club;
  updateClub: (clubId: string, patch: Partial<Club>) => void;
  applyForClubRole: (clubId: string, roleId: string, note: string) => void;
  approveRoleApplication: (clubId: string, applicationId: string) => void;
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
  deletePostComment: (postId: string, commentId: string) => void;
  certificateTicketId: string | null;
  openCertificate: (ticketOrEventId: string) => void;
  closeCertificate: () => void;
  organizerEventId: string | null;
  openOrganizer: (eventId: string) => void;
  categoryCounts: Record<Category, number>;
  pendingApprovals: number;
  managedEventsCount: number;
  firebaseUser: User | null;
  cloudSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  signInWithGoogle: () => Promise<void>;
  signOutFirebase: () => Promise<void>;
  syncToCloud: () => Promise<void>;
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
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const timers = useRef<Record<string, number>>({});

  const personas = useMemo(
    () => state.personas && state.personas.length > 0 ? state.personas : buildAllPersonasFromDirectory(PERSONAS, state.directory ?? STUDENT_DIRECTORY),
    [state.personas, state.directory],
  );

  const directory = useMemo(
    () => state.directory && state.directory.length > 0 ? state.directory : STUDENT_DIRECTORY,
    [state.directory],
  );

  const persona = useMemo(
    () => personas.find((p) => p.id === state.personaId) ?? personas[0],
    [personas, state.personaId],
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (u) setCloudSyncStatus('synced');
      else setCloudSyncStatus('idle');
    });
    return () => unsub();
  }, []);

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

  const pushNotification = (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const record: AppNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    setState((prev) => ({
      ...prev,
      notifications: [record, ...(prev.notifications ?? [])].slice(0, 40),
    }));
  };

  const markAllNotificationsRead = () => {
    setState((prev) => ({
      ...prev,
      notifications: (prev.notifications ?? []).map((n) => ({ ...n, read: true })),
    }));
  };

  const unreadNotificationsCount = useMemo(
    () =>
      (state.notifications ?? []).filter(
        (n) => !n.read && (n.userId === 'all' || n.userId === persona.id),
      ).length,
    [state.notifications, persona.id],
  );

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

  const setUiLang = (uiLang: Lang) => {
    setState((prev) => ({ ...prev, uiLang }));
  };

  const ensureStudentInState = (
    userId: string,
    name: string,
    telegram: string,
    programme: string,
    programmeShort?: string,
    color = '#2563EB',
  ) => {
    const shortProg =
      programmeShort ||
      (programme.includes('Finance')
        ? 'Finance'
        : programme.includes('Data')
          ? 'Data Analytics'
          : programme.includes('Management')
            ? 'Management'
            : programme.includes('Agri')
              ? 'AgriTech'
              : 'Student');

    setState((prev) => {
      const dir = prev.directory ?? STUDENT_DIRECTORY;
      const pers = prev.personas ?? PERSONAS;
      const nextDir = dir.some((d) => d.id === userId)
        ? dir
        : [
            ...dir,
            {
              id: userId,
              name,
              telegram: telegram.startsWith('@') ? telegram : `@${telegram}`,
              programme,
              programmeShort: shortProg,
              color,
            },
          ];
      const nextPers = pers.some((p) => p.id === userId)
        ? pers
        : [
            ...pers,
            {
              id: userId,
              name,
              role: 'student' as const,
              programme,
              programmeShort: shortProg,
              year: 'Year 2',
              telegram: telegram.startsWith('@') ? telegram : `@${telegram}`,
              studentId: `UDEA-25-${Math.floor(1000 + Math.random() * 8999)}`,
              xp: 220,
              reliabilityScore: 98,
              color,
              headlineRole: `${shortProg} · Student`,
            },
          ];
      return { ...prev, directory: nextDir, personas: nextPers };
    });
  };

  const registerStudentAccount = (payload: {
    name: string;
    telegram: string;
    programme: string;
    programmeShort?: string;
    year?: string;
    switchNow?: boolean;
  }): Persona => {
    const id = `stu_${Date.now().toString(36)}`;
    const colors = ['#2563EB', '#10B981', '#8B5CF6', '#EC4899', '#F97316', '#0EA5E9'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shortProg =
      payload.programmeShort ||
      (payload.programme.includes('Finance')
        ? 'Finance'
        : payload.programme.includes('Data')
          ? 'Data Analytics'
          : payload.programme.includes('Management')
            ? 'Management'
            : payload.programme.includes('Agri')
              ? 'AgriTech'
              : 'Foundation');
    const cleanTg = payload.telegram.trim().startsWith('@')
      ? payload.telegram.trim()
      : `@${payload.telegram.trim().replace(/[^a-zA-Z0-9_]/g, '') || 'student_udea'}`;

    const newPersona: Persona = {
      id,
      name: payload.name.trim(),
      role: 'student',
      programme: payload.programme,
      programmeShort: shortProg,
      year: payload.year || 'Year 2',
      telegram: cleanTg,
      studentId: `UDEA-26-${Math.floor(1000 + Math.random() * 8999)}`,
      xp: 200,
      reliabilityScore: 100,
      color,
      headlineRole: `${shortProg} · ${payload.year || 'Year 2'}`,
    };

    const dirEntry: StudentDirectoryItem = {
      id,
      name: newPersona.name,
      telegram: cleanTg,
      programme: payload.programme,
      programmeShort: shortProg,
      color,
      studentId: newPersona.studentId,
      year: newPersona.year,
    };

    setState((prev) => ({
      ...prev,
      personas: [...(prev.personas ?? personas), newPersona],
      directory: [...(prev.directory ?? directory), dirEntry],
      personaId: payload.switchNow ? id : prev.personaId,
    }));

    pushToast({
      tone: 'success',
      telegram: true,
      title: payload.switchNow ? `Connected & switched to ${newPersona.name}` : `${newPersona.name} added to Campus Directory`,
      message: `${cleanTg} (${shortProg}) is now available in the Account Switcher and Role Architect.`,
    });

    return newPersona;
  };

  const setPersona = (id: string) => {
    const next = personas.find((p) => p.id === id);
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

  const signInWithGoogle = async () => {
    try {
      setCloudSyncStatus('syncing');
      const cred = await signInWithPopup(auth, googleProvider);
      setFirebaseUser(cred.user);
      setCloudSyncStatus('synced');
      pushToast({
        tone: 'success',
        title: `Signed in as ${cred.user.displayName || cred.user.email}`,
        message: 'Connected to Firebase Auth & Firestore cloud workspace.',
      });
    } catch (error) {
      setCloudSyncStatus('idle');
      pushToast({
        tone: 'warn',
        title: 'Google Sign-In cancelled or blocked',
        message: error instanceof Error ? error.message : 'Continuing with local campus session.',
      });
    }
  };

  const signOutFirebase = async () => {
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setCloudSyncStatus('idle');
    pushToast({
      tone: 'info',
      title: 'Signed out of cloud account',
      message: 'Local campus demo state remains active.',
    });
  };

  const syncToCloud = async () => {
    if (!auth.currentUser) {
      await signInWithGoogle();
      return;
    }
    const uid = auth.currentUser.uid;
    const path = `workspaces/${uid}`;
    try {
      setCloudSyncStatus('syncing');
      await setDoc(doc(db, 'workspaces', uid), {
        ownerUid: uid,
        personaId: state.personaId,
        theme: state.theme,
        uiLang: state.uiLang ?? 'EN',
        payloadJson: JSON.stringify({
          followedClubs: state.followedClubs,
          savedEventIds: state.savedEventIds ?? [],
          ticketsCount: state.tickets.length,
          eventsCount: state.events.length,
        }).slice(0, 800000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCloudSyncStatus('synced');
      pushToast({
        tone: 'success',
        title: 'Synced to Firestore',
        message: 'Your UDEA Pulse passes, roles and preferences are backed up to Firebase.',
      });
    } catch (error) {
      setCloudSyncStatus('error');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
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
      title: 'Demo state reset to v3.5',
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

  const toggleSaveEvent = (eventId: string) => {
    const saved = (state.savedEventIds ?? []).includes(eventId);
    setState((prev) => ({
      ...prev,
      savedEventIds: saved
        ? (prev.savedEventIds ?? []).filter((id) => id !== eventId)
        : [...(prev.savedEventIds ?? []), eventId],
    }));
    pushToast({
      tone: saved ? 'info' : 'success',
      title: saved ? 'Removed from Saved Events' : 'Saved to Bookmarks',
      message: saved
        ? 'Removed from your Saved Events filter.'
        : 'Filter by “Saved” on Explore to find this event anytime.',
    });
  };

  const isEventSaved = (eventId: string): boolean => (state.savedEventIds ?? []).includes(eventId);

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
          e.id === eventId
            ? {
                ...e,
                waitlistCount: e.waitlistCount + 1,
                waitlistRoster: [
                  ...e.waitlistRoster,
                  {
                    id: `wl_${persona.id}`,
                    name: persona.name,
                    programme: persona.programme ?? 'UDEA Student',
                    programmeShort: persona.programmeShort ?? 'Student',
                    telegram: persona.telegram,
                    studentId: persona.studentId,
                  },
                ],
              }
            : e,
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
      wasConfirmed && (event.registeredCount >= event.capacity || event.waitlistRoster.length > 0)
        ? event.waitlistRoster[0]
        : undefined;
    const waitlistedTicket = wasConfirmed
      ? state.tickets.find((t) => t.eventId === ticket.eventId && t.status === 'waitlisted')
      : undefined;

    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) => {
        if (t.ticketId === ticketId) return { ...t, status: 'cancelled' };
        if (waitlistedTicket && t.ticketId === waitlistedTicket.ticketId) {
          return {
            ...t,
            status: 'confirmed',
            seatNumber: event.capacity,
            waitlistPosition: undefined,
            qrHash: randomHash('UDEA-PASS'),
          };
        }
        return t;
      }),
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
          next.waitlistRoster = e.waitlistRoster.filter((w) => w.id !== `wl_${ticket.userId}`);
        }
        return next;
      }),
    }));

    if (promoted) {
      pushNotification({
        userId: 'all',
        title: `🎉 Waitlist #1 Promoted: ${promoted.name}`,
        message: `${promoted.name} was automatically promoted to a confirmed seat for “${event.title}”.`,
        tone: 'success',
        linkEventId: event.id,
      });
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

  const promoteWaitlistEntry = (eventId: string, waitlistId: string) => {
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;
    const entry = event.waitlistRoster.find((w) => w.id === waitlistId);
    if (!entry) return;

    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          capacity: Math.max(e.capacity, e.registeredCount + 1),
          registeredCount: e.registeredCount + 1,
          waitlistCount: Math.max(0, e.waitlistCount - 1),
          waitlistRoster: e.waitlistRoster.filter((w) => w.id !== waitlistId),
          attendees: [
            ...e.attendees,
            {
              id: entry.id,
              name: entry.name,
              programme: entry.programme,
              programmeShort: entry.programmeShort,
              telegram: entry.telegram,
              color: '#10B981',
            },
          ],
        };
      }),
    }));

    pushToast({
      tone: 'success',
      telegram: true,
      title: `${entry.name} promoted to confirmed seat`,
      message: `Sent confirmed QR pass to ${entry.telegram} via @udea_pulse_bot.`,
    });
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

  const addEventSquad = (eventId: string, squad: Omit<EventSquad, 'id'>) => {
    const newSquad: EventSquad = {
      ...squad,
      id: `sq_${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId ? { ...e, squads: [newSquad, ...(e.squads ?? [])] } : e,
      ),
    }));
    pushToast({
      tone: 'success',
      title: `Squad “${squad.name}” created`,
      message: 'Attendees can now join your squad directly from the People & Teams tab.',
    });
  };

  const joinEventSquad = (eventId: string, squadId: string, role: string) => {
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          squads: (e.squads ?? []).map((sq) => {
            if (sq.id !== squadId) return sq;
            if (sq.members.some((m) => m.userId === persona.id)) return sq;
            return {
              ...sq,
              neededRoles: sq.neededRoles.filter((r) => r !== role),
              members: [
                ...sq.members,
                {
                  userId: persona.id,
                  name: persona.name,
                  telegram: persona.telegram,
                  role: role || persona.programmeShort || 'Builder',
                },
              ],
            };
          }),
        };
      }),
    }));
    pushToast({
      tone: 'success',
      telegram: true,
      title: 'Joined squad!',
      message: `Your Telegram handle (${persona.telegram}) was shared with the squad lead.`,
    });
  };

  const addEventFeedback = (eventId: string, rating: number, comment: string) => {
    if (!comment.trim()) return;
    const fb = {
      id: `fb_${Date.now()}`,
      userId: persona.id,
      userName: persona.name,
      programme: persona.programmeShort ?? 'Student',
      rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) =>
        e.id === eventId ? { ...e, feedback: [fb, ...(e.feedback ?? [])] } : e,
      ),
    }));
    pushToast({
      tone: 'success',
      title: 'Feedback submitted (+15 XP)',
      message: 'Thank you for rating this Boshlik Campus session.',
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
    if (event) {
      pushNotification({
        userId: event.createdBy ?? 'all',
        title: `✅ Room Request Approved: ${event.title}`,
        message: `Campus Operations approved your room request. Your event is now live on Explore.`,
        tone: 'success',
        linkEventId: event.id,
      });
    }
    pushToast({
      tone: 'success',
      telegram: true,
      title: 'Approved & auto-posted',
      message: event
        ? `“${event.title}” is live on the Explore feed and announced to @udeauz_events.`
        : 'Event approved.',
    });
  };

  const rejectEvent = (eventId: string, suggestedRoomId?: string, note?: string) => {
    const event = state.events.find((e) => e.id === eventId);
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id !== eventId) return e;
        if (suggestedRoomId) {
          return {
            ...e,
            roomId: suggestedRoomId,
            adminNote: note || `Suggested alternate Boshlik room: ${suggestedRoomId}`,
          };
        }
        return { ...e, approvalStatus: 'rejected', adminNote: note };
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
      title: `${person?.name ?? 'Guest'} checked in (+50 XP)`,
      message: 'Cached pass validated offline and synced to the attendance log.',
    });
  };

  const verifyTicketCode = (eventId: string, code: string): Result => {
    const clean = code.trim().toUpperCase();
    if (!clean) return { ok: false, message: 'Enter a QR hash, student ID or @telegram handle.' };
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return { ok: false, message: 'Event not found.' };

    const matchedTicket = state.tickets.find(
      (t) =>
        t.eventId === eventId &&
        t.status !== 'cancelled' &&
        (t.qrHash.toUpperCase() === clean || t.ticketId.toUpperCase() === clean),
    );
    if (matchedTicket) {
      const personId = `att_${matchedTicket.userId}`;
      checkInPerson(eventId, personId);
      const holder = personas.find((p) => p.id === matchedTicket.userId);
      return {
        ok: true,
        message: `Verified QR Pass ${matchedTicket.qrHash} for ${holder?.name ?? 'Attendee'}!`,
      };
    }

    const matchedAttendee = event.attendees.find(
      (a) =>
        a.name.toUpperCase().includes(clean) ||
        a.telegram.toUpperCase().includes(clean) ||
        a.id.toUpperCase() === clean,
    );
    if (matchedAttendee) {
      checkInPerson(eventId, matchedAttendee.id);
      return {
        ok: true,
        message: `Checked in ${matchedAttendee.name} (${matchedAttendee.telegram})!`,
      };
    }

    return { ok: false, message: `No matching pass or attendee found for “${code.trim()}”.` };
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
    const p = personas.find((x) => x.id === tkt?.userId);
    pushToast({
      tone: 'success',
      telegram: true,
      title: 'Application approved',
      message: `${p?.name ?? 'The student'} received a confirmed QR pass on Telegram.`,
    });
  };

  const declineScreeningTicket = (ticketId: string) => {
    const tkt = state.tickets.find((t) => t.ticketId === ticketId);
    if (!tkt) return;
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t) =>
        t.ticketId === ticketId ? { ...t, screeningStatus: 'rejected', status: 'cancelled' } : t,
      ),
      events: prev.events.map((e) =>
        e.id === tkt.eventId
          ? {
              ...e,
              registeredCount: Math.max(0, e.registeredCount - 1),
              attendees: e.attendees.filter((a) => a.id !== `att_${tkt.userId}`),
            }
          : e,
      ),
    }));
    const p = personas.find((x) => x.id === tkt.userId);
    pushToast({
      tone: 'warn',
      telegram: true,
      title: 'Application declined',
      message: `${p?.name ?? 'The applicant'} was notified and the held seat was released.`,
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
    pushNotification({
      userId: 'all',
      title: `📣 Broadcast · ${event.title}`,
      message: record.text,
      tone: 'info',
      linkEventId: event.id,
    });
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

  const createClub = (payload: {
    name: string;
    short: string;
    category: Category;
    description: string;
    partner?: string;
    color: string;
    leadId?: string;
    leadName?: string;
  }): Club => {
    const newClub: Club = {
      id: `club_${Date.now().toString(36)}`,
      name: payload.name.trim(),
      short: payload.short.trim() || payload.name.trim().slice(0, 16),
      category: payload.category,
      description: payload.description.trim(),
      members: 25,
      verified: true,
      partner: payload.partner?.trim() || undefined,
      color: payload.color || '#10B981',
      leadId: payload.leadId || persona.id,
      leadName: payload.leadName || persona.name,
      customRoles: [
        {
          id: `role_default_${Date.now()}`,
          clubId: '',
          title: 'Events & Room Coordinator',
          badgeColor: payload.color || '#10B981',
          permissions: ['create_events', 'publish_posts', 'book_rooms', 'scan_tickets'],
        },
      ],
      roster: [],
      applications: [],
    };
    newClub.customRoles[0].clubId = newClub.id;
    setState((prev) => ({
      ...prev,
      clubs: [newClub, ...prev.clubs],
      followedClubs: [...prev.followedClubs, newClub.id],
    }));
    pushToast({
      tone: 'success',
      telegram: true,
      title: `Verified Club “${newClub.name}” launched`,
      message: 'Role Architect and official event tracks are now active for this society.',
    });
    return newClub;
  };

  const updateClub = (clubId: string, patch: Partial<Club>) => {
    setState((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) => (c.id === clubId ? { ...c, ...patch } : c)),
    }));
    pushToast({
      tone: 'success',
      title: 'Club profile updated',
      message: 'Changes are live in the Student Union directory.',
    });
  };

  const applyForClubRole = (clubId: string, roleId: string, note: string) => {
    const club = state.clubs.find((c) => c.id === clubId);
    const role = club?.customRoles.find((r) => r.id === roleId);
    if (!club || !role) return;
    const app = {
      id: `app_${Date.now()}`,
      clubId,
      userId: persona.id,
      userName: persona.name,
      userTelegram: persona.telegram,
      userProgramme: persona.programme ?? 'UDEA Student',
      roleId,
      note: note.trim() || `Interested in helping ${club.short} as ${role.title}.`,
      createdAt: new Date().toISOString(),
      status: 'pending' as const,
    };
    setState((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) =>
        c.id === clubId ? { ...c, applications: [app, ...(c.applications ?? [])] } : c,
      ),
    }));
    pushNotification({
      userId: club.leadId ?? 'usr_2',
      title: `🙋 Role Application: ${persona.name}`,
      message: `${persona.name} applied for “${role.title}” in ${club.short}.`,
      tone: 'info',
      linkClubId: club.id,
    });
    pushToast({
      tone: 'success',
      telegram: true,
      title: `Applied for ${role.title}`,
      message: `${club.leadName ?? 'Club President'} received your application in Role Architect.`,
    });
  };

  const approveRoleApplication = (clubId: string, applicationId: string) => {
    const club = state.clubs.find((c) => c.id === clubId);
    const app = club?.applications?.find((a) => a.id === applicationId);
    if (!club || !app) return;
    assignClubMember(clubId, {
      userId: app.userId,
      userName: app.userName,
      userTelegram: app.userTelegram,
      userProgramme: app.userProgramme,
      roleId: app.roleId,
    });
    setState((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) =>
        c.id === clubId
          ? {
              ...c,
              applications: (c.applications ?? []).map((a) =>
                a.id === applicationId ? { ...a, status: 'approved' as const } : a,
              ),
            }
          : c,
      ),
    }));
  };

  const downloadEventICS = (event: EventItem) => {
    const room = ROOMS.find((r) => r.id === event.roomId);
    downloadFile(`${event.id}.ics`, buildICS(event, room), 'text/calendar;charset=utf-8');
    pushToast({
      tone: 'success',
      title: '.ics calendar file downloaded',
      message: 'Open it to add the event to Google Calendar, Apple Calendar or Outlook (Tashkent UTC+5).',
    });
  };

  const exportICS = (eventId: string) => {
    const event = state.events.find((e) => e.id === eventId);
    if (event) downloadEventICS(event);
  };

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
    const clubPerms = club ? getUserPermissionsForClub(persona, club, draft.category) : [];
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

    (draft.teamMembers ?? []).forEach((tm) => {
      ensureStudentInState(tm.userId, tm.name, tm.telegram, tm.programme, tm.programme);
    });

    const event: EventItem = {
      id,
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      description: draft.description.trim() || draft.subtitle.trim(),
      outcomes:
        draft.outcomes && draft.outcomes.length > 0
          ? draft.outcomes
          : ['Practical hands-on session on Boshlik Campus', 'Peer networking & Q&A with organisers'],
      prerequisites: draft.prerequisites?.trim() || undefined,
      agenda:
        draft.agenda && draft.agenda.length > 0
          ? draft.agenda
          : [
              { time: draft.startTime, title: 'Doors open & QR check-in', speaker: persona.name },
              { time: draft.startTime, title: 'Main session & interactive workshop', speaker: hostName },
            ],
      attachments: draft.attachments ?? [],
      squads: [],
      feedback: [],
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

    (draft.teamMembers ?? []).forEach((tm) => {
      ensureStudentInState(tm.userId, tm.name, tm.telegram, tm.programme, tm.programme);
    });

    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          title: draft.title.trim(),
          subtitle: draft.subtitle.trim(),
          description: draft.description.trim() || draft.subtitle.trim(),
          outcomes: draft.outcomes && draft.outcomes.length > 0 ? draft.outcomes : e.outcomes,
          prerequisites: draft.prerequisites !== undefined ? draft.prerequisites : e.prerequisites,
          agenda: draft.agenda && draft.agenda.length > 0 ? draft.agenda : e.agenda,
          attachments: draft.attachments !== undefined ? draft.attachments : e.attachments,
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
    ensureStudentInState(member.userId, member.name, member.telegram, member.programme, member.programme);
    setState((prev) => ({
      ...prev,
      events: prev.events.map((e) => {
        if (e.id !== eventId) return e;
        const filtered = (e.teamMembers ?? []).filter((m) => m.userId !== member.userId);
        return { ...e, teamMembers: [...filtered, member] };
      }),
    }));
    pushNotification({
      userId: member.userId,
      title: `🎖️ Connected to Event Team: ${member.customLabel}`,
      message: `${persona.name} added you to the organizing team. Switch to ${member.name} to access Host controls.`,
      tone: 'success',
      linkEventId: eventId,
    });
    pushToast({
      tone: 'success',
      telegram: true,
      title: `${member.name} connected to event team`,
      message: `${member.customLabel} (${member.telegram}) now has organizer access and is available in the Account Switcher.`,
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
    ensureStudentInState(
      payload.userId,
      payload.userName,
      payload.userTelegram,
      payload.userProgramme,
      undefined,
      role?.badgeColor || club?.color || '#2563EB',
    );
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
    pushNotification({
      userId: payload.userId,
      title: `🎖️ Assigned as ${role?.title ?? 'Coordinator'} in ${club?.short ?? 'Club'}`,
      message: `${persona.name} delegated ${role?.permissions.length ?? 0} permissions to your account.`,
      tone: 'success',
      linkClubId: clubId,
    });
    pushToast({
      tone: 'success',
      telegram: true,
      title: `${payload.userName} assigned as ${role?.title ?? 'Coordinator'}`,
      message: `Notified ${payload.userTelegram} via @udea_pulse_bot. You can now switch to ${payload.userName} in the topbar!`,
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
    const badge = getPrimaryRoleBadgeForUser(persona, state.clubs);
    const comment = {
      id: `cm_${Date.now()}`,
      authorId: persona.id,
      authorName: persona.name,
      authorProgramme: persona.programmeShort ?? 'Staff',
      authorRoleTitle:
        persona.role === 'admin'
          ? 'Campus Admin'
          : persona.role === 'club_lead'
            ? 'Club President'
            : badge?.title,
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

  const deletePostComment = (postId: string, commentId: string) => {
    setState((prev) => ({
      ...prev,
      posts: prev.posts.map((p) =>
        p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p,
      ),
    }));
    pushToast({
      tone: 'info',
      title: 'Comment deleted',
    });
  };

  const openCertificate = (ticketOrEventId: string) => setCertificateTicketId(ticketOrEventId);
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
    personas,
    directory,
    theme: state.theme,
    uiLang: state.uiLang ?? 'EN',
    setUiLang,
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
    registerStudentAccount,
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
    toggleSaveEvent,
    isEventSaved,
    markAllNotificationsRead,
    unreadNotificationsCount,
    addQuestion,
    upvote,
    answerQuestion,
    addEventSquad,
    joinEventSquad,
    addEventFeedback,
    updateEventCapacity,
    approveEvent,
    rejectEvent,
    checkInPerson,
    undoCheckIn,
    verifyTicketCode,
    promoteWaitlistEntry,
    approveScreeningTicket,
    declineScreeningTicket,
    broadcast,
    followClub,
    createClub,
    updateClub,
    applyForClubRole,
    approveRoleApplication,
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
    deletePostComment,
    certificateTicketId,
    openCertificate,
    closeCertificate,
    organizerEventId,
    openOrganizer,
    categoryCounts,
    pendingApprovals,
    managedEventsCount,
    firebaseUser,
    cloudSyncStatus,
    signInWithGoogle,
    signOutFirebase,
    syncToCloud,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
