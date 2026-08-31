import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading, EmptyState } from "../../components/Loading.jsx";

export default function CoopContracts() {
  const [openContracts, setOpenContracts] = useState(null);
  const [myContracts, setMyContracts] = useState(null);
  const [quoting, setQuoting] = useState(null);
  const [form, setForm] = useState({ totalPrice: "", workersOffered: "", slaCommitmentHours: "24", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api.get("/contracts/open").then((r) => setOpenContracts(r.data));
    api.get("/society-admin/contracts").then((r) => setMyContracts(r.data));
  };
  useEffect(() => { load(); }, []);

  const submitQuote = async (contractId) => {
    setSubmitting(true);
    try {
      await api.post(`/contracts/${contractId}/quote`, {
        totalPrice: Number(form.totalPrice), workersOffered: Number(form.workersOffered),
        slaCommitmentHours: Number(form.slaCommitmentHours), notes: form.notes,
      });
      setQuoting(null);
      setForm({ totalPrice: "", workersOffered: "", slaCommitmentHours: "24", notes: "" });
      load();
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-1">Institutional Contracts</h1>
      <p className="text-sm text-stone-500 mb-6">Browse bulk workforce requirements from institutions and submit quotations.</p>

      <h2 className="text-lg font-bold text-stone-900 mb-3">Open for Quotation</h2>
      {!openContracts && <Loading />}
      {openContracts && openContracts.length === 0 && <EmptyState title="No open contracts right now" />}
      <div className="space-y-3 mb-8">
        {openContracts?.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-stone-900">{c.title}</p>
                <p className="text-xs text-stone-500">{c.institution?.orgName} · {c.institution?.city}</p>
              </div>
              <span className="badge bg-gold-100 text-gold-600">{c.status}</span>
            </div>
            <p className="text-sm text-stone-600 mt-2">{c.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {c.requirements.map((r) => (
                <span key={r.id} className="badge bg-stone-100 text-stone-600">{r.workersNeeded}× {r.category.name}</span>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">{c.durationMonths} months · SLA within {c.slaResponseHours}h</p>

            {c.quotations.length > 0 && (
              <div className="mt-3 text-xs text-stone-500">{c.quotations.length} quotation(s) submitted so far, lowest ₹{c.quotations[0].totalPrice.toLocaleString("en-IN")}</div>
            )}

            {quoting === c.id ? (
              <div className="mt-4 space-y-2 border-t border-stone-100 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="Total price (₹)" type="number" value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} />
                  <input className="input" placeholder="Workers offered" type="number" value={form.workersOffered} onChange={(e) => setForm({ ...form, workersOffered: e.target.value })} />
                </div>
                <input className="input" placeholder="SLA commitment (hours)" type="number" value={form.slaCommitmentHours} onChange={(e) => setForm({ ...form, slaCommitmentHours: e.target.value })} />
                <textarea className="input" placeholder="Notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={() => submitQuote(c.id)} disabled={submitting} className="btn-primary text-sm">{submitting ? "Submitting..." : "Submit quotation"}</button>
                  <button onClick={() => setQuoting(null)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setQuoting(c.id)} className="btn-primary text-sm mt-3">Submit quotation</button>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-stone-900 mb-3">Awarded to Your Cooperative</h2>
      {myContracts && myContracts.length === 0 && <p className="text-sm text-stone-400">No contracts awarded yet.</p>}
      <div className="space-y-2">
        {myContracts?.map((c) => (
          <div key={c.id} className="card p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{c.title}</p>
              <p className="text-xs text-stone-500">{c.institution?.orgName}</p>
            </div>
            <span className="badge bg-emerald-100 text-emerald-700">{c.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
