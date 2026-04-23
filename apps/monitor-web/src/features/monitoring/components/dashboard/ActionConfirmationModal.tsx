type PendingConfirmation = {
  actionKey: string;
  message: string;
};

type Props = {
  confirmation: PendingConfirmation | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ActionConfirmationModal({ confirmation, onCancel, onConfirm }: Props) {
  if (!confirmation) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-border/70 bg-background/95 p-6 shadow-2xl shadow-black/30">
        <div className="monitor-label">Confirm action</div>
        <h2 className="mt-2 text-2xl font-semibold">Run this demo command?</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{confirmation.message}</p>
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
            className="rounded-full border border-primary/50 bg-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
