/**
 * مركز الطباعة — Print Center Hub Page
 * صفحة مركزية تجمع كل قوالب الطباعة من جميع الأنظمة
 */
import React, { useState, useRef, useCallback } from 'react';




/* ─── Batch 1 Templates ─── */
import { HR_TEMPLATES, HRTemplateRenderer } from './templates/HRPrintTemplates';
import { FINANCE_TEMPLATES, FinanceTemplateRenderer } from './templates/FinancePrintTemplates';
import { THERAPY_TEMPLATES, TherapyTemplateRenderer } from './templates/TherapyPrintTemplates';
import { ADMIN_TEMPLATES, AdminTemplateRenderer } from './templates/AdminPrintTemplates';
import { OPERATIONS_TEMPLATES, OperationsTemplateRenderer } from './templates/OperationsPrintTemplates';

/* ─── Batch 2 Templates ─── */
import { EDUCATION_TEMPLATES, EducationTemplateRenderer } from './templates/EducationPrintTemplates';
import { PROCUREMENT_TEMPLATES, ProcurementTemplateRenderer } from './templates/ProcurementSCMPrintTemplates';
import { LEGAL_TEMPLATES, LegalTemplateRenderer } from './templates/LegalContractsPrintTemplates';
import { QUALITY_HSE_TEMPLATES, QualityHSETemplateRenderer } from './templates/QualityHSEPrintTemplates';
import { MEDICAL_TEMPLATES, MedicalTemplateRenderer } from './templates/MedicalClinicalPrintTemplates';
import { FLEET_TEMPLATES, FleetTemplateRenderer } from './templates/FleetTransportPrintTemplates';
import { HR_EXT_TEMPLATES, HRExtTemplateRenderer } from './templates/RecruitmentHRExtPrintTemplates';
import { COMMUNICATIONS_TEMPLATES, CommunicationsTemplateRenderer } from './templates/CommunicationsEventsPrintTemplates';
import { FACILITY_TEMPLATES, FacilityTemplateRenderer } from './templates/FacilityServicesPrintTemplates';
import { BUSINESS_TEMPLATES, BusinessTemplateRenderer } from './templates/BusinessCRMPrintTemplates';
import { STAKEHOLDER_TEMPLATES, StakeholderTemplateRenderer } from './templates/StakeholderGovPrintTemplates';

/* ─── Batch 3 Templates ─── */
import { REHAB_SPECIALIZED_TEMPLATES, RehabSpecializedTemplateRenderer } from './templates/RehabSpecializedPrintTemplates';
import { EARLY_MHPSS_TEMPLATES, EarlyMHPSSTemplateRenderer } from './templates/EarlyMHPSSPrintTemplates';
import { TELEHEALTH_MONTESSORI_TEMPLATES, TelehealthMontessoriTemplateRenderer } from './templates/TelehealthMontessoriPrintTemplates';
import { DONATIONS_HELPDESK_TEMPLATES, DonationsHelpDeskTemplateRenderer } from './templates/DonationsHelpDeskPrintTemplates';
import { PROJECTS_STRATEGY_TEMPLATES, ProjectsStrategyTemplateRenderer } from './templates/ProjectsStrategyPrintTemplates';
import { WORKFLOW_AUDIT_TEMPLATES, WorkflowAuditTemplateRenderer } from './templates/WorkflowAuditPrintTemplates';
import { KITCHEN_LIBRARY_TEMPLATES, KitchenLibraryTemplateRenderer } from './templates/KitchenLibraryPrintTemplates';
import { GOV_IOT_TEMPLATES, GovIoTTemplateRenderer } from './templates/GovIntegrationsPrintTemplates';
import { ECOMMERCE_BLOCKCHAIN_TEMPLATES, EcommerceBlockchainTemplateRenderer } from './templates/EcommerceBlockchainPrintTemplates';
import { PORTALS_DIRECTIVES_TEMPLATES, PortalsDirectivesTemplateRenderer } from './templates/PortalsDirectivesPrintTemplates';

/* ─── Batch 4 Templates ─── */
import { CASE_BENEFICIARY_TEMPLATES, CaseBeneficiaryTemplateRenderer } from './templates/CaseBeneficiaryPrintTemplates';
import { COMPLAINTS_MEETINGS_TEMPLATES, ComplaintsMeetingsTemplateRenderer } from './templates/ComplaintsMeetingsPrintTemplates';
import { FAMILY_SATISFACTION_TEMPLATES, FamilySatisfactionTemplateRenderer } from './templates/FamilySatisfactionPrintTemplates';
import { DISABILITY_ASSESSMENT_TEMPLATES, DisabilityAssessmentTemplateRenderer } from './templates/DisabilityAssessmentPrintTemplates';
import { DOCUMENT_MANAGEMENT_TEMPLATES, DocumentManagementTemplateRenderer } from './templates/DocumentManagementPrintTemplates';
import { CRISIS_SAFETY_TEMPLATES, CrisisSafetyTemplateRenderer } from './templates/CrisisSafetyPrintTemplates';
import { COMMUNITY_ORG_TEMPLATES, CommunityOrgTemplateRenderer } from './templates/CommunityOrgPrintTemplates';
import { BI_EXECUTIVE_TEMPLATES, BIExecutiveTemplateRenderer } from './templates/BIExecutivePrintTemplates';
import { SPECIAL_EDUCATION_TEMPLATES, SpecialEducationTemplateRenderer } from './templates/SpecialEducationPrintTemplates';
import { ENTERPRISE_PLUS_TEMPLATES, EnterprisePlusTemplateRenderer } from './templates/EnterprisePlusPrintTemplates';

/* ─── Batch 5 Templates ─── */
import { SAUDI_GOV_TEMPLATES, SaudiGovTemplateRenderer } from './templates/SaudiGovPlatformsPrintTemplates';
import { ACADEMIC_CURRICULUM_TEMPLATES, AcademicCurriculumTemplateRenderer } from './templates/AcademicCurriculumPrintTemplates';
import { STUDENT_EXTENDED_TEMPLATES, StudentExtendedTemplateRenderer } from './templates/StudentExtendedPrintTemplates';
import { FINANCIAL_PLANNING_TEMPLATES, FinancialPlanningTemplateRenderer } from './templates/FinancialPlanningPrintTemplates';
import { ADVANCED_THERAPY_TEMPLATES, AdvancedTherapyTemplateRenderer } from './templates/AdvancedTherapyPrintTemplates';
import { GPS_BUS_TRAFFIC_TEMPLATES, GpsBusTrafficTemplateRenderer } from './templates/GpsBusTrafficPrintTemplates';
import { COMPENSATION_WORKFORCE_TEMPLATES, CompensationWorkforceTemplateRenderer } from './templates/CompensationWorkforcePrintTemplates';
import { AI_ML_ANALYTICS_TEMPLATES, AIMLAnalyticsTemplateRenderer } from './templates/AIMLAnalyticsPrintTemplates';
import { SYSTEM_ADMIN_SECURITY_TEMPLATES, SystemAdminSecurityTemplateRenderer } from './templates/SystemAdminSecurityPrintTemplates';
import { SMART_FEATURES_APPROVALS_TEMPLATES, SmartFeaturesApprovalsTemplateRenderer } from './templates/SmartFeaturesApprovalsPrintTemplates';
import { MESSAGING_CMS_CAMPAIGNS_TEMPLATES, MessagingCMSCampaignsTemplateRenderer } from './templates/MessagingCMSCampaignsPrintTemplates';
import { SUPPLY_CHAIN_EXTENDED_TEMPLATES, SupplyChainExtendedTemplateRenderer } from './templates/SupplyChainExtendedPrintTemplates';
import { ELEARNING_KNOWLEDGE_TEMPLATES, ElearningKnowledgeTemplateRenderer } from './templates/ElearningKnowledgePrintTemplates';
import { WHATSAPP_MOBILE_TEMPLATES, WhatsAppMobileTemplateRenderer } from './templates/WhatsAppMobilePrintTemplates';
import { MICROSERVICES_DASHBOARD_TEMPLATES, MicroservicesDashboardTemplateRenderer } from './templates/MicroservicesDashboardPrintTemplates';

/* ─── Batch 6 Templates ─── */
import { PARTNERSHIPS_PR_TEMPLATES, PartnershipsPRTemplateRenderer } from './templates/PartnershipsPRPrintTemplates';
import { INSURANCE_LEAVE_TEMPLATES, InsuranceLeaveTemplateRenderer } from './templates/InsuranceLeavePrintTemplates';
import { RISK_COMPLIANCE_TEMPLATES, RiskComplianceTemplateRenderer } from './templates/RiskCompliancePrintTemplates';
import { REPORT_BUILDER_TEMPLATES, ReportBuilderTemplateRenderer } from './templates/ReportBuilderPrintTemplates';
import { TREATMENT_WAITLIST_TEMPLATES, TreatmentWaitlistTemplateRenderer } from './templates/TreatmentWaitlistPrintTemplates';
import { ZAKAT_ISLAMIC_FINANCE_TEMPLATES, ZakatIslamicFinanceTemplateRenderer } from './templates/ZakatIslamicFinancePrintTemplates';
import { SUCCESSION_PERFORMANCE_TEMPLATES, SuccessionPerformanceTemplateRenderer } from './templates/SuccessionPerformancePrintTemplates';
import { FEEDBACK_GAMIFICATION_TEMPLATES, FeedbackGamificationTemplateRenderer } from './templates/FeedbackGamificationPrintTemplates';
import { INTEGRATED_CARE_OCR_TEMPLATES, IntegratedCareOCRTemplateRenderer } from './templates/IntegratedCareOCRPrintTemplates';
import { AGENT_CHAT_REALTIME_TEMPLATES, AgentChatRealtimeTemplateRenderer } from './templates/AgentChatRealtimePrintTemplates';

/* ─── Module Groups ─── */
const MODULE_GROUPS = [
  {
    id: 'hr', name: 'الموارد البشرية', nameEn: 'Human Resources',
    icon: <HRIcon />, color: '#2e7d32',
    templates: HR_TEMPLATES,
    renderer: HRTemplateRenderer,
  },
  {
    id: 'finance', name: 'المالية والمحاسبة', nameEn: 'Finance & Accounting',
    icon: <FinanceIcon />, color: '#1565c0',
    templates: FINANCE_TEMPLATES,
    renderer: FinanceTemplateRenderer,
  },
  {
    id: 'therapy', name: 'العلاج والتأهيل', nameEn: 'Therapy & Rehabilitation',
    icon: <TherapyIcon />, color: '#7b1fa2',
    templates: THERAPY_TEMPLATES,
    renderer: TherapyTemplateRenderer,
  },
  {
    id: 'admin', name: 'الإدارة والتنظيم', nameEn: 'Administration & Organization',
    icon: <AdminIcon />, color: '#37474f',
    templates: ADMIN_TEMPLATES,
    renderer: AdminTemplateRenderer,
  },
  {
    id: 'operations', name: 'العمليات والصيانة', nameEn: 'Operations & Maintenance',
    icon: <OpsIcon />, color: '#e65100',
    templates: OPERATIONS_TEMPLATES,
    renderer: OperationsTemplateRenderer,
  },
  /* ─── Batch 2 Modules ─── */
  {
    id: 'education', name: 'التعليم والطلاب', nameEn: 'Education & Students',
    icon: <EducationIcon />, color: '#0277bd',
    templates: EDUCATION_TEMPLATES,
    renderer: EducationTemplateRenderer,
  },
  {
    id: 'procurement', name: 'المشتريات وسلسلة الإمداد', nameEn: 'Procurement & SCM',
    icon: <ProcurementIcon />, color: '#4527a0',
    templates: PROCUREMENT_TEMPLATES,
    renderer: ProcurementTemplateRenderer,
  },
  {
    id: 'legal', name: 'الشؤون القانونية والعقود', nameEn: 'Legal & Contracts',
    icon: <LegalIcon />, color: '#37474f',
    templates: LEGAL_TEMPLATES,
    renderer: LegalTemplateRenderer,
  },
  {
    id: 'quality-hse', name: 'الجودة والسلامة', nameEn: 'Quality & HSE',
    icon: <QualityIcon />, color: '#00695c',
    templates: QUALITY_HSE_TEMPLATES,
    renderer: QualityHSETemplateRenderer,
  },
  {
    id: 'medical', name: 'الطبي والسريري', nameEn: 'Medical & Clinical',
    icon: <MedicalIcon />, color: '#c62828',
    templates: MEDICAL_TEMPLATES,
    renderer: MedicalTemplateRenderer,
  },
  {
    id: 'fleet', name: 'الأسطول والنقل', nameEn: 'Fleet & Transport',
    icon: <FleetIcon />, color: '#ef6c00',
    templates: FLEET_TEMPLATES,
    renderer: FleetTemplateRenderer,
  },
  {
    id: 'hr-ext', name: 'التوظيف والرواتب', nameEn: 'Recruitment & Payroll',
    icon: <RecruitmentIcon />, color: '#ad1457',
    templates: HR_EXT_TEMPLATES,
    renderer: HRExtTemplateRenderer,
  },
  {
    id: 'communications', name: 'الاتصالات والفعاليات', nameEn: 'Communications & Events',
    icon: <CommsIcon />, color: '#1565c0',
    templates: COMMUNICATIONS_TEMPLATES,
    renderer: CommunicationsTemplateRenderer,
  },
  {
    id: 'facility', name: 'المرافق والخدمات', nameEn: 'Facility & Services',
    icon: <FacilityIcon />, color: '#795548',
    templates: FACILITY_TEMPLATES,
    renderer: FacilityTemplateRenderer,
  },
  {
    id: 'business', name: 'الأعمال والمشاريع', nameEn: 'Business & CRM',
    icon: <BusinessIcon />, color: '#2e7d32',
    templates: BUSINESS_TEMPLATES,
    renderer: BusinessTemplateRenderer,
  },
  {
    id: 'stakeholder', name: 'أصحاب المصلحة والجهات', nameEn: 'Stakeholder & Government',
    icon: <StakeholderIcon />, color: '#0d47a1',
    templates: STAKEHOLDER_TEMPLATES,
    renderer: StakeholderTemplateRenderer,
  },
  /* ─── Batch 3 Modules ─── */
  {
    id: 'rehab-specialized', name: 'التأهيل المتخصص', nameEn: 'Specialized Rehabilitation',
    icon: <RehabIcon />, color: '#00838f',
    templates: REHAB_SPECIALIZED_TEMPLATES,
    renderer: RehabSpecializedTemplateRenderer,
  },
  {
    id: 'early-mhpss', name: 'التدخل المبكر والدعم النفسي', nameEn: 'Early Intervention & MHPSS',
    icon: <EarlyIcon />, color: '#6a1b9a',
    templates: EARLY_MHPSS_TEMPLATES,
    renderer: EarlyMHPSSTemplateRenderer,
  },
  {
    id: 'telehealth', name: 'الصحة عن بُعد ومنتسوري', nameEn: 'Telehealth & Montessori',
    icon: <TelehealthIcon />, color: '#00695c',
    templates: TELEHEALTH_MONTESSORI_TEMPLATES,
    renderer: TelehealthMontessoriTemplateRenderer,
  },
  {
    id: 'donations', name: 'التبرعات والدعم الفني', nameEn: 'Donations & Help Desk',
    icon: <DonationsIcon />, color: '#c62828',
    templates: DONATIONS_HELPDESK_TEMPLATES,
    renderer: DonationsHelpDeskTemplateRenderer,
  },
  {
    id: 'projects', name: 'المشاريع والاستراتيجية', nameEn: 'Projects & Strategy',
    icon: <ProjectsIcon />, color: '#1565c0',
    templates: PROJECTS_STRATEGY_TEMPLATES,
    renderer: ProjectsStrategyTemplateRenderer,
  },
  {
    id: 'workflow-audit', name: 'سير العمل والتدقيق', nameEn: 'Workflow & Audit',
    icon: <AuditIcon />, color: '#4527a0',
    templates: WORKFLOW_AUDIT_TEMPLATES,
    renderer: WorkflowAuditTemplateRenderer,
  },
  {
    id: 'kitchen-library', name: 'المطبخ والمكتبة والبحث', nameEn: 'Kitchen, Library & Research',
    icon: <KitchenIcon />, color: '#bf360c',
    templates: KITCHEN_LIBRARY_TEMPLATES,
    renderer: KitchenLibraryTemplateRenderer,
  },
  {
    id: 'gov-iot', name: 'التكامل الحكومي وإنترنت الأشياء', nameEn: 'Gov Integration & IoT',
    icon: <GovIcon />, color: '#0d47a1',
    templates: GOV_IOT_TEMPLATES,
    renderer: GovIoTTemplateRenderer,
  },
  {
    id: 'ecommerce', name: 'التجارة الإلكترونية والبلوكتشين', nameEn: 'E-Commerce & Blockchain',
    icon: <EcomIcon />, color: '#e65100',
    templates: ECOMMERCE_BLOCKCHAIN_TEMPLATES,
    renderer: EcommerceBlockchainTemplateRenderer,
  },
  {
    id: 'portals', name: 'البوابات والمستودعات والتدريب', nameEn: 'Portals, Warehouse & Training',
    icon: <PortalsIcon />, color: '#880e4f',
    templates: PORTALS_DIRECTIVES_TEMPLATES,
    renderer: PortalsDirectivesTemplateRenderer,
  },
  /* ─── Batch 4 Modules ─── */
  {
    id: 'case-beneficiary', name: 'إدارة الحالات والمستفيدين', nameEn: 'Case Management & Beneficiaries',
    icon: <CaseMgmtIcon />, color: '#0d47a1',
    templates: CASE_BENEFICIARY_TEMPLATES,
    renderer: CaseBeneficiaryTemplateRenderer,
  },
  {
    id: 'complaints-meetings', name: 'الشكاوى والزوار والاجتماعات', nameEn: 'Complaints, Visitors & Meetings',
    icon: <ComplaintsIcon />, color: '#b71c1c',
    templates: COMPLAINTS_MEETINGS_TEMPLATES,
    renderer: ComplaintsMeetingsTemplateRenderer,
  },
  {
    id: 'family-satisfaction', name: 'رضا الأسرة والنتائج', nameEn: 'Family Satisfaction & Outcomes',
    icon: <FamilyIcon />, color: '#4a148c',
    templates: FAMILY_SATISFACTION_TEMPLATES,
    renderer: FamilySatisfactionTemplateRenderer,
  },
  {
    id: 'disability-assessment', name: 'الإعاقة والتقييم والرعاية', nameEn: 'Disability, Assessment & Care',
    icon: <DisabilityIcon />, color: '#1b5e20',
    templates: DISABILITY_ASSESSMENT_TEMPLATES,
    renderer: DisabilityAssessmentTemplateRenderer,
  },
  {
    id: 'document-management', name: 'إدارة الوثائق والوسائط', nameEn: 'Documents, E-Sign & Media',
    icon: <DocMgmtIcon />, color: '#37474f',
    templates: DOCUMENT_MANAGEMENT_TEMPLATES,
    renderer: DocumentManagementTemplateRenderer,
  },
  {
    id: 'crisis-safety', name: 'المخاطر والأزمات والدفاع المدني', nameEn: 'Crisis, Safety & Civil Defense',
    icon: <CrisisIcon />, color: '#d50000',
    templates: CRISIS_SAFETY_TEMPLATES,
    renderer: CrisisSafetyTemplateRenderer,
  },
  {
    id: 'community-org', name: 'المجتمع والتطوع والهيكل', nameEn: 'Community, Volunteers & Org',
    icon: <CommunityIcon />, color: '#00695c',
    templates: COMMUNITY_ORG_TEMPLATES,
    renderer: CommunityOrgTemplateRenderer,
  },
  {
    id: 'bi-executive', name: 'ذكاء الأعمال والتقارير التنفيذية', nameEn: 'BI & Executive Reports',
    icon: <BIIcon />, color: '#1a237e',
    templates: BI_EXECUTIVE_TEMPLATES,
    renderer: BIExecutiveTemplateRenderer,
  },
  {
    id: 'special-education', name: 'التربية الخاصة والتوظيف المدعوم', nameEn: 'Special Education & Employment',
    icon: <SpecialEdIcon />, color: '#0277bd',
    templates: SPECIAL_EDUCATION_TEMPLATES,
    renderer: SpecialEducationTemplateRenderer,
  },
  {
    id: 'enterprise-plus', name: 'المؤسسة المتقدمة', nameEn: 'Enterprise Plus & Governance',
    icon: <EnterpriseIcon />, color: '#283593',
    templates: ENTERPRISE_PLUS_TEMPLATES,
    renderer: EnterprisePlusTemplateRenderer,
  },
  /* ─── Batch 5 Modules ─── */
  {
    id: 'saudi-gov', name: 'المنصات الحكومية السعودية', nameEn: 'Saudi Government Platforms',
    icon: <SaudiGovIcon />, color: '#1b5e20',
    templates: SAUDI_GOV_TEMPLATES,
    renderer: SaudiGovTemplateRenderer,
  },
  {
    id: 'academic', name: 'المناهج والجدولة الأكاديمية', nameEn: 'Academic Curriculum & Scheduling',
    icon: <AcademicIcon />, color: '#0d47a1',
    templates: ACADEMIC_CURRICULUM_TEMPLATES,
    renderer: AcademicCurriculumTemplateRenderer,
  },
  {
    id: 'student-ext', name: 'شؤون الطلاب الموسعة', nameEn: 'Extended Student Services',
    icon: <StudentExtIcon />, color: '#4a148c',
    templates: STUDENT_EXTENDED_TEMPLATES,
    renderer: StudentExtendedTemplateRenderer,
  },
  {
    id: 'fin-planning', name: 'التخطيط المالي والخزينة', nameEn: 'Financial Planning & Treasury',
    icon: <FinPlanIcon />, color: '#1565c0',
    templates: FINANCIAL_PLANNING_TEMPLATES,
    renderer: FinancialPlanningTemplateRenderer,
  },
  {
    id: 'adv-therapy', name: 'العلاج المتقدم والفريق متعدد التخصصات', nameEn: 'Advanced Therapy & MDT',
    icon: <AdvTherapyIcon />, color: '#6a1b9a',
    templates: ADVANCED_THERAPY_TEMPLATES,
    renderer: AdvancedTherapyTemplateRenderer,
  },
  {
    id: 'gps-bus', name: 'GPS والحافلات والمرور', nameEn: 'GPS, Bus & Traffic',
    icon: <GpsBusIcon />, color: '#e65100',
    templates: GPS_BUS_TRAFFIC_TEMPLATES,
    renderer: GpsBusTrafficTemplateRenderer,
  },
  {
    id: 'comp-workforce', name: 'التعويضات والقوى العاملة', nameEn: 'Compensation & Workforce',
    icon: <CompWorkIcon />, color: '#2e7d32',
    templates: COMPENSATION_WORKFORCE_TEMPLATES,
    renderer: CompensationWorkforceTemplateRenderer,
  },
  {
    id: 'ai-ml', name: 'الذكاء الاصطناعي والتحليلات', nameEn: 'AI, ML & Analytics',
    icon: <AIMLIcon />, color: '#283593',
    templates: AI_ML_ANALYTICS_TEMPLATES,
    renderer: AIMLAnalyticsTemplateRenderer,
  },
  {
    id: 'sys-admin', name: 'إدارة النظام والأمان', nameEn: 'System Admin & Security',
    icon: <SysAdminIcon />, color: '#37474f',
    templates: SYSTEM_ADMIN_SECURITY_TEMPLATES,
    renderer: SystemAdminSecurityTemplateRenderer,
  },
  {
    id: 'smart-approvals', name: 'الميزات الذكية والموافقات', nameEn: 'Smart Features & Approvals',
    icon: <SmartApprovalIcon />, color: '#0277bd',
    templates: SMART_FEATURES_APPROVALS_TEMPLATES,
    renderer: SmartFeaturesApprovalsTemplateRenderer,
  },
  {
    id: 'messaging-cms', name: 'المراسلات والمحتوى والحملات', nameEn: 'Messaging, CMS & Campaigns',
    icon: <MessagingIcon />, color: '#ad1457',
    templates: MESSAGING_CMS_CAMPAIGNS_TEMPLATES,
    renderer: MessagingCMSCampaignsTemplateRenderer,
  },
  {
    id: 'scm-extended', name: 'سلسلة التوريد الموسعة', nameEn: 'Supply Chain Extended',
    icon: <SCMExtIcon />, color: '#4527a0',
    templates: SUPPLY_CHAIN_EXTENDED_TEMPLATES,
    renderer: SupplyChainExtendedTemplateRenderer,
  },
  {
    id: 'elearning', name: 'التعلم الإلكتروني وإدارة المعرفة', nameEn: 'E-Learning & Knowledge',
    icon: <ElearningIcon />, color: '#00695c',
    templates: ELEARNING_KNOWLEDGE_TEMPLATES,
    renderer: ElearningKnowledgeTemplateRenderer,
  },
  {
    id: 'whatsapp-mobile', name: 'واتساب والجوال', nameEn: 'WhatsApp & Mobile',
    icon: <WhatsAppIcon />, color: '#25d366',
    templates: WHATSAPP_MOBILE_TEMPLATES,
    renderer: WhatsAppMobileTemplateRenderer,
  },
  {
    id: 'microservices', name: 'الخدمات المصغرة ولوحات المتابعة', nameEn: 'Microservices & Dashboard',
    icon: <MicroservicesIcon />, color: '#455a64',
    templates: MICROSERVICES_DASHBOARD_TEMPLATES,
    renderer: MicroservicesDashboardTemplateRenderer,
  },
  /* ─── Batch 6 Modules ─── */
  {
    id: 'partnerships-pr', name: 'الشراكات والعلاقات العامة', nameEn: 'Partnerships & Public Relations',
    icon: <PartnershipsIcon />, color: '#00695c',
    templates: PARTNERSHIPS_PR_TEMPLATES,
    renderer: PartnershipsPRTemplateRenderer,
  },
  {
    id: 'insurance-leave', name: 'التأمين والإجازات', nameEn: 'Insurance & Leave Management',
    icon: <InsuranceIcon />, color: '#1565c0',
    templates: INSURANCE_LEAVE_TEMPLATES,
    renderer: InsuranceLeaveTemplateRenderer,
  },
  {
    id: 'risk-compliance', name: 'المخاطر والامتثال', nameEn: 'Risk & Compliance',
    icon: <RiskComplianceIcon />, color: '#c62828',
    templates: RISK_COMPLIANCE_TEMPLATES,
    renderer: RiskComplianceTemplateRenderer,
  },
  {
    id: 'report-builder', name: 'منشئ التقارير', nameEn: 'Report Builder & Analytics',
    icon: <ReportBuilderIcon />, color: '#6a1b9a',
    templates: REPORT_BUILDER_TEMPLATES,
    renderer: ReportBuilderTemplateRenderer,
  },
  {
    id: 'treatment-waitlist', name: 'تصاريح العلاج وقوائم الانتظار', nameEn: 'Treatment Auth & Waitlist',
    icon: <TreatmentWaitIcon />, color: '#2e7d32',
    templates: TREATMENT_WAITLIST_TEMPLATES,
    renderer: TreatmentWaitlistTemplateRenderer,
  },
  {
    id: 'zakat-islamic', name: 'الزكاة والمالية الإسلامية', nameEn: 'Zakat & Islamic Finance',
    icon: <ZakatIcon />, color: '#1b5e20',
    templates: ZAKAT_ISLAMIC_FINANCE_TEMPLATES,
    renderer: ZakatIslamicFinanceTemplateRenderer,
  },
  {
    id: 'succession-perf', name: 'التعاقب وتقييم الأداء', nameEn: 'Succession & Performance',
    icon: <SuccessionIcon />, color: '#0d47a1',
    templates: SUCCESSION_PERFORMANCE_TEMPLATES,
    renderer: SuccessionPerformanceTemplateRenderer,
  },
  {
    id: 'feedback-gamification', name: 'التغذية الراجعة والتلعيب', nameEn: 'Feedback & Gamification',
    icon: <FeedbackIcon />, color: '#7b1fa2',
    templates: FEEDBACK_GAMIFICATION_TEMPLATES,
    renderer: FeedbackGamificationTemplateRenderer,
  },
  {
    id: 'integrated-care-ocr', name: 'الرعاية المتكاملة و OCR', nameEn: 'Integrated Care & OCR',
    icon: <IntegratedCareIcon />, color: '#00897b',
    templates: INTEGRATED_CARE_OCR_TEMPLATES,
    renderer: IntegratedCareOCRTemplateRenderer,
  },
  {
    id: 'agent-chat-realtime', name: 'الوكيل الذكي والدردشة', nameEn: 'Agent, Chat & Realtime',
    icon: <AgentChatIcon />, color: '#37474f',
    templates: AGENT_CHAT_REALTIME_TEMPLATES,
    renderer: AgentChatRealtimeTemplateRenderer,
  },
];

const ALL_TEMPLATES = MODULE_GROUPS.flatMap(g =>
  g.templates.map(t => ({ ...t, moduleId: g.id, moduleName: g.name, renderer: g.renderer }))
);

/* ─── Main Page Component ─── */
const PrintCenterPage = () => {
  const [tab, setTab] = useState(0); // 0 = all, 1+ = module index+1
  const [search, setSearch] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const printRef = useRef(null);

  const filtered = ALL_TEMPLATES.filter(t => {
    const matchSearch = !search
      || t.name.includes(search)
      || t.nameEn.toLowerCase().includes(search.toLowerCase())
      || t.desc.includes(search)
      || t.moduleName.includes(search);
    const matchTab = tab === 0 || t.moduleId === MODULE_GROUPS[tab - 1]?.id;
    return matchSearch && matchTab;
  });

  const handlePreview = (template) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8" />
      <title>${selectedTemplate?.name || 'طباعة'}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 10mm; }
        @page { size: A4; margin: 10mm; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: right; }
        @media print {
          body { padding: 0; }
          .no-print { display: none !important; }
        }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  }, [selectedTemplate]);

  const handleSavePdf = useCallback(async () => {
    if (!printRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`${selectedTemplate?.name || 'template'}.pdf`);
    } catch (err) {
      console.error('PDF Error:', err);
      alert('خطأ في إنشاء ملف PDF');
    }
  }, [selectedTemplate]);

  return (
    <Box sx={{ p: 3, direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link underline="hover" color="inherit" href="/dashboard" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <HomeIcon sx={{ fontSize: 18 }} /> الرئيسية
        </Link>
        <Typography color="text.primary" fontWeight="bold">مركز الطباعة</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1a237e, #283593)', color: 'white', borderRadius: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <PrintCenterIcon sx={{ fontSize: 48 }} />
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold">مركز الطباعة</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              جميع قوالب الطباعة والنماذج الرسمية — {ALL_TEMPLATES.length} نموذج في {MODULE_GROUPS.length} أقسام
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Module Stats Cards */}
      <Grid container spacing={2} mb={3}>
        {MODULE_GROUPS.map(g => (
          <Grid item xs={6} sm={4} md={3} lg={2} key={g.id}>
            <Card
              sx={{
                cursor: 'pointer', borderTop: `4px solid ${g.color}`, borderRadius: 2,
                transition: 'all 0.2s', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
                ...(tab > 0 && MODULE_GROUPS[tab - 1]?.id === g.id ? { boxShadow: 6, border: `2px solid ${g.color}` } : {})
              }}
              onClick={() => setTab(MODULE_GROUPS.findIndex(m => m.id === g.id) + 1)}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: g.color, mb: 0.5 }}>{React.cloneElement(g.icon, { sx: { fontSize: 32 } })}</Box>
                <Typography variant="subtitle2" fontWeight="bold">{g.name}</Typography>
                <Chip label={`${g.templates.length} نموذج`} size="small" sx={{ mt: 0.5, bgcolor: `${g.color}15`, color: g.color, fontWeight: 'bold' }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search + Tabs */}
      <Box display="flex" gap={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small" placeholder="بحث في القوالب..." value={search}
          onChange={e => setSearch(e.target.value)} sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            ...(search && { endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><CloseIcon fontSize="small" /></IconButton></InputAdornment> }),
          }}
        />
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontFamily: 'Cairo', fontWeight: 600, minHeight: 40 } }}>
          <Tab label={`الكل (${ALL_TEMPLATES.length})`} />
          {MODULE_GROUPS.map(g => <Tab key={g.id} label={`${g.name} (${g.templates.length})`} icon={React.cloneElement(g.icon, { sx: { fontSize: 18 } })} iconPosition="start" />)}
        </Tabs>
      </Box>

      {/* Templates Grid */}
      {filtered.length === 0 ? (
        <Alert severity="info" sx={{ mt: 4 }}>لا توجد قوالب مطابقة للبحث</Alert>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(t => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={`${t.moduleId}-${t.id}`}>
              <Fade in timeout={300}>
                <Card sx={{
                  height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2,
                  transition: 'all 0.2s', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
                  borderTop: `3px solid ${t.color}`,
                }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: t.color }}>{t.name}</Typography>
                      <Chip size="small" label={t.moduleName} variant="outlined"
                        sx={{ fontSize: 10, height: 22, borderColor: t.color, color: t.color }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{t.nameEn}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>{t.desc}</Typography>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 1.5 }}>
                    <Button size="small" variant="contained" startIcon={<PreviewIcon />}
                      sx={{ bgcolor: t.color, '&:hover': { bgcolor: t.color, filter: 'brightness(0.9)' }, fontSize: 12 }}
                      onClick={() => handlePreview(t)}>
                      معاينة
                    </Button>
                  </CardActions>
                </Card>
              </Fade>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '95vh' } }}>
        <DialogTitle sx={{
          background: `linear-gradient(135deg, ${selectedTemplate?.color || '#1a237e'}, ${selectedTemplate?.color || '#1a237e'}cc)`,
          color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">{selectedTemplate?.name}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>{selectedTemplate?.nameEn}</Typography>
          </Box>
          <IconButton onClick={() => setPreviewOpen(false)} sx={{ color: 'white' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#f5f5f5' }}>
          <Box sx={{ p: 3, direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
            <Box ref={printRef} sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden' }}>
              {selectedTemplate && (
                <selectedTemplate.renderer templateId={selectedTemplate.id} data={{}} />
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Tooltip title="حفظ كملف PDF"><Button variant="outlined" startIcon={<PdfIcon />} onClick={handleSavePdf}>حفظ PDF</Button></Tooltip>
          <Tooltip title="طباعة مباشرة"><Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} sx={{ bgcolor: selectedTemplate?.color || '#1a237e' }}>طباعة</Button></Tooltip>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PrintCenterPage;
