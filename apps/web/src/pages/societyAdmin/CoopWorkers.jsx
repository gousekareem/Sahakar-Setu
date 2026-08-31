import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading, EmptyState } from "../../components/Loading.jsx";
import { VerificationBadge } from "../../components/Badges.jsx";

const STATUSES = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED"];

export default function CoopWorkers() {
  const [workers, setWorkers] = useState(null);
  const [pendingCerts, setPendingCerts] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    api.get("/society-admin/workers").then((r) => setWorkers(r.data));
    api.get("/certifications/pending").then((r) => setPendingCerts(r.data));
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (worker, status) => {
    setBusyId(worker.id);
    try { await api.post(`/society-admin/workers/${worker.id}/verify`, { status }); load(); } finally { setBusyId(null); }
  };

  const reviewCert = async (cert, status) => {
    setBusyId(cert.id);
    try { await api.post(`/certifications/${cert.id}/review`, { status }); load(); } finally { setBusyId(null); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-6">Workforce & Verification</h1>

      {pendingCerts.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-stone-900 mb-3">Pending Certifications</h2>
          <div className="space-y-2 mb-8">
            {pendingCerts.map((c) => (
              <div key={c.id} className="card p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{c.title} — {c.workerName}</p>
                  <p className="text-xs text-stone-500">{c.issuingBody}</p>
                </div>
                <div className="flex gap-2">
                  <button disabled={busyId === c.id} onClick={() => reviewCert(c, "APPROVED")} className="btn-primary text-xs !py-1.5 !px-3">Approve</button>
                  <button disabled={busyId === c.id} onClick={() => reviewCert(c, "REJECTED")} className="btn-secondary text-xs !py-1.5 !px-3 !text-red-600">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-lg font-bold text-stone-900 mb-3">Workers</h2>
      {!workers && <Loading />}
      {workers && workers.length === 0 && <EmptyState title="No workers in your cooperative yet" />}
      <div className="space-y-3">
        {workers?.map((w) => (
          <div key={w.id} className="card p-5 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-stone-900">{w.user.name}</p>
                <VerificationBadge status={w.verificationStatus} />
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{w.user.phone} · {w.homeCity} · {w.experienceYears} yrs exp · ⭐ {w.ratingAvg?.toFixed(1) || "—"}</p>
            </div>
            <select
              value={w.verificationStatus}
              disabled={busyId === w.id}
              onChange={(e) => setStatus(w, e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2 py-1.5"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
