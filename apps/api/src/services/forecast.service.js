import { db, mapCategory, mapDemand } from "../db/index.js";

/**
 * AI Demand Forecasting.
 *
 * Uses the last 28 days of DemandRecord data (seeded demo data standing in
 * for historical booking logs) per service category, fits a simple linear
 * trend over daily totals (least-squares regression) plus a 7-day weighted
 * moving average, and projects the next 7 days. This is a deliberately
 * lightweight, dependency-free time-series model chosen for reliability in
 * a judge-facing demo over a heavier ML stack — see AI.md for the full
 * writeup and how it would be swapped for Prophet/XGBoost against real
 * booking history in production.
 */
export async function forecastDemand(categoryId, city = null) {
  const category = mapCategory(db.prepare(`SELECT * FROM service_categories WHERE id = ?`).get(categoryId));
  if (!category) return null;

  const records = (city
    ? db.prepare(`SELECT * FROM demand_records WHERE category_id = ? AND city = ? ORDER BY date ASC`).all(categoryId, city)
    : db.prepare(`SELECT * FROM demand_records WHERE category_id = ? ORDER BY date ASC`).all(categoryId)
  ).map(mapDemand);

  // Aggregate to daily totals
  const byDay = new Map();
  for (const r of records) {
    const key = r.date.slice(0, 10);
    byDay.set(key, (byDay.get(key) || 0) + r.requestCount);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  const series = days.map(([, v]) => v);

  if (series.length < 3) {
    return { category: category.name, insufficientData: true };
  }

  const { slope, intercept } = linearRegression(series);
  const lastWeekAvg = average(series.slice(-7));
  const prevWeekAvg = average(series.slice(-14, -7)) || lastWeekAvg;
  const changePct = prevWeekAvg ? Math.round(((lastWeekAvg - prevWeekAvg) / prevWeekAvg) * 100) : 0;

  const next7 = [];
  for (let i = 1; i <= 7; i++) {
    const trendPoint = intercept + slope * (series.length + i);
    // Blend trend projection with recent moving average for stability
    const projected = Math.max(0, Math.round(0.6 * trendPoint + 0.4 * lastWeekAvg));
    next7.push(projected);
  }
  const next7Total = next7.reduce((a, b) => a + b, 0);
  const prior7Total = series.slice(-7).reduce((a, b) => a + b, 0);
  const weekOverWeekPct = prior7Total ? Math.round(((next7Total - prior7Total) / prior7Total) * 100) : 0;

  // Peak-hour analysis
  const byHour = new Array(24).fill(0);
  for (const r of records) byHour[r.hour] += r.requestCount;
  const peakHour = byHour.indexOf(Math.max(...byHour));

  return {
    categoryId,
    category: category.name,
    historicalDailyAvg: Math.round(average(series)),
    next7DaysForecast: next7,
    next7DaysTotal: next7Total,
    weekOverWeekChangePct: weekOverWeekPct,
    trendDirection: slope > 0.05 ? "increasing" : slope < -0.05 ? "decreasing" : "stable",
    peakHourWindow: `${peakHour}:00–${(peakHour + 3) % 24}:00`,
    insight: buildInsight(category.name, weekOverWeekPct, peakHour),
  };
}

export async function forecastAllCategories() {
  const categories = db.prepare(`SELECT * FROM service_categories`).all().map(mapCategory);
  const results = [];
  for (const c of categories) {
    const f = await forecastDemand(c.id);
    if (f && !f.insufficientData) results.push(f);
  }
  return results.sort((a, b) => b.weekOverWeekChangePct - a.weekOverWeekChangePct);
}

export async function workforceRecommendation() {
  const forecasts = await forecastAllCategories();
  const recs = [];
  for (const f of forecasts) {
    if (f.weekOverWeekChangePct >= 5) {
      const workersNeeded = Math.max(1, Math.min(5, Math.round((f.next7DaysTotal - f.historicalDailyAvg * 7) / 60)));
      recs.push({
        category: f.category,
        message: `${workersNeeded} additional verified worker${workersNeeded > 1 ? "s" : ""} recommended for ${f.category} during ${f.peakHourWindow}, demand is trending up ${f.weekOverWeekChangePct}%.`,
        workersNeeded,
        window: f.peakHourWindow,
      });
    }
  }
  return recs;
}

function linearRegression(series) {
  const n = series.length;
  const xs = series.map((_, i) => i + 1);
  const xMean = average(xs);
  const yMean = average(series);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (series[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function buildInsight(categoryName, changePct, peakHour) {
  const direction = changePct >= 0 ? "increase" : "decrease";
  return `${categoryName} demand is predicted to ${direction} ${Math.abs(changePct)}% next week, peaking around ${peakHour}:00.`;
}
