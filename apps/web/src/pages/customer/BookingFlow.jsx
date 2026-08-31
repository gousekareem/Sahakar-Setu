import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/client.js";
import { Loading } from "../../components/Loading.jsx";

const STEPS = ["Address", "Schedule", "Describe", "Review"];

export default function BookingFlow() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = params.get("categoryId");
  const preferredWorkerId = params.get("workerId") || undefined;

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ label: "Home", line1: "", city: "Vijayawada", state: "Andhra Pradesh", pincode: "", latitude: 16.5062, longitude: 80.6480 });
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 3600000);
    return d.toISOString().slice(0, 16);
  });
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get("/services").then((r) => setCategory(r.data.find((c) => c.id === categoryId)));
    api.get("/addresses").then((r) => {
      setAddresses(r.data);
      if (r.data.length) setAddressId(r.data.find((a) => a.isDefault)?.id || r.data[0].id);
      else setShowNewAddress(true);
    });
  }, [categoryId]);

  const saveAddress = async () => {
    const { data } = await api.post("/addresses", { ...newAddress, isDefault: addresses.length === 0 });
    setAddresses((prev) => [data, ...prev]);
    setAddressId(data.id);
    setShowNewAddress(false);
  };

  const submitBooking = async () => {
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/bookings", {
        categoryId, addressId, scheduledAt: new Date(scheduledAt).toISOString(), description, preferredWorkerId,
      });
      setResult(data.booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!category) return <Loading />;

  if (result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <span className="text-5xl">✅</span>
        <h1 className="text-2xl font-bold text-stone-900 mt-4">Booking confirmed!</h1>
        <p className="text-stone-500 mt-2">
          {result.worker ? `${result.worker.user.name} has been assigned — ETA ${result.etaMinutes} min.` : "We're finding the best available worker for you."}
        </p>
        <div className="card p-5 mt-6 text-left">
          <div className="flex justify-between text-sm py-1"><span>Service</span><strong>{category.name}</strong></div>
          <div className="flex justify-between text-sm py-1"><span>Estimated price</span><strong>₹{result.estimatedPrice}</strong></div>
          <div className="flex justify-between text-sm py-1"><span>Status</span><strong>{result.status}</strong></div>
        </div>
        <button onClick={() => navigate(`/bookings/${result.id}`)} className="btn-primary w-full mt-6">Track booking</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-stone-900">Book {category.name}</h1>
      <div className="flex gap-2 mt-4">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= step ? "bg-coop-600" : "bg-stone-200"}`} />
        ))}
      </div>

      <div className="card p-6 mt-6">
        {step === 0 && (
          <div>
            <h2 className="font-semibold text-stone-800 mb-3">Choose an address</h2>
            {!showNewAddress ? (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex items-start gap-3 border rounded-xl p-3.5 cursor-pointer ${addressId === a.id ? "border-coop-500 bg-coop-50" : "border-stone-200"}`}>
                    <input type="radio" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1" />
                    <div>
                      <p className="font-medium text-sm">{a.label}</p>
                      <p className="text-xs text-stone-500">{a.line1}, {a.city}, {a.state} {a.pincode}</p>
                    </div>
                  </label>
                ))}
                <button onClick={() => setShowNewAddress(true)} className="text-sm text-coop-700 font-semibold">+ Add new address</button>
              </div>
            ) : (
              <div className="space-y-3">
                <input className="input" placeholder="Label (e.g. Home)" value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} />
                <input className="input" placeholder="Address line" value={newAddress.line1} onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="input" placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
                  <input className="input" placeholder="Pincode" value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveAddress} className="btn-primary text-sm">Save address</button>
                  {addresses.length > 0 && <button onClick={() => setShowNewAddress(false)} className="btn-secondary text-sm">Cancel</button>}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-semibold text-stone-800 mb-3">When do you need this?</h2>
            <input type="datetime-local" className="input" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-semibold text-stone-800 mb-3">Describe the issue (optional)</h2>
            <textarea className="input" rows={4} placeholder="e.g. Ceiling fan not spinning, makes noise" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-semibold text-stone-800 mb-3">Review & confirm</h2>
            <div className="rounded-xl bg-stone-50 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span>Service</span><strong>{category.name}</strong></div>
              <div className="flex justify-between"><span>Scheduled</span><strong>{new Date(scheduledAt).toLocaleString()}</strong></div>
              <div className="flex justify-between"><span>Estimated price</span><strong>₹{category.baseRate}</strong></div>
              {description && <div className="flex justify-between"><span>Notes</span><strong className="text-right max-w-[60%]">{description}</strong></div>}
            </div>
            <p className="text-xs text-stone-400 mt-3">Our AI allocation engine will assign the best-matched verified worker immediately after you confirm.</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex justify-between mt-6">
          <button disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="btn-secondary disabled:opacity-0">Back</button>
          {step < STEPS.length - 1 ? (
            <button disabled={step === 0 && !addressId} onClick={() => setStep((s) => s + 1)} className="btn-primary">Continue</button>
          ) : (
            <button onClick={submitBooking} disabled={submitting} className="btn-primary">{submitting ? "Booking..." : "Confirm booking"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
