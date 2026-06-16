import { captureMessage } from './sentry';

const STORAGE_KEY = 'opsTelemetryCounters';
const EVENTS_STORAGE_KEY = 'opsTelemetryEvents';
const MAX_COUNTER_AGE_MS = 24 * 60 * 60 * 1000;

const safeNow = () => Date.now();

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore localStorage quota/privacy failures
  }
}

function readEvents() {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeEvents(events) {
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore localStorage quota/privacy failures
  }
}

function pruneEvents(events) {
  const now = safeNow();
  return (events || []).filter(
    e => e && typeof e.at === 'number' && now - e.at <= MAX_COUNTER_AGE_MS
  );
}

function pruneExpired(store) {
  const now = safeNow();
  const next = { ...store };
  for (const [key, value] of Object.entries(next)) {
    if (!value || typeof value !== 'object') {
      delete next[key];
      continue;
    }
    if (typeof value.lastAt !== 'number' || now - value.lastAt > MAX_COUNTER_AGE_MS) {
      delete next[key];
    }
  }
  return next;
}

export function incrementOpsCounter(key, meta = {}) {
  if (!key) return;
  const current = pruneExpired(readStore());
  const now = safeNow();
  const existing = current[key] || { count: 0, firstAt: now, lastAt: now, meta: {} };

  current[key] = {
    count: Number(existing.count || 0) + 1,
    firstAt: Number(existing.firstAt || now),
    lastAt: now,
    meta: {
      ...(existing.meta || {}),
      ...(meta || {}),
    },
  };

  writeStore(current);

  const events = pruneEvents(readEvents());
  events.push({ key, at: now });
  // keep latest 2000 events only to avoid unbounded growth
  writeEvents(events.slice(-2000));
}

export function getOpsCounters(prefix = '') {
  const store = pruneExpired(readStore());
  const items = Object.entries(store)
    .filter(([key]) => (prefix ? key.startsWith(prefix) : true))
    .map(([key, value]) => ({
      key,
      count: Number(value.count || 0),
      firstAt: Number(value.firstAt || 0),
      lastAt: Number(value.lastAt || 0),
      meta: value.meta || {},
    }))
    .sort((a, b) => b.lastAt - a.lastAt);

  return items;
}

export function clearOpsCounters(prefix = '') {
  if (!prefix) {
    writeStore({});
    writeEvents([]);
    return;
  }

  const store = pruneExpired(readStore());
  const next = { ...store };
  for (const key of Object.keys(next)) {
    if (key.startsWith(prefix)) {
      delete next[key];
    }
  }
  writeStore(next);

  const events = pruneEvents(readEvents());
  writeEvents(events.filter(e => !String(e.key || '').startsWith(prefix)));
}

export function getOpsTrend(prefix = '', windowMs = 24 * 60 * 60 * 1000, buckets = 12) {
  const now = safeNow();
  const safeWindow = Math.max(60 * 1000, Number(windowMs) || 24 * 60 * 60 * 1000);
  const safeBuckets = Math.max(4, Number(buckets) || 12);
  const bucketSize = safeWindow / safeBuckets;
  const start = now - safeWindow;

  const values = new Array(safeBuckets).fill(0);
  const events = pruneEvents(readEvents()).filter(e => {
    if (!e || typeof e.at !== 'number') return false;
    if (e.at < start || e.at > now) return false;
    if (!prefix) return true;
    return String(e.key || '').startsWith(prefix);
  });

  for (const e of events) {
    const idx = Math.min(safeBuckets - 1, Math.floor((e.at - start) / bucketSize));
    if (idx >= 0) values[idx] += 1;
  }

  const points = values.map((value, idx) => {
    const ts = new Date(start + bucketSize * (idx + 1));
    return {
      slot: ts.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      value,
    };
  });

  return points;
}

function classifyOpsEventKey(key) {
  const normalized = String(key || '').toLowerCase();
  if (/auth|401|403/.test(normalized)) return 'auth';
  if (/partial|alerts-partial|financials-partial/.test(normalized)) return 'partial';
  return 'other';
}

export function getOpsTrendByCategory(prefix = '', windowMs = 24 * 60 * 60 * 1000, buckets = 12) {
  const now = safeNow();
  const safeWindow = Math.max(60 * 1000, Number(windowMs) || 24 * 60 * 60 * 1000);
  const safeBuckets = Math.max(4, Number(buckets) || 12);
  const bucketSize = safeWindow / safeBuckets;
  const start = now - safeWindow;

  const series = new Array(safeBuckets).fill(null).map(() => ({ auth: 0, partial: 0, other: 0 }));

  const events = pruneEvents(readEvents()).filter(e => {
    if (!e || typeof e.at !== 'number') return false;
    if (e.at < start || e.at > now) return false;
    if (!prefix) return true;
    return String(e.key || '').startsWith(prefix);
  });

  for (const e of events) {
    const idx = Math.min(safeBuckets - 1, Math.floor((e.at - start) / bucketSize));
    if (idx < 0) continue;
    const category = classifyOpsEventKey(e.key);
    series[idx][category] += 1;
  }

  return series.map((bucket, idx) => {
    const ts = new Date(start + bucketSize * (idx + 1));
    return {
      slot: ts.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      auth: bucket.auth,
      partial: bucket.partial,
      other: bucket.other,
    };
  });
}

export function logOpsEvent({
  key,
  sentryMessage,
  sentryLevel = 'warning',
  sentryContext = {},
  counterMeta = {},
}) {
  if (!key) return;
  incrementOpsCounter(key, counterMeta);
  if (sentryMessage) {
    captureMessage(sentryMessage, sentryLevel, sentryContext);
  }
}
