import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const DEMO_ACCOUNTS = [
  { label: "Customer", phone: "9000000002", role: "CUSTOMER" },
  { label: "Worker", phone: "9000000003", role: "WORKER" },
  { label: "Coop Admin", phone: "9000000004", role: "SOCIETY_ADMIN" },
  { label: "Institution", phone: "9000000005", role: "INSTITUTION" },
  { label: "Platform Admin", phone: "9000000001", role: "ADMIN" },
];

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const routeFor = (role) =>
    role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin"
    : role === "WORKER" ? "/worker"
    : role === "SOCIETY_ADMIN" ? "/coop"
    : role === "INSTITUTION" ? "/institution"
    : "/home";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const user = await login(phone, password);
      navigate(routeFor(user.role));
    } catch (err) {
      setError(err.message);
    }
  };

  const quickLogin = async (acc) => {
    setError("");
    try {
      const user = await login(acc.phone, "Demo@123");
      navigate(routeFor(user.role));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-stone-900 text-center">Welcome back</h1>
      <p className="text-center text-stone-500 mt-1">Log in to SahakarSetu</p>

      <form onSubmit={submit} className="card p-6 mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-stone-700">Mobile number</label>
          <input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" maxLength={10} />
        </div>
        <div>
          <label className="text-sm font-medium text-stone-700">Password</label>
          <input type="password" className="input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Logging in..." : "Log in"}</button>
      </form>

      <div className="mt-6">
        <p className="text-xs text-center text-stone-400 mb-3">Demo accounts (password: Demo@123)</p>
        <div className="grid grid-cols-3 gap-2">          {DEMO_ACCOUNTS.map((a) => (
            <button key={a.phone} onClick={() => quickLogin(a)} className="btn-secondary text-xs !py-2">
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-stone-500 mt-6">
        New here? <Link to="/register" className="text-coop-700 font-semibold">Create an account</Link>
      </p>
    </div>
  );
}
