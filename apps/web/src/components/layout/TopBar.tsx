import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Props = {
  subtitle: string;
  title: string;
};

export function TopBar({ subtitle, title }: Props) {
  return (
    <header className="flex flex-col gap-4 rounded-[1.75rem] border border-zinc-200 bg-white/80 px-6 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-amber-700">{subtitle}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="muted">No auth guard yet</Badge>
        <Button href="/system/health" variant="secondary">
          System health
        </Button>
      </div>
    </header>
  );
}
