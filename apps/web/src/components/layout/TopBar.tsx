import Link from "next/link";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";

type Props = {
  logoutAction: () => Promise<void>;
  subtitle: string;
  title: string;
};

export function TopBar({ logoutAction, subtitle, title }: Props) {
  return (
    <header className="flex flex-col gap-4 rounded-[1.75rem] border border-border bg-card/80 px-6 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-brand">{subtitle}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="success">Backend auth required</Badge>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            Logout
          </Button>
        </form>
        <Button asChild variant="secondary">
          <Link href="/system/health">System health</Link>
        </Button>
      </div>
    </header>
  );
}
