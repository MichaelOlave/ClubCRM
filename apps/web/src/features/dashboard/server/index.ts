import type { DashboardViewModel } from "@/features/dashboard/types";

export async function getDashboardViewModel(): Promise<DashboardViewModel> {
  return {
    metrics: [
      {
        label: "Active clubs",
        value: "2",
        detail: "Student groups with visible member, event, and announcement data.",
        tone: "success",
      },
      {
        label: "Shared members",
        value: "4",
        detail: "Organization-level records that can belong to multiple clubs.",
        tone: "default",
      },
      {
        label: "Open form flow",
        value: "1",
        detail: "Public join request path scaffolded and ready for API wiring.",
        tone: "warning",
      },
    ],
    quickActions: [
      {
        label: "Browse clubs",
        href: "/clubs",
        description: "Review the reusable club directory and detail surface.",
      },
      {
        label: "Browse members",
        href: "/members",
        description: "See organization-level member records and memberships.",
      },
      {
        label: "Preview join form",
        href: "/join/chess-society",
        description: "Open the public intake experience that stays outside auth.",
      },
    ],
    activity: [
      {
        id: "activity-club-created",
        title: "Chess Society opened spring registration",
        description: "Club profile now points members to the public join form.",
        timestamp: "2026-03-24T14:00:00.000Z",
        type: "club",
      },
      {
        id: "activity-member-added",
        title: "Two new members added to Design Guild",
        description: "Organization-level member records were linked to an existing club roster.",
        timestamp: "2026-03-24T10:30:00.000Z",
        type: "member",
      },
      {
        id: "activity-announcement",
        title: "Robotics Lab published a lab safety reminder",
        description: "Announcement history remains attached to the club detail screen in this MVP.",
        timestamp: "2026-03-23T18:15:00.000Z",
        type: "announcement",
      },
    ],
  };
}
