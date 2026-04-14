"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";

type QuickActionSection = {
  content: ReactNode;
  label: string;
};

type Props = {
  footer?: ReactNode;
  sections: QuickActionSection[];
};

export function ClubQuickActions({ footer, sections }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    function hasActiveModal(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) {
        return false;
      }

      return Boolean(
        target.closest(
          '[data-slot="dialog-content"], [data-slot="dialog-overlay"], [data-slot="sheet-content"], [data-slot="sheet-overlay"]'
        )
      );
    }

    function handlePointerDown(event: MouseEvent) {
      if (hasActiveModal(event.target)) {
        return;
      }

      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (hasActiveModal(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <Button
        aria-controls={panelId}
        aria-expanded={open}
        className="w-full justify-between sm:w-auto sm:min-w-44"
        onClick={() => setOpen((current) => !current)}
        size="sm"
        variant="secondary"
      >
        Quick actions
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>

      {open ? (
        <div
          className="absolute right-0 z-20 mt-3 w-[min(24rem,calc(100vw-2rem))] space-y-4 rounded-[1.5rem] border border-border/70 bg-card/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur sm:p-5"
          id={panelId}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">Quick actions</Badge>
            <p className="text-sm text-muted-foreground">
              Keep editing, publishing, and roster work close at hand.
            </p>
          </div>

          <div className="space-y-3">
            {sections.map((section) => (
              <div className="space-y-2" key={section.label}>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {section.label}
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  onClick={(event) => {
                    const target = event.target as HTMLElement | null;

                    if (target?.closest("a")) {
                      setOpen(false);
                    }
                  }}
                >
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {footer ? <div className="border-t border-border/70 pt-3">{footer}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
