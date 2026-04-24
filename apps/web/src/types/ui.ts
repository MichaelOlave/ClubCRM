import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon?: string;
};

export type TableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
};

export type TabItem = {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
};
