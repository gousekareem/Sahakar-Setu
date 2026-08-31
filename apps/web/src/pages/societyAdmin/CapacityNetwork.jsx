import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";

export default function CapacityNetwork() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [shortage, setShortage] = useState(null);
  const [checking, setChecking] = useState(false);
  const [requests, setRequests] = useState(null);
  const [creating, setCreating] = useState(false);

  const loadRequests = () => api.get("/society-admin/capacity/sharing-requests").then((r) => setRequests(r.data));

  useEffect(() => {
    api.get("/services").then((r) => setCategories(r.data));
    loadRequests();
  }, []);

  const checkShortage = async (categoryId) => {
    setSelectedCategory(categoryId);
    setChecking(true);
    setShortage(null);
    try {
      const { data } = await api.get(`/society-admin/capacity/shortage/${categoryId}`);
      setShortage(data);
    } finally {
      setChecking(false);
    }
  };

  const requestSharing = async () => {
    setCreating(true);
    try {
      await api.post("/society-admin/capacity/sharing-requests", {
        categoryId: selectedCategory,
        workersRequested: shortage.shortageWorkers,
        reason: `Predicted demand exceeds available capacity by ${shortage.shortageWorkers} workers.`,
      });
      await loadRequests();
    } finally {
      setCreating(false);
    }
  };

  const respond = async (requestId, status) => {
    await api.post(`/society-admin/capacity/sharing-requests/${requestId}/respond`, { status });
    await loadRequests();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-1">Capacity & Federation Network</h1>
      <p className="text-sm text-stone-500 mb-6">
        Detect predicted workforce shortages and discover spare capacity at nearby cooperative societies.
      </p>

      <div className="card p-6">
        <p className="font-semibold text-sm text-stone-700 mb-3">Check shortage for a skill category</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => checkShortage(c.id)}
              className={`text-sm px-3 py-1.5 rounded-full border ${selectedCategory === c.id ? "bg-coop-600 text-white border-coop-600" : "bg-white border-stone-200 text-stone-600"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {checking && <Loading label="Analyzing demand vs. capacity..." />}

        {shortage && !checking && (
          <div className="mt-5 rounded-xl bg-stone-50 p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-coop-700">{shortage.currentAvailable}</p>
                <p className="text-xs text-stone-500">Available now</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-700">{shortage.predictedNeed}</p>
                <p className="text-xs text-stone-500">Predicted need (7d)</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${shortage.shortageWorkers > 0 ? "text-red-600" : "text-emerald-600"}`}>{shortage.shortageWorkers}</p>
                <p className="text-xs text-stone-500">Shortage</p>
              </div>
            </div>

            {shortage.shortageWorkers > 0 ? (
              <div className="mt-5">
                <p className="font-semibold text-sm text-red-700">⚠ Local shortage detected</p>
                {shortage.nearbyCapacity.length > 0 ? (
                  <>
                    <p className="text-sm text-stone-600 mt-2 mb-3">Nearby cooperative capacity available:</p>
                    <div className="space-y-2">
                      {shortage.nearbyCapacity.map((n) => (
                        <div key={n.societyId} className="flex items-center justify-between bg-white rounded-lg border border-stone-200 px-4 py-3">
                          <div>
                            <p className="font-medium text-sm">{n.societyName}</p>
                            <p className="text-xs text-stone-500">{n.societyCity} {n.distanceKm != null && `· ${n.distanceKm} km away`}</p>
                          </div>
                          <span className="badge bg-coop-100 text-coop-700">{n.availableWorkers} available</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={requestSharing} disabled={creating} className="btn-primary mt-4">
                      {creating ? "Sending request..." : `Request ${shortage.shortageWorkers} workers from network`}
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-stone-500 mt-2">No nearby cooperative currently has spare capacity in this category.</p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-emerald-700">✓ Capacity currently meets predicted demand.</p>
            )}
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold text-stone-900 mt-8 mb-3">Capacity Sharing Requests</h2>
      {!requests && <Loading />}
      {requests && requests.length === 0 && <p className="text-sm text-stone-400">No sharing requests yet.</p>}
      <div className="space-y-2">
        {requests?.map((r) => (
          <div key={r.id} className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{r.workersRequested} workers requested</p>
              <p className="text-xs text-stone-500">{r.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge bg-amber-100 text-amber-700">{r.status}</span>
              {r.status === "OPEN" && (
                <>
                  <button onClick={() => respond(r.id, "OFFERED")} className="btn-secondary text-xs !py-1.5 !px-3">Offer capacity</button>
                  <button onClick={() => respond(r.id, "DECLINED")} className="btn-secondary text-xs !py-1.5 !px-3 !text-red-600">Decline</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
