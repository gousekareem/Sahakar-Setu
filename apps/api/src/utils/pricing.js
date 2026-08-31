// Transparent "fair wage" split. Percentages are configurable per cooperative
// society (welfareContributionPct + platformFeePct), the remainder goes to
// the worker. This is intentionally NOT a fixed private-platform commission.
export function computeFairWageSplit(amount, society) {
  const welfarePct = society?.welfareContributionPct ?? 8;
  const platformPct = society?.platformFeePct ?? 8;
  const welfareShare = round2((amount * welfarePct) / 100);
  const platformShare = round2((amount * platformPct) / 100);
  const workerPayout = round2(amount - welfareShare - platformShare);
  return { amount, workerPayout, welfareShare, platformShare, welfarePct, platformPct };
}

export function estimatePrice(category, isEmergency) {
  const base = category.baseRate;
  const emergencySurcharge = isEmergency ? base * 0.25 : 0;
  return round2(base + emergencySurcharge);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
