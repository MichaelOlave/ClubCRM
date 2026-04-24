"use client";

import { useEffect } from "react";

/**
 * TabScrollHandler prevents the "teleport" jump when switching from a long tab
 * to a short tab by locking the height during the transition and smoothly
 * scrolling the user back to the top of the tabs section if they were scrolled down.
 */
export function TabScrollHandler() {
  useEffect(() => {
    const handleTabClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const trigger = target.closest('[data-slot="tabs-trigger"]');

      if (trigger) {
        const tabsRoot = trigger.closest('[data-slot="tabs"]') as HTMLElement;
        if (tabsRoot) {
          // 1. Capture current height and lock it to prevent the page from collapsing/jumping
          const currentHeight = tabsRoot.offsetHeight;
          tabsRoot.style.minHeight = `${currentHeight}px`;

          // 2. Start the smooth scroll immediately if the header is off-screen
          const rect = tabsRoot.getBoundingClientRect();
          if (rect.top < 0) {
            window.scrollTo({
              top: window.pageYOffset + rect.top - 120, // Offset for top header
              behavior: "smooth",
            });
          }

          // 3. Release the height lock after the transition animation (0.7s) finishes
          setTimeout(() => {
            tabsRoot.style.minHeight = "";
          }, 800);
        }
      }
    };

    // Use capture to ensure we handle this as early as possible
    document.addEventListener("click", handleTabClick, { capture: true });
    return () => document.removeEventListener("click", handleTabClick, { capture: true });
  }, []);

  return null;
}
