export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-6 px-6 py-12">
      <span className="monitor-label">Companion Monitoring Stack</span>
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          ClubCRM networking control plane
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          This standalone Next.js app hosts the dedicated monitoring dashboard used for the
          networking demo environment.
        </p>
      </div>
    </main>
  );
}
