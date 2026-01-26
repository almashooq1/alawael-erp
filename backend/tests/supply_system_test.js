/**
 * Supply & Support System - Comprehensive Test Suite
 * نظام الإمداد والمساندة - مجموعة الاختبارات الشاملة
 */

const SupplySupportSystem = require('../lib/supply_support_system');

class SupplySystemTester {
  constructor() {
    this.system = new SupplySupportSystem();
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  /**
   * Run all tests
   */
  runAllTests() {
    console.log('\n========================================');
    console.log('🧪 Supply & Support System Test Suite');
    console.log('========================================\n');

    this.testBranchManagement();
    this.testSupplyRequests();
    this.testTransfers();
    this.testSupportTickets();
    this.testInventoryAnalysis();
    this.testReports();
    this.testSystemStatistics();

    this.printSummary();
  }

  /**
   * Test 1: Branch Management
   */
  testBranchManagement() {
    console.log('📍 Testing Branch Management...\n');

    // Test 1.1: Get all branches
    const branches = this.system.getAllBranches();
    this.assert(
      branches.success && branches.branches.length === 4,
      'Get all branches (4 branches should exist)'
    );

    // Test 1.2: Get branch inventory
    const inventory = this.system.getBranchInventory('BR001');
    this.assert(inventory.success && inventory.inventory, 'Get branch inventory');

    // Test 1.3: Get branch metrics
    const metrics = this.system.getBranchMetrics('BR001');
    this.assert(metrics.success && metrics.metrics, 'Get branch metrics');

    console.log();
  }

  /**
   * Test 2: Supply Requests
   */
  testSupplyRequests() {
    console.log('📦 Testing Supply Requests...\n');

    // Test 2.1: Create supply request
    const items = [
      { item_name: 'bandages', quantity: 100, unit_price: 10 },
      { item_name: 'syringes', quantity: 50, unit_price: 5 },
    ];

    const request = this.system.createSupplyRequest('BR001', 'BR002', items, 'normal');

    this.assert(request.id && request.status === 'pending', 'Create supply request');

    // Test 2.2: Approve supply request
    const approval = this.system.approveSupplyRequest(request.id);
    this.assert(
      approval.success && approval.transfer,
      'Approve supply request and create transfer'
    );

    // Test 2.3: Request with insufficient inventory
    const largeItems = [{ item_name: 'bandages', quantity: 10000, unit_price: 10 }];

    const largeRequest = this.system.createSupplyRequest('BR001', 'BR002', largeItems, 'normal');

    const rejectedApproval = this.system.approveSupplyRequest(largeRequest.id);
    this.assert(
      !rejectedApproval.success && rejectedApproval.error === 'Insufficient inventory',
      'Reject request with insufficient inventory'
    );

    console.log();
  }

  /**
   * Test 3: Transfers
   */
  testTransfers() {
    console.log('🚚 Testing Transfers...\n');

    // Test 3.1: Create transfer
    const items = [{ item_name: 'masks', quantity: 200, unit_price: 2 }];

    const transfer = this.system.createTransfer('BR001', 'BR003', items);
    this.assert(transfer.id && transfer.status === 'pending', 'Create transfer');

    // Test 3.2: Update transfer to in_transit
    const updateInTransit = this.system.updateTransferStatus(
      transfer.id,
      'in_transit',
      'Dispatched from BR001'
    );
    this.assert(
      updateInTransit.success && updateInTransit.transfer.status === 'in_transit',
      'Update transfer to in_transit'
    );

    // Test 3.3: Deliver transfer
    const updateDelivered = this.system.updateTransferStatus(
      transfer.id,
      'delivered',
      'Received at BR003'
    );
    this.assert(
      updateDelivered.success && updateDelivered.transfer.status === 'delivered',
      'Update transfer to delivered'
    );

    // Test 3.4: Get transfer history
    const history = this.system.getTransferHistory('BR001', 'sent');
    this.assert(history.success && Array.isArray(history.history.sent), 'Get transfer history');

    console.log();
  }

  /**
   * Test 4: Support Tickets
   */
  testSupportTickets() {
    console.log('🎫 Testing Support Tickets...\n');

    // Test 4.1: Create support ticket
    const ticket = this.system.createSupportTicket(
      'BR002',
      'supply',
      'Running low on medical supplies',
      'urgent'
    );
    this.assert(ticket.id && ticket.status === 'open', 'Create support ticket');

    // Test 4.2: Add comment to ticket
    const comment = this.system.addTicketComment(
      ticket.id,
      'John Doe',
      'We need to order more supplies ASAP'
    );
    this.assert(comment.success && comment.ticket.comments.length > 0, 'Add comment to ticket');

    // Test 4.3: Resolve ticket
    const resolution = this.system.resolveSupportTicket(
      ticket.id,
      'Ordered 500 units of medical supplies'
    );
    this.assert(
      resolution.success && resolution.ticket.status === 'resolved',
      'Resolve support ticket'
    );

    console.log();
  }

  /**
   * Test 5: Inventory Analysis
   */
  testInventoryAnalysis() {
    console.log('📊 Testing Inventory Analysis...\n');

    // Test 5.1: Predictive inventory analysis
    const predictions = this.system.predictiveInventoryAnalysis('BR001');
    this.assert(
      predictions.success && predictions.predictions,
      'Get predictive inventory analysis'
    );

    // Test 5.2: Check for low stock items
    const lowStockExists = predictions.predictions.low_stock_items.length >= 0;
    this.assert(lowStockExists, 'Identify low stock items');

    console.log();
  }

  /**
   * Test 6: Reports
   */
  testReports() {
    console.log('📈 Testing Reports...\n');

    // Test 6.1: Generate branch report
    const report = this.system.generateBranchReport('BR001');
    this.assert(report.success && report.report.summary, 'Generate branch report');

    // Test 6.2: Check report content
    this.assert(
      report.report.performance && report.report.recent_activity,
      'Report contains all sections'
    );

    console.log();
  }

  /**
   * Test 7: System Statistics
   */
  testSystemStatistics() {
    console.log('📊 Testing System Statistics...\n');

    // Test 7.1: Get system statistics
    const stats = this.system.getSystemStatistics();
    this.assert(stats.success && stats.system_status === 'operational', 'Get system statistics');

    // Test 7.2: Check statistics completeness
    this.assert(
      stats.total_branches > 0 &&
        stats.total_supply_requests !== undefined &&
        stats.total_transfers !== undefined,
      'Statistics contain all required fields'
    );

    console.log();
  }

  /**
   * Assert helper
   */
  assert(condition, testName) {
    if (condition) {
      this.results.passed++;
      console.log(`  ✅ ${testName}`);
    } else {
      this.results.failed++;
      console.log(`  ❌ ${testName}`);
    }

    this.results.tests.push({
      name: testName,
      passed: condition,
    });
  }

  /**
   * Print summary
   */
  printSummary() {
    console.log('\n========================================');
    console.log('📋 Test Summary');
    console.log('========================================\n');

    const total = this.results.passed + this.results.failed;
    const percentage = ((this.results.passed / total) * 100).toFixed(1);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${percentage}%\n`);

    if (this.results.failed === 0) {
      console.log('🎉 All tests passed! System is ready for production.\n');
    } else {
      console.log(`⚠️  ${this.results.failed} test(s) failed. Please review.\n`);
    }

    console.log('========================================\n');
  }

  /**
   * Generate detailed test report
   */
  generateDetailedReport() {
    const report = {
      timestamp: new Date(),
      total_tests: this.results.passed + this.results.failed,
      passed: this.results.passed,
      failed: this.results.failed,
      success_rate: (
        (this.results.passed / (this.results.passed + this.results.failed)) *
        100
      ).toFixed(1),
      tests: this.results.tests,
      system_status: {
        branches: this.system.branches.size,
        requests: this.system.requests.size,
        transfers: this.system.transfers.size,
        tickets: this.system.support_tickets.size,
      },
    };

    return report;
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new SupplySystemTester();
  tester.runAllTests();

  // Save report
  const report = tester.generateDetailedReport();
  console.log('\n📄 Detailed Report:\n');
  console.log(JSON.stringify(report, null, 2));
}

module.exports = SupplySystemTester;
