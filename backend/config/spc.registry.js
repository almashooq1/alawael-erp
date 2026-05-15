'use strict';

/**
 * spc.registry.js — World-Class QMS Phase 29 Commit 3.
 *
 * Pure-math helpers + reference data for Statistical Process Control.
 * Implements the chart families covered by ISO 7870 and ASQ:
 *
 *   X-bar / R    — continuous data, fixed subgroup size (2-10).
 *   X-bar / S    — continuous data, larger subgroups (>10).
 *   I-MR         — individual + moving range (subgroup size 1).
 *   p            — proportion defective (Bernoulli trials).
 *   np           — count defective (fixed subgroup size).
 *   c            — count of defects per inspection unit.
 *   u            — defects per unit (variable opportunity).
 *
 * Plus process-capability indices (Cp, Cpk, Pp, Ppk) and the eight
 * Western Electric / Nelson rules for special-cause detection.
 *
 * No I/O — safe to require anywhere.
 */

// ── AIAG constants for X-bar / R / S charts ────────────────────────
//
// Values for subgroup sizes 2-25, taken from AIAG SPC Reference Manual
// 2nd ed. (pages 197-199). A2/A3/B3/B4/D3/D4 are the canonical names.

const SHEWHART_CONSTANTS = Object.freeze({
  2: { A2: 1.88, A3: 2.659, d2: 1.128, D3: 0, D4: 3.267, B3: 0, B4: 3.267 },
  3: { A2: 1.023, A3: 1.954, d2: 1.693, D3: 0, D4: 2.574, B3: 0, B4: 2.568 },
  4: { A2: 0.729, A3: 1.628, d2: 2.059, D3: 0, D4: 2.282, B3: 0, B4: 2.266 },
  5: { A2: 0.577, A3: 1.427, d2: 2.326, D3: 0, D4: 2.114, B3: 0, B4: 2.089 },
  6: { A2: 0.483, A3: 1.287, d2: 2.534, D3: 0, D4: 2.004, B3: 0.03, B4: 1.97 },
  7: { A2: 0.419, A3: 1.182, d2: 2.704, D3: 0.076, D4: 1.924, B3: 0.118, B4: 1.882 },
  8: { A2: 0.373, A3: 1.099, d2: 2.847, D3: 0.136, D4: 1.864, B3: 0.185, B4: 1.815 },
  9: { A2: 0.337, A3: 1.032, d2: 2.97, D3: 0.184, D4: 1.816, B3: 0.239, B4: 1.761 },
  10: { A2: 0.308, A3: 0.975, d2: 3.078, D3: 0.223, D4: 1.777, B3: 0.284, B4: 1.716 },
  11: { A2: 0.285, A3: 0.927, d2: 3.173, D3: 0.256, D4: 1.744, B3: 0.321, B4: 1.679 },
  12: { A2: 0.266, A3: 0.886, d2: 3.258, D3: 0.283, D4: 1.717, B3: 0.354, B4: 1.646 },
  15: { A2: 0.223, A3: 0.789, d2: 3.472, D3: 0.347, D4: 1.653, B3: 0.428, B4: 1.572 },
  20: { A2: 0.18, A3: 0.68, d2: 3.735, D3: 0.415, D4: 1.585, B3: 0.51, B4: 1.49 },
  25: { A2: 0.153, A3: 0.606, d2: 3.931, D3: 0.459, D4: 1.541, B3: 0.565, B4: 1.435 },
});

const CHART_TYPES = Object.freeze([
  {
    code: 'xbar_r',
    nameAr: 'X̄ - R',
    nameEn: 'X-bar / R',
    data: 'continuous',
    subgroupMin: 2,
    subgroupMax: 10,
  },
  {
    code: 'xbar_s',
    nameAr: 'X̄ - S',
    nameEn: 'X-bar / S',
    data: 'continuous',
    subgroupMin: 11,
    subgroupMax: 25,
  },
  {
    code: 'imr',
    nameAr: 'I-MR',
    nameEn: 'I-MR (individual + moving range)',
    data: 'continuous',
    subgroupMin: 1,
    subgroupMax: 1,
  },
  {
    code: 'p',
    nameAr: 'p',
    nameEn: 'p (proportion defective)',
    data: 'attribute',
    subgroupMin: 1,
    subgroupMax: null,
  },
  {
    code: 'np',
    nameAr: 'np',
    nameEn: 'np (count defective)',
    data: 'attribute',
    subgroupMin: 1,
    subgroupMax: null,
  },
  {
    code: 'c',
    nameAr: 'c',
    nameEn: 'c (count of defects)',
    data: 'attribute',
    subgroupMin: 1,
    subgroupMax: 1,
  },
  {
    code: 'u',
    nameAr: 'u',
    nameEn: 'u (defects per unit)',
    data: 'attribute',
    subgroupMin: 1,
    subgroupMax: null,
  },
]);

// ── Helpers ────────────────────────────────────────────────────────

const mean = arr => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length);
const stddev = arr => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
};
const range = arr => (arr.length === 0 ? 0 : Math.max(...arr) - Math.min(...arr));

function getConstants(n) {
  const exact = SHEWHART_CONSTANTS[n];
  if (exact) return exact;
  // Snap to the nearest known size (for n between 12 and 25 we fall back to 15/20/25).
  const sizes = Object.keys(SHEWHART_CONSTANTS)
    .map(Number)
    .sort((a, b) => a - b);
  let nearest = sizes[0];
  let bestDelta = Math.abs(n - nearest);
  for (const s of sizes) {
    const d = Math.abs(n - s);
    if (d < bestDelta) {
      bestDelta = d;
      nearest = s;
    }
  }
  return SHEWHART_CONSTANTS[nearest];
}

// ── Chart calculators ──────────────────────────────────────────────

/**
 * Compute X-bar / R control limits and per-subgroup statistics.
 *
 * @param {Array<Array<number>>} subgroups — each entry is a subgroup of measurements.
 * @returns {{xBarMean, rMean, xBarUcl, xBarLcl, rUcl, rLcl, points}}
 */
function computeXbarR(subgroups) {
  if (!Array.isArray(subgroups) || subgroups.length === 0) {
    throw new Error('subgroups required');
  }
  const n = subgroups[0].length;
  for (const g of subgroups) {
    if (g.length !== n) throw new Error('all subgroups must be the same size');
  }
  const { A2, D3, D4 } = getConstants(n);
  const xBars = subgroups.map(g => mean(g));
  const ranges = subgroups.map(g => range(g));
  const xBarMean = mean(xBars);
  const rMean = mean(ranges);
  const xBarUcl = xBarMean + A2 * rMean;
  const xBarLcl = xBarMean - A2 * rMean;
  const rUcl = D4 * rMean;
  const rLcl = D3 * rMean;
  return {
    chartType: 'xbar_r',
    subgroupSize: n,
    xBarMean,
    rMean,
    xBarUcl,
    xBarLcl,
    rUcl,
    rLcl,
    points: subgroups.map((g, i) => ({ index: i + 1, xBar: xBars[i], range: ranges[i] })),
  };
}

/**
 * Compute X-bar / S control limits.
 */
function computeXbarS(subgroups) {
  if (!Array.isArray(subgroups) || subgroups.length === 0) {
    throw new Error('subgroups required');
  }
  const n = subgroups[0].length;
  for (const g of subgroups) if (g.length !== n) throw new Error('size mismatch');
  const { A3, B3, B4 } = getConstants(n);
  const xBars = subgroups.map(g => mean(g));
  const stds = subgroups.map(g => stddev(g));
  const xBarMean = mean(xBars);
  const sMean = mean(stds);
  return {
    chartType: 'xbar_s',
    subgroupSize: n,
    xBarMean,
    sMean,
    xBarUcl: xBarMean + A3 * sMean,
    xBarLcl: xBarMean - A3 * sMean,
    sUcl: B4 * sMean,
    sLcl: B3 * sMean,
    points: subgroups.map((g, i) => ({ index: i + 1, xBar: xBars[i], stddev: stds[i] })),
  };
}

/**
 * Individual + moving-range. Subgroups of size 1.
 */
function computeImr(values) {
  if (!Array.isArray(values) || values.length < 2) {
    throw new Error('at least 2 measurements required');
  }
  const movingRanges = [];
  for (let i = 1; i < values.length; i++) {
    movingRanges.push(Math.abs(values[i] - values[i - 1]));
  }
  const xBar = mean(values);
  const mrBar = mean(movingRanges);
  // For n=2 (moving range): D3=0, D4=3.267, d2=1.128
  const sigma = mrBar / 1.128;
  return {
    chartType: 'imr',
    xBar,
    mrBar,
    sigma,
    iUcl: xBar + 3 * sigma,
    iLcl: xBar - 3 * sigma,
    mrUcl: 3.267 * mrBar,
    mrLcl: 0,
    points: values.map((v, i) => ({
      index: i + 1,
      value: v,
      mr: i === 0 ? null : Math.abs(v - values[i - 1]),
    })),
  };
}

/**
 * p-chart: each subgroup has size n_i and defective count d_i.
 * Variable n is supported per ASQ — UCL/LCL recomputed per point.
 */
function computeP(subgroups) {
  if (!Array.isArray(subgroups) || subgroups.length === 0) {
    throw new Error('subgroups required');
  }
  const totalDefective = subgroups.reduce((a, g) => a + g.defective, 0);
  const totalInspected = subgroups.reduce((a, g) => a + g.sampleSize, 0);
  if (totalInspected === 0) throw new Error('total sample size is 0');
  const pBar = totalDefective / totalInspected;
  return {
    chartType: 'p',
    pBar,
    points: subgroups.map((g, i) => {
      const p = g.defective / g.sampleSize;
      const sigma = Math.sqrt((pBar * (1 - pBar)) / g.sampleSize);
      return {
        index: i + 1,
        p,
        sampleSize: g.sampleSize,
        defective: g.defective,
        ucl: pBar + 3 * sigma,
        lcl: Math.max(0, pBar - 3 * sigma),
      };
    }),
  };
}

function computeNp(subgroups) {
  if (!Array.isArray(subgroups) || subgroups.length === 0) {
    throw new Error('subgroups required');
  }
  const n = subgroups[0].sampleSize;
  for (const g of subgroups) if (g.sampleSize !== n) throw new Error('np requires fixed n');
  const totalDefective = subgroups.reduce((a, g) => a + g.defective, 0);
  const pBar = totalDefective / (n * subgroups.length);
  const npBar = n * pBar;
  const sigma = Math.sqrt(npBar * (1 - pBar));
  return {
    chartType: 'np',
    n,
    pBar,
    npBar,
    ucl: npBar + 3 * sigma,
    lcl: Math.max(0, npBar - 3 * sigma),
    points: subgroups.map((g, i) => ({ index: i + 1, defective: g.defective })),
  };
}

function computeC(subgroups) {
  if (!Array.isArray(subgroups) || subgroups.length === 0) {
    throw new Error('subgroups required');
  }
  const counts = subgroups.map(g => g.count);
  const cBar = mean(counts);
  const sigma = Math.sqrt(cBar);
  return {
    chartType: 'c',
    cBar,
    ucl: cBar + 3 * sigma,
    lcl: Math.max(0, cBar - 3 * sigma),
    points: counts.map((c, i) => ({ index: i + 1, count: c })),
  };
}

function computeU(subgroups) {
  if (!Array.isArray(subgroups) || subgroups.length === 0) {
    throw new Error('subgroups required');
  }
  const totalDefects = subgroups.reduce((a, g) => a + g.count, 0);
  const totalUnits = subgroups.reduce((a, g) => a + g.units, 0);
  const uBar = totalDefects / totalUnits;
  return {
    chartType: 'u',
    uBar,
    points: subgroups.map((g, i) => {
      const u = g.count / g.units;
      const sigma = Math.sqrt(uBar / g.units);
      return {
        index: i + 1,
        u,
        units: g.units,
        count: g.count,
        ucl: uBar + 3 * sigma,
        lcl: Math.max(0, uBar - 3 * sigma),
      };
    }),
  };
}

// ── Process capability ─────────────────────────────────────────────

/**
 * Cp, Cpk, Pp, Ppk per the AIAG SPC Reference Manual.
 *
 * @param {object} input
 * @param {Array<number>} input.values — flat list of individual measurements.
 * @param {number} input.usl — upper spec limit
 * @param {number} input.lsl — lower spec limit
 * @param {number} input.sigmaWithin — short-term (within-subgroup) sigma; if omitted, sigmaLongTerm is used.
 * @returns {{cp, cpk, pp, ppk, mean, sigmaShortTerm, sigmaLongTerm}}
 */
function computeCapability({ values, usl, lsl, sigmaWithin = null }) {
  if (!Array.isArray(values) || values.length < 2) {
    throw new Error('at least 2 values required');
  }
  if (typeof usl !== 'number' || typeof lsl !== 'number' || usl <= lsl) {
    throw new Error('usl > lsl required');
  }
  const m = mean(values);
  const sigmaLong = stddev(values);
  const sigmaShort = sigmaWithin ?? sigmaLong;
  const cp = (usl - lsl) / (6 * sigmaShort);
  const cpu = (usl - m) / (3 * sigmaShort);
  const cpl = (m - lsl) / (3 * sigmaShort);
  const cpk = Math.min(cpu, cpl);
  const pp = (usl - lsl) / (6 * sigmaLong);
  const ppu = (usl - m) / (3 * sigmaLong);
  const ppl = (m - lsl) / (3 * sigmaLong);
  const ppk = Math.min(ppu, ppl);
  let grade = 'inadequate';
  if (cpk >= 1.67) grade = 'world_class';
  else if (cpk >= 1.33) grade = 'capable';
  else if (cpk >= 1.0) grade = 'marginal';
  return { mean: m, sigmaShortTerm: sigmaShort, sigmaLongTerm: sigmaLong, cp, cpk, pp, ppk, grade };
}

// ── Special-cause rules (Western Electric + Nelson) ────────────────

/**
 * Run the eight classic rules on a sequence of points + CL/UCL/LCL.
 * Returns the list of fired rule codes per point index.
 *
 * @param {Array<number>} values — y-values (X-bar, p, c, …).
 * @param {number} cl — center line.
 * @param {number} ucl
 * @param {number} lcl
 * @returns {Array<{index, value, fired:string[]}>}
 */
function detectSpecialCauses(values, cl, ucl, lcl) {
  const sigma = (ucl - cl) / 3;
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const fired = [];

    // Rule 1: one point beyond 3σ
    if (v > ucl || v < lcl) fired.push('rule_1_beyond_3sigma');

    // Rule 2: 9 points in a row on one side of CL
    if (i >= 8) {
      const win = values.slice(i - 8, i + 1);
      if (win.every(x => x > cl) || win.every(x => x < cl)) fired.push('rule_2_run_9');
    }

    // Rule 3: 6 in a row steadily increasing or decreasing
    if (i >= 5) {
      const win = values.slice(i - 5, i + 1);
      let inc = true;
      let dec = true;
      for (let k = 1; k < win.length; k++) {
        if (win[k] <= win[k - 1]) inc = false;
        if (win[k] >= win[k - 1]) dec = false;
      }
      if (inc || dec) fired.push('rule_3_trend_6');
    }

    // Rule 4: 14 in a row alternating up/down
    if (i >= 13) {
      const win = values.slice(i - 13, i + 1);
      let ok = true;
      for (let k = 1; k < win.length - 1; k++) {
        const a = win[k] - win[k - 1];
        const b = win[k + 1] - win[k];
        if (a === 0 || b === 0 || Math.sign(a) === Math.sign(b)) {
          ok = false;
          break;
        }
      }
      if (ok) fired.push('rule_4_alternating_14');
    }

    // Rule 5: 2 of 3 beyond 2σ on the same side
    if (i >= 2) {
      const win = values.slice(i - 2, i + 1);
      const aboveCount = win.filter(x => x > cl + 2 * sigma).length;
      const belowCount = win.filter(x => x < cl - 2 * sigma).length;
      if (aboveCount >= 2 || belowCount >= 2) fired.push('rule_5_2of3_2sigma');
    }

    // Rule 6: 4 of 5 beyond 1σ on the same side
    if (i >= 4) {
      const win = values.slice(i - 4, i + 1);
      const aboveCount = win.filter(x => x > cl + sigma).length;
      const belowCount = win.filter(x => x < cl - sigma).length;
      if (aboveCount >= 4 || belowCount >= 4) fired.push('rule_6_4of5_1sigma');
    }

    // Rule 7: 15 points within 1σ of CL (stratification / lack of variation)
    if (i >= 14) {
      const win = values.slice(i - 14, i + 1);
      if (win.every(x => x >= cl - sigma && x <= cl + sigma)) {
        fired.push('rule_7_hugging');
      }
    }

    // Rule 8: 8 in a row outside 1σ on either side (mixture)
    if (i >= 7) {
      const win = values.slice(i - 7, i + 1);
      if (win.every(x => x > cl + sigma || x < cl - sigma)) {
        fired.push('rule_8_mixture');
      }
    }

    out.push({ index: i + 1, value: v, fired });
  }
  return out;
}

const RULE_LABELS = Object.freeze({
  rule_1_beyond_3sigma: { nameAr: 'نقطة خارج حدود 3σ', nameEn: 'Point beyond 3-sigma' },
  rule_2_run_9: { nameAr: '9 نقاط متتالية على جهة واحدة', nameEn: 'Nine in a row on one side' },
  rule_3_trend_6: { nameAr: 'اتجاه صعودي/هبوطي 6 نقاط', nameEn: 'Trend of six' },
  rule_4_alternating_14: { nameAr: '14 نقطة متناوبة', nameEn: '14 alternating' },
  rule_5_2of3_2sigma: { nameAr: '2 من 3 خارج 2σ', nameEn: 'Two of three beyond 2-sigma' },
  rule_6_4of5_1sigma: { nameAr: '4 من 5 خارج 1σ', nameEn: 'Four of five beyond 1-sigma' },
  rule_7_hugging: { nameAr: '15 نقطة قريبة جداً من المركز', nameEn: '15 hugging the centerline' },
  rule_8_mixture: { nameAr: '8 نقاط خارج 1σ على أي جهة', nameEn: 'Eight beyond 1-sigma (mixture)' },
});

module.exports = {
  SHEWHART_CONSTANTS,
  CHART_TYPES,
  getConstants,
  mean,
  stddev,
  range,
  computeXbarR,
  computeXbarS,
  computeImr,
  computeP,
  computeNp,
  computeC,
  computeU,
  computeCapability,
  detectSpecialCauses,
  RULE_LABELS,
};
