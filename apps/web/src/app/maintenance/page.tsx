export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
      <section className="max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">Maintenance mode</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">OneHub is temporarily paused for maintenance.</h1>
        <p className="mt-4 text-base leading-7 text-slate-200">
          We are applying a scheduled safety window. Write actions are frozen until the maintenance window closes.
        </p>
        <p className="mt-4 text-sm text-slate-300">
          Please retry shortly. If you are coordinating an active event, contact your OneHub operator through your approved support channel.
        </p>
      </section>
    </main>
  );
}
