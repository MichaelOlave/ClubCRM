import type { ActivityRecord } from "@/types/api";

export type DashboardMetric = {
  detail: string;
  label: string;
  tone: "default" | "success" | "warning";
  value: string;
};

export type QuickAction = {
  description: string;
  href: string;
  id: string;
  label: string;
};

export type DashboardRedisClubSummary = {
  cacheDetail: string;
  cacheStatus: string;
  clubId: string;
  clubName: string;
  hitRate: string;
  requestCount: string;
  totalAnnouncements: number;
  totalEvents: number;
  totalMembers: number;
};

export type DashboardRedisView = {
  clubSummaries: DashboardRedisClubSummary[];
  description: string;
  metrics: DashboardMetric[];
  title: string;
};

export type DashboardViewModel = {
  activity: ActivityRecord[];
  metrics: DashboardMetric[];
  quickActions: QuickAction[];
  redisViews: {
    admin: DashboardRedisView;
    user: DashboardRedisView;
  };
};
