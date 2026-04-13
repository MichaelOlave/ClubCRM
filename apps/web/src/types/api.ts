export type ClubStatus = "active" | "planning" | "archived";
export type MemberStatus = "active" | "prospective";
export type MembershipStatus = "active" | "pending";
export type EventStatus = "upcoming" | "draft";
export type AnnouncementStatus = "published" | "scheduled";
export type JoinRequestStatus = "pending" | "approved" | "denied";
export type ActivityType = "club" | "member" | "form" | "event" | "announcement";

export type ClubRecord = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  status: ClubStatus;
  memberCount: number;
  manager: string | null;
  nextEventAt: string | null;
  tags: string[];
};

export type EventRecord = {
  id: string;
  title: string;
  location: string;
  startsAt: string;
  status: EventStatus;
};

export type AnnouncementRecord = {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  status: AnnouncementStatus;
};

export type MemberRecord = {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string | null;
  status: MemberStatus;
  clubCount: number;
  primaryClub: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MembershipRecord = {
  id: string;
  clubId: string;
  clubName: string;
  memberId: string;
  memberName: string;
  role: string;
  status: MembershipStatus;
  joinedAt: string | null;
};

export type JoinRequestRecord = {
  id: string;
  clubId: string;
  submitterName: string;
  submitterEmail: string;
  studentId: string | null;
  role: string | null;
  message: string | null;
  status: JoinRequestStatus;
};

export type ActivityRecord = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: ActivityType;
};

export type BackendClubRecord = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  status: string;
};

export type BackendMemberRecord = {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  student_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type BackendMembershipRecord = {
  id: string;
  club_id: string;
  member_id: string;
  role: string;
  status: string;
  joined_at: string | null;
};

export type BackendJoinRequestRecord = {
  id: string;
  club_id: string;
  submitter_name: string;
  submitter_email: string;
  student_id: string | null;
  role: string | null;
  message: string | null;
  status: string;
};

export type BackendJoinRequestModerationRecord = {
  join_request_id: string;
  status: string;
};

export type BackendJoinRequestApprovalRecord = BackendJoinRequestModerationRecord & {
  member_id: string;
  membership_id: string;
  member_created: boolean;
  membership_created: boolean;
};

export type BackendEventRecord = {
  id: string;
  club_id: string;
  title: string;
  description: string;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
};

export type BackendAnnouncementRecord = {
  id: string;
  club_id: string;
  title: string;
  body: string;
  published_at: string;
  created_by: string | null;
};

export type BackendDashboardSummaryRecord = {
  club_id: string;
  total_members: number;
  total_events: number;
  total_announcements: number;
};

export type BackendDashboardRedisAnalyticsRecord = {
  club_id: string;
  cache_key: string;
  available: boolean;
  cache_present: boolean;
  ttl_seconds: number | null;
  request_count: number;
  hit_count: number;
  miss_count: number;
  refresh_count: number;
  invalidation_count: number;
  hit_rate: number;
  status: string;
  error: string | null;
};
