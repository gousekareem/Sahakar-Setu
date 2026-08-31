import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading, EmptyState } from "../../components/Loading.jsx";
import { StatusBadge } from "../../components/Badges.jsx";
import MapView from "../../components/MapView.jsx";

export default function AdminBookings() {
  const [bookings, setBookings] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  useEffect(() => {
    api.get("/admin/bookings", { params: emergencyOnly ? { isEmergency: true } : {} }).then((r) => setBookings(r.data));
  }, [emergencyOnly]);

  useEffect(() => {
    api.get("/admin/demand-heatmap").then((r) => setHeatmap(r.data));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-1">Bookings</h1>
      <p className="text-sm text-stone-500 mb-5">Live demand heatmap and booking operations</p>

      <div className="card p-2 mb-6">
        <MapView
          center={[16.55, 80.4]}
          zoom={8}
          workers={heatmap.map((h, i) => ({ id: i, name: `${h.category}${h.isEmergency ? " (Emergency)" : ""}`, latitude: h.lat, longitude: h.lng }))}
          height="360px"
        />
      </div>

      <label className="flex items-center gap-2 text-sm mb-4">
        <input type="checkbox" checked={emergencyOnly} onChange={(e) => setEmergencyOnly(e.target.checked)} />
        Emergency requests only
      </label>

      {!bookings && <Loading />}
      {bookings && bookings.length === 0 && <EmptyState title="No bookings found" />}
      <div className="space-y-2">
        {bookings?.map((b) => (
          <div key={b.id} className="card p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-sm">{b.category.name} {b.isEmergency && <span className="text-red-600 text-xs">EMERGENCY</span>}</p>
              <p className="text-xs text-stone-500">{b.customer?.name} → {b.worker?.name || "Unassigned"} · {new Date(b.scheduledAt).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <StatusBadge status={b.status} />
              <p className="text-sm font-semibold mt-1">₹{b.estimatedPrice}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
