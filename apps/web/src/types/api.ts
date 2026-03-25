export type ClubStatus = "active" | "planning" | "archived";
export type MemberStatus = "active" | "prospective";
export type MembershipStatus = "active" | "pending";
export type EventStatus = "upcoming" | "draft";
export type AnnouncementStatus = "published" | "scheduled";
export type ActivityType = "club" | "member" | "form" | "event" | "announcement";

export type ClubRecord = {
  id: string;
  name: string;
  description: string;
  status: ClubStatus;
  memberCount: number;
  manager: string;
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
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  status: MemberStatus;
  clubCount: number;
  primaryClub: string;
};

export type MembershipRecord = {
  id: string;
  clubId: string;
  clubName: string;
  memberId: string;
  memberName: string;
  role: string;
  status: MembershipStatus;
  joinedAt: string;
};

export type ActivityRecord = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: ActivityType;
};
