import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

const ICONS = {
  zap: "⚡", droplet: "🚰", hammer: "🔨", sparkles: "🧹", paintbrush: "🖌️",
  "heart-handshake": "🤝", car: "🚗", leaf: "🌿", settings: "🛠️", cpu: "📡",
};

export default function Landing() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.get("/services").then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  const goSearch = (categoryId) => {
    if (!user) return navigate("/login");
    navigate(`/search?categoryId=${categoryId}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-coop-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
          <span className="badge bg-coop-100 text-coop-700 mb-5">Smart India Hackathon · SIH26089 · Ministry of Cooperation</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-900 tracking-tight max-w-3xl mx-auto">
            {t("tagline")}
          </h1>
          <p className="mt-5 text-lg text-stone-600 max-w-2xl mx-auto">{t("heroSubtitle")}</p>

          <div className="mt-8 max-w-xl mx-auto flex flex-col sm:flex-row items-stretch gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="input flex-1"
            />
            <button
              onClick={() => (user ? navigate("/search") : navigate("/login"))}
              className="btn-primary px-6"
            >
              Search Services
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <Link to={user ? "/emergency" : "/login"} className="btn-emergency">
              🚨 {t("emergencyCta")}
            </Link>
            {!user && <Link to="/register" className="btn-secondary">Join as a Worker</Link>}
            <Link to="/demo" className="btn-secondary">🎬 Demo Mode</Link>
          </div>
        </div>
      </section>

      {/* Trust metrics */}
      <section className="border-y border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            ["230+", t("verifiedWorkers")],
            ["4", t("cooperativesOnboarded")],
            ["1,200+", t("servicesCompleted")],
            ["3", "Districts Covered"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-2xl sm:text-3xl font-extrabold text-coop-700">{value}</p>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-stone-400 pb-4">Demonstration figures for illustrative purposes.</p>
      </section>

      {/* Service categories */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-stone-900 text-center">Popular Services</h2>
        <p className="text-center text-stone-500 mt-2">Verified cooperative workers across every household need</p>
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => goSearch(c.id)}
              className="card p-5 flex flex-col items-center gap-2 hover:shadow-md hover:border-coop-300 transition-all"
            >
              <span className="text-3xl">{ICONS[c.icon] || "🔧"}</span>
              <span className="font-semibold text-sm text-stone-800">{c.name}</span>
              <span className="text-xs text-stone-400">from ₹{c.baseRate}</span>
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-stone-50 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-bold text-stone-900 text-center">How SahakarSetu Works</h2>
          <div className="mt-10 grid sm:grid-cols-4 gap-6">
            {[
              ["1", "Choose a service", "Pick from electrical, plumbing, cleaning and more."],
              ["2", "AI finds the best worker", "Nearby, certified, available — ranked by our matching engine."],
              ["3", "Track & pay digitally", "Live status updates, transparent pricing, UPI/card payments."],
              ["4", "Rate your experience", "Help keep the cooperative marketplace trustworthy."],
            ].map(([n, title, sub]) => (
              <div key={n} className="card p-5">
                <span className="w-8 h-8 rounded-full bg-coop-600 text-white flex items-center justify-center font-bold text-sm">{n}</span>
                <p className="mt-3 font-semibold text-stone-800">{title}</p>
                <p className="text-sm text-stone-500 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fair wage */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="card p-8 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="badge bg-saffron-500/10 text-saffron-600">{t("fairWage")}</span>
            <h2 className="text-2xl font-bold text-stone-900 mt-3">Transparent pricing, every time</h2>
            <p className="text-stone-600 mt-3">
              Unlike private gig platforms, SahakarSetu shows exactly where every rupee goes. Cooperative
              societies set their own welfare and platform contribution rates — configurable, never hidden.
            </p>
          </div>
          <div className="rounded-xl bg-stone-50 border border-stone-200 p-6">
            <div className="flex justify-between text-sm py-1.5"><span>Customer pays</span><strong>₹600</strong></div>
            <div className="flex justify-between text-sm py-1.5 text-coop-700"><span>Worker receives</span><strong>₹504 (84%)</strong></div>
            <div className="flex justify-between text-sm py-1.5 text-stone-500"><span>Welfare contribution</span><strong>₹48 (8%)</strong></div>
            <div className="flex justify-between text-sm py-1.5 text-stone-500"><span>Cooperative operations</span><strong>₹48 (8%)</strong></div>
          </div>
        </div>
      </section>

      {/* Cooperative impact */}
      <section id="impact" className="bg-coop-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-3 gap-8">
          {[
            ["For Workers", ["Fair, transparent wages", "Verified employment & welfare", "Insurance & benefits", "Local opportunities"]],
            ["For Customers", ["Verified, background-checked workers", "Transparent pricing", "Emergency assistance", "Local availability"]],
            ["For Cooperatives", ["Workforce visibility", "AI demand forecasting", "Better allocation", "Digital transformation"]],
          ].map(([title, items]) => (
            <div key={title}>
              <h3 className="font-bold text-lg">{title}</h3>
              <ul className="mt-4 space-y-2 text-coop-100 text-sm">
                {items.map((i) => <li key={i} className="flex gap-2"><span>✓</span>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-stone-950 text-stone-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <p className="text-white font-bold">SahakarSetu</p>
            <p className="mt-1 max-w-sm">A cooperative-owned digital services marketplace — built for SIH26089, Ministry of Cooperation, National Council for Cooperative Training.</p>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-white font-semibold mb-2">Product</p>
              <p>Services</p><p>For Workers</p><p>For Cooperatives</p>
            </div>
            <div>
              <p className="text-white font-semibold mb-2">Demo</p>
              <p>customer@sahakarsetu.demo</p>
              <p>worker@sahakarsetu.demo</p>
              <p>admin@sahakarsetu.demo</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
