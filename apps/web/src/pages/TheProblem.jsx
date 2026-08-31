import { Link } from "react-router-dom";

export default function TheProblem() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900">
        The problem is not a lack of service apps.
      </h1>

      <div className="mt-10 flex flex-col items-center gap-3 text-stone-700">
        <span className="card px-5 py-3">Fragmented skilled labour</span>
        <span className="text-xl text-coop-600">+</span>
        <span className="card px-5 py-3">Invisible cooperative capacity</span>
        <span className="text-xl text-coop-600">+</span>
        <span className="card px-5 py-3">Trust gaps</span>
        <span className="text-xl text-coop-600">+</span>
        <span className="card px-5 py-3">Demand-supply mismatch</span>
        <span className="text-xl text-coop-600">+</span>
        <span className="card px-5 py-3">Limited inter-cooperative coordination</span>
        <span className="text-2xl text-stone-400 mt-2">=</span>
        <span className="rounded-2xl bg-coop-800 text-white px-6 py-4 font-bold text-lg mt-2">
          Underutilized Workforce + Inefficient Service Access
        </span>
      </div>

      <h2 className="text-2xl font-bold text-coop-700 mt-14">SahakarSetu organizes the ecosystem.</h2>

      <p className="mt-4 text-stone-600 max-w-2xl mx-auto">
        Labour cooperatives already have skilled workers. What they lack is a digital operating
        layer to verify skills, match workforce to demand intelligently, forecast requirements,
        identify skill gaps, and share capacity across the federation — instead of each
        cooperative operating as an isolated, disconnected pool of labour.
      </p>

      <div className="mt-8 flex justify-center gap-3">
        <Link to="/why-sahakarsetu" className="btn-primary">See Why SahakarSetu →</Link>
        <Link to="/register" className="btn-secondary">Join the Network</Link>
      </div>
    </div>
  );
}
