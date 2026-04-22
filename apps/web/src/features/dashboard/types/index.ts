export type DashboardMetric = {
  detail: string;
  label: string;
  tone: "default" | "success" | "warning";
  value: string;
};

export type DashboardActivityRecord = {
  description: string;
  id: string;
  timestamp: string;
  title: string;
  href: string;
  type: "announcement" | "event";
};

export type DashboardViewModel = {
  activity: DashboardActivityRecord[];
  metrics: DashboardMetric[];
  joinPreviewHref: string | null;
};
