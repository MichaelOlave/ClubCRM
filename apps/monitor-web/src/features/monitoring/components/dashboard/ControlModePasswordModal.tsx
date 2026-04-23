type Props = {
  errorMessage: string | null;
  isOpen: boolean;
  isSubmitting: boolean;
  password: string;
  onCancel: () => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function ControlModePasswordModal({
  errorMessage,
  isOpen,
  isSubmitting,
  password,
  onCancel,
  onPasswordChange,
  onSubmit,
}: Props) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-border/70 bg-background/95 p-6 shadow-2xl shadow-black/30">
        <div className="monitor-label">Control mode</div>
        <h2 className="mt-2 text-2xl font-semibold">Enter password to continue</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Control mode exposes the operational dashboard and guarded recovery actions. Once
          unlocked, access stays cached in this browser for the next 12 hours.
        </p>
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-medium">Password</span>
          <input
            autoFocus
            className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50"
            name="monitor-mode-password"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSubmit();
              }
            }}
          />
        </label>
        {errorMessage ? (
          <p className="mt-3 text-sm font-medium text-critical">{errorMessage}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-border/80 px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-accent/80"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onSubmit}
          >
            {isSubmitting ? "Unlocking..." : "Unlock control mode"}
          </button>
        </div>
      </div>
    </div>
  );
}
