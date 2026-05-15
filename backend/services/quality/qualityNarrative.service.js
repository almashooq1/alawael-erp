'use strict';

const {
  redact,
  generateRuleBased,
  NARRATIVE_KINDS,
} = require('../../config/quality-narrative.registry');

class QualityNarrativeService {
  constructor({ llmClient = null, logger = console } = {}) {
    this.llmClient = llmClient;
    this.logger = logger;
  }

  async generate({ kind, payload }) {
    if (!NARRATIVE_KINDS.includes(kind)) {
      throw Object.assign(new Error(`unknown narrative kind: ${kind}`), { code: 'VALIDATION' });
    }
    const ruleBased = generateRuleBased({ kind, payload });
    // Redact rule-based output too (covers cases where the registry
    // bubbled PII from the payload).
    const redacted = {
      en: redact(ruleBased.en),
      ar: redact(ruleBased.ar),
    };

    if (!this.llmClient) {
      return { source: 'rule_based', ...redacted };
    }

    try {
      // We never send raw payload to the LLM — only the already-redacted
      // rule-based draft + a structural prompt.
      const prompt = this._buildPrompt(kind, redacted);
      const enhanced = await this.llmClient.complete(prompt);
      return {
        source: 'llm',
        en: redact(enhanced.en || redacted.en),
        ar: redact(enhanced.ar || redacted.ar),
        llmModel: enhanced.model || null,
      };
    } catch (err) {
      this.logger.warn(`[QualityNarrative] LLM fallback: ${err.message}`);
      return { source: 'rule_based_fallback', ...redacted, error: err.message };
    }
  }

  _buildPrompt(kind, draft) {
    return [
      `You are drafting a healthcare quality-management report. Kind: ${kind}.`,
      'Rewrite the following draft into a polished, professional paragraph in both',
      'English and Arabic. Do NOT invent new facts. Do NOT include any personal',
      'identifiers, ID numbers, phone numbers, or emails. Keep the figures exactly',
      'as given.',
      '---',
      `EN draft: ${draft.en}`,
      `AR draft: ${draft.ar}`,
    ].join('\n');
  }

  // Direct helpers (exposed for tests + callers that don't need LLM).
  generateRuleBased(input) {
    return generateRuleBased(input);
  }

  redact(text) {
    return redact(text);
  }

  listKinds() {
    return [...NARRATIVE_KINDS];
  }
}

function createQualityNarrativeService(deps) {
  return new QualityNarrativeService(deps);
}

let _defaultInstance = null;
function getDefault() {
  if (!_defaultInstance) {
    _defaultInstance = new QualityNarrativeService({ llmClient: null });
  }
  return _defaultInstance;
}

function _replaceDefault(instance) {
  _defaultInstance = instance;
}

module.exports = {
  QualityNarrativeService,
  createQualityNarrativeService,
  getDefault,
  _replaceDefault,
};
