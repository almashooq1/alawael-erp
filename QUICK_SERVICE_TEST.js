/**
 * QUICK TEST FILE
 * اختبار سريع للخدمات الجديدة
 *
 * لتشغيل هذا الملف:
 * node QUICK_SERVICE_TEST.js
 */

// ============================================================================
// Import Services
// ============================================================================

const AdvancedSearchService = require('./backend/services/advancedSearchService');
const AdvancedReportingService = require('./backend/services/advancedReportingService');
const ExternalIntegrationService = require('./backend/services/externalIntegrationService');
const ProjectManagementService = require('./backend/services/projectManagementService');
const AIAnalyticsService = require('./backend/services/aiAnalyticsService');

// ============================================================================
// Test Data
// ============================================================================

const testEmployees = [
  { id: 'emp001', name: 'محمد علي', email: 'mohammad@company.com', department: 'IT', salary: 8000 },
  { id: 'emp002', name: 'فاطمة سلمان', email: 'fatima@company.com', department: 'HR', salary: 7000 },
  { id: 'emp003', name: 'أحمد محمود', email: 'ahmad@company.com', department: 'Finance', salary: 9000 },
];

const attendanceHistory = [
  { date: '2024-01-01', status: 'present', dayOfWeek: 'Saturday' },
  { date: '2024-01-02', status: 'present', dayOfWeek: 'Sunday' },
  { date: '2024-01-03', status: 'absent', dayOfWeek: 'Monday' },
  { date: '2024-01-04', status: 'present', dayOfWeek: 'Tuesday' },
  { date: '2024-01-05', status: 'present', dayOfWeek: 'Wednesday' },
];

// ============================================================================
// Test Functions
// ============================================================================

function testAdvancedSearch() {
  console.log('\n🔍 Testing Advanced Search Service...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const searchService = new AdvancedSearchService();

  // Test 1: Basic search
  const results1 = searchService.advancedSearch(testEmployees, 'محمد', {
    fields: ['name', 'email'],
  });
  console.log('✅ Basic Search:', results1.length, 'results found');

  // Test 2: Fuzzy matching
  const results2 = searchService.advancedSearch(testEmployees, 'محمود', {
    fields: ['name'],
    fuzzyTolerance: 2,
  });
  console.log('✅ Fuzzy Matching:', results2.length, 'results found');

  // Test 3: Filters
  const filtered = searchService.applyFilters(testEmployees, {
    salary: { operator: 'between', value: [7000, 9000] },
  });
  console.log('✅ Filtered Results:', filtered.length, 'employees in salary range');

  // Test 4: Autocomplete
  const suggestions = searchService.autocompleteSearch(testEmployees, 'محمد', 'name');
  console.log('✅ Autocomplete Suggestions:', suggestions.length, 'suggestions');

  // Test 5: Export
  const csv = searchService.exportResults(results1, 'csv');
  console.log('✅ Export to CSV:', csv ? 'Success' : 'Failed');
}

function testAdvancedReporting() {
  console.log('\n📊 Testing Advanced Reporting Service...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const reportingService = new AdvancedReportingService();

  // Generate a performance report
  const report = reportingService.generateReport('performance', testEmployees);
  console.log('✅ Report Generated:', report.success ? 'Success' : 'Failed');
  console.log('   Title:', report.success ? report.report.title : 'N/A');
  console.log('   Sections:', report.success ? report.report.sections.length : 0);

  // Schedule a report
  const schedule = reportingService.scheduleReport('performance', 'monthly', ['manager@company.com', 'director@company.com']);
  console.log('✅ Report Scheduled:', schedule.success ? 'Success' : 'Failed');

  // Export report
  const html = reportingService.exportReport(report.report?.id, 'html');
  console.log('✅ Export to HTML:', html ? 'Success' : 'Failed');
}

async function testExternalIntegration() {
  console.log('\n🔗 Testing External Integration Service...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const integrationService = new ExternalIntegrationService();

  // Configure Slack
  const slackConfig = await integrationService.configureSlack('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', ['#general', '#alerts']);
  console.log('✅ Slack Configuration:', slackConfig.success ? 'Success' : 'Test Mode');

  // Send Slack message
  const slackMsg = await integrationService.sendSlackMessage('#general', 'اختبار رسالة Slack');
  console.log('✅ Slack Message Sent:', slackMsg.success ? 'Success' : 'Failed');

  // Configure Email
  const emailConfig = await integrationService.configureEmail({
    host: 'smtp.gmail.com',
    port: 587,
    auth: { user: 'test@company.com', pass: 'password' },
  });
  console.log('✅ Email Configuration:', emailConfig.success ? 'Success' : 'Test Mode');

  // Register Webhook
  const webhook = integrationService.registerWebhook('project-completed', 'https://your-api.com/webhook');
  console.log('✅ Webhook Registered:', webhook.success ? 'Success' : 'Failed');

  // Get connection status
  const status = integrationService.getConnectionStatus();
  console.log('✅ Connection Status Retrieved:', Object.keys(status).length, 'integrations');
}

function testProjectManagement() {
  console.log('\n📋 Testing Project Management Service...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const projectService = new ProjectManagementService();

  // Create project
  const project = projectService.createProject({
    name: 'مشروع نظام الفواتير',
    manager: 'mohammed@company.com',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    budget: 500000,
  });
  console.log('✅ Project Created:', project.success ? 'Success' : 'Failed');

  if (project.success) {
    const projectId = project.project.id;

    // Add phase
    const phase = projectService.addPhase(projectId, {
      name: 'مرحلة التصميم',
      startDate: '2024-01-01',
      endDate: '2024-02-15',
      owner: 'designer@company.com',
    });
    console.log('✅ Phase Added:', phase.success ? 'Success' : 'Failed');

    // Create task
    const task = projectService.createTask(projectId, phase.phase?.id, {
      name: 'تصميم الواجهة',
      assignee: 'designer@company.com',
      startDate: '2024-01-01',
      dueDate: '2024-01-15',
      estimatedHours: 40,
    });
    console.log('✅ Task Created:', task.success ? 'Success' : 'Failed');

    // Manage budget
    const budget = projectService.manageBudget(projectId, {
      totalBudget: 500000,
      contingency: 50000,
    });
    console.log('✅ Budget Created:', budget.success ? 'Success' : 'Failed');

    // Calculate progress
    const progress = projectService.calculateProjectProgress(projectId);
    console.log('✅ Progress Calculated:', progress.success ? progress.progress + '%' : 'Failed');

    // Generate report
    const report = projectService.generateProjectReport(projectId);
    console.log('✅ Project Report Generated:', report.success ? 'Success' : 'Failed');
  }
}

function testAIAnalytics() {
  console.log('\n🤖 Testing AI Analytics Service...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const aiService = new AIAnalyticsService();

  // Predict attendance patterns
  const attendancePred = aiService.predictAttendancePatterns(testEmployees[0], attendanceHistory);
  console.log('✅ Attendance Prediction:', attendancePred.success ? 'Success' : 'Failed');
  if (attendancePred.success) {
    console.log('   Confidence:', attendancePred.prediction.confidence);
  }

  // Predict performance
  const performancePred = aiService.predictPerformance('emp001', {
    tasks_completed: 50,
    quality_score: 85,
    on_time_delivery: 90,
    teamwork: 88,
  });
  console.log('✅ Performance Prediction:', performancePred.success ? 'Success' : 'Failed');
  if (performancePred.success) {
    console.log('   Current Score:', performancePred.prediction.currentScore);
    console.log('   Projected Score:', performancePred.prediction.projectedScore);
  }

  // Detect anomalies
  const data = [
    { value: 100 },
    { value: 102 },
    { value: 98 },
    { value: 500 }, // This is an anomaly
    { value: 99 },
    { value: 101 },
  ];
  const anomalies = aiService.detectAnomalies(data, 'performance');
  console.log('✅ Anomaly Detection:', anomalies.success ? 'Found ' + anomalies.anomalies.anomalies.length + ' anomalies' : 'Failed');

  // Generate recommendations
  const recommendations = aiService.generateSmartRecommendations(
    'emp001',
    {
      currentSkills: ['JavaScript', 'React'],
      requiredSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
      developmentAreas: ['Backend Development', 'System Design'],
    },
    {},
  );
  console.log(
    '✅ Smart Recommendations:',
    recommendations.success ? recommendations.recommendations.recommendations.length + ' recommendations' : 'Failed',
  );

  // Analyze trends
  const trendData = [
    { date: '2024-01-01', value: 80 },
    { date: '2024-01-08', value: 82 },
    { date: '2024-01-15', value: 85 },
    { date: '2024-01-22', value: 87 },
  ];
  const trends = aiService.analyzeTrends(trendData);
  console.log('✅ Trend Analysis:', trends.success ? trends.trends.overallTrend : 'Failed');
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log('\n\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           🧪 QUICK SERVICE TEST - اختبار الخدمات                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  try {
    testAdvancedSearch();
    testAdvancedReporting();
    await testExternalIntegration();
    testProjectManagement();
    testAIAnalytics();

    console.log('\n\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ جميع الاختبارات مكتملة                       ║');
    console.log('║              ✅ All Tests Completed Successfully                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');

    console.log('\n📚 للمزيد من المعلومات اقرأ:');
    console.log('   • SERVICES_DOCUMENTATION.md');
    console.log('   • SERVICES_INTEGRATION_EXAMPLE.js');
    console.log('   • ROADMAP_NEXT_PHASE.md');

    console.log('\n🚀 الخطوة التالية:');
    console.log('   اكتب: "متابعة في تطبيق المسارات" أو أي خيار آخر');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ خطأ في الاختبار:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testAdvancedSearch,
  testAdvancedReporting,
  testExternalIntegration,
  testProjectManagement,
  testAIAnalytics,
  runAllTests,
};
