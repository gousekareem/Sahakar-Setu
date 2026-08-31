import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/client.js";
import { Loading, ErrorState } from "../../components/Loading.jsx";
import { StatusBadge } from "../../components/Badges.jsx";

const TRACKING_STEPS = ["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"];

export default function BookingDetail() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState("UPI");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const load = () => api.get(`/bookings/${id}`).then((r) => setBooking(r.data)).catch((e) => setError(e.message));

  useEffect(() => { load(); const iv = setInterval(load, 6000); return () => clearInterval(iv); }, [id]);

  const cancel = async () => {
    if (!confirm("Cancel this booking?")) return;
    await api.patch(`/bookings/${id}/status`, { status: "CANCELLED", reason: "Customer requested cancellation" });
    load();
  };

  const pay = async () => {
    setPaying(true);
    try {
      await api.post(`/payments/${id}`, { method });
      await load();
    } catch (e) { setError(e.message); } finally { setPaying(false); }
  };

  const submitReview = async () => {
    setSubmittingReview(true);
    try {
      await api.post("/reviews", { bookingId: id, rating, comment });
      await load();
    } catch (e) { setError(e.message); } finally { setSubmittingReview(false); }
  };

  if (error) return <ErrorState message={error} />;
  if (!booking) return <Loading />;

  const stepIndex = TRACKING_STEPS.indexOf(booking.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900">{booking.category.name} Booking</h1>
        <StatusBadge status={booking.status} />
      </div>

      {!["CANCELLED", "COMPLETED", "DISPUTED"].includes(booking.status) && (
        <div className="card p-5 mt-5">
          <h2 className="font-semibold text-sm text-stone-700 mb-4">Live Tracking</h2>
          <div className="flex justify-between">
            {TRACKING_STEPS.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${i <= stepIndex ? "bg-coop-600" : "bg-stone-200"}`} />
                <p className={`text-[10px] mt-1.5 text-center ${i <= stepIndex ? "text-coop-700 font-semibold" : "text-stone-400"}`}>{s.replaceAll("_", " ")}</p>
              </div>
            ))}
          </div>
          {booking.etaMinutes && stepIndex < 3 && <p className="text-sm text-stone-500 mt-4 text-center">Estimated arrival in {booking.etaMinutes} minutes</p>}
        </div>
      )}

      <div className="card p-5 mt-5 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-stone-500">Scheduled</span><span>{new Date(booking.scheduledAt).toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-stone-500">Address</span><span className="text-right max-w-[60%]">{booking.address.line1}, {booking.address.city}</span></div>
        {booking.worker && (
          <>
            <div className="flex justify-between"><span className="text-stone-500">Worker</span><span>{booking.worker.user.name}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Cooperative</span><span>{booking.worker.society?.name}</span></div>
            {booking.matchReason && <div className="flex justify-between"><span className="text-stone-500">Why matched</span><span className="text-right max-w-[60%] text-coop-700">{booking.matchReason}</span></div>}
            <div className="pt-1">
              <Link to={`/workers/${booking.worker.id}/passport`} className="text-sm text-coop-700 font-semibold">View Skill Passport →</Link>
            </div>
          </>
        )}
      </div>

      <div className="card p-5 mt-5">
        <h2 className="font-semibold text-sm text-stone-700 mb-3">Fair Wage Breakdown</h2>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span>You pay</span><strong>₹{booking.finalPrice || booking.estimatedPrice}</strong></div>
          {booking.workerPayout != null && <div className="flex justify-between text-coop-700"><span>Worker receives</span><strong>₹{booking.workerPayout}</strong></div>}
          {booking.welfareShare != null && <div className="flex justify-between text-stone-500"><span>Welfare contribution</span><strong>₹{booking.welfareShare}</strong></div>}
          {booking.platformShare != null && <div className="flex justify-between text-stone-500"><span>Cooperative operations</span><strong>₹{booking.platformShare}</strong></div>}
        </div>
      </div>

      {booking.status === "COMPLETED" && !booking.payment && (
        <div className="card p-5 mt-5">
          <h2 className="font-semibold text-sm text-stone-700 mb-3">Pay for this service</h2>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
            {["UPI", "CARD", "NETBANKING", "WALLET", "CASH"].map((m) => <option key={m}>{m}</option>)}
          </select>
          <button onClick={pay} disabled={paying} className="btn-primary w-full mt-3">{paying ? "Processing..." : `Pay ₹${booking.finalPrice || booking.estimatedPrice}`}</button>
        </div>
      )}

      {booking.payment && (
        <div className="card p-5 mt-5 bg-emerald-50 border-emerald-200">
          <p className="text-sm font-semibold text-emerald-700">✓ Paid via {booking.payment.method}</p>
          <p className="text-xs text-stone-500 mt-1">Invoice {booking.payment.invoiceNo} · Ref {booking.payment.transactionRef}</p>
        </div>
      )}

      {booking.status === "COMPLETED" && booking.payment && !booking.review && (
        <div className="card p-5 mt-5">
          <h2 className="font-semibold text-sm text-stone-700 mb-3">Rate your worker</h2>
          <div className="flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)}>{n <= rating ? "★" : "☆"}</button>
            ))}
          </div>
          <textarea className="input mt-3" rows={2} placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button onClick={submitReview} disabled={submittingReview} className="btn-primary w-full mt-3">{submittingReview ? "Submitting..." : "Submit rating"}</button>
        </div>
      )}

      {booking.review && (
        <div className="card p-5 mt-5">
          <p className="text-sm font-semibold text-stone-700">Your rating: {"★".repeat(booking.review.rating)}{"☆".repeat(5 - booking.review.rating)}</p>
          {booking.review.comment && <p className="text-sm text-stone-500 mt-1">"{booking.review.comment}"</p>}
        </div>
      )}

      {["PENDING", "MATCHING", "ASSIGNED"].includes(booking.status) && (
        <button onClick={cancel} className="btn-secondary w-full mt-5 !text-red-600 !border-red-200">Cancel booking</button>
      )}
    </div>
  );
}
