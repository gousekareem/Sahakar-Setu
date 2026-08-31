import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client.js";
import { Loading, EmptyState } from "../../components/Loading.jsx";
import { StatusBadge } from "../../components/Badges.jsx";

export default function MyBookings() {
  const [bookings, setBookings] = useState(null);

  useEffect(() => {
    api.get("/bookings").then((r) => setBookings(r.data)).catch(() => setBookings([]));
  }, []);

  if (!bookings) return <Loading />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-stone-900 mb-6">My Bookings</h1>
      {bookings.length === 0 && (
        <EmptyState title="No bookings yet" subtitle="Book your first cooperative service to see it here." action={<Link to="/search" className="btn-primary mt-4">Find a service</Link>} />
      )}
      <div className="space-y-3">
        {bookings.map((b) => (
          <Link key={b.id} to={`/bookings/${b.id}`} className="card p-5 flex items-center justify-between hover:border-coop-300 transition-all">
            <div>
              <p className="font-semibold text-stone-900">{b.category.name} {b.isEmergency && <span className="text-red-600 text-xs ml-1">EMERGENCY</span>}</p>
              <p className="text-xs text-stone-500 mt-0.5">{new Date(b.scheduledAt).toLocaleString()}</p>
              {b.worker && <p className="text-xs text-stone-400 mt-0.5">Worker: {b.worker.user.name}</p>}
            </div>
            <div className="text-right">
              <StatusBadge status={b.status} />
              <p className="text-sm font-semibold text-stone-700 mt-1.5">₹{b.finalPrice || b.estimatedPrice}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
