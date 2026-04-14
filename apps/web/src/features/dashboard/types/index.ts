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

export type DashboardViewModel = {
  activity: ActivityRecord[];
  metrics: DashboardMetric[];
  quickActions: QuickAction[];
};
