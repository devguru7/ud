export type Category = 'fintech' | 'tech' | 'academic' | 'sports' | 'culture';
export type EventType = 'official' | 'peer_meetup';
export type ApprovalStatus = 'approved' | 'pending_room_approval' | 'pending' | 'rejected' | 'cancelled';
export type Campus = 'Boshlik' | 'Online';
export type BoshlikZone = 'all' | 'halls' | 'labs' | 'lrc' | 'sports' | 'online';
export type Lang = 'EN' | 'UZ' | 'RU';
export type RegistrationMode = 'internal_1click' | 'internal_screening' | 'external_link';
export type TicketStatus = 'confirmed' | 'waitlisted' | 'checked_in' | 'cancelled' | 'external_saved';
export type Role = 'student' | 'club_lead' | 'admin';
export type Theme = 'light' | 'dark';
export type View = 'explore' | 'clubs' | 'passes' | 'organizer' | 'studio';
export type ExploreFeedMode = 'events' | 'posts' | 'combined';
export type EventSortMode = 'soonest' | 'popular' | 'seats' | 'saved' | 'my_schedule';

export type PermissionFlag =
  | 'create_events'        // Can create & edit events under this club/scope
  | 'publish_posts'        // Can create, edit & pin Campus Posts, News & Recaps
  | 'book_rooms'           // Can request official Boshlik Campus rooms & equipment
  | 'manage_registrations' // Can approve/reject screening applications & promote waitlist
  | 'scan_tickets'         // Can use QR Scanner & check in attendees at the door
  | 'send_broadcasts'      // Can send Telegram notifications to registered attendees
  | 'manage_roles';        // Can create custom roles & assign members inside the club

export type AttachmentKind = 'slides' | 'dataset' | 'doc' | 'recording' | 'photos' | 'repo';

export interface AttachmentItem {
  id: string;
  title: string;
  url: string;
  kind: AttachmentKind;
}

export interface AppNotification {
  id: string;
  userId: string; // 'all' or specific persona id
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  tone?: 'success' | 'info' | 'warn';
  linkEventId?: string;
  linkClubId?: string;
  linkPostId?: string;
}

export interface EventSquad {
  id: string;
  name: string;
  projectIdea: string;
  neededRoles: string[];
  members: {
    userId: string;
    name: string;
    telegram: string;
    role: string;
  }[];
}

export interface EventFeedback {
  id: string;
  userId: string;
  userName: string;
  programme: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface StudentDirectoryItem {
  id: string;
  name: string;
  telegram: string;
  programme: string;
  programmeShort: string;
  color: string;
  studentId?: string;
  year?: string;
}

export interface ClubRoleApplication {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  userTelegram: string;
  userProgramme: string;
  roleId: string;
  note: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface CustomClubRole {
  id: string;
  clubId: string;
  title: string;
  badgeColor: string;
  allowedCategories?: Category[];
  permissions: PermissionFlag[];
}

export interface ClubMemberAssignment {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  userTelegram: string;
  userProgramme: string;
  roleId: string;
  assignedBy: string;
  assignedAt: string;
}

export type EventStaffRole = 'co_host' | 'coordinator' | 'scanner_volunteer' | 'speaker';

export interface EventTeamMember {
  userId: string;
  name: string;
  telegram: string;
  programme: string;
  role: EventStaffRole;
  customLabel: string;
  permissions: PermissionFlag[];
  showOnEventPage: boolean;
}

export type PostType =
  | 'announcement'
  | 'event_promo'
  | 'event_recap'
  | 'discussion';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  votedByMe?: boolean;
}

export interface CampusPost {
  id: string;
  type: PostType;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRoleTitle: string;
  clubId?: string;
  linkedEventId?: string;
  coverStyle?: string;
  imageUrl?: string;
  badgeText?: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt?: string;
  attachments?: AttachmentItem[];
  reactions: {
    fire: number;
    heart: number;
    rocket: number;
    myReactions: ('fire' | 'heart' | 'rocket')[];
  };
  pollOptions?: PollOption[];
  recapStats?: {
    attendedCount: number;
    photosCount: number;
    winnerTeam?: string;
    highlights: string[];
  };
  comments: {
    id: string;
    authorId?: string;
    authorName: string;
    authorProgramme: string;
    authorRoleTitle?: string;
    text: string;
    createdAt: string;
  }[];
  telegramSynced?: boolean;
}

export interface Persona {
  id: string;
  name: string;
  role: Role;
  programme?: string;
  programmeShort?: string;
  year?: string;
  department?: string;
  telegram: string;
  studentId: string;
  xp: number;
  reliabilityScore: number;
  clubId?: string;
  color: string;
  headlineRole?: string;
}

export interface Room {
  id: string;
  campus: Campus;
  zone: Exclude<BoshlikZone, 'all'>;
  name: string;
  code: string;
  capacity: number;
  equipment: string[];
  address: string;
  floor: string;
  kind: 'hall' | 'lab' | 'sports' | 'lounge' | 'library' | 'online';
}

export interface Club {
  id: string;
  name: string;
  short: string;
  category: Category;
  description: string;
  members: number;
  verified: boolean;
  partner?: string;
  color: string;
  leadId?: string;
  leadName?: string;
  customRoles: CustomClubRole[];
  roster: ClubMemberAssignment[];
  applications?: ClubRoleApplication[];
}

export interface Person {
  id: string;
  name: string;
  programme: string;
  programmeShort: string;
  telegram: string;
  color: string;
  lookingForTeam?: boolean;
  teamRole?: string;
  self?: boolean;
}

export interface Question {
  id: string;
  userId?: string;
  author: string;
  programme: string;
  text: string;
  upvotes: number;
  upvotedByMe: boolean;
  timestamp: string;
  answered: boolean;
  answerText?: string;
}

export interface AgendaItem {
  time: string;
  title: string;
  speaker?: string;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  programme: string;
  programmeShort: string;
  telegram: string;
  studentId: string;
}

export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  outcomes: string[];
  prerequisites?: string;
  agenda: AgendaItem[];
  attachments?: AttachmentItem[];
  squads?: EventSquad[];
  feedback?: EventFeedback[];
  adminNote?: string;
  category: Category;
  eventType: EventType;
  approvalStatus: ApprovalStatus;
  campus: Campus;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  language: Lang;
  hostClubId: string | null;
  coHostClubIds?: string[];
  hostName: string;
  createdBy?: string;
  createdByRoleTitle?: string;
  teamMembers: EventTeamMember[];
  registrationMode: RegistrationMode;
  externalUrl?: string;
  screeningPrompt?: string;
  capacity: number;
  registeredCount: number;
  waitlistCount: number;
  issueCertificate: boolean;
  coverStyle: string;
  coverImage?: string;
  pattern: 'grid' | 'dots' | 'waves' | 'clean';
  equipmentRequested: string[];
  teamFinder: boolean;
  waitlistEnabled: boolean;
  attendees: Person[];
  questions: Question[];
  waitlistRoster: WaitlistEntry[];
  checkIns: Record<string, string>;
  featured?: boolean;
  past?: boolean;
}

export interface Ticket {
  ticketId: string;
  eventId: string;
  userId: string;
  status: TicketStatus;
  seatNumber?: number;
  waitlistPosition?: number;
  qrHash: string;
  confirmedAttendance4h: boolean;
  checkedInAt?: string;
  screeningAnswer?: string;
  screeningStatus?: 'pending' | 'approved' | 'rejected';
  lookingForTeam: boolean;
  teamSkillTag: string;
  issuedAt: string;
}

export interface Filters {
  date: string | null;
  track: 'all' | 'official' | 'peer';
  category: Category | 'all';
  campus: Campus | 'all';
  zone: BoshlikZone;
  language: Lang | 'all';
  search: string;
  sort?: EventSortMode;
  clubId?: string | null;
}

export interface Broadcast {
  id: string;
  eventId: string;
  text: string;
  at: string;
  recipients: number;
}

export interface PersistedState {
  version: number;
  theme: Theme;
  uiLang?: Lang;
  personaId: string;
  personas?: Persona[];
  directory?: StudentDirectoryItem[];
  followedClubs: string[];
  savedEventIds?: string[];
  notifications?: AppNotification[];
  clubs: Club[];
  events: EventItem[];
  posts: CampusPost[];
  tickets: Ticket[];
  filters: Filters;
  broadcasts: Broadcast[];
  createdEventIds: string[];
}

export interface EventDraft {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  outcomes?: string[];
  prerequisites?: string;
  agenda?: AgendaItem[];
  attachments?: AttachmentItem[];
  track: EventType;
  category: Category;
  language: Lang;
  hostClubId: string | null;
  coHostClubIds: string[];
  coverStyle: string;
  coverImage: string;
  pattern: 'grid' | 'dots' | 'waves' | 'clean';
  date: string;
  startTime: string;
  endTime: string;
  campus: Campus;
  roomId: string;
  equipment: string[];
  registrationMode: RegistrationMode;
  externalUrl: string;
  screeningPrompt: string;
  capacity: number;
  waitlistEnabled: boolean;
  teamFinder: boolean;
  certificate: boolean;
  teamMembers: EventTeamMember[];
}
