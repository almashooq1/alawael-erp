#!/usr/bin/env node
/**
 * Restructure frontend/src/pages/ — Move flat files into module subdirectories
 * and update all import paths in consumer files.
 *
 * Usage: node scripts/restructure-pages.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = path.resolve(__dirname, '..', 'frontend', 'src');
const PAGES = path.join(ROOT, 'pages');

// ── Module mapping: filename → target subdirectory ──────────────────────────
const MODULE_MAP = {
  // Finance
  'AccountingDashboard.js': 'finance',
  'BudgetManagement.js': 'finance',
  'CashFlowManagement.js': 'finance',
  'ChartOfAccounts.js': 'finance',
  'CostCenters.js': 'finance',
  'DonationsDashboard.js': 'finance',
  'EInvoicing.js': 'finance',
  'ExpenseManagement.js': 'finance',
  'FinancialReports.js': 'finance',
  'FixedAssets.js': 'finance',
  'GeneralLedger.js': 'finance',
  'InvoiceManagement.js': 'finance',
  'JournalEntries.js': 'finance',
  'PaymentDashboard.js': 'finance',
  'PaymentsHistory.js': 'finance',
  'VATZakatManagement.js': 'finance',

  // HR
  'AttendanceManagement.jsx': 'hr',
  'AttendanceReports.js': 'hr',
  'EmployeeManagement.jsx': 'hr',
  'EmployeePortal.js': 'hr',
  'EndOfServiceBenefits.js': 'hr',
  'InsuranceManagement.js': 'hr',
  'KPIDashboard.js': 'hr',
  'OrganizationChart.jsx': 'hr',
  'PayrollProcessing.js': 'hr',
  'PayrollReports.js': 'hr',
  'PayrollSettings.js': 'hr',
  'PerformanceEvaluation.js': 'hr',
  'RecruitmentDashboard.js': 'hr',
  'SalarySlip.js': 'hr',
  'TrainingDashboard.js': 'hr',
  'TrainingPrograms.js': 'hr',
  'TrainingReports.js': 'hr',
  'ZKTecoDeviceManagement.jsx': 'hr',

  // Admin
  'AdminAuditLogs.js': 'admin',
  'AdminClinicManagement.js': 'admin',
  'AdminCorrespondence.js': 'admin',
  'AdminDashboard.js': 'admin',
  'AdminDecisionCreate.js': 'admin',
  'AdminDecisionDetail.js': 'admin',
  'AdminDecisions.js': 'admin',
  'AdminDelegations.js': 'admin',
  'AdminNotifications.js': 'admin',
  'AdminPaymentsBilling.js': 'admin',
  'AdminReportsAnalytics.js': 'admin',
  'AdminSystemSettings.js': 'admin',
  'Administration.js': 'admin',
  'ExecutiveDashboard.js': 'admin',
  'SecuritySettings.js': 'admin',
  'SystemAdmin.js': 'admin',

  // Rehab & Therapy
  'AssistiveDevicesManagement.js': 'rehab',
  'DisabilityRehabDashboard.js': 'rehab',
  'DisabilityRehabReports.js': 'rehab',
  'RehabProgramManagement.js': 'rehab',
  'TherapistCases.js': 'rehab',
  'TherapistCommunications.js': 'rehab',
  'TherapistDashboard.js': 'rehab',
  'TherapistDocuments.js': 'rehab',
  'TherapistMessages.js': 'rehab',
  'TherapistPatients.js': 'rehab',
  'TherapistReports.js': 'rehab',
  'TherapistSchedule.js': 'rehab',
  'TherapistSessions.js': 'rehab',
  'TherapySessionAdmin.js': 'rehab',

  // Education & Student
  'ChildrenProgress.js': 'education',
  'CourseViewer.js': 'education',
  'ELearningDashboard.js': 'education',
  'StudentAnnouncements.js': 'education',
  'StudentAssignments.js': 'education',
  'StudentAttendance.js': 'education',
  'StudentGrades.js': 'education',
  'StudentLibrary.js': 'education',
  'StudentMessages.js': 'education',
  'StudentPortal.js': 'education',
  'StudentSchedule.js': 'education',

  // Workflow
  'WorkflowAnalytics.js': 'workflow',
  'WorkflowBuilder.js': 'workflow',
  'WorkflowDashboard.js': 'workflow',
  'WorkflowInstanceDetail.js': 'workflow',
  'WorkflowInstances.js': 'workflow',
  'WorkflowMyTasks.js': 'workflow',
  'WorkflowTemplates.js': 'workflow',

  // CRM
  'CRMDashboard.js': 'crm',
  'CRMReports.js': 'crm',
  'ContactsManagement.js': 'crm',
  'LeadsManagement.js': 'crm',

  // Operations & Maintenance
  'EquipmentManagement.js': 'operations',
  'IncidentManagement.js': 'operations',
  'InternalAuditPage.js': 'operations',
  'LicenseManagement.js': 'operations',
  'MaintenanceDashboard.js': 'operations',
  'OperationsDashboard.jsx': 'operations',
  'RiskAssessment.js': 'operations',
  'VisitorRegistry.js': 'operations',

  // Fleet & Transport
  'FleetDashboard.jsx': 'fleet',
  'FleetManagement.js': 'fleet',
  'TransportManagement.js': 'fleet',
  'VehicleManagement.js': 'fleet',

  // Supply Chain & Inventory
  'BranchPurchasing.js': 'supply-chain',
  'BranchReports.js': 'supply-chain',
  'BranchWarehouseManagement.js': 'supply-chain',
  'ContractsDashboard.jsx': 'supply-chain',
  'ContractsManagement.js': 'supply-chain',
  'InventoryManagement.js': 'supply-chain',
  'PurchasingManagement.js': 'supply-chain',
  'StockTransfers.js': 'supply-chain',
  'VendorManagement.js': 'supply-chain',

  // Documents & Archiving
  'Documents.js': 'documents',
  'DocumentsMgmt.js': 'documents',
  'DocumentsReports.js': 'documents',
  'ElectronicArchiving.js': 'documents',
  'SmartDocumentsPage.js': 'documents',

  // E-Signature & E-Stamp
  'ESignature.js': 'e-signature',
  'ESignatureCreate.js': 'e-signature',
  'ESignatureSigning.js': 'e-signature',
  'ESignatureTemplates.js': 'e-signature',
  'ESignatureVerify.js': 'e-signature',
  'EStamp.js': 'e-signature',
  'EStampApply.js': 'e-signature',
  'EStampCreate.js': 'e-signature',
  'EStampDetail.js': 'e-signature',
  'EStampVerify.js': 'e-signature',

  // Communications
  'Communications.js': 'communications',
  'CommunicationsSystem.jsx': 'communications',
  'MessagingPage.js': 'communications',

  // Common / Shared
  'Activity.js': 'common',
  'AdvancedTickets.js': 'common',
  'AIAnalyticsDashboard.js': 'common',
  'AppointmentsScheduling.js': 'common',
  'ComplaintsManagement.js': 'common',
  'FormTemplates.js': 'common',
  'Friends.js': 'common',
  'GroupDetail.js': 'common',
  'Groups.js': 'common',
  'Home.js': 'common',
  'KnowledgeCenter.js': 'common',
  'MeetingsManagement.js': 'common',
  'ModulePage.js': 'common',
  'MonitoringDashboard.jsx': 'common',
  'NotFound.js': 'common',
  'ParentDashboard.js': 'common',
  'ParentMessages.js': 'common',
  'Profile.js': 'common',
  'ProjectManagementDashboard.js': 'common',
  'QualityDashboard.jsx': 'common',
  'SimpleDashboard.jsx': 'common',
  'SimpleLogin.jsx': 'common',
  'SmartNotificationCenter.js': 'common',
  'TaskManagement.js': 'common',
};

// ── Consumer files to update ────────────────────────────────────────────────
const CONSUMER_FILES = [
  path.join(ROOT, 'App.js'),
  path.join(ROOT, 'routes', 'FinanceRoutes.jsx'),
  path.join(ROOT, 'routes', 'HRRoutes.jsx'),
  path.join(ROOT, 'routes', 'AdminRoutes.jsx'),
  path.join(ROOT, 'routes', 'RehabRoutes.jsx'),
  path.join(ROOT, 'routes', 'EducationRoutes.jsx'),
  path.join(ROOT, 'routes', 'WorkflowRoutes.jsx'),
  path.join(ROOT, 'routes', 'PortalRoutes.jsx'),
];

// ── Step 1: Create target directories ───────────────────────────────────────
const targetDirs = [...new Set(Object.values(MODULE_MAP))];
for (const dir of targetDirs) {
  const dirPath = path.join(PAGES, dir);
  if (!fs.existsSync(dirPath)) {
    console.log(`📁 mkdir: pages/${dir}/`);
    if (!DRY_RUN) fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ── Step 2: Move files ──────────────────────────────────────────────────────
let movedCount = 0;
for (const [file, module] of Object.entries(MODULE_MAP)) {
  const src = path.join(PAGES, file);
  const dest = path.join(PAGES, module, file);
  if (fs.existsSync(src)) {
    console.log(`📦 move: pages/${file} → pages/${module}/${file}`);
    if (!DRY_RUN) fs.renameSync(src, dest);
    movedCount++;
  } else {
    console.log(`⚠️  skip (not found): pages/${file}`);
  }
}

// ── Step 3: Update import paths in consumer files ───────────────────────────
// Build a basename-to-module lookup (strip ext)
const nameToModule = {};
for (const [file, module] of Object.entries(MODULE_MAP)) {
  const baseName = file.replace(/\.(jsx?|tsx?)$/, '');
  nameToModule[baseName] = module;
}

let updatedFiles = 0;
for (const consumerPath of CONSUMER_FILES) {
  if (!fs.existsSync(consumerPath)) continue;

  let content = fs.readFileSync(consumerPath, 'utf8');
  let modified = false;
  const isAppJs = consumerPath.endsWith('App.js');

  // Match: import('...pages/FileName') or from '...pages/FileName'
  // Routes use: ../pages/FileName
  // App.js uses: ./pages/FileName
  const pageImportRe = isAppJs ? /(['"])\.\/(pages)\/([A-Za-z0-9_-]+)(['"])/g : /(['"])\.\.\/(pages)\/([A-Za-z0-9_-]+)(['"])/g;

  const newContent = content.replace(pageImportRe, (match, q1, pagesDir, name, q2) => {
    const module = nameToModule[name];
    if (module) {
      modified = true;
      const prefix = isAppJs ? './' : '../';
      return `${q1}${prefix}${pagesDir}/${module}/${name}${q2}`;
    }
    return match; // Not in our map — leave as-is
  });

  if (modified) {
    console.log(`✏️  update: ${path.relative(ROOT, consumerPath)}`);
    if (!DRY_RUN) fs.writeFileSync(consumerPath, newContent, 'utf8');
    updatedFiles++;
  }
}

console.log(`\n✅ Done${DRY_RUN ? ' (DRY RUN)' : ''}: Moved ${movedCount} files, updated ${updatedFiles} consumer files`);
