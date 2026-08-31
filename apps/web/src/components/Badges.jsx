const statusColors = {
  PENDING: "bg-stone-100 text-stone-600",
  MATCHING: "bg-amber-100 text-amber-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-blue-100 text-blue-700",
  ON_THE_WAY: "bg-indigo-100 text-indigo-700",
  ARRIVED: "bg-indigo-100 text-indigo-700",
  IN_PROGRESS: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-stone-200 text-stone-500",
  DISPUTED: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }) {
  return <span className={`badge ${statusColors[status] || "bg-stone-100 text-stone-600"}`}>{status?.replaceAll("_", " ")}</span>;
}

export function VerifiedBadge() {
  return (
    <span className="badge bg-coop-100 text-coop-700">
      ✓ Verified
    </span>
  );
}

const verificationColors = {
  PENDING: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-stone-200 text-stone-600",
};
export function VerificationBadge({ status }) {
  return <span className={`badge ${verificationColors[status] || "bg-stone-100"}`}>{status?.replaceAll("_", " ")}</span>;
}
