import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/client.js";
import { useI18n } from "../../i18n/I18nContext.jsx";
import { Loading } from "../../components/Loading.jsx";

const ICONS = {
  zap: "⚡", droplet: "🚰", hammer: "🔨", sparkles: "🧹", paintbrush: "🖌️",
  "heart-handshake": "🤝", car: "🚗", leaf: "🌿", settings: "🛠️", cpu: "📡",
};

export default function CustomerHome() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [categories, setCategories] = useState(null);

  useEffect(() => {
    api.get("/services").then((r) => setCategories(r.data)).catch(() => setCategories([]));
  }, []);

  if (!categories) return <Loading />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="card bg-gradient-to-br from-coop-600 to-coop-800 text-white p-8">
        <h1 className="text-2xl sm:text-3xl font-bold">{t("tagline")}</h1>
        <p className="mt-2 text-coop-100 max-w-xl">{t("heroSubtitle")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/search" className="btn-primary bg-white !text-coop-800 hover:bg-coop-50">Find a service</Link>
          <Link to="/emergency" className="btn-emergency">🚨 {t("emergency")}</Link>
          <Link to="/bookings" className="btn-secondary !bg-coop-700/40 !text-white !border-coop-400">My Bookings</Link>
        </div>
      </div>

      <h2 className="text-lg font-bold text-stone-900 mt-10 mb-4">{t("services")}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/search?categoryId=${c.id}`)}
            className="card p-5 flex flex-col items-center gap-2 hover:shadow-md hover:border-coop-300 transition-all"
          >
            <span className="text-3xl">{ICONS[c.icon] || "🔧"}</span>
            <span className="font-semibold text-sm text-stone-800 text-center">{c.name}</span>
            <span className="text-xs text-stone-400">from ₹{c.baseRate}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
