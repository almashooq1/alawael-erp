'use strict';

/**
 * careBootstrap.js — Phase 17 bootstrap for the Care Platform
 * (CRM + Social Services + Psychological Support + Life
 * Independence).
 *
 * Mirrors the pattern of `operationsBootstrap.js`:
 *   • pure wiring, no auth/route mounting
 *   • returns `null` if Mongo isn't connected
 *   • reuses the Phase-16 SLA engine + qualityEventBus so care
 *     events land on the same bus the Phase-15 notification
 *     router is already subscribed to
 *
 * C1 (4.0.83) wires the CRM lead-funnel service only. Future
 * commits add social/psych/independence services here.
 */

const mongoose = require('mongoose');
const { createLeadFunnelService } = require('../services/care/leadFunnel.service');
const { createSocialCaseService } = require('../services/care/socialCase.service');
const { createHomeVisitService } = require('../services/care/homeVisit.service');
const { createWelfareService } = require('../services/care/welfare.service');
const { createCommunityService } = require('../services/care/community.service');
const { createPsychService } = require('../services/care/psych.service');
const { createIndependenceService } = require('../services/care/independence.service');
const { createBeneficiary360Service } = require('../services/care/beneficiary360.service');
const { createRetentionService } = require('../services/care/retention.service');

let _leadFunnelService = null;
let _socialCaseService = null;
let _homeVisitService = null;
let _welfareService = null;
let _communityService = null;
let _psychService = null;
let _independenceService = null;
let _beneficiary360Service = null;
let _retentionService = null;

function bootstrapCare({ logger = console, dispatcher = null, slaEngine = null } = {}) {
  if (mongoose.connection.readyState !== 1) {
    logger.warn('[Care] bootstrap skipped — mongoose not connected');
    return null;
  }

  // Reuse the qualityEventBus so ops.crm.* events flow through the
  // same Phase-15 notification router + Phase-16 observability stack.
  let bus = dispatcher;
  if (!bus) {
    try {
      const { getDefault } = require('../services/quality/qualityEventBus.service');
      bus = getDefault();
    } catch (err) {
      logger.warn(`[Care] could not reuse qualityEventBus: ${err.message}`);
      bus = null;
    }
  }

  // Reuse the Phase-16 SLA engine default if the caller didn't inject one.
  let engine = slaEngine;
  if (!engine) {
    try {
      const slaMod = require('../services/operations/slaEngine.service');
      engine = slaMod.getDefault();
    } catch (err) {
      logger.warn(`[Care] SLA engine unavailable: ${err.message}`);
      engine = null;
    }
  }

  let leadFunnelService = null;
  try {
    const Inquiry = require('../models/care/Inquiry.model');
    const CareLead = require('../models/care/Lead.model');
    leadFunnelService = createLeadFunnelService({
      inquiryModel: Inquiry,
      leadModel: CareLead,
      slaEngine: engine,
      dispatcher: bus,
      logger,
    });
    _leadFunnelService = leadFunnelService;
  } catch (err) {
    logger.warn(`[Care] lead-funnel service unavailable: ${err.message}`);
  }

  // Phase 17 C2 — Social services (SocialCase lifecycle + 3 SLAs)
  let socialCaseService = null;
  try {
    const SocialCase = require('../models/care/SocialCase.model');
    socialCaseService = createSocialCaseService({
      caseModel: SocialCase,
      slaEngine: engine,
      dispatcher: bus,
      logger,
    });
    _socialCaseService = socialCaseService;
  } catch (err) {
    logger.warn(`[Care] social-case service unavailable: ${err.message}`);
  }

  // Phase 17 C3 — Home visits (lifecycle + follow-up SLA)
  let homeVisitService = null;
  try {
    const HomeVisit = require('../models/care/HomeVisit.model');
    homeVisitService = createHomeVisitService({
      visitModel: HomeVisit,
      slaEngine: engine,
      dispatcher: bus,
      logger,
    });
    _homeVisitService = homeVisitService;
  } catch (err) {
    logger.warn(`[Care] home-visit service unavailable: ${err.message}`);
  }

  // Phase 17 C4 — Welfare applications (lifecycle + appeals + disbursements)
  let welfareService = null;
  try {
    const WelfareApplication = require('../models/care/WelfareApplication.model');
    welfareService = createWelfareService({
      applicationModel: WelfareApplication,
      dispatcher: bus,
      logger,
    });
    _welfareService = welfareService;
  } catch (err) {
    logger.warn(`[Care] welfare service unavailable: ${err.message}`);
  }

  // Phase 17 C4 — Community partners + linkages
  let communityService = null;
  try {
    const CommunityPartner = require('../models/care/CommunityPartner.model');
    const CommunityLinkage = require('../models/care/CommunityLinkage.model');
    communityService = createCommunityService({
      partnerModel: CommunityPartner,
      linkageModel: CommunityLinkage,
      dispatcher: bus,
      logger,
    });
    _communityService = communityService;
  } catch (err) {
    logger.warn(`[Care] community service unavailable: ${err.message}`);
  }

  // Phase 17 C5 — Psych platform (risk flags + scales + MDT)
  let psychService = null;
  try {
    const PsychRiskFlag = require('../models/care/PsychRiskFlag.model');
    const PsychScaleAssessment = require('../models/care/PsychScaleAssessment.model');
    const MdtMeeting = require('../models/care/MdtMeeting.model');
    psychService = createPsychService({
      flagModel: PsychRiskFlag,
      scaleModel: PsychScaleAssessment,
      mdtModel: MdtMeeting,
      slaEngine: engine,
      dispatcher: bus,
      logger,
    });
    _psychService = psychService;
  } catch (err) {
    logger.warn(`[Care] psych service unavailable: ${err.message}`);
  }

  // Wire cross-service subscription: home-visit critical concern → auto-flag
  // the linked SocialCase as high-risk. Loose coupling via the bus.
  if (bus && homeVisitService && socialCaseService) {
    bus.on('ops.care.social.home_visit_critical_concern', async payload => {
      if (!payload?.caseId) return;
      try {
        await socialCaseService.flagHighRisk(payload.caseId, {
          riskLevel: 'high',
          reason: `home_visit_critical_concern (${payload.visitNumber || payload.visitId})`,
        });
      } catch (err) {
        logger.warn(
          `[Care] auto-flag high-risk from visit ${payload.visitId} failed: ${err.message}`
        );
      }
    });
  }

  // Phase 17 C6 — Life Independence (TransitionReadiness + IADL + Participation)
  let independenceService = null;
  try {
    const TransitionReadinessAssessment = require('../models/care/TransitionReadinessAssessment.model');
    const IadlAssessment = require('../models/care/IadlAssessment.model');
    const CommunityParticipationLog = require('../models/care/CommunityParticipationLog.model');
    const CommunityPartner = require('../models/care/CommunityPartner.model');
    independenceService = createIndependenceService({
      transitionModel: TransitionReadinessAssessment,
      iadlModel: IadlAssessment,
      participationModel: CommunityParticipationLog,
      partnerModel: CommunityPartner,
      dispatcher: bus,
      logger,
    });
    _independenceService = independenceService;
  } catch (err) {
    logger.warn(`[Care] independence service unavailable: ${err.message}`);
  }

  // Phase 17 C5 — Psych ↔ Social subscription
  // When a critical risk flag is raised against a beneficiary, check if they
  // have an open SocialCase and flag it high-risk. Loose coupling via bus.
  if (bus && psychService && socialCaseService) {
    bus.on('ops.care.psych.risk_flag_raised', async payload => {
      if (payload?.severity !== 'critical' || !payload?.caseId) return;
      try {
        await socialCaseService.flagHighRisk(payload.caseId, {
          riskLevel: 'high',
          reason: `psych_risk_flag_critical (${payload.flagNumber || payload.flagId})`,
        });
      } catch (err) {
        logger.warn(
          `[Care] auto-flag case from psych flag ${payload.flagId} failed: ${err.message}`
        );
      }
    });
  }

  // Phase 17 C7 — Beneficiary-360 aggregator (crown jewel)
  // Construct AFTER all upstream services so the accessor is populated.
  let beneficiary360Service = null;
  try {
    let beneficiaryModel = null;
    try {
      beneficiaryModel = require('../models/Beneficiary');
    } catch (_) {
      /* optional */
    }
    beneficiary360Service = createBeneficiary360Service({
      services: {
        leadFunnel: leadFunnelService,
        socialCase: socialCaseService,
        homeVisit: homeVisitService,
        welfare: welfareService,
        community: communityService,
        psych: psychService,
        independence: independenceService,
      },
      beneficiaryModel,
      logger,
    });
    _beneficiary360Service = beneficiary360Service;
  } catch (err) {
    logger.warn(`[Care] beneficiary-360 service unavailable: ${err.message}`);
  }

  // Phase 17 C8 — Retention / churn risk + auto-interventions
  // Constructed AFTER Beneficiary-360 (which it consumes).
  let retentionService = null;
  try {
    const RetentionAssessment = require('../models/care/RetentionAssessment.model');
    let beneficiaryModel = null;
    try {
      beneficiaryModel = require('../models/Beneficiary');
    } catch (_) {
      /* optional */
    }
    if (beneficiary360Service) {
      retentionService = createRetentionService({
        assessmentModel: RetentionAssessment,
        beneficiary360Service,
        psychService,
        socialCaseService,
        homeVisitService,
        beneficiaryModel,
        dispatcher: bus,
        logger,
      });
      _retentionService = retentionService;
    } else {
      logger.warn('[Care] retention service unavailable — beneficiary360Service missing');
    }
  } catch (err) {
    logger.warn(`[Care] retention service unavailable: ${err.message}`);
  }

  logger.info(
    '[Care] Phase 17 bootstrap complete — CRM + Social + Home Visits + Welfare + Community + Psych + Independence + Beneficiary-360 + Retention online'
  );

  async function shutdown() {
    // Nothing to unwind yet (no timers started here). Future commits
    // add retention sweepers / scoring schedulers.
  }

  return {
    leadFunnelService,
    socialCaseService,
    homeVisitService,
    welfareService,
    communityService,
    psychService,
    independenceService,
    beneficiary360Service,
    retentionService,
    shutdown,
  };
}

function _getLeadFunnelService() {
  return _leadFunnelService;
}
function _getSocialCaseService() {
  return _socialCaseService;
}
function _getHomeVisitService() {
  return _homeVisitService;
}
function _getWelfareService() {
  return _welfareService;
}
function _getCommunityService() {
  return _communityService;
}
function _getPsychService() {
  return _psychService;
}
function _getIndependenceService() {
  return _independenceService;
}
function _getBeneficiary360Service() {
  return _beneficiary360Service;
}
function _getRetentionService() {
  return _retentionService;
}

module.exports = {
  bootstrapCare,
  _getLeadFunnelService,
  _getSocialCaseService,
  _getHomeVisitService,
  _getWelfareService,
  _getCommunityService,
  _getPsychService,
  _getIndependenceService,
  _getBeneficiary360Service,
  _getRetentionService,
};
