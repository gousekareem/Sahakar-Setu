import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const STEPS = [
  {
    n: 1, title: "Institution posts a bulk requirement",
    body: "Log in as the demo Institution account. A contract titled \"Demo Institution — Society Maintenance Contract\" is already posted, requiring 20 electricians + 10 plumbers.",
    action: "Log in as Institution", phone: "9000000005",
  },
  {
    n: 2, title: "Cooperative societies submit quotations",
    body: "Log in as the demo Cooperative Admin and go to Contracts → submit a quotation on the open contract with your price, worker count, and SLA.",
    action: "Log in as Coop Admin", phone: "9000000004",
  },
  {
    n: 3, title: "Institution reviews and awards",
    body: "Back in the Institution account, open the contract and award it to the submitted quotation.",
    action: "Log in as Institution", phone: "9000000005",
  },
  {
    n: 4, title: "AI ranks workers for a household booking",
    body: "Log in as the demo Customer, search for Electrical service, and see the AI Workforce Allocation Engine rank nearby verified workers with a live match score and explanation.",
    action: "Log in as Customer", phone: "9000000002",
  },
  {
    n: 5, title: "Demand forecast identifies a shortage",
    body: "Log in as Coop Admin → Capacity & Federation Network → check Electrical. This is simulated/prototype forecasting over seeded demand data — see AI.md for the model.",
    action: "Log in as Coop Admin", phone: "9000000004",
  },
  {
    n: 6, title: "Nearby cooperative capacity is discovered",
    body: "The same shortage check surfaces Guntur's surplus electricians — a live capacity-sharing request can be sent from here.",
    action: null,
  },
  {
    n: 7, title: "Job is assigned, service completed",
    body: "As Worker, accept the job in Jobs and walk it through to Completed.",
    action: "Log in as Worker", phone: "9000000003",
  },
  {
    n: 8, title: "Payment is distributed transparently",
    body: "As Customer, pay for the completed booking and see the Fair Wage breakdown: worker payout, welfare contribution, cooperative operations share.",
    action: "Log in as Customer", phone: "9000000002",
  },
  {
    n: 9, title: "Cooperative Intelligence dashboard updates",
    body: "As Coop Admin, the dashboard reflects the new completed job, updated capacity, and earnings — all computed live, not hardcoded.",
    action: "Log in as Coop Admin", phone: "9000000004",
  },
];

export default function DemoMode() {
  const { login } = useAuth();

  const quickLogin = async (phone) => {
    try { await login(phone, "Demo@123"); window.location.href = "/"; } catch {}
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <span className="badge bg-gold-100 text-gold-600 mb-3">Demo Mode</span>
        <h1 className="text-2xl font-bold text-stone-900">Guided Judge Walkthrough</h1>
        <p className="text-stone-500 mt-2 max-w-xl mx-auto">
          A step-by-step tour of SahakarSetu's core loop: demand → verification → matching →
          cooperative allocation → service → payment/welfare → forecasting → capacity sharing.
          All data shown is seeded demonstration data (password for every account: <code>Demo@123</code>).
        </p>
      </div>

      <div className="space-y-4">
        {STEPS.map((s) => (
          <div key={s.n} className="card p-5 flex gap-4">
            <span className="w-8 h-8 rounded-full bg-coop-600 text-white flex items-center justify-center font-bold text-sm shrink-0">{s.n}</span>
            <div className="flex-1">
              <p className="font-semibold text-stone-900">{s.title}</p>
              <p className="text-sm text-stone-600 mt-1">{s.body}</p>
              {s.action && (
                <button onClick={() => quickLogin(s.phone)} className="btn-secondary text-xs !py-1.5 !px-3 mt-3">
                  {s.action}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-stone-400 text-center mt-8">
        Every number and AI output shown in this demo is generated live from the seeded database — nothing here is a static mockup.
        See <Link to="/why-sahakarsetu" className="underline">Why SahakarSetu</Link> for the product differentiation story.
      </p>
    </div>
  );
}
