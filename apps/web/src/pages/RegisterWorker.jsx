import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const cityCoords = {
  Vijayawada: [16.5062, 80.6480],
  Guntur: [16.3067, 80.4365],
  Visakhapatnam: [17.6868, 83.2185],
  Hyderabad: [17.3850, 78.4867],
};

export default function RegisterWorker() {
  const { registerWorker, loading } = useAuth();
  const navigate = useNavigate();
  const [societies, setSocieties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", password: "",
    societyId: "", homeCity: "Vijayawada", experienceYears: 2, serviceRadiusKm: 6,
  });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/societies").then((r) => setSocieties(r.data)).catch(() => {});
    api.get("/services").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const toggleSkill = (id) => {
    setSelectedSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.societyId) return setError("Please select your cooperative society");
    const [lat, lng] = cityCoords[form.homeCity] || cityCoords.Vijayawada;
    try {
      await registerWorker({
        ...form,
        email: form.email || undefined,
        experienceYears: Number(form.experienceYears),
        serviceRadiusKm: Number(form.serviceRadiusKm),
        homeLatitude: lat,
        homeLongitude: lng,
        languages: "en,hi,te",
        skillIds: selectedSkills,
      });
      navigate("/worker");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900 text-center">Join as a cooperative worker</h1>
      <p className="text-center text-stone-500 mt-1">Get matched with nearby bookings through your Labour Cooperative Society</p>

      <form onSubmit={submit} className="card p-6 mt-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-stone-700">Full name</label>
            <input required className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Mobile number</label>
            <input required maxLength={10} className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-stone-700">Email (optional)</label>
            <input type="email" className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Password</label>
            <input required type="password" minLength={6} className="input mt-1" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700">Cooperative society</label>
          <select required className="input mt-1" value={form.societyId} onChange={(e) => setForm({ ...form, societyId: e.target.value })}>
            <option value="">Select your society</option>
            {societies.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-stone-700">City</label>
            <select className="input mt-1" value={form.homeCity} onChange={(e) => setForm({ ...form, homeCity: e.target.value })}>
              {Object.keys(cityCoords).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Experience (yrs)</label>
            <input type="number" min="0" step="0.5" className="input mt-1" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">Service radius (km)</label>
            <input type="number" min="1" className="input mt-1" value={form.serviceRadiusKm} onChange={(e) => setForm({ ...form, serviceRadiusKm: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700">Your skills</label>
          <div className="mt-2 max-h-56 overflow-y-auto border border-stone-200 rounded-xl p-3 space-y-3">
            {categories.map((c) => (
              <div key={c.id}>
                <p className="text-xs font-semibold text-stone-500 uppercase">{c.name}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {c.skills.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleSkill(s.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border ${selectedSkills.includes(s.id) ? "bg-coop-600 text-white border-coop-600" : "bg-white border-stone-200 text-stone-600"}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Submitting..." : "Register — pending verification"}</button>
        <p className="text-xs text-stone-400 text-center">Your cooperative society will verify your identity, skills and certifications before you go live.</p>
      </form>

      <p className="text-center text-sm text-stone-500 mt-6">
        Already registered? <Link to="/login" className="text-coop-700 font-semibold">Log in</Link>
      </p>
    </div>
  );
}
