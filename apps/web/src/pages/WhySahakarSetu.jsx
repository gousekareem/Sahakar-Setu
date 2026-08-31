export default function WhySahakarSetu() {
  const rows = [
    ["Worker ownership", "Individual gig worker, no organization", "Cooperative-owned, worker-organized"],
    ["Skill verification", "Self-reported profile", "Cooperative-verified Skill Passport"],
    ["Demand forecasting", "Not present", "AI-driven, per category & city"],
    ["Capacity sharing", "Not possible", "Cooperatives share workforce across the federation"],
    ["Institutional contracts", "Ad hoc, one worker at a time", "Structured bulk contracts with quotations & SLAs"],
    ["Welfare visibility", "Opaque or absent", "Insurance & welfare tracked per worker"],
    ["Cooperative intelligence", "None", "Live capacity, skill-gap & shortage dashboards"],
    ["Pricing transparency", "Hidden commission", "Configurable, fully visible fair-wage split"],
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-stone-900 text-center">Why SahakarSetu?</h1>
      <p className="text-center text-stone-500 mt-2 max-w-2xl mx-auto">
        Traditional service marketplaces connect a customer directly to an individual worker.
        SahakarSetu inserts an intelligence layer that organizes fragmented labour into a
        cooperative-owned network.
      </p>

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <p className="text-xs font-semibold text-stone-400 uppercase mb-3">Traditional marketplace model</p>
          <div className="flex flex-col items-center gap-2 text-sm">
            <span className="badge bg-stone-100 text-stone-600">Customer</span>
            <span>↓</span>
            <span className="badge bg-stone-100 text-stone-600">Platform</span>
            <span>↓</span>
            <span className="badge bg-stone-100 text-stone-600">Individual Worker</span>
          </div>
        </div>
        <div className="card p-6 border-coop-300">
          <p className="text-xs font-semibold text-coop-600 uppercase mb-3">SahakarSetu model</p>
          <div className="flex flex-col items-center gap-2 text-sm">
            <span className="badge bg-coop-100 text-coop-700">Customer / Institution</span>
            <span>↓</span>
            <span className="badge bg-coop-100 text-coop-700">SahakarSetu Intelligence Layer</span>
            <span>↓</span>
            <span className="badge bg-coop-100 text-coop-700">Labour Cooperative</span>
            <span>↓</span>
            <span className="badge bg-gold-100 text-gold-600">Verified Workforce</span>
          </div>
        </div>
      </div>

      <div className="card mt-10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Traditional marketplace model</th>
              <th className="text-left px-4 py-3">SahakarSetu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([cat, trad, sahakar]) => (
              <tr key={cat} className="border-t border-stone-100">
                <td className="px-4 py-3 font-medium text-stone-800">{cat}</td>
                <td className="px-4 py-3 text-stone-500">{trad}</td>
                <td className="px-4 py-3 text-coop-700 font-medium">{sahakar}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-stone-400 text-center mt-6 max-w-2xl mx-auto">
        This comparison describes a general category of existing service marketplaces and does not refer to any specific company.
      </p>
    </div>
  );
}
