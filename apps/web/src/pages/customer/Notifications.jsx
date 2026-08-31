import { useEffect, useState } from "react";
import api from "../../api/client.js";
import { Loading, EmptyState } from "../../components/Loading.jsx";

export default function Notifications() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get("/notifications").then((r) => setItems(r.data)).catch(() => setItems([]));
  }, []);

  if (!items) return <Loading />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-stone-900 mb-6">Notifications</h1>
      {items.length === 0 && <EmptyState title="No notifications yet" />}
      <div className="space-y-2">
        {items.map((n) => (
          <div key={n.id} className={`card p-4 ${!n.isRead ? "border-coop-300 bg-coop-50/40" : ""}`}>
            <p className="font-semibold text-sm text-stone-800">{n.title}</p>
            <p className="text-sm text-stone-500 mt-0.5">{n.body}</p>
            <p className="text-xs text-stone-400 mt-1.5">{new Date(n.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
