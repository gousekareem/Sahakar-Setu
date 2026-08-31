import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";
import StatCard from "../../components/StatCard.jsx";

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/admin/dashboard").then((r) => setData(r.data)); }, []);
  if (!data) return <Loading />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-1">Cooperative Admin Dashboard</h1>
      <p className="text-sm text-stone-500 mb-6">Ministry of Cooperation · National Council for Cooperative Training</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Workers" value={data.totalWorkers} />
        <StatCard label="Verified Workers" value={data.verifiedWorkers} accent="coop" />
        <StatCard label="Active Now" value={data.activeWorkers} />
        <StatCard label="Total Customers" value={data.totalCustomers} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
        <StatCard label="Today's Bookings" value={data.todaysBookings} />
        <StatCard label="Completed Services" value={data.completedServices} />
        <StatCard label="Emergency Requests" value={data.emergencyRequests} accent="saffron" />
        <StatCard label="Welfare Beneficiaries" value={data.welfareBeneficiaries} />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <StatCard label="Total Revenue" value={`₹${data.totalRevenue.toLocaleString("en-IN")}`} accent="saffron" />
        <StatCard label="Total Worker Payouts" value={`₹${data.totalWorkerPayouts.toLocaleString("en-IN")}`} accent="coop" />
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <a href="/admin/workers" className="card p-5 hover:border-coop-300"><p className="font-semibold">Workforce & Verification →</p><p className="text-sm text-stone-500 mt-1">Review pending worker verifications</p></a>
        <a href="/admin/ai" className="card p-5 hover:border-coop-300"><p className="font-semibold">AI Insights →</p><p className="text-sm text-stone-500 mt-1">Demand forecast & workforce allocation</p></a>
        <a href="/admin/analytics" className="card p-5 hover:border-coop-300"><p className="font-semibold">Analytics →</p><p className="text-sm text-stone-500 mt-1">Bookings, revenue & performance</p></a>
      </div>
    </div>
  );
}
