import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";

export default function AdminAI() {
  const [forecasts, setForecasts] = useState(null);
  const [recs, setRecs] = useState(null);

  useEffect(() => {
    api.get("/ai/demand-forecast").then((r) => setForecasts(r.data));
    api.get("/ai/workforce-recommendation").then((r) => setRecs(r.data));
  }, []);

  if (!forecasts || !recs) return <Loading label="Running AI demand forecasting models..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-1">AI Insights</h1>
      <p className="text-sm text-stone-500 mb-6">Demand forecasting & workforce allocation — generated from 28 days of booking demand data using a linear-trend + moving-average model.</p>

      <h2 className="text-lg font-bold text-stone-900 mb-3">Demand Forecast — Next 7 Days</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {forecasts.map((f) => (
          <div key={f.categoryId} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-stone-900">{f.category}</p>
              <span className={`badge ${f.weekOverWeekChangePct >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {f.weekOverWeekChangePct >= 0 ? "↑" : "↓"} {Math.abs(f.weekOverWeekChangePct)}%
              </span>
            </div>
            <p className="text-2xl font-bold text-coop-700 mt-2">{f.next7DaysTotal}</p>
            <p className="text-xs text-stone-400">predicted requests, next 7 days</p>
            <p className="text-sm text-stone-600 mt-3">{f.insight}</p>
            <p className="text-xs text-stone-400 mt-2">Peak window: {f.peakHourWindow} · Trend: {f.trendDirection}</p>
            <div className="flex gap-1 mt-3 items-end h-10">
              {f.next7DaysForecast.map((v, i) => (
                <div key={i} className="flex-1 bg-coop-200 rounded-t" style={{ height: `${Math.max(8, (v / Math.max(...f.next7DaysForecast)) * 100)}%` }} title={`Day ${i + 1}: ${v}`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-stone-900 mt-10 mb-3">Workforce Allocation Recommendations</h2>
      {recs.length === 0 ? (
        <p className="text-sm text-stone-400">No urgent workforce gaps predicted this week.</p>
      ) : (
        <div className="space-y-3">
          {recs.map((r) => (
            <div key={r.category} className="card p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-stone-900">{r.category}</p>
                <p className="text-sm text-stone-600 mt-1">{r.message}</p>
              </div>
              <span className="badge bg-saffron-500/10 text-saffron-600 shrink-0">+{r.workersNeeded} workers</span>
            </div>
          ))}
        </div>
      )}

      <div className="card p-5 mt-8 bg-stone-50">
        <p className="text-sm font-semibold text-stone-700">How this works</p>
        <p className="text-sm text-stone-500 mt-1">
          The forecast blends a least-squares linear trend with a 7-day weighted moving average over historical
          booking demand per service category, then projects the next 7 days. Workforce recommendations trigger
          when week-over-week demand growth crosses a threshold. See <code>AI.md</code> in the project docs for the full model writeup.
        </p>
      </div>
    </div>
  );
}
