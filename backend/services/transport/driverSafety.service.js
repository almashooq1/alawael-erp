/**
 * Driver Safety Score — Phase F
 *
 * Analyzes GpsTracking + Trip data per driver to compute a 0-100 safety
 * score. Pure functions; the caller passes in data arrays so the engine
 * stays testable without DB.
 *
 * Inputs we score on:
 *   - Speeding ratio (% of GPS points where speed > limit)
 *   - Harsh acceleration / harsh braking (Δspeed / Δt thresholds)
 *   - Idle ratio (engine_on with speed <= 2 km/h for extended periods)
 *   - Geofence violations (is_outside_geofence true)
 *   - Trip completion rate (completed vs total assigned)
 *
 * Output:
 *   { score, grade, breakdown, samples, recommendations }
 *
 * Grade map:
 *   90-100 → A (excellent)   75-89 → B   60-74 → C   45-59 → D   <45 → F
 */
'use strict';

const SCORING_WEIGHTS = {
  speeding: 30,
  harshEvents: 25,
  idle: 15,
  geofence: 15,
  completion: 15,
};

// Thresholds — tune per fleet
const HARSH_ACCEL_DELTA_KMH = 12; // Δspeed in 5s
const HARSH_BRAKE_DELTA_KMH = -15;
const HARSH_WINDOW_MS = 5000; // 5 seconds
const IDLE_SPEED_THRESHOLD = 2; // km/h

function gradeFromScore(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

function clampPct(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Compute safety score for one driver.
 * @param {Array<GpsPoint>} points - GPS points ordered by timestamp ASC
 * @param {Array<Trip>} trips - trips assigned in the period
 * @returns {Object}
 */
function computeDriverScore(points, trips = []) {
  const samples = Array.isArray(points) ? points.length : 0;

  // ── 1. Speeding ratio ──
  let speedingCount = 0;
  let movingCount = 0;
  for (const p of points || []) {
    if ((p.speed || 0) > IDLE_SPEED_THRESHOLD) movingCount++;
    if (p.is_speeding) speedingCount++;
  }
  const speedingRatio = movingCount > 0 ? speedingCount / movingCount : 0;
  const speedingScore = clampPct(100 - speedingRatio * 100 * 2.5); // 40% over = 0

  // ── 2. Harsh accel / brake events ──
  let harshAccel = 0;
  let harshBrake = 0;
  for (let i = 1; i < (points?.length || 0); i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev?.timestamp || !curr?.timestamp) continue;
    const dt = new Date(curr.timestamp) - new Date(prev.timestamp);
    if (dt <= 0 || dt > HARSH_WINDOW_MS) continue;
    const dv = (curr.speed || 0) - (prev.speed || 0);
    if (dv >= HARSH_ACCEL_DELTA_KMH) harshAccel++;
    if (dv <= HARSH_BRAKE_DELTA_KMH) harshBrake++;
  }
  const totalHarsh = harshAccel + harshBrake;
  const harshPerHour = samples > 0 ? totalHarsh / Math.max(1, sampleDurationHours(points)) : 0;
  const harshScore = clampPct(100 - harshPerHour * 10); // 10 events/h = 0

  // ── 3. Idle ratio ──
  let idleCount = 0;
  for (const p of points || []) {
    if (p.engine_on && (p.speed || 0) <= IDLE_SPEED_THRESHOLD) idleCount++;
  }
  const idleRatio = samples > 0 ? idleCount / samples : 0;
  const idleScore = clampPct(100 - Math.max(0, idleRatio - 0.2) * 100 * 1.5);

  // ── 4. Geofence violations ──
  const geofenceCount = (points || []).filter(p => p.is_outside_geofence).length;
  const geofenceRatio = samples > 0 ? geofenceCount / samples : 0;
  const geofenceScore = clampPct(100 - geofenceRatio * 100 * 3);

  // ── 5. Completion rate ──
  let completed = 0;
  let cancelled = 0;
  for (const t of trips || []) {
    if (t.status === 'completed') completed++;
    else if (t.status === 'cancelled') cancelled++;
  }
  const totalTrips = trips?.length || 0;
  const completionRatio = totalTrips > 0 ? completed / totalTrips : 1;
  const completionScore = clampPct(completionRatio * 100);

  // ── Weighted total ──
  const total =
    (speedingScore * SCORING_WEIGHTS.speeding +
      harshScore * SCORING_WEIGHTS.harshEvents +
      idleScore * SCORING_WEIGHTS.idle +
      geofenceScore * SCORING_WEIGHTS.geofence +
      completionScore * SCORING_WEIGHTS.completion) /
    100;
  const score = Math.round(total);
  const grade = gradeFromScore(score);

  // ── Recommendations ──
  const recommendations = [];
  if (speedingScore < 70) recommendations.push('تجاوز السرعة مرتفع — تدريب على القيادة الاقتصادية');
  if (harshScore < 70) recommendations.push('حوادث فرملة/تسارع مفاجئ — مراجعة سلوك القيادة');
  if (idleScore < 70) recommendations.push('وقت تعطّل طويل — تخطيط مسارات أفضل');
  if (geofenceScore < 80) recommendations.push('انحراف عن المسار — تأكد من اتباع الخريطة');
  if (completionScore < 90 && totalTrips > 0)
    recommendations.push('معدل إكمال الرحلات منخفض — متابعة الالتزام');

  return {
    score,
    grade,
    samples,
    trips: totalTrips,
    breakdown: {
      speeding: { score: speedingScore, ratio: round3(speedingRatio), incidents: speedingCount },
      harsh: {
        score: harshScore,
        accel: harshAccel,
        brake: harshBrake,
        perHour: round3(harshPerHour),
      },
      idle: { score: idleScore, ratio: round3(idleRatio) },
      geofence: { score: geofenceScore, incidents: geofenceCount },
      completion: { score: completionScore, completed, cancelled, total: totalTrips },
    },
    weights: SCORING_WEIGHTS,
    recommendations,
  };
}

function sampleDurationHours(points) {
  if (!points || points.length < 2) return 0;
  const first = new Date(points[0].timestamp).getTime();
  const last = new Date(points[points.length - 1].timestamp).getTime();
  return Math.max(0, (last - first) / (1000 * 60 * 60));
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

/**
 * Rank drivers given their pre-computed scores.
 * @param {Array<{driverId, score, samples}>} items
 */
function rankDrivers(items) {
  return [...(items || [])]
    .filter(i => i && i.samples > 0)
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({ ...item, rank: idx + 1, grade: gradeFromScore(item.score) }));
}

module.exports = {
  SCORING_WEIGHTS,
  HARSH_ACCEL_DELTA_KMH,
  HARSH_BRAKE_DELTA_KMH,
  computeDriverScore,
  rankDrivers,
  gradeFromScore,
};
