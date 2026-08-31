import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import api from "../../api/client.js";
import { Loading, EmptyState } from "../../components/Loading.jsx";

export default function InstitutionDashboard() {
  const [institution, setInstitution] = useState(undefined); // undefined = loading, null = not registered
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    api.get("/institutions/me").then((r) => setInstitution(r.data)).catch(() => setInstitution(null));
    api.get("/institutions/contracts").then((r) => setContracts(r.data)).catch(() => {});
  }, []);

  if (institution === undefined) return <Loading />;
  if (institution === null) return <Navigate to="/institution/onboarding" replace />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{institution.orgName}</h1>
          <p className="text-sm text-stone-500">{institution.orgType} · {institution.city}</p>
        </div>
        <Link to="/institution/post-contract" className="btn-primary">+ Post Requirement</Link>
      </div>

      <h2 className="text-lg font-bold text-stone-900 mb-3">Your Contracts</h2>
      {contracts.length === 0 && <EmptyState title="No contracts posted yet" subtitle="Post a bulk workforce requirement to get quotations from cooperative societies." />}
      <div className="space-y-3">
        {contracts.map((c) => (
          <Link key={c.id} to={`/institution/contracts/${c.id}`} className="card p-5 block hover:border-coop-300">
            <div className="flex justify-between items-start">
              <p className="font-semibold text-stone-900">{c.title}</p>
              <span className="badge bg-gold-100 text-gold-600">{c.status}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {c.requirements.map((r) => (
                <span key={r.id} className="badge bg-stone-100 text-stone-600">{r.workersNeeded}× {r.category.name}</span>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">{c.quotations.length} quotation(s) received</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
