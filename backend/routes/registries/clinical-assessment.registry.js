/**
 * Clinical Assessment & Specialized Services Sub-Registry
 * سجل مسارات التقييم والخدمات السريرية المتخصصة
 * ══════════════════════════════════════════════════════════════════════════
 * ~21 modules: Specialized Clinical Services (7), Al-Awael Smart
 * Rehabilitation (7 priorities), Al-Awael Professional Upgrade v2 (6),
 * Smart Assessment Engine (1)
 *
 * Split from clinical.registry.js (Priority #17) for maintainability.
 * ══════════════════════════════════════════════════════════════════════════
 */

'use strict';

/**
 * Register assessment & specialized clinical routes.
 * @param {Express.Application} app
 * @param {object} helpers – { safeRequire, dualMount, safeMount, logger }
 */
module.exports = function registerClinicalAssessmentRoutes(
  app,
  { safeRequire, dualMount, safeMount, logger }
) {
  // ══════════════════════════════════════════════════════════════════════════
  // ── Specialized Clinical Services — التخصصات السريرية المتقدمة ──────────
  // ══════════════════════════════════════════════════════════════════════════

  // Early Intervention System (نظام التدخل المبكر — أطفال 0–3 سنوات)
  const earlyInterventionRoutes = safeRequire('../routes/early-intervention.routes');
  dualMount(app, 'early-intervention', earlyInterventionRoutes);
  logger.info(
    'Early Intervention routes mounted (30+ endpoints — 5 modules: children 0-3, developmental screenings, milestones, IFSP plans, hospital referrals & national screening integration)'
  );

  // ICF Functional Assessment System (نظام التقييم الوظيفي وفق ICF)
  const icfAssessmentRoutes = safeRequire('../routes/icfAssessment.routes');
  dualMount(app, 'icf-assessments', icfAssessmentRoutes);
  logger.info(
    'ICF Assessment routes mounted (20+ endpoints — WHO ICF-based functional assessment: body functions, body structures, activities & participation, environmental factors, benchmarking, comparative reports, gap analysis)'
  );

  // Post-Rehabilitation Follow-Up System (نظام المتابعة ما بعد التأهيل)
  const postRehabFollowUpRoutes = safeRequire('../routes/post-rehab-followup.routes');
  dualMount(app, 'post-rehab-followup', postRehabFollowUpRoutes);
  logger.info(
    'Post-Rehab Follow-Up routes mounted (25+ endpoints — 5 modules: cases management, periodic follow-up visits home/remote, long-term impact measurement 6mo/1yr/2yr, satisfaction & outcome surveys, automatic re-enrollment)'
  );

  // Independent Living Transition System (نظام الانتقال للحياة المستقلة)
  const independentLivingRoutes = safeRequire('../routes/independentLiving.routes');
  dualMount(app, 'independent-living', independentLivingRoutes);
  logger.info(
    'Independent Living Transition routes mounted (30+ endpoints — 4 modules: ADL assessments, individual training plans (cooking/cleaning/shopping/transportation), independence progress tracking, supported/rehabilitative housing programs)'
  );

  // Mental Health & Psychosocial Support System (نظام الدعم النفسي والصحة النفسية)
  const mhpssRoutes = safeRequire('../routes/mhpss.routes');
  dualMount(app, 'mhpss', mhpssRoutes);
  logger.info(
    'MHPSS routes mounted (35+ endpoints — 5 modules: counseling sessions, mental health programs, psychological assessments, crisis interventions, psychosocial support groups)'
  );

  // Research & Evidence-Based Practice (نظام البحث العلمي وقياس الأثر)
  const researchRoutes = safeRequire('../routes/research.routes');
  dualMount(app, 'research', researchRoutes);
  logger.info(
    'Research & Evidence-Based Practice routes mounted (35+ endpoints — 7 modules: research studies, internationally-recognized outcome measures FIM/WHODAS/Barthel/COPM/GAS/PHQ-9/EQ-5D, anonymized datasets with k-anonymity/differential-privacy, evidence-based program effectiveness reports, benchmarking with other centers, data export to REDCap/SPSS/Stata/R/FHIR, dashboard & statistics)'
  );

  // Multidisciplinary Team Coordination System (نظام التنسيق متعدد التخصصات)
  const mdtCoordinationRoutes = safeRequire('../routes/mdt-coordination.routes');
  dualMount(app, 'mdt-coordination', mdtCoordinationRoutes);
  logger.info(
    'MDT Coordination routes mounted (65+ endpoints — 5 modules: MDT meetings with agenda/cases/attendance, unified rehabilitation plans with multi-therapist goals & reviews, internal referral tickets between departments, shared beneficiary/team/department dashboards, meeting minutes & decisions tracker with action items)'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Al-Awael Smart Rehabilitation System — الأولويات العشر الاحترافية ──
  // ══════════════════════════════════════════════════════════════════════════

  // Priority 1: Standard Assessment Tools (VABS-3, CARS-2, PEP-3, ICF)
  safeMount(
    app,
    ['/api/standard-assessments', '/api/v1/standard-assessments'],
    '../rehabilitation-assessment/standard-assessment-routes'
  );
  logger.info(
    'Standard Assessment routes mounted (VABS-3, CARS-2, PEP-3, ICF, Developmental Milestones — auto-scoring)'
  );

  // Priority 2: Smart IEP + Goals Bank + Session Logs
  safeMount(
    app,
    ['/api/smart-iep', '/api/v1/smart-iep'],
    '../rehabilitation-services/smart-iep-routes'
  );
  logger.info(
    'Smart IEP routes mounted (Goals Bank 200+, SMART IEP, Session Logs, ABC Tracking, Mastery Detection)'
  );

  // Priority 3: Early Warning System (Plateau, Regression, Attendance)
  safeMount(
    app,
    ['/api/early-warning', '/api/v1/early-warning'],
    '../rehabilitation-services/early-warning-system'
  );
  logger.info(
    'Early Warning System routes mounted (plateau detection, regression alert, attendance monitoring)'
  );

  // Priority 4: Smart Family Portal (Home Activities, Digital Notebook, Engagement)
  safeMount(
    app,
    ['/api/family-portal', '/api/v1/family-portal'],
    '../rehabilitation-family/smart-family-portal'
  );
  logger.info(
    'Smart Family Portal routes mounted (digital notebook, weekly home activities, simplified reports, engagement index)'
  );

  // Priority 5: AI Rehabilitation Recommendation Engine (ABA, PECS, TEACCH, DIR, PRT, SI)
  safeMount(
    app,
    ['/api/rehab-recommendations', '/api/v1/rehab-recommendations'],
    '../rehabilitation-ai/recommendation-engine'
  );
  logger.info(
    'AI Rehabilitation Recommendation Engine routes mounted (ABA/PECS/TEACCH/DIR/PRT/SI scoring, goal prioritization, red flags)'
  );

  // Priorities 6, 7, 8: MDT System + Transition Planning + Quality KPIs (CARF)
  safeMount(
    app,
    ['/api/rehab-operations', '/api/v1/rehab-operations'],
    '../rehabilitation-services/mdt-transition-quality'
  );
  logger.info(
    'Rehab Operations routes mounted (MDT meetings, Transition Planning, Quality KPIs/CARF compliance)'
  );

  // Priorities 9 & 10: AAC Module + Therapeutic Protocol Library
  safeMount(
    app,
    ['/api/rehab-clinical', '/api/v1/rehab-clinical'],
    '../rehabilitation-services/aac-therapy-protocols'
  );
  logger.info(
    'Rehab Clinical routes mounted (AAC profiles/PECS/ARASAAC/vocabulary bank, Protocol Library: DTT/PECS/TEACCH/FBA/SI/PEERS)'
  );

  logger.info('🏆 Al-Awael Smart Rehabilitation System — جميع الأولويات العشر مُثبّتة بنجاح');

  // ══════════════════════════════════════════════════════════════════════════
  // ── Al-Awael Professional Upgrade v2 — 6 New Professional Modules ──────
  // ══════════════════════════════════════════════════════════════════════════

  // Upgrade 1: Goals Bank Service (200+ therapeutic goals, 17 domains)
  safeMount(
    app,
    ['/api/goals-bank-service', '/api/v1/goals-bank-service'],
    '../rehabilitation-services/goals-bank-service'
  );
  logger.info(
    'Goals Bank Service routes mounted (200+ therapeutic goals, 17 domains: COM/COG/FMT/GMT/SOC/SFC/BEH/SEN/ACA/VOC/TRN/PLY/LNG/FED/HRG/VIS/DLV)'
  );

  // Upgrade 2: ADOS-2 and Sensory Profile 2
  safeMount(
    app,
    ['/api/ados2-sp2', '/api/v1/ados2-sp2'],
    '../rehabilitation-assessment/ados2-sensory-profile2'
  );
  logger.info(
    'ADOS-2 & Sensory Profile 2 routes mounted (ADOS-2: Social Affect + RRB algorithm, Modules 1-4 + Toddler; SP2: 6 sensory systems, 4 quadrant patterns, sensory diet)'
  );

  // Upgrade 3: Escalation Notifications System
  safeMount(
    app,
    ['/api/escalation-notifications', '/api/v1/escalation-notifications'],
    '../rehabilitation-services/escalation-notifications-service'
  );
  logger.info(
    'Escalation Notifications routes mounted (8 default rules: session_missed, crisis_indicator, iep_review_due, goal_regression, attendance_risk, discharge_pending, medication_change, family_complaint)'
  );

  // Upgrade 4: PDF Report Generator
  safeMount(
    app,
    ['/api/pdf-reports', '/api/v1/pdf-reports'],
    '../rehabilitation-services/pdf-report-generator'
  );
  logger.info(
    'PDF Report Generator routes mounted (7 report types: IEP, Progress, Session, Assessment, DepartmentStats, CARF, Family — Arabic RTL, Cairo font)'
  );

  // Upgrade 5: CARF Accreditation Service
  safeMount(
    app,
    ['/api/carf-accreditation', '/api/v1/carf-accreditation'],
    '../rehabilitation-services/carf-accreditation-service'
  );
  logger.info(
    'CARF Accreditation routes mounted (22 core standards, 8 sections A-K: leadership, strategic-planning, human-resources, rights, service-delivery, outcomes, comprehensive-rehab)'
  );

  // Upgrade 6: Advanced Therapy Protocols (22+ evidence-based protocols)
  safeMount(
    app,
    ['/api/advanced-therapy-protocols', '/api/v1/advanced-therapy-protocols'],
    '../rehabilitation-services/advanced-therapy-protocols'
  );
  logger.info(
    'Advanced Therapy Protocols routes mounted (22 protocols: ABA-DTT, PECS, DIR/Floortime, Ayres-SI, CIMT, Dysphagia, PROMPT, RDI, SOS-Feeding, SCERTS, NDT/Bobath, Hanen, PRT, LAMP, PCIT, Video-Modeling, PEERS, Lokomat + more)'
  );

  logger.info(
    'Al-Awael Professional Upgrade v2 complete: Goals Bank 200+ + ADOS-2/SP2 + Escalation Notifications + PDF Reports + CARF Accreditation + 22 Advanced Protocols'
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ── Smart Assessment Engine — محرك التقييم الذكي (النظام 44) ────────────
  // ══════════════════════════════════════════════════════════════════════════
  safeMount(
    app,
    ['/api/smart-assessment', '/api/v1/smart-assessment'],
    './smart-assessment-engine.routes'
  );
  logger.info(
    '✅ Smart Assessment Engine routes mounted (System 44): M-CHAT-R/F, CARS-2, Sensory Profile 2, BRIEF-2, SRS-2, Portage Guide, ABC Data Collection, Family Needs, QoL, Transition Readiness, Saudi Screening, FBA, Caregiver Burden — auto-scoring + CDSS protocols + progress analytics + effect size + RCI + clinical significance + trend analysis + goal prediction + benchmarks + ROI (60+ endpoints)'
  );

  logger.info(
    '[Clinical-Assessment] All ~21 assessment/specialized clinical modules mounted successfully'
  );
};
