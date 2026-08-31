import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading, EmptyState } from "../../components/Loading.jsx";
import { StatusBadge } from "../../components/Badges.jsx";

const NEXT_STATUS = {
  ASSIGNED: "ACCEPTED",
  ACCEPTED: "ON_THE_WAY",
  ON_THE_WAY: "ARRIVED",
  ARRIVED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};
const ACTION_LABEL = {
  ASSIGNED: "Accept job",
  ACCEPTED: "Start heading over",
  ON_THE_WAY: "Mark arrived",
  ARRIVED: "Start service",
  IN_PROGRESS: "Mark completed",
};

export default function WorkerJobs() {
  const [jobs, setJobs] = useState(null);
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = () => api.get("/workers/me/jobs", { params: filter ? { status: filter } : {} }).then((r) => setJobs(r.data));
  useEffect(() => { load(); }, [filter]);

  const advance = async (job) => {
    setBusyId(job.id);
    try {
      await api.patch(`/bookings/${job.id}/status`, { status: NEXT_STATUS[job.status] });
      await load();
    } finally { setBusyId(null); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-4">My Jobs</h1>
      <div className="flex gap-2 mb-5 flex-wrap">
        {["", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border ${filter === s ? "bg-coop-600 text-white border-coop-600" : "bg-white border-stone-200 text-stone-600"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {!jobs && <Loading />}
      {jobs && jobs.length === 0 && <EmptyState title="No jobs found" />}

      <div className="space-y-3">
        {jobs?.map((j) => (
          <div key={j.id} className="card p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-stone-900">{j.category.name} {j.isEmergency && <span className="text-red-600 text-xs ml-1">EMERGENCY</span>}</p>
              <p className="text-xs text-stone-500 mt-0.5">{j.customer?.name} · {j.address?.city} · {new Date(j.scheduledAt).toLocaleString()}</p>
              <p className="text-xs text-stone-400 mt-0.5">{j.description}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <StatusBadge status={j.status} />
              {NEXT_STATUS[j.status] && (
                <button onClick={() => advance(j)} disabled={busyId === j.id} className="btn-primary text-xs !py-1.5 !px-3 mt-2 block">
                  {busyId === j.id ? "..." : ACTION_LABEL[j.status]}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
