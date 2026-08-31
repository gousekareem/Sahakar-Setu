import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client.js";
import { useI18n } from "../../i18n/I18nContext.jsx";

const EMERGENCY_TYPES = [
  { slug: "electrical", label: "Electrical emergency", icon: "⚡" },
  { slug: "plumbing", label: "Water leakage / blockage", icon: "🚰" },
  { slug: "appliance-repair", label: "Appliance failure", icon: "🛠️" },
  { slug: "home-care", label: "Elderly assistance", icon: "🤝" },
];

export default function EmergencyPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [categories, setCategories] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState("select"); // select | dispatching | assigned | error
  const [description, setDescription] = useState("");
  const [assigned, setAssigned] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/services").then((r) => setCategories(r.data));
    api.get("/addresses").then((r) => setAddresses(r.data));
  }, []);

  const dispatch = async (type) => {
    setSelected(type);
    const category = categories.find((c) => c.slug === type.slug);
    const address = addresses.find((a) => a.isDefault) || addresses[0];
    if (!category || !address) { setError("Please add an address first from your profile."); return; }

    setPhase("dispatching");
    try {
      const { data } = await api.post("/bookings/emergency", { categoryId: category.id, addressId: address.id, description });
      setAssigned(data.booking);
      setPhase("assigned");
    } catch (e) {
      setError(e.message);
      setPhase("error");
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center">
        <span className="text-4xl">🚨</span>
        <h1 className="text-2xl font-bold text-stone-900 mt-3">{t("emergencyCta")}</h1>
        <p className="text-stone-500 mt-1">{t("emergencySub")}</p>
      </div>

      {phase === "select" && (
        <div className="mt-8 space-y-3">
          <p className="text-sm font-medium text-stone-700">What happened?</p>
          {EMERGENCY_TYPES.map((type) => (
            <button key={type.slug} onClick={() => dispatch(type)} className="card w-full p-4 flex items-center gap-3 hover:border-red-300 text-left">
              <span className="text-2xl">{type.icon}</span>
              <span className="font-medium text-stone-800">{type.label}</span>
            </button>
          ))}
          <textarea className="input mt-2" rows={2} placeholder="Briefly describe what happened (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      )}

      {phase === "dispatching" && (
        <div className="mt-12 text-center">
          <span className="inline-block w-10 h-10 rounded-full border-4 border-red-200 border-t-red-600 animate-spin" />
          <p className="mt-4 font-medium text-stone-700">Finding nearby worker...</p>
        </div>
      )}

      {phase === "assigned" && assigned && (
        <div className="mt-8 card p-6 text-center">
          <span className="text-3xl">✅</span>
          <p className="font-bold text-lg mt-2">Worker assigned</p>
          <p className="text-stone-600 mt-1">{assigned.worker?.user?.name || "A verified worker"} is on the way</p>
          <p className="text-sm text-stone-500 mt-1">Arriving in about {assigned.etaMinutes} minutes</p>
          <button onClick={() => navigate(`/bookings/${assigned.id}`)} className="btn-primary w-full mt-5">Track live status</button>
        </div>
      )}

      {phase === "error" && (
        <div className="mt-8 card p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => setPhase("select")} className="btn-secondary mt-4">Try again</button>
        </div>
      )}
    </div>
  );
}
