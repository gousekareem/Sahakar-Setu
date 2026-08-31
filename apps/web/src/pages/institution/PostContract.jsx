import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client.js";

export default function PostContract() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMonths, setDurationMonths] = useState(3);
  const [slaResponseHours, setSlaResponseHours] = useState(24);
  const [requirements, setRequirements] = useState([{ categoryId: "", workersNeeded: 1, minExperienceYears: 1 }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.get("/services").then((r) => setCategories(r.data)); }, []);

  const updateReq = (i, field, value) => {
    setRequirements((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };
  const addReq = () => setRequirements((prev) => [...prev, { categoryId: "", workersNeeded: 1, minExperienceYears: 1 }]);
  const removeReq = (i) => setRequirements((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/institutions/contracts", {
        title, description, durationMonths: Number(durationMonths), slaResponseHours: Number(slaResponseHours),
        requirements: requirements.map((r) => ({ categoryId: r.categoryId, workersNeeded: Number(r.workersNeeded), minExperienceYears: Number(r.minExperienceYears) })),
      });
      navigate(`/institution/contracts/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold text-stone-900 mb-1">Post a Workforce Requirement</h1>
      <p className="text-sm text-stone-500 mb-6">e.g. "20 electricians + 10 plumbers required for 3 months"</p>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <input required className="input" placeholder="Contract title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={3} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-stone-700">Duration (months)</label>
            <input type="number" min="1" className="input mt-1" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-700">SLA response (hours)</label>
            <input type="number" min="1" className="input mt-1" value={slaResponseHours} onChange={(e) => setSlaResponseHours(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700">Skill requirements</label>
          <div className="space-y-2 mt-1">
            {requirements.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select required className="input flex-1" value={r.categoryId} onChange={(e) => updateReq(i, "categoryId", e.target.value)}>
                  <option value="">Select skill</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" min="1" className="input w-24" placeholder="Count" value={r.workersNeeded} onChange={(e) => updateReq(i, "workersNeeded", e.target.value)} />
                {requirements.length > 1 && <button type="button" onClick={() => removeReq(i)} className="text-red-500 text-sm">✕</button>}
              </div>
            ))}
          </div>
          <button type="button" onClick={addReq} className="text-sm text-coop-700 font-semibold mt-2">+ Add another skill</button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={submitting}>{submitting ? "Posting..." : "Post requirement"}</button>
      </form>
    </div>
  );
}
