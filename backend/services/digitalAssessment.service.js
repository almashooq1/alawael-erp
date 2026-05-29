'use strict';

/**
 * digitalAssessment.service.js — W557
 *
 * The digital-administration path: a clinician (or caregiver, via a
 * supervised flow) answers a standardized instrument item-by-item; the
 * W212 scoring engine auto-scores from the raw item responses; the result
 * is persisted as a `MeasureApplication` so it flows into the existing
 * outcome rollups, goal auto-update (W216), reassessment auto-close
 * (W214), trend engine, and the family/clinical/ministry reports.
 *
 * Distinct from MeasuresLibraryService.applyMeasure — that path takes
 * pre-computed domain scores and uses the legacy band-index ScoringEngine.
 * This path takes RAW ITEM RESPONSES and uses the registry-based
 * measureScoringEngine (W212) with version pinning + the W553 item banks.
 *
 * The service does NOT enforce tenant scope — the route layer must call
 * enforceBeneficiaryBranch(req, beneficiaryId) first (W269 doctrine).
 */

const mongoose = require('mongoose');
const engine = require('./measureScoringEngine.service');
const logger = require('../utils/logger');

function _err(message, statusCode) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

/**
 * Build the MeasureApplication.domainScores array from a scored W212
 * envelope + the instrument item bank + the raw responses.
 *
 * • Multi-domain instruments (PedsQL) → one entry per declared domain,
 *   each carrying its subscale value + the items that feed it.
 * • Single-domain instruments (M-CHAT-R, CARS-2) → one 'total' entry
 *   carrying every item.
 */
function _buildDomainScores(itemBankEnvelope, rawItems, scored) {
  const bank = itemBankEnvelope.itemBank;
  const lang = 'ar';
  const itemEntry = (item, idx) => ({
    itemIndex: item.number,
    label: item[`text_${lang}`] || item.text_en,
    rawScore: rawItems[idx],
  });

  const domains = bank.domains && bank.domains.length ? bank.domains : null;
  if (domains) {
    return domains.map(d => {
      const items = bank.items
        .map((item, idx) => ({ item, idx }))
        .filter(x => x.item.domain === d.key);
      const subVal = scored.derived.subscales ? scored.derived.subscales[d.key] : null;
      return {
        domainKey: d.key,
        domainName: d.name_en,
        domainName_ar: d.name_ar,
        itemScores: items.map(x => itemEntry(x.item, x.idx)),
        rawScore: typeof subVal === 'number' ? subVal : 0,
      };
    });
  }

  return [
    {
      domainKey: 'total',
      domainName: itemBankEnvelope.itemBank.instrumentName_en,
      domainName_ar: itemBankEnvelope.itemBank.instrumentName_ar,
      itemScores: bank.items.map((item, idx) => itemEntry(item, idx)),
      rawScore: scored.derived.value,
      interpretation: scored.interpretation.label_en,
      interpretation_ar: scored.interpretation.label_ar,
      severity: scored.interpretation.severity,
    },
  ];
}

class DigitalAssessmentService {
  /**
   * Score raw item responses WITHOUT persisting — used for the live
   * "your score would be…" preview as the clinician fills the form.
   *
   * @param {Object} input
   * @param {string} input.measureCode
   * @param {Array<number>} input.rawItems
   * @param {number} [input.prevDerived]  previous derived value for delta
   */
  async preview({ measureCode, rawItems, prevDerived }) {
    if (!measureCode) throw _err('measureCode required', 400);
    if (!Array.isArray(rawItems)) throw _err('rawItems array required', 400);

    const measure = await this._resolveMeasureOrModule(measureCode);
    const scored = await engine.score({ measure, rawItems, prevDerived });
    return scored;
  }

  /**
   * Administer + persist. Returns { application, scoring, comparison }.
   *
   * @param {Object} input
   * @param {string} input.beneficiaryId
   * @param {string} input.measureCode
   * @param {Array<number>} input.rawItems
   * @param {string} [input.episodeId]
   * @param {string} [input.purpose]
   * @param {string} [input.setting]
   * @param {string} [input.notes]
   * @param {string} [input.clinicalObservations]
   * @param {string} input.assessorId
   * @param {string} [input.branchId]
   * @param {string} [input.organizationId]
   */
  async administer(input) {
    const {
      beneficiaryId,
      measureCode,
      rawItems,
      episodeId,
      purpose,
      setting,
      notes,
      clinicalObservations,
      assessorId,
      branchId,
      organizationId,
    } = input;

    if (!beneficiaryId) throw _err('beneficiaryId required', 400);
    if (!measureCode) throw _err('measureCode required', 400);
    if (!Array.isArray(rawItems)) throw _err('rawItems array required', 400);
    if (!assessorId) throw _err('assessorId required', 400);

    const Measure = mongoose.model('Measure');
    const MeasureApplication = mongoose.model('MeasureApplication');

    // Must be a real catalog Measure — the digital path persists a
    // MeasureApplication whose measureId references it.
    const measure = await Measure.findOne({ code: measureCode });
    if (!measure) {
      throw _err(
        `Measure '${measureCode}' not found in catalog — run \`npm run seed:measures\``,
        404
      );
    }

    const itemBank = engine.getItemBank(measureCode);
    if (!itemBank) {
      throw _err(`Measure '${measureCode}' has no digital item bank`, 422);
    }

    // History → application number + comparison anchors.
    const history = await MeasureApplication.getMeasureHistory(beneficiaryId, measure._id);
    const completed = history.filter(h => h.status === 'completed' || h.status === 'locked');
    const applicationNumber = completed.length + 1;
    const previous = completed.length ? completed[completed.length - 1] : null;
    const baseline = history.find(h => h.purpose === 'baseline') || history[0] || null;

    const scored = await engine.score({
      measure,
      rawItems,
      prevDerived: previous ? previous.totalRawScore : undefined,
    });

    const resolvedPurpose = purpose || (applicationNumber === 1 ? 'baseline' : 'progress');
    const domainScores = _buildDomainScores(itemBank, rawItems, scored);

    const matched =
      typeof measure.interpretScore === 'function'
        ? measure.interpretScore(scored.derived.value)
        : null;

    const application = await MeasureApplication.create({
      beneficiaryId,
      episodeId,
      measureId: measure._id,
      applicationDate: new Date(),
      applicationNumber,
      purpose: resolvedPurpose,
      isBaseline: resolvedPurpose === 'baseline',

      domainScores,
      totalRawScore: scored.derived.value,
      compositeScore: scored.derived.subscales ? scored.derived.value : undefined,

      overallInterpretation: scored.interpretation.label_en,
      overallInterpretation_ar: scored.interpretation.label_ar,
      overallSeverity: scored.interpretation.severity,
      matchedRule: matched
        ? {
            rangeLabel: matched.rangeLabel,
            rangeLabel_ar: matched.rangeLabel_ar,
            color: matched.color,
          }
        : {
            rangeLabel: scored.interpretation.label_en,
            rangeLabel_ar: scored.interpretation.label_ar,
            color: scored.interpretation.color,
          },

      comparison: this._buildComparison(scored, baseline, previous, measure),

      assessorId,
      setting: setting || 'clinic',
      notes,
      clinicalObservations,

      isAutoScored: true,
      scoredWithMeasureVersion: measure.version || undefined,
      scoredWithAlgorithmVersion: scored.engineVersion || undefined,
      mcidAtAdministration: scored.mcidSnapshot || undefined,
      sdcAtAdministration: scored.sdcSnapshot || undefined,

      status: 'completed',
      branchId,
      organizationId,
      createdBy: assessorId,
    });

    await this._recordTimeline({
      beneficiaryId,
      episodeId,
      measure,
      application,
      scored,
      assessorId,
      applicationNumber,
    });

    logger.info(
      `[DigitalAssessment] ${measure.code} administered to ${beneficiaryId} — ` +
        `score ${scored.derived.value} (${scored.interpretation.band})`
    );

    return {
      application,
      scoring: scored,
      comparison: application.comparison,
      interpretation: scored.interpretation,
    };
  }

  /**
   * W558 — Build a professional bilingual result report for ONE persisted
   * administration. Two audiences:
   *   • 'clinical' — full item-level detail, all bands, comparison, assessor
   *   • 'family'   — jargon-free summary, traffic-light, plain-language action
   *
   * The per-beneficiary rollups (family/clinical/ministry) already pick up
   * digital administrations automatically via the outcome aggregator; this
   * is the single-administration result sheet a clinician shares or the
   * parent views for one specific assessment.
   *
   * @param {string} applicationId
   * @param {Object} [opts]
   * @param {'clinical'|'family'} [opts.audience='clinical']
   */
  async buildReport(applicationId, { audience = 'clinical' } = {}) {
    if (!mongoose.isValidObjectId(applicationId)) throw _err('valid applicationId required', 400);
    const MeasureApplication = mongoose.model('MeasureApplication');
    const Measure = mongoose.model('Measure');

    const app = await MeasureApplication.findById(applicationId)
      .populate('beneficiaryId', 'name fileNumber personalInfo dateOfBirth ageMonths')
      .populate('assessorId', 'name firstName lastName')
      .lean();
    if (!app) throw _err('administration not found', 404);

    const measure = await Measure.findById(app.measureId)
      .select(
        'code name name_ar abbreviation category publisher scoringRules scoringDirection minScore maxScore reporting interpretation'
      )
      .lean();

    const itemBank = engine.getItemBank(measure ? measure.code : '');

    const bands = (measure?.scoringRules || []).map(r => ({
      label_ar: r.rangeLabel_ar,
      label_en: r.rangeLabel,
      minScore: r.minScore,
      maxScore: r.maxScore,
      severity: r.severity,
      color: r.color,
      isCurrent:
        typeof app.totalRawScore === 'number' &&
        app.totalRawScore >= r.minScore &&
        app.totalRawScore <= r.maxScore,
    }));

    const beneficiary =
      app.beneficiaryId && typeof app.beneficiaryId === 'object'
        ? {
            id: String(app.beneficiaryId._id),
            name: app.beneficiaryId.name || app.beneficiaryId.personalInfo?.fullName || null,
            fileNumber: app.beneficiaryId.fileNumber || null,
          }
        : { id: String(app.beneficiaryId) };

    const header = {
      generatedAt: new Date(),
      audience,
      reportLanguage: 'ar',
      measure: measure
        ? {
            code: measure.code,
            name: measure.name,
            name_ar: measure.name_ar,
            abbreviation: measure.abbreviation,
            category: measure.category,
            publisher: measure.publisher,
            familyFriendlyLabel_ar: measure.reporting?.familyFriendlyLabel_ar || null,
          }
        : null,
      beneficiary,
      application: {
        id: String(app._id),
        date: app.applicationDate,
        purpose: app.purpose,
        applicationNumber: app.applicationNumber,
        setting: app.setting,
      },
      score: {
        value: app.totalRawScore,
        min: measure?.minScore,
        max: measure?.maxScore,
        direction: measure?.scoringDirection,
        subscales: (app.domainScores || [])
          .filter(d => d.domainKey !== 'total')
          .map(d => ({
            key: d.domainKey,
            name_ar: d.domainName_ar,
            name_en: d.domainName,
            score: d.rawScore,
          })),
      },
      interpretation: {
        label_ar: app.overallInterpretation_ar,
        label_en: app.overallInterpretation,
        severity: app.overallSeverity,
        color: app.matchedRule?.color,
      },
      bands,
    };

    if (audience === 'family') {
      return {
        ...header,
        // Family view: no item-level detail, no MCID jargon — plain action.
        summary_ar:
          `${measure?.reporting?.familyFriendlyLabel_ar || measure?.name_ar || ''}: ` +
          `${app.overallInterpretation_ar || ''}`,
        recommendation_ar: itemBank ? this._familyAction(itemBank, app.overallSeverity) : null,
        comparison: app.comparison
          ? {
              changeFromBaseline: app.comparison.changeFromBaseline ?? null,
              trend: app.comparison.trend ?? null,
            }
          : null,
      };
    }

    // Clinical view: full item-level detail + comparison + assessor.
    const items = this._reportItems(itemBank, app);
    return {
      ...header,
      comparison: app.comparison || null,
      mcid: app.mcidAtAdministration || null,
      versionPinned: {
        measureVersion: app.scoredWithMeasureVersion || null,
        algorithmVersion: app.scoredWithAlgorithmVersion || null,
      },
      assessor:
        app.assessorId && typeof app.assessorId === 'object'
          ? {
              name:
                app.assessorId.name ||
                [app.assessorId.firstName, app.assessorId.lastName].filter(Boolean).join(' ') ||
                null,
            }
          : null,
      clinicalObservations: app.clinicalObservations || null,
      notes: app.notes || null,
      items,
    };
  }

  _familyAction(itemBank, severity) {
    // The interpret() action lives in the scoring module; we surface a
    // gentle plain-language line keyed on severity.
    const map = {
      normal: 'النتيجة ضمن المعدّل الطبيعي — استمرّوا في البرنامج الحالي.',
      mild: 'هناك مؤشرات بسيطة — سنتابعها معكم في الجلسات القادمة.',
      moderate: 'نوصي بمتابعة مركّزة وقد نقترح تعديل بعض الأهداف.',
      severe: 'نوصي بتقييم أعمق وخطة تدخّل مكثّفة — سيتواصل معكم الفريق.',
      critical: 'يتطلّب الأمر اهتمامًا عاجلًا — سيتواصل معكم الفريق فورًا.',
    };
    return map[severity] || map.moderate;
  }

  _reportItems(itemBank, app) {
    if (!itemBank) return [];
    const optByValue = {};
    for (const it of itemBank.itemBank.items) {
      optByValue[it.number] = it;
    }
    const flat = [];
    for (const d of app.domainScores || []) {
      for (const is of d.itemScores || []) {
        const def = optByValue[is.itemIndex];
        const opt = def?.responseOptions?.find(o => o.value === is.rawScore);
        flat.push({
          number: is.itemIndex,
          domain: d.domainKey !== 'total' ? d.domainKey : undefined,
          text_ar: def?.text_ar || is.label,
          text_en: def?.text_en || null,
          response: is.rawScore,
          responseLabel_ar: opt?.label_ar || null,
          responseLabel_en: opt?.label_en || null,
          atRisk: opt?.atRisk === true,
        });
      }
    }
    return flat.sort((a, b) => a.number - b.number);
  }

  _buildComparison(scored, baseline, previous, measure) {
    const curr = scored.derived.value;
    const cmp = { trend: 'insufficient_data' };
    if (baseline && typeof baseline.totalRawScore === 'number') {
      cmp.baselineScore = baseline.totalRawScore;
      cmp.baselineDate = baseline.applicationDate;
      cmp.changeFromBaseline = Math.round((curr - baseline.totalRawScore) * 10) / 10;
      cmp.changeFromBaselinePercent =
        baseline.totalRawScore !== 0
          ? Math.round((cmp.changeFromBaseline / Math.abs(baseline.totalRawScore)) * 1000) / 10
          : null;
    }
    if (previous && typeof previous.totalRawScore === 'number') {
      cmp.previousScore = previous.totalRawScore;
      cmp.previousDate = previous.applicationDate;
      cmp.changeFromPrevious = Math.round((curr - previous.totalRawScore) * 10) / 10;
    }
    if (scored.delta) {
      cmp.trend =
        scored.delta.direction === 'improving'
          ? 'improving'
          : scored.delta.direction === 'declining'
            ? 'declining'
            : 'stable';
      cmp.isClinicallySignificant = scored.delta.mcidMet === true;
    }
    void measure;
    return cmp;
  }

  async _resolveMeasureOrModule(measureCode) {
    // Preview can run without a catalog Measure (pure registry scoring),
    // but if a catalog doc exists we use it for version pinning + MCID.
    try {
      const Measure = mongoose.model('Measure');
      const doc = await Measure.findOne({ code: measureCode }).lean();
      if (doc) return doc;
    } catch (_e) {
      /* model not registered in this context — fall through */
    }
    // Fall back to the module's own declared version so resolveStrict passes.
    const mod = engine.getItemBank(measureCode);
    if (!mod) throw _err(`Unknown measure '${measureCode}'`, 404);
    return { code: measureCode, scoringEngineVersion: mod.engineVersion };
  }

  async _recordTimeline({
    beneficiaryId,
    episodeId,
    measure,
    application,
    scored,
    assessorId,
    applicationNumber,
  }) {
    try {
      const CareTimeline = mongoose.model('CareTimeline');
      await CareTimeline.create({
        beneficiaryId,
        episodeId,
        eventType: 'assessment_completed',
        title: `تطبيق رقمي للمقياس: ${measure.name_ar || measure.name}`,
        description: `النتيجة: ${scored.derived.value} — ${scored.interpretation.label_ar}`,
        performedBy: assessorId,
        category: 'clinical',
        metadata: {
          measureCode: measure.code,
          applicationId: application._id,
          score: scored.derived.value,
          band: scored.interpretation.band,
          severity: scored.interpretation.severity,
          applicationNumber,
          digital: true,
        },
      });
    } catch (err) {
      logger.error(`[DigitalAssessment] Timeline recording failed: ${err.message}`);
    }
  }
}

const digitalAssessmentService = new DigitalAssessmentService();
module.exports = { DigitalAssessmentService, digitalAssessmentService, _buildDomainScores };
