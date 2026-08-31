import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";

export default function CoopSettings() {
  const [society, setSociety] = useState(null);
  const [welfarePct, setWelfarePct] = useState(8);
  const [platformPct, setPlatformPct] = useState(8);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/society-admin/society").then((r) => {
      setSociety(r.data);
      setWelfarePct(r.data.welfare_contribution_pct ?? r.data.welfareContributionPct);
      setPlatformPct(r.data.platform_fee_pct ?? r.data.platformFeePct);
    });
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.patch("/society-admin/fees", { welfareContributionPct: Number(welfarePct), platformFeePct: Number(platformPct) });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (!society) return <Loading />;

  const workerPct = 100 - Number(welfarePct) - Number(platformPct);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-1">Fair Wage Settings</h1>
      <p className="text-sm text-stone-500 mb-6">{society.name} — configure how every booking's payment is split.</p>

      <form onSubmit={save} className="card p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-stone-700">Welfare contribution %</label>
          <input type="number" min="0" max="50" step="0.5" className="input mt-1" value={welfarePct} onChange={(e) => setWelfarePct(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-stone-700">Cooperative operations %</label>
          <input type="number" min="0" max="50" step="0.5" className="input mt-1" value={platformPct} onChange={(e) => setPlatformPct(e.target.value)} />
        </div>

        <div className="rounded-xl bg-stone-50 p-4 text-sm">
          <div className="flex justify-between py-1"><span>Worker receives</span><strong className="text-coop-700">{workerPct}%</strong></div>
          <div className="flex justify-between py-1"><span>Welfare fund</span><strong>{welfarePct}%</strong></div>
          <div className="flex justify-between py-1"><span>Cooperative operations</span><strong>{platformPct}%</strong></div>
        </div>

        {workerPct < 50 && <p className="text-xs text-amber-600">Warning: worker share below 50% may not reflect a fair-wage principle.</p>}
        {saved && <p className="text-sm text-emerald-600">✓ Saved</p>}
        <button className="btn-primary w-full" disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>
      </form>
    </div>
  );
}
