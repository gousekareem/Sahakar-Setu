import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";

export default function ContractDetail() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [awarding, setAwarding] = useState(null);

  const load = () => api.get(`/contracts/${id}`).then((r) => setContract(r.data));
  useEffect(() => { load(); }, [id]);

  const award = async (quotationId) => {
    setAwarding(quotationId);
    try { await api.post(`/institutions/contracts/${id}/award/${quotationId}`); await load(); } finally { setAwarding(null); }
  };

  if (!contract) return <Loading />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex justify-between items-start">
        <h1 className="text-xl font-bold text-stone-900">{contract.title}</h1>
        <span className="badge bg-gold-100 text-gold-600">{contract.status}</span>
      </div>
      <p className="text-sm text-stone-600 mt-2">{contract.description}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {contract.requirements.map((r) => (
          <span key={r.id} className="badge bg-stone-100 text-stone-600">{r.workersNeeded}× {r.category.name} (min {r.minExperienceYears}y exp)</span>
        ))}
      </div>
      <p className="text-xs text-stone-400 mt-2">{contract.durationMonths} months · SLA within {contract.slaResponseHours}h</p>

      <h2 className="text-lg font-bold text-stone-900 mt-8 mb-3">Quotations ({contract.quotations.length})</h2>
      {contract.quotations.length === 0 && <p className="text-sm text-stone-400">No quotations received yet.</p>}
      <div className="space-y-3">
        {contract.quotations.map((q) => (
          <div key={q.id} className="card p-5 flex justify-between items-center">
            <div>
              <p className="font-semibold text-stone-900">{q.society?.name}</p>
              <p className="text-sm text-stone-600 mt-1">₹{q.totalPrice.toLocaleString("en-IN")} · {q.workersOffered} workers · SLA {q.slaCommitmentHours}h</p>
              {q.notes && <p className="text-xs text-stone-500 mt-1">{q.notes}</p>}
            </div>
            <div className="text-right">
              <span className={`badge ${q.status === "AWARDED" ? "bg-emerald-100 text-emerald-700" : q.status === "REJECTED" ? "bg-stone-200 text-stone-500" : "bg-blue-100 text-blue-700"}`}>{q.status}</span>
              {contract.status === "QUOTED" && q.status === "SUBMITTED" && (
                <button onClick={() => award(q.id)} disabled={awarding === q.id} className="btn-primary text-xs !py-1.5 !px-3 mt-2 block">
                  {awarding === q.id ? "Awarding..." : "Award contract"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
