import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";

export default function AdminCooperatives() {
  const [federations, setFederations] = useState(null);

  useEffect(() => { api.get("/admin/cooperatives").then((r) => setFederations(r.data)); }, []);
  if (!federations) return <Loading />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-stone-900 mb-6">Cooperative Hierarchy</h1>
      <div className="space-y-6">
        {federations.map((f) => (
          <div key={f.id} className="card p-5">
            <p className="font-bold text-stone-900">{f.name}</p>
            <p className="text-xs text-stone-500 mb-3">{f.state}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {f.societies.map((s) => (
                <div key={s.id} className="rounded-xl bg-stone-50 border border-stone-200 p-4">
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-stone-500">{s.city} · {s.workerCount} workers</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
