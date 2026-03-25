"use client";

import { usePathname } from "next/navigation";

export function useActivePath() {
  const pathname = usePathname();

  return (href: string): boolean => {
    if (href === "/") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };
}
