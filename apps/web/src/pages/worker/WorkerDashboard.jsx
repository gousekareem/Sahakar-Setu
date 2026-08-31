import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";
import StatCard from "../../components/StatCard.jsx";
import { StatusBadge, VerificationBadge } from "../../components/Badges.jsx";

export default function WorkerDashboard() {
  const [data, setData] = useState(null);
  const [toggling, setToggling] = useState(false);

  const load = () => api.get("/workers/me/dashboard").then((r) => setData(r.data));
  useEffect(() => { load(); }, []);

  const toggleOnline = async () => {
    setToggling(true);
    try {
      await api.post("/workers/me/availability", { isOnline: !data.worker.isOnline });
      await load();
    } finally { setToggling(false); }
  };

  if (!data) return <Loading />;
  const { worker, todaysJobs, upcomingJobsCount, completedJobsCount, earnings, welfare } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-900">Welcome, {worker.user?.name || "Worker"}</h1>
            <VerificationBadge status={worker.verificationStatus} />
          </div>
          <p className="text-sm text-stone-500 mt-1">⭐ {worker.ratingAvg?.toFixed(1) || "—"} · {worker.jobsCompleted} jobs completed</p>
        </div>
        <button onClick={toggleOnline} disabled={toggling || worker.verificationStatus !== "VERIFIED"}
          className={worker.isOnline ? "btn-primary" : "btn-secondary"}>
          {worker.isOnline ? "🟢 Online — Go Offline" : "⚪ Offline — Go Online"}
        </button>
      </div>

      {worker.verificationStatus !== "VERIFIED" && (
        <div className="card p-4 mt-5 bg-amber-50 border-amber-200 text-amber-800 text-sm">
          Your profile is pending cooperative verification. You'll be able to receive bookings once your documents and skills are verified.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
        <StatCard label="Today's Jobs" value={todaysJobs.length} />
        <StatCard label="Upcoming" value={upcomingJobsCount} />
        <StatCard label="Completed" value={completedJobsCount} />
        <StatCard label="Rating" value={`${worker.ratingAvg?.toFixed(1) || "—"} ★`} />
      </div>

      <h2 className="text-lg font-bold text-stone-900 mt-8 mb-3">Earnings</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Today" value={`₹${earnings.total}`} accent="saffron" />
        <StatCard label="This week" value={`₹${earnings.weekly}`} accent="saffron" />
        <StatCard label="This month" value={`₹${earnings.monthly}`} accent="saffron" />
      </div>

      <h2 className="text-lg font-bold text-stone-900 mt-8 mb-3">Today's Jobs</h2>
      {todaysJobs.length === 0 ? (
        <p className="text-sm text-stone-400">No jobs scheduled for today.</p>
      ) : (
        <div className="space-y-2">
          {todaysJobs.map((j) => (
            <div key={j.id} className="card p-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{j.category.name}</p>
                <p className="text-xs text-stone-500">{j.customer?.name} · {new Date(j.scheduledAt).toLocaleTimeString()}</p>
              </div>
              <StatusBadge status={j.status} />
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-bold text-stone-900 mt-8 mb-3">Welfare</h2>
      <div className="card p-5">
        {welfare?.enrolled ? (
          <div className="text-sm space-y-1">
            <p className="text-emerald-700 font-semibold">✓ Enrolled — {welfare.policyProvider}</p>
            <p className="text-stone-500">Policy: {welfare.policyNumber} · Coverage ₹{welfare.coverageAmount?.toLocaleString("en-IN")}</p>
          </div>
        ) : (
          <p className="text-sm text-stone-500">Not yet enrolled in the cooperative welfare scheme. Contact your society administrator.</p>
        )}
      </div>
    </div>
  );
}
