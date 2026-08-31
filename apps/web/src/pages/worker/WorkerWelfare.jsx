import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";

export default function WorkerWelfare() {
  const [welfare, setWelfare] = useState(null);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.get("/welfare/me").then((r) => setWelfare(r.data));
  useEffect(() => { load(); }, []);

  const submitClaim = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/welfare/me/claims", { reason, amountClaimed: Number(amount) });
      setReason(""); setAmount("");
      await load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  if (!welfare) return <Loading />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-6">Welfare & Insurance</h1>

      <div className="card p-6">
        {welfare.enrolled ? (
          <>
            <p className="text-emerald-700 font-semibold">✓ Enrolled in {welfare.policyProvider}</p>
            <div className="mt-3 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-stone-500">Policy number</span><span>{welfare.policyNumber}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Coverage amount</span><span>₹{welfare.coverageAmount?.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Premium</span><span>{welfare.premiumPaidByCoop ? "Paid by cooperative" : "Self-paid"}</span></div>
            </div>
          </>
        ) : (
          <p className="text-stone-500 text-sm">You are not yet enrolled in the cooperative welfare scheme. Please contact your cooperative society administrator to get enrolled.</p>
        )}
      </div>

      {welfare.enrolled && (
        <>
          <h2 className="text-lg font-bold text-stone-900 mt-8 mb-3">Submit a Claim</h2>
          <form onSubmit={submitClaim} className="card p-5 space-y-3">
            <input required className="input" placeholder="Reason for claim" value={reason} onChange={(e) => setReason(e.target.value)} />
            <input required type="number" min="1" className="input" placeholder="Amount claimed (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={submitting}>{submitting ? "Submitting..." : "Submit claim"}</button>
          </form>

          <h2 className="text-lg font-bold text-stone-900 mt-8 mb-3">Claim History</h2>
          {welfare.claims?.length ? (
            <div className="space-y-2">
              {welfare.claims.map((c) => (
                <div key={c.id} className="card p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{c.reason}</p>
                    <p className="text-xs text-stone-400">{new Date(c.createdAt || c.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{c.amountClaimed ?? c.amount_claimed}</p>
                    <span className="badge bg-amber-100 text-amber-700 text-xs">{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400">No claims submitted yet.</p>
          )}
        </>
      )}
    </div>
  );
}
