type Props = {
  connected: boolean;
  details: string;
};

export function HealthStatusCard({ connected, details }: Props) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-foreground p-6 text-background sm:p-8">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-3.5 w-3.5 rounded-full ${
            connected ? "bg-success-solid" : "bg-destructive"
          }`}
        />
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-background/70">
          Current state
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <p className="text-3xl font-semibold sm:text-4xl">
          {connected ? "Connected" : "Not connected"}
        </p>
        <p className="max-w-xl text-base leading-7 text-background/80">{details}</p>
      </div>
    </div>
  );
}
