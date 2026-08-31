export default function StatCard({ label, value, sub, accent = "coop" }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold text-${accent}-700`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-400">{sub}</p>}
    </div>
  );
}
