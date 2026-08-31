import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function InstitutionOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ orgName: "", orgType: "apartment", city: "Vijayawada" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/institutions/register", form);
      navigate("/institution");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900 text-center">Complete your organization profile</h1>
      <p className="text-center text-stone-500 mt-1">Welcome, {user?.name}. Set up your institution to post workforce requirements.</p>

      <form onSubmit={submit} className="card p-6 mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-stone-700">Organization name</label>
          <input required className="input mt-1" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-stone-700">Organization type</label>
          <select className="input mt-1" value={form.orgType} onChange={(e) => setForm({ ...form, orgType: e.target.value })}>
            <option value="apartment">Apartment / Residents' Association</option>
            <option value="college">College / University</option>
            <option value="hospital">Hospital</option>
            <option value="municipal">Municipal Body</option>
            <option value="company">Company</option>
            <option value="government">Government Organization</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-stone-700">City</label>
          <input required className="input mt-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={submitting}>{submitting ? "Saving..." : "Complete setup"}</button>
      </form>
    </div>
  );
}
