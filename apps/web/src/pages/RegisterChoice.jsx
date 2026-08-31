import { Link } from "react-router-dom";

export default function RegisterChoice() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-stone-900">Join SahakarSetu</h1>
      <p className="text-stone-500 mt-1">How would you like to join the cooperative workforce network?</p>

      <div className="mt-8 grid sm:grid-cols-3 gap-5">
        <Link to="/register/customer" className="card p-8 hover:shadow-md hover:border-coop-300 transition-all text-left">
          <span className="text-3xl">🏠</span>
          <p className="font-bold text-lg mt-3">I need services</p>
          <p className="text-sm text-stone-500 mt-1">Book verified electricians, plumbers, cleaners and more for your home.</p>
        </Link>
        <Link to="/register/worker" className="card p-8 hover:shadow-md hover:border-coop-300 transition-all text-left">
          <span className="text-3xl">🛠️</span>
          <p className="font-bold text-lg mt-3">I'm a skilled worker</p>
          <p className="text-sm text-stone-500 mt-1">Join your Labour Cooperative Society and get bookings.</p>
        </Link>
        <Link to="/register/institution" className="card p-8 hover:shadow-md hover:border-coop-300 transition-all text-left">
          <span className="text-3xl">🏢</span>
          <p className="font-bold text-lg mt-3">I represent an institution</p>
          <p className="text-sm text-stone-500 mt-1">Post bulk workforce contracts to cooperative societies.</p>
        </Link>
      </div>
    </div>
  );
}
