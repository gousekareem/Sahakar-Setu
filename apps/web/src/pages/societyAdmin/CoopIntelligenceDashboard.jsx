import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";
import StatCard from "../../components/StatCard.jsx";

export default function CoopIntelligenceDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/society-admin/dashboard").then((r) => setData(r.data));
  }, []);

  if (!data) return <Loading label="Loading cooperative intelligence..." />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-1">Cooperative Intelligence</h1>
      <p className="text-sm text-stone-500 mb-6">Live workforce visibility, demand signals, and capacity coordination for your cooperative society.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active Workers" value={data.activeWorkers} />
        <StatCard label="Online Now" value={data.onlineWorkers} accent="coop" />
        <StatCard label="Active Jobs" value={data.activeJobs} />
        <StatCard label="Today's Demand" value={data.todaysDemand} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
        <StatCard label="Idle Capacity" value={data.idleCapacity} sub="Available, unassigned workers" />
        <StatCard label="Active Contracts" value={data.activeContracts} accent="gold" />
        <StatCard label="Skill Gaps" value={data.skillGapCategories.length} sub={data.skillGapCategories.slice(0, 3).join(", ") || "None"} />
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <Link to="/coop/workers" className="card p-5 hover:border-coop-300">
          <p className="font-semibold">Workforce & Verification →</p>
          <p className="text-sm text-stone-500 mt-1">Verify workers, review certifications</p>
        </Link>
        <Link to="/coop/capacity" className="card p-5 hover:border-coop-300">
          <p className="font-semibold">Capacity & Federation Network →</p>
          <p className="text-sm text-stone-500 mt-1">Shortage detection, capacity sharing with nearby cooperatives</p>
        </Link>
        <Link to="/coop/contracts" className="card p-5 hover:border-coop-300">
          <p className="font-semibold">Institutional Contracts →</p>
          <p className="text-sm text-stone-500 mt-1">Browse open contracts, submit quotations</p>
        </Link>
        <Link to="/coop/settings" className="card p-5 hover:border-coop-300">
          <p className="font-semibold">Fair Wage Settings →</p>
          <p className="text-sm text-stone-500 mt-1">Configure welfare & platform fee percentages</p>
        </Link>
      </div>

      <h2 className="text-lg font-bold text-stone-900 mt-10 mb-3">Capacity by Skill Category</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Category</th>
              <th className="text-right px-4 py-2.5">Total Workers</th>
              <th className="text-right px-4 py-2.5">Available Now</th>
            </tr>
          </thead>
          <tbody>
            {data.capacity.map((c) => (
              <tr key={c.categoryId} className="border-t border-stone-100">
                <td className="px-4 py-2.5">{c.categoryName}</td>
                <td className="px-4 py-2.5 text-right">{c.totalWorkers}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${c.availableWorkers === 0 && c.totalWorkers > 0 ? "text-red-600" : "text-coop-700"}`}>
                  {c.availableWorkers}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
