import Link from "next/link";

import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { ModeToggle } from "@/components/mode-toggle";

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

      <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
        <ModeToggle />
        <Badge className="px-3.5 py-1.5" variant="success">
          Backend auth required
        </Badge>
        <Button asChild size="sm" variant="ghost">
          <Link href="/system/health">System health</Link>
        </Button>
        <form action={logoutAction}>
          <Button size="sm" type="submit" variant="outline">
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}
