import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterInstitution() {
  const { registerInstitution, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await registerInstitution({ ...form, email: form.email || undefined });
      navigate("/institution/onboarding");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900 text-center">Register your organization</h1>
      <p className="text-center text-stone-500 mt-1">Post bulk workforce requirements to cooperative societies</p>

      <form onSubmit={submit} className="card p-6 mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-stone-700">Contact person name</label>
          <input required className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-stone-700">Mobile number</label>
          <input required maxLength={10} className="input mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile number" />
        </div>
        <div>
          <label className="text-sm font-medium text-stone-700">Email (optional)</label>
          <input type="email" className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-stone-700">Password</label>
          <input required type="password" minLength={6} className="input mt-1" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Creating account..." : "Continue"}</button>
      </form>

      <p className="text-center text-sm text-stone-500 mt-6">
        Already registered? <Link to="/login" className="text-coop-700 font-semibold">Log in</Link>
      </p>
    </div>
  );
}
