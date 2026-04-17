/**
 * Models Index - Central Export Point
 * تصدير جميع نماذج Mongoose من قاعدة البيانات
 *
 * Updated: 2026-03-28 — Added 60+ previously missing models
 */

// ── Core Models ──────────────────────────────────────────────────────────────
const User = require('./User');
const Document = require('./Document');
const Notification = require('./Notification');
const AuditLog = require('./AuditLog');
const SystemSettings = require('./SystemSettings');
const ApiKey = require('./ApiKey');

// ── Beneficiary & Clinical ───────────────────────────────────────────────────
const Beneficiary = require('./Beneficiary');
const BeneficiaryPortal = require('./BeneficiaryPortal');
const BeneficiaryProgress = require('./BeneficiaryProgress');
const CarePlan = require('./CarePlan');
const TherapeuticPlan = require('./TherapeuticPlan');
const TherapySession = require('./TherapySession');
const TherapyProgram = require('./TherapyProgram');
const TherapyRoom = require('./TherapyRoom');
const DailySession = require('./DailySession');
const Assessment = require('./Assessment');
const Goal = require('./Goal');
const GoalBank = require('./GoalBank');
const ICFAssessment = require('./ICFAssessment');

// ── Disability & Rehabilitation ──────────────────────────────────────────────
const DisabilityProgram = require('./DisabilityProgram');
const DisabilitySession = require('./DisabilitySession');
const EarlyIntervention = require('./EarlyIntervention');
const IndependentLivingPlan = require('./IndependentLivingPlan');
const MentalHealth = require('./MentalHealth');
const PostRehabFollowUp = require('./PostRehabFollowUp');

// ── Finance Models ───────────────────────────────────────────────────────────
const Invoice = require('./Invoice');
const JournalEntry = require('./JournalEntry');
const FinancialJournalEntry = require('./FinancialJournalEntry');
const CashFlow = require('./CashFlow');
const PettyCash = require('./PettyCash');
const Cheque = require('./Cheque');
const BankAccount = require('./BankAccount');
const BankReconciliation = require('./BankReconciliation');
const CreditNote = require('./CreditNote');
const Payment = require('./Payment');
const PaymentVoucher = require('./PaymentVoucher');
const Expense = require('./Expense');
const Budget = require('./Budget');
const FixedAsset = require('./FixedAsset');
const RecurringTransaction = require('./RecurringTransaction');
const FinancialReport = require('./FinancialReport');
const FinancialTransaction = require('./FinancialTransaction');
const CostCenter = require('./CostCenter');
const RiskAssessment = require('./RiskAssessment');
const ComplianceMetric = require('./ComplianceMetric');

// ── Saudi Tax & Compliance ───────────────────────────────────────────────────
const VATReturn = require('./VATReturn');
const TaxFiling = require('./TaxFiling');
const WithholdingTax = require('./WithholdingTax');
const TaxCalendar = require('./TaxCalendar');
const EInvoice = require('./EInvoice');

// ── HR & Employee ────────────────────────────────────────────────────────────
const Employee = require('./Employee');
const Department = require('./Department');
const Position = require('./Position');
const Leave = require('./Leave');
const LeaveRequest = require('./LeaveRequest');
const Attendance = require('./Attendance');
const Shift = require('./Shift');
const Training = require('./Training');
const PerformanceEvaluation = require('./PerformanceEvaluation');
const SuccessionPlan = require('./SuccessionPlan');

// ── Education ────────────────────────────────────────────────────────────────
const AcademicYear = require('./AcademicYear');
const Classroom = require('./Classroom');
const Subject = require('./Subject');
const Curriculum = require('./Curriculum');
const Exam = require('./Exam');
const Timetable = require('./Timetable');
const Teacher = require('./Teacher');

// ── CRM & Sales ──────────────────────────────────────────────────────────────
const Lead = require('./Lead');
const Customer = require('./Customer');
const Order = require('./Order');
const Product = require('./Product');
const Campaign = require('./Campaign');

// ── Operations ───────────────────────────────────────────────────────────────
const Asset = require('./Asset');
const Schedule = require('./Schedule');
const Analytics = require('./Analytics');
const Report = require('./Report');
const Maintenance = require('./Maintenance');
const MaintenancePrediction = require('./MaintenancePrediction');
const Webhook = require('./Webhook');
const WebhookDelivery = require('./WebhookDelivery');
const Vehicle = require('./Vehicle');
const Visitor = require('./Visitor');
const Meeting = require('./Meeting');
const Complaint = require('./Complaint');
const Project = require('./Project');
const Inventory = require('./Inventory');
const Warehouse = require('./Warehouse');
const Donation = require('./Donation');
const Donor = require('./Donor');

// ── Communication ────────────────────────────────────────────────────────────
const Communication = require('./Communication');
const Correspondence = require('./Correspondence');

module.exports = {
  // Core
  User,
  Document,
  Notification,
  AuditLog,
  SystemSettings,
  ApiKey,

  // Beneficiary & Clinical
  Beneficiary,
  BeneficiaryPortal,
  BeneficiaryProgress,
  CarePlan,
  TherapeuticPlan,
  TherapySession,
  TherapyProgram,
  TherapyRoom,
  DailySession,
  Assessment,
  Goal,
  GoalBank,
  ICFAssessment,

  // Disability & Rehabilitation
  DisabilityProgram,
  DisabilitySession,
  EarlyIntervention,
  IndependentLivingPlan,
  MentalHealth,
  PostRehabFollowUp,

  // Finance
  Invoice,
  JournalEntry,
  FinancialJournalEntry,
  CashFlow,
  PettyCash,
  Cheque,
  BankAccount,
  BankReconciliation,
  CreditNote,
  Payment,
  PaymentVoucher,
  Expense,
  Budget,
  FixedAsset,
  RecurringTransaction,
  FinancialReport,
  FinancialTransaction,
  CostCenter,
  RiskAssessment,
  ComplianceMetric,

  // Saudi Tax & Compliance
  VATReturn,
  TaxFiling,
  WithholdingTax,
  TaxCalendar,
  EInvoice,

  // HR & Employee
  Employee,
  Department,
  Position,
  Leave,
  LeaveRequest,
  Attendance,
  Shift,
  Training,
  PerformanceEvaluation,
  SuccessionPlan,

  // Education
  AcademicYear,
  Classroom,
  Subject,
  Curriculum,
  Exam,
  Timetable,
  Teacher,

  // CRM & Sales
  Lead,
  Customer,
  Order,
  Product,
  Campaign,

  // Operations
  Asset,
  Schedule,
  Analytics,
  Report,
  Maintenance,
  MaintenancePrediction,
  Webhook,
  WebhookDelivery,
  Vehicle,
  Visitor,
  Meeting,
  Complaint,
  Project,
  Inventory,
  Warehouse,
  Donation,
  Donor,

  // Communication
  Communication,
  Correspondence,
};
