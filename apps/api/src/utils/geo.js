// Haversine distance in kilometers between two lat/lng points.
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Rough ETA: base dispatch delay + travel time at an assumed urban avg speed.
export function estimateEtaMinutes(km) {
  const avgSpeedKmph = 22;
  return Math.max(4, Math.round((km / avgSpeedKmph) * 60) + 3);
}
