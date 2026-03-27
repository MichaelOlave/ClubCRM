"use client";

import type { TabItem } from "@/types/ui";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

type Props = {
  activeId?: string;
  tabs: TabItem[];
};

export function TabsView({ activeId, tabs }: Props) {
  const initialTabId = activeId ?? tabs[0]?.id ?? "";

  if (!tabs.length) {
    return null;
  }

  return (
    <Tabs className="space-y-5" defaultValue={initialTabId}>
      <TabsList className="border-b border-border pb-4">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
            {tab.count ? <span className="text-xs opacity-80">{tab.count}</span> : null}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
