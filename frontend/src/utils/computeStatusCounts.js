/**
 * Single-pass status counter — eliminates repeated .filter().length scans.
 *
 * @param {Array}  items      – array to scan
 * @param {string} [field='status'] – property name to group by
 * @param {string[]} [statuses=[]] – status values to count (omit to count all)
 * @returns {Record<string, number>} – counts keyed by status value, plus `_total`
 *
 * @example
 *   const { active, pending, inactive } = computeStatusCounts(
 *     beneficiaries, 'status', ['active', 'pending', 'inactive']
 *   );
 */
export default function computeStatusCounts(items, field = 'status', statuses = []) {
  if (!Array.isArray(items)) return { _total: 0 };

  const counts = { _total: 0 };
  if (statuses.length) {
    for (const s of statuses) counts[s] = 0;
  }

  for (const item of items) {
    const val = item?.[field];
    if (statuses.length === 0 || val in counts) {
      counts[val] = (counts[val] || 0) + 1;
    }
    counts._total++;
  }

  return counts;
}
