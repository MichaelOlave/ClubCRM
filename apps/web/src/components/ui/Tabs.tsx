"use client";

import { useState } from "react";
import type { TabItem } from "@/types/ui";
import { cn } from "@/lib/utils/cn";

type Props = {
  activeId?: string;
  tabs: TabItem[];
};

export function Tabs({ activeId, tabs }: Props) {
  const initialTabId = activeId ?? tabs[0]?.id ?? "";
  const [selectedTabId, setSelectedTabId] = useState(initialTabId);
  const activeTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id;

          return (
            <button
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                isActive ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-600"
              )}
              key={tab.id}
              onClick={() => setSelectedTabId(tab.id)}
              type="button"
            >
              {tab.label}
              {tab.count ? <span className="text-xs opacity-80">{tab.count}</span> : null}
            </button>
          );
        })}
      </div>

      <div>{activeTab?.content}</div>
    </div>
  );
}
