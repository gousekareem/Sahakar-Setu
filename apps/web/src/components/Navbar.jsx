import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n, LANGUAGES } from "../i18n/I18nContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, lang, changeLang } = useI18n();
  const navigate = useNavigate();
  const [a11y, setA11y] = useState(() => localStorage.getItem("sahakarsetu_a11y") === "1");

  useEffect(() => {
    document.body.classList.toggle("a11y-mode", a11y);
    localStorage.setItem("sahakarsetu_a11y", a11y ? "1" : "0");
  }, [a11y]);

  const homeLink =
    user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" ? "/admin"
    : user?.role === "WORKER" ? "/worker"
    : user?.role === "SOCIETY_ADMIN" ? "/coop"
    : user?.role === "INSTITUTION" ? "/institution"
    : user?.role === "CUSTOMER" ? "/home"
    : "/";

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to={homeLink} className="flex items-center gap-2 shrink-0">
          <span className="w-9 h-9 rounded-xl bg-coop-600 text-white flex items-center justify-center font-bold text-lg">S</span>
          <span className="font-bold text-lg text-coop-800 tracking-tight">SahakarSetu</span>
        </Link>

        {!user && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <Link to="/#services" className="hover:text-coop-700">{t("services")}</Link>
            <Link to="/the-problem" className="hover:text-coop-700">The Problem</Link>
            <Link to="/why-sahakarsetu" className="hover:text-coop-700">Why SahakarSetu</Link>
          </nav>
        )}

        {user?.role === "CUSTOMER" && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <Link to="/home" className="hover:text-coop-700">{t("home")}</Link>
            <Link to="/bookings" className="hover:text-coop-700">{t("bookings")}</Link>
            <Link to="/notifications" className="hover:text-coop-700">{t("notifications")}</Link>
          </nav>
        )}

        {user?.role === "WORKER" && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <Link to="/worker" className="hover:text-coop-700">{t("dashboard")}</Link>
            <Link to="/worker/jobs" className="hover:text-coop-700">Jobs</Link>
            <Link to="/worker/welfare" className="hover:text-coop-700">Welfare</Link>
          </nav>
        )}

        {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <Link to="/admin" className="hover:text-coop-700">{t("dashboard")}</Link>
            <Link to="/admin/workers" className="hover:text-coop-700">Workforce</Link>
            <Link to="/admin/bookings" className="hover:text-coop-700">Bookings</Link>
            <Link to="/admin/ai" className="hover:text-coop-700">AI Insights</Link>
            <Link to="/admin/analytics" className="hover:text-coop-700">Analytics</Link>
          </nav>
        )}

        {user?.role === "SOCIETY_ADMIN" && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <Link to="/coop" className="hover:text-coop-700">Intelligence</Link>
            <Link to="/coop/workers" className="hover:text-coop-700">Workforce</Link>
            <Link to="/coop/capacity" className="hover:text-coop-700">Network</Link>
            <Link to="/coop/contracts" className="hover:text-coop-700">Contracts</Link>
            <Link to="/coop/settings" className="hover:text-coop-700">Settings</Link>
          </nav>
        )}

        {user?.role === "INSTITUTION" && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
            <Link to="/institution" className="hover:text-coop-700">{t("dashboard")}</Link>
            <Link to="/institution/post-contract" className="hover:text-coop-700">Post Requirement</Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setA11y((v) => !v)}
            title="Toggle high-contrast, larger text mode"
            aria-pressed={a11y}
            className={`text-sm border rounded-lg px-2 py-1.5 ${a11y ? "bg-coop-600 text-white border-coop-600" : "bg-white border-stone-200 text-stone-600"}`}
          >
            A+
          </button>
          <select
            value={lang}
            onChange={(e) => changeLang(e.target.value)}
            className="text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-600"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-stone-500">{user.name}</span>
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-sm font-semibold text-stone-500 hover:text-red-600"
              >
                {t("logout")}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary !py-2 !px-3 text-sm">{t("login")}</Link>
              <Link to="/register" className="btn-primary !py-2 !px-3 text-sm">{t("register")}</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
