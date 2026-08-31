import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../../api/client.js";
import { Loading, EmptyState, ErrorState } from "../../components/Loading.jsx";
import MapView from "../../components/MapView.jsx";

const DEFAULT_CENTER = [16.5062, 80.6480]; // Vijayawada

export default function WorkerSearch() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = params.get("categoryId");

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryId || "");
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [workers, setWorkers] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/services").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const useMyLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setCoords({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setCoords({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] }); setLocating(false); },
      { timeout: 4000 }
    );
  };

  useEffect(() => { useMyLocation(); }, []);

  useEffect(() => {
    if (!selectedCategory || !coords) return;
    setWorkers(null);
    setError("");
    api
      .get("/workers/nearby", { params: { categoryId: selectedCategory, latitude: coords.lat, longitude: coords.lng } })
      .then((r) => setWorkers(r.data))
      .catch((e) => setError(e.message));
  }, [selectedCategory, coords]);

  const category = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-stone-900">Find a verified worker</h1>

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <select className="input max-w-xs" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="">Select a service</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={useMyLocation} className="btn-secondary text-sm">
          {locating ? "Locating..." : "📍 Use my location"}
        </button>
        {coords && <span className="text-xs text-stone-400">Location set</span>}
      </div>

      {!selectedCategory && <EmptyState title="Choose a service to see nearby workers" />}

      {selectedCategory && (
        <div className="mt-6 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-3">
            {workers === null && <Loading label="Running AI worker matching..." />}
            {error && <ErrorState message={error} />}
            {workers && workers.length === 0 && (
              <EmptyState title="No verified workers found nearby" subtitle="Try a wider area or another service category." />
            )}
            {workers && workers.map((w) => (
              <div key={w.workerId} className="card p-5 flex gap-4">
                <div className="w-14 h-14 rounded-full bg-coop-100 text-coop-700 flex items-center justify-center font-bold text-lg shrink-0">
                  {w.name?.[0] || "W"}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-stone-900">{w.name}</p>
                    <span className="badge bg-coop-100 text-coop-700">{w.matchScore}% match</span>
                  </div>
                  <p className="text-xs text-stone-500">{w.society}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                    <span>⭐ {w.rating?.toFixed(1)} ({w.ratingCount})</span>
                    <span>📍 {w.distanceKm} km away</span>
                    <span>⏱ ETA {w.etaMinutes} min</span>
                    <span>🧰 {w.experienceYears} yrs exp</span>
                    <span className={w.isOnline ? "text-emerald-600" : "text-stone-400"}>{w.isOnline ? "● Online" : "○ Offline"}</span>
                  </div>
                  <p className="mt-2 text-xs text-coop-700 bg-coop-50 rounded-lg px-2.5 py-1.5 inline-block">
                    ✓ {w.matchReason}
                  </p>
                  <Link to={`/workers/${w.workerId}/passport`} className="block text-xs text-coop-700 font-semibold mt-2">View Skill Passport →</Link>
                </div>
                <button
                  onClick={() => navigate(`/book?categoryId=${selectedCategory}&workerId=${w.workerId}&lat=${coords.lat}&lng=${coords.lng}`)}
                  className="btn-primary self-center shrink-0 text-sm"
                >
                  Book
                </button>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <div className="card p-2 sticky top-20">
              {coords && (
                <MapView
                  center={[coords.lat, coords.lng]}
                  customer={[coords.lat, coords.lng]}
                  radiusKm={category ? 10 : undefined}
                  workers={(workers || []).map((w) => ({ ...w, latitude: coords.lat + (Math.random() - 0.5) * 0.05, longitude: coords.lng + (Math.random() - 0.5) * 0.05 }))}
                  height="480px"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
