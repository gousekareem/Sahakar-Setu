import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";
import StatCard from "../../components/StatCard.jsx";

const COLORS = ["#38885a", "#5aab78", "#8bc9a0", "#e58a1f", "#c96f11", "#2a6d47", "#b8dfc4", "#22573a", "#dcefe1", "#193a29"];

export default function AdminAnalytics() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get("/admin/analytics").then((r) => setData(r.data)); }, []);
  if (!data) return <Loading />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-6">Analytics</h1>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <StatCard label="Avg Worker Rating" value={`${data.avgWorkerRating} ★`} />
        <StatCard label="Total Categories Tracked" value={data.bookingsByCategory.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <p className="font-semibold text-sm text-stone-700 mb-4">Bookings by Category</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.bookingsByCategory}>
              <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#38885a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <p className="font-semibold text-sm text-stone-700 mb-4">Bookings by Status</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.bookingsByStatus} dataKey="count" nameKey="status" outerRadius={90} label={(e) => e.status}>
                {data.bookingsByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5 lg:col-span-2">
          <p className="font-semibold text-sm text-stone-700 mb-4">Bookings & Revenue — Last 14 Days</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.bookingsOverTime}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="bookings" stroke="#38885a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="revenue" stroke="#e58a1f" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
