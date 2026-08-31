import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/client.js";
import { Loading, ErrorState } from "../../components/Loading.jsx";

// The "Skill Passport" — deliberately styled to look like a credential/ID
// document, not a generic marketplace profile card, to visually communicate
// "VERIFIED BY COOPERATIVE" as a distinct trust artifact.
export default function SkillPassport() {
  const { id } = useParams();
  const [worker, setWorker] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/workers/${id}`).then((r) => setWorker(r.data)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!worker) return <Loading />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="rounded-2xl overflow-hidden border-2 border-coop-800 shadow-lg">
        <div className="bg-gradient-to-r from-coop-800 to-coop-600 text-white px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-coop-200">Cooperative Skill Passport</p>
            <p className="text-lg font-bold mt-0.5">SahakarSetu</p>
          </div>
          <span className="badge bg-gold-400 text-coop-900 font-bold">✓ VERIFIED BY COOPERATIVE</span>
        </div>

        <div className="bg-white p-6">
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 rounded-xl bg-coop-100 text-coop-700 flex items-center justify-center font-bold text-3xl shrink-0 border-2 border-coop-200">
              {worker.user?.name?.[0] || "W"}
            </div>
            <div className="flex-1">
              <p className="text-xl font-bold text-stone-900">{worker.user?.name}</p>
              <p className="text-sm text-stone-500">Worker ID: {worker.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-sm text-stone-500">{worker.society?.name}</p>
              <div className="flex gap-3 mt-2 text-sm">
                <span>⭐ {worker.ratingAvg?.toFixed(1) || "—"}</span>
                <span>· {worker.jobsCompleted} jobs</span>
                <span>· {worker.experienceYears} yrs experience</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="rounded-xl bg-stone-50 p-4">
              <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Skills</p>
              {worker.skills?.length ? (
                <ul className="text-sm space-y-1">
                  {worker.skills.map((s) => <li key={s.id}>• {s.skillName} <span className="text-stone-400">({s.level})</span></li>)}
                </ul>
              ) : <p className="text-sm text-stone-400">None listed</p>}
            </div>
            <div className="rounded-xl bg-stone-50 p-4">
              <p className="text-xs font-semibold text-stone-500 uppercase mb-2">Certifications</p>
              {worker.certifications?.length ? (
                <ul className="text-sm space-y-1">
                  {worker.certifications.map((c) => (
                    <li key={c.id} className="flex items-center gap-1">
                      {c.verified ? "✓" : "○"} {c.title}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-stone-400">None submitted</p>}
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-coop-50 border border-coop-200 p-4 text-sm text-coop-800">
            This worker's identity, skills, and certifications have been verified by their Labour Cooperative Society, in line with National Council for Cooperative Training (NCCT) standards. This is a digital credential, not a self-reported profile.
          </div>
        </div>
      </div>
    </div>
  );
}
