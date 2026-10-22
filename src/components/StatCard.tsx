export default function StatCard({ icon, label, value, hint, delay = 0 }: any) {
  return (
    <div className="card animate-fade-up p-5" style={{ animationDelay: delay + "s" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="mt-2 truncate text-3xl font-extrabold">{value}</div>
      {hint && <div className="mt-1 truncate text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}
