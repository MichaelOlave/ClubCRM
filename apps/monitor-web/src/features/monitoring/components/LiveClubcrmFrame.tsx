type Props = {
  demoUrl: string;
};

export function LiveClubcrmFrame({ demoUrl }: Props) {
  return (
    <section className="monitor-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border/70 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="monitor-label">Live app surface</div>
          <h2 className="text-2xl font-semibold">ClubCRM failover view</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            The embedded ClubCRM diagnostics page polls the live host and shows the current browser
            entry pod plus the upstream API pod. Recycle the active web pod from the control rail to
            watch the view switch to the replacement pod.
          </p>
        </div>
        <a
          className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-sm font-medium whitespace-nowrap text-primary transition hover:bg-primary/15"
          href={demoUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open live page
        </a>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-full border border-border/70 bg-accent/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {demoUrl}
        </div>
        <iframe
          className="h-[920px] w-full rounded-[1.75rem] border border-border/70 bg-white"
          loading="eager"
          src={demoUrl}
          title="ClubCRM live routing demo"
        />
      </div>
    </section>
  );
}
