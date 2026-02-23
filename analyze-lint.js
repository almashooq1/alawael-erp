// Manual parsing based on the lint output already captured
// This directly analyzes the data we have

const lintData = {
  // Format: filePath: { variables: { varName: count } }
  
  'services\\smartGPSTracking.service.js': { trip: 1, bearingChange: 1, enrichedData: 1, route: 2, latitude: 1, longitude: 1, start: 1, end: 1, location: 1, effectiveSpeed: 1, distance: 1, allPoints: 1, idx: 1 },
  'tests\\moi-passport.test.js': { '_e': 12 },
  'services\\recommendationsEngine.service.js': { aiModels: 1, tenantId: 3, userId: 3, context: 3 },
  'services\\websocket.service.js': { error: 8 },
  'test-phase-9.js': { error: 10 },
  'services\\messagingService.js': { data: 1, messageId: 1, beneficiaryId: 3 },
  'tests\\qiwa.test.js': { filters: 1, months: 1, newWage: 1, workforce: 1, c: 1, u: 1, error: 1 },
  'services\\smartNotifications.service.js': { reject: 5 },
  'services\\gpsSecurityService.js': { userId: 1, vehicleId: 1, action: 1, startDate: 1, endDate: 1 },
  'services\\gpsTracking.service.js': { trip: 1, location: 2, start: 1, end: 1 },
  'services\\hr\\analyticsAIService.js': { Payroll: 1, employee: 1, completedTrainings: 1 },
  'services\\kpiAlertService.js': { rule: 3 },
  'tests\\comprehensive.test.js': { lastAlert: 1, mockSocket: 1, broadcastSpy: 1, db: 1 },
  'services\\userService.js': { userId: 2, file: 1, query: 1 },
  'tests\\sso.comprehensive.test.js': { '_e': 5, '_error': 2 },
  'tests\\communityAwareness.test.js': { EducationalContent: 1, VirtualSession: 1, DigitalLibrary: 1, SubscriptionPlan: 1, UserSubscription: 1, userId: 1 },
  'services\\tenantResolver.service.js': { error: 5 },
  'tests\\database.integration.test.js': { seedData: 1, Supplier: 1, Product: 1, PurchaseOrder: 1, Shipment: 1, suppliers: 1 },
  'src\\optimization\\performanceOptimization.js': { query: 1, next: 1, code: 1, signal: 1, app: 1, mongoDB: 1 },
  'services\\oauth.service.js': { stateData: 1, redirectUri: 1, clientId: 1 },
  'services\\driverManagement.service.js': { User: 1, totalViolations: 1 },
  'tests\\BeneficiaryPortal.test.js': { SurveyResponse: 1, beneficiary: 1, secondBeneficiaryToken: 1, userId: 1 },
  'services\\hr\\incentivesService.js': { employeeId: 2, startDate: 1, endDate: 1 },
  'services\\systemDashboard.js': { searchEngine: 1, validator: 1, total: 1 },
  'tests\\BeneficiaryActual.test.js': { SurveyResponse: 1, beneficiary: 1, secondBeneficiaryToken: 1, userId: 1 },
  'tests\\e2e-phase1.test.js': { e: 2, inventoryId: 1, orderId: 1 },
  'tests\\integration-test-suite.js': { e: 1, response: 3 },
  'tests\\vulnerabilityScanner.js': { '_error': 3 },
  'tests\\sso-e2e-fixed.test.js': { sessionId: 1, userId: 1, '_e': 1 },
  'tests\\sso-e2e.test.js': { sessionId: 1, userId: 1, '_e': 2 },
  'services\\trafficAccidentService.js': { Driver: 1, Vehicle: 1, includeAttachments: 1 },
  'services\\notificationAnalyticsSystem.js': { period: 1, metricsArray: 2 },
  'services\\routeOptimization.service.js': { route: 1, passengerNeeds: 1 },
  'tests\\e2e-phase3.test.js': { createdShipmentId: 1, e: 2 },
  'services\\unifiedNotificationManager.js': { e: 1, error: 1, results: 1 },
  'services\\eSignatureService.js': { content: 2 },
  'tests\\measurement-integration.test.js': { mongoose: 1, DB_URI: 1, testBeneficiary: 1, testMeasurement: 1, response: 1 },
  'test-mfa-load.js': { mfaService: 1, mfaController: 1, mfaRouter: 1 },
  'tests\\integration-system.test.js': { webhook: 1, event: 1, connector: 1 },
  'services\\hr\\gratuityService.js': { QiwaService: 1, GOSIService: 1 },
  'services\\mfaService.js': { nodemailer: 1, error: 1 },
  'tests\\e2e-api.test.js': { e: 1, getRes: 1 },
  'services\\policyEngine.service.js': { context: 1, policyId: 1 },
  'services\\smsService.js': { to: 1, message: 1 },
  'test-phase-9.js': { error: 10 },
  'services\\whatsappNotificationService.js': { config: 1, error: 1, idx: 1 },
  'services\\rbacService.js': { filters: 1, file: 1 },
};

// Calculate totals and create output
const result = Object.entries(lintData)
  .map(([filePath, variables]) => {
    const problemCount = Object.values(variables).reduce((a, b) => a + b, 0);
    const allVars = Object.entries(variables)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const underscoreVars = allVars.filter(v => v.name.startsWith('_'));
    
    return {
      filePath,
      problemCount,
      variables: allVars,
      underscoreVariables: underscoreVars
    };
  })
  .sort((a, b) => b.problemCount - a.problemCount)
  .slice(0, 15);

console.log(JSON.stringify(result, null, 2));
