"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Card, CardContent } from "@/components/shadcn/card";

type Doc = {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: string;
};

type Props = {
  docs: Doc[];
};

export function DocsPageClient({ docs }: Props) {
  const [activeTab, setActiveTab] = React.useState(docs[0]?.id || "");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto rounded-2xl border border-border bg-muted/30 p-1 mb-6">
          {docs.map((doc) => (
            <TabsTrigger
              key={doc.id}
              value={doc.id}
              className="rounded-xl data-[state=active]:shadow-sm flex items-center gap-2 px-4 py-2"
            >
              {doc.icon}
              {doc.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {docs.map((doc) => (
          <TabsContent key={doc.id} value={doc.id} className="mt-0 focus-visible:outline-none">
            <Card className="rounded-[2rem] border-border/60 bg-card/30 overflow-hidden">
              <CardContent className="p-8 sm:p-12">
                <div className="prose prose-zinc dark:prose-invert max-w-none">
                  {renderMarkdown(doc.content)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function renderMarkdown(content: string) {
  if (!content) return null;
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentCodeBlock: string[] | null = null;
  let currentList: { items: string[]; type: "ul" | "ol" } | null = null;

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.type === "ul" ? "ul" : "ol";
      elements.push(
        <ListTag key={`list-${elements.length}`} className="my-4 ml-6 list-disc space-y-2">
          {currentList.items.map((item, i) => (
            <li key={i} className="text-muted-foreground">
              {parseInline(item)}
            </li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  const flushCodeBlock = () => {
    if (currentCodeBlock) {
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="my-6 overflow-x-auto rounded-xl bg-muted/50 p-4 font-mono text-sm border border-border/40"
        >
          <code>{currentCodeBlock.join("\n")}</code>
        </pre>
      );
      currentCodeBlock = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (currentCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        currentCodeBlock = [];
      }
      continue;
    }

    if (currentCodeBlock) {
      currentCodeBlock.push(line);
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={i} className="mt-8 mb-4 text-xl font-bold tracking-tight text-foreground">
          {parseInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h2
          key={i}
          className="mt-10 mb-6 text-2xl font-bold tracking-tight text-foreground border-b border-border/40 pb-2"
        >
          {parseInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={i} className="mt-12 mb-8 text-3xl font-bold tracking-tight text-foreground">
          {parseInline(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Lists
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      if (!currentList) {
        currentList = { items: [], type: "ul" };
      }
      currentList.items.push(line.trim().slice(2));
      continue;
    }

    // Empty lines
    if (line.trim() === "") {
      flushList();
      elements.push(<div key={i} className="h-4" />);
      continue;
    }

    // Regular paragraphs
    flushList();
    elements.push(
      <p key={i} className="my-4 leading-relaxed text-muted-foreground">
        {parseInline(line)}
      </p>
    );
  }

  flushList();
  flushCodeBlock();

  return elements;
}

function parseInline(text: string) {
  // Simple inline parser for bold and code
  const parts: React.ReactNode[] = [];
  let currentPos = 0;

  // regex for **bold**, `code`, [link](url)
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > currentPos) {
      parts.push(text.slice(currentPos, match.index));
    }

    const m = match[0];
    if (m.startsWith("**") && m.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-bold text-foreground">
          {m.slice(2, -2)}
        </strong>
      );
    } else if (m.startsWith("`") && m.endsWith("`")) {
      parts.push(
        <code key={match.index} className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
          {m.slice(1, -1)}
        </code>
      );
    } else if (m.startsWith("[") && m.includes("](")) {
      const linkText = m.slice(1, m.indexOf("]("));
      const url = m.slice(m.indexOf("](") + 2, -1);
      parts.push(
        <a key={match.index} href={url} className="text-brand hover:underline font-medium">
          {linkText}
        </a>
      );
    }

    currentPos = regex.lastIndex;
  }

  if (currentPos < text.length) {
    parts.push(text.slice(currentPos));
  }

  return parts.length > 0 ? parts : text;
}
