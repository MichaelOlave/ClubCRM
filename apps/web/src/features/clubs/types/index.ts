import type { AnnouncementRecord, ClubRecord, EventRecord } from "@/types/api";

export type ClubListViewModel = {
  clubs: ClubRecord[];
};

export type ClubDetailViewModel = {
  announcements: AnnouncementRecord[];
  club: ClubRecord;
  events: EventRecord[];
};
