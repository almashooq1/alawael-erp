/**
 * scalesLoader.js — fetch canonical scale definitions from Backend.
 *
 * Loads `/api/v1/rehab-measures/catalog` and transforms the backend
 * measure documents into the shape expected by the frontend scale UI.
 * Falls back to the static `ASSESSMENT_SCALES` catalog if the API is
 * unreachable or returns an empty list.
 */

import apiClient from 'services/api.client';
import logger from 'utils/logger';
import ASSESSMENT_SCALES from './scales';

const SCALE_ID_MAP = {
  FIM: 'functionalIndependence',
  CARS2: 'cars2',
  GMFCS: 'gmfcs',
  VBMAPP: 'vbmapp',
  'VB-MAPP': 'vbmapp',
  ABLLSR: 'abllsr',
  'ABLLS-R': 'abllsr',
  BAYLEY4: 'bayley4',
  'BAYLEY-4': 'bayley4',
  WHODAS36: 'whodas36',
  'WHODAS-36': 'whodas36',
  ABAS3: 'abas3',
  'ABAS-3': 'abas3',
  GAS: 'gas',
  COPM: 'copm',
};

function toScaleId(key) {
  return SCALE_ID_MAP[key] || key.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function pickInterpretation(measure) {
  const raw = measure.interpretation;
  if (Array.isArray(raw)) return raw.map(toFrontendInterpretation);
  if (raw && typeof raw === 'object') {
    const first = Object.values(raw)[0];
    if (Array.isArray(first)) return first.map(toFrontendInterpretation);
  }
  return [];
}

function toFrontendInterpretation(entry) {
  const [min, max] = Array.isArray(entry.range) ? entry.range : [entry.min, entry.max];
  return {
    min,
    max,
    level: entry.tier || entry.level || entry.band || '',
    label: entry.label_ar || entry.label || '',
    color: entry.color || '#1976d2',
  };
}

function toFrontendDomains(measure) {
  const backendDomains = measure.domains || {};
  const entries = Object.entries(backendDomains);
  if (entries.length) {
    return entries.map(([key, d]) => ({
      key,
      name: d.name_ar || d.name || key,
      nameEn: d.name_en || d.nameEn || key,
      maxScore: d.maxScore || d.max || 0,
      weight: d.weight || 1,
    }));
  }
  const items = measure.items_ST || measure.items || [];
  if (items.length) {
    return items.map((item, idx) => ({
      key: item.id || `item_${idx + 1}`,
      name: item.name_ar || item.name || `بند ${idx + 1}`,
      nameEn: item.name_en || item.nameEn || `Item ${idx + 1}`,
      maxScore: item.maxScore || item.max || 0,
      weight: item.weight || 1,
    }));
  }
  return [];
}

function backendToFrontendScale(measure) {
  const key = measure.key || measure.abbreviation || measure.id;
  const id = toScaleId(key);
  const domains = toFrontendDomains(measure);
  const maxScore =
    measure.maxTotalScore ||
    measure.maxScore ||
    domains.reduce((sum, d) => sum + (d.maxScore || 0), 0);
  const minScore = measure.minTotalScore || measure.minScore || 0;

  return {
    id,
    name: measure.name_ar || measure.name || key,
    nameEn: measure.name_en || measure.nameEn || measure.name_en || key,
    description: measure.description_ar || measure.description || '',
    maxScore,
    minScore,
    domains,
    interpretation: pickInterpretation(measure),
    // Preserve backend metadata useful for the UI / reports.
    _backendKey: key,
    _backendId: measure.id,
    category: measure.category,
    targetPopulation: measure.targetPopulation,
    adminTime: measure.adminTime,
    references: measure.references,
  };
}

export async function loadScales() {
  try {
    const response = await apiClient.get('/api/v1/rehab-measures/catalog');
    const payload = response?.data || response;
    const list = Array.isArray(payload) ? payload : payload?.data;
    if (!Array.isArray(list) || !list.length) {
      logger.warn('scalesLoader: backend returned empty catalog — using static fallback');
      return ASSESSMENT_SCALES;
    }
    const loaded = list.map(backendToFrontendScale);
    // Merge with static fallback: backend definitions win, static fills gaps.
    const byId = new Map(loaded.map(s => [s.id, s]));
    for (const staticScale of ASSESSMENT_SCALES) {
      if (!byId.has(staticScale.id)) {
        byId.set(staticScale.id, staticScale);
      }
    }
    return Array.from(byId.values());
  } catch (err) {
    logger.warn(
      'scalesLoader: failed to load backend scales — using static fallback:',
      err?.message
    );
    return ASSESSMENT_SCALES;
  }
}

export function getStaticScales() {
  return ASSESSMENT_SCALES;
}

export default { loadScales, getStaticScales };
