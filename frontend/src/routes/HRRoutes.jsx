/**
 * HR & Payroll Routes
 * مسارات الموارد البشرية والرواتب
 */
import { lazyWithRetry } from '../utils/lazyLoader';

// Lazy-loaded HR pages
const HRAdvancedDashboard = lazyWithRetry(() => import('../pages/HRAdvancedDashboard'));
const EmployeeManagement = lazyWithRetry(() => import('../pages/hr/EmployeeManagement'));
const LeaveManagement = lazyWithRetry(() => import('../pages/LeaveManagement'));
const AttendanceManagement = lazyWithRetry(() => import('../pages/hr/AttendanceManagement'));
const ZKTecoDeviceManagement = lazyWithRetry(() => import('../pages/hr/ZKTecoDeviceManagement'));
const PayrollDashboard = lazyWithRetry(() => import('../components/PayrollDashboard'));
const IncentivesManagement = lazyWithRetry(() => import('../components/IncentivesManagement'));
const CompensationStructureManagement = lazyWithRetry(
  () => import('../components/CompensationStructureManagement')
);
const PayrollAnalyticsDashboard = lazyWithRetry(
  () => import('../components/PayrollAnalyticsDashboard')
);
const SalarySlip = lazyWithRetry(() => import('../pages/hr/SalarySlip'));
const PayrollProcessing = lazyWithRetry(() => import('../pages/hr/PayrollProcessing'));
const PayrollReports = lazyWithRetry(() => import('../pages/hr/PayrollReports'));
const PayrollSettings = lazyWithRetry(() => import('../pages/hr/PayrollSettings'));
const EndOfServiceBenefits = lazyWithRetry(() => import('../pages/hr/EndOfServiceBenefits'));
const OrganizationChart = lazyWithRetry(() => import('../pages/hr/OrganizationChart'));
const PerformanceEvaluation = lazyWithRetry(() => import('../pages/hr/PerformanceEvaluation'));
const EmployeePortal = lazyWithRetry(() => import('../pages/hr/EmployeePortal'));
const KPIDashboard = lazyWithRetry(() => import('../pages/hr/KPIDashboard'));
const HRInsuranceDashboard = lazyWithRetry(
  () => import('../pages/HRInsurance/HRInsuranceDashboard')
);

// Training
const TrainingDashboard = lazyWithRetry(() => import('../pages/hr/TrainingDashboard'));
const TrainingPrograms = lazyWithRetry(() => import('../pages/hr/TrainingPrograms'));
const TrainingReports = lazyWithRetry(() => import('../pages/hr/TrainingReports'));

// Recruitment
const RecruitmentDashboard = lazyWithRetry(() => import('../pages/hr/RecruitmentDashboard'));

// Employee Affairs Expanded — شؤون الموظفين الموسّعة
const ComplaintsManagement = lazyWithRetry(() => import('../pages/hr/ComplaintsManagement'));
const EmployeeLoansManagement = lazyWithRetry(() => import('../pages/hr/EmployeeLoansManagement'));
const DisciplinaryActionsManagement = lazyWithRetry(() => import('../pages/hr/DisciplinaryActionsManagement'));
const EmployeeLettersManagement = lazyWithRetry(() => import('../pages/hr/EmployeeLettersManagement'));
const PromotionsTransfersManagement = lazyWithRetry(() => import('../pages/hr/PromotionsTransfersManagement'));
const OvertimeManagement = lazyWithRetry(() => import('../pages/hr/OvertimeManagement'));

// Employee Affairs Phase 2 — شؤون الموظفين المرحلة الثانية
const TaskManagement = lazyWithRetry(() => import('../pages/hr/TaskManagement'));
const HousingTransportationManagement = lazyWithRetry(() => import('../pages/hr/HousingTransportationManagement'));
const CustodyManagement = lazyWithRetry(() => import('../pages/hr/CustodyManagement'));
const WorkPermitsManagement = lazyWithRetry(() => import('../pages/hr/WorkPermitsManagement'));
const RewardsManagement = lazyWithRetry(() => import('../pages/hr/RewardsManagement'));
const ShiftManagement = lazyWithRetry(() => import('../pages/hr/ShiftManagement'));

// Phase 3 — المرحلة الثالثة
const ContractManagement = lazyWithRetry(() => import('../pages/hr/ContractManagement'));
const VacationSettlementManagement = lazyWithRetry(() => import('../pages/hr/VacationSettlementManagement'));
const EmployeeWarningsManagement = lazyWithRetry(() => import('../pages/hr/EmployeeWarningsManagement'));
const EmployeeClearanceManagement = lazyWithRetry(() => import('../pages/hr/EmployeeClearanceManagement'));
const ExitReentryVisaManagement = lazyWithRetry(() => import('../pages/hr/ExitReentryVisaManagement'));
const BenefitsManagement = lazyWithRetry(() => import('../pages/hr/BenefitsManagement'));

export default function HRRoutes() {
  return (
    <>
      {/* HR Module */}
      <Route path="hr" element={<HRAdvancedDashboard />} />
      <Route path="hr/employees" element={<EmployeeManagement />} />
      <Route path="hr/leaves" element={<LeaveManagement />} />
      <Route path="hr/attendance" element={<AttendanceManagement />} />
      <Route path="hr/zkteco-devices" element={<ZKTecoDeviceManagement />} />
      <Route path="hr/payroll" element={<PayrollDashboard />} />
      <Route path="hr/incentives" element={<IncentivesManagement />} />
      <Route path="hr/compensation" element={<CompensationStructureManagement />} />
      <Route path="hr/analytics" element={<PayrollAnalyticsDashboard />} />
      <Route path="hr/salary-slip" element={<SalarySlip />} />
      <Route path="hr/salary-slip/:payrollId" element={<SalarySlip />} />
      <Route path="hr/payroll-processing" element={<PayrollProcessing />} />
      <Route path="hr/payroll-reports" element={<PayrollReports />} />
      <Route path="hr/payroll-settings" element={<PayrollSettings />} />
      <Route path="hr/end-of-service" element={<EndOfServiceBenefits />} />
      <Route path="hr/insurance" element={<HRInsuranceDashboard />} />
      {/* Legacy top-level HR routes */}
      <Route path="payroll" element={<PayrollDashboard />} />
      <Route path="incentives" element={<IncentivesManagement />} />
      <Route path="compensation" element={<CompensationStructureManagement />} />
      <Route path="attendance" element={<AttendanceManagement />} />
      <Route path="zkteco-devices" element={<ZKTecoDeviceManagement />} />
      <Route path="organization" element={<OrganizationChart />} />
      {/* Performance & Employee Portal */}
      <Route path="performance" element={<PerformanceEvaluation />} />
      <Route path="employee-portal" element={<EmployeePortal />} />
      <Route path="kpi-dashboard" element={<KPIDashboard />} />
      {/* Training & Development */}
      <Route path="training" element={<TrainingDashboard />} />
      <Route path="training/programs" element={<TrainingPrograms />} />
      <Route path="training/reports" element={<TrainingReports />} />
      {/* Recruitment */}
      <Route path="recruitment" element={<RecruitmentDashboard />} />
      {/* Employee Affairs Expanded — شؤون الموظفين الموسّعة */}
      <Route path="hr/complaints" element={<ComplaintsManagement />} />
      <Route path="hr/loans" element={<EmployeeLoansManagement />} />
      <Route path="hr/disciplinary" element={<DisciplinaryActionsManagement />} />
      <Route path="hr/letters" element={<EmployeeLettersManagement />} />
      <Route path="hr/promotions" element={<PromotionsTransfersManagement />} />
      <Route path="hr/overtime" element={<OvertimeManagement />} />
      {/* Employee Affairs Phase 2 — شؤون الموظفين المرحلة الثانية */}
      <Route path="hr/tasks" element={<TaskManagement />} />
      <Route path="hr/housing" element={<HousingTransportationManagement />} />
      <Route path="hr/custody" element={<CustodyManagement />} />
      <Route path="hr/permits" element={<WorkPermitsManagement />} />
      <Route path="hr/rewards" element={<RewardsManagement />} />
      <Route path="hr/shifts" element={<ShiftManagement />} />
      {/* Employee Affairs Phase 3 — شؤون الموظفين المرحلة الثالثة */}
      <Route path="hr/contracts" element={<ContractManagement />} />
      <Route path="hr/vacation-settlement" element={<VacationSettlementManagement />} />
      <Route path="hr/warnings" element={<EmployeeWarningsManagement />} />
      <Route path="hr/clearance" element={<EmployeeClearanceManagement />} />
      <Route path="hr/exit-visas" element={<ExitReentryVisaManagement />} />
      <Route path="hr/benefits" element={<BenefitsManagement />} />
    </>
  );
}
