import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading, EmptyState } from "../../components/Loading.jsx";
import { VerificationBadge } from "../../components/Badges.jsx";

const STATUSES = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED"];

export default function AdminWorkers() {
  const [workers, setWorkers] = useState(null);
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = () => api.get("/admin/workers", { params: filter ? { status: filter } : {} }).then((r) => setWorkers(r.data));
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (worker, status) => {
    setBusyId(worker.id);
    try { await api.post(`/admin/workers/${worker.id}/verify`, { status }); await load(); } finally { setBusyId(null); }
  };

  const enrollWelfare = async (worker) => {
    setBusyId(worker.id);
    try { await api.post(`/admin/workers/${worker.id}/welfare/enroll`); await load(); } finally { setBusyId(null); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-4">Workforce & Verification</h1>
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setFilter("")} className={`text-xs px-3 py-1.5 rounded-full border ${!filter ? "bg-coop-600 text-white border-coop-600" : "bg-white border-stone-200 text-stone-600"}`}>All</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border ${filter === s ? "bg-coop-600 text-white border-coop-600" : "bg-white border-stone-200 text-stone-600"}`}>{s}</button>
        ))}
      </div>

      {!workers && <Loading />}
      {workers && workers.length === 0 && <EmptyState title="No workers found" />}

      <div className="space-y-3">
        {workers?.map((w) => (
          <div key={w.id} className="card p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-stone-900">{w.user.name}</p>
                  <VerificationBadge status={w.verificationStatus} />
                </div>
                <p className="text-xs text-stone-500 mt-0.5">{w.user.phone} · {w.homeCity} · {w.society?.name}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Skills: {w.skills.map((s) => s.skill_name).join(", ") || "—"} · {w.experienceYears} yrs exp
                </p>
                <p className="text-xs text-stone-400">
                  Certifications: {w.certifications.length ? w.certifications.map((c) => c.title).join(", ") : "None submitted"}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 items-end">
                <select
                  value={w.verificationStatus}
                  disabled={busyId === w.id}
                  onChange={(e) => setStatus(w, e.target.value)}
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1.5"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => enrollWelfare(w)} disabled={busyId === w.id} className="text-xs text-coop-700 font-semibold">Enroll in welfare</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
