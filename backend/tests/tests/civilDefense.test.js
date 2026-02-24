/**
 * Civil Defense Integration Tests
 * اختبارات تكامل الدفاع المدني
 */

const axios = require('axios');
const moment = require('moment');

const API_BASE = process.env.TEST_API_URL || 'http://localhost:3001/api';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'test_token';

const headers = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
};

class CivilDefenseTests {
  constructor() {
    this.testResults = [];
    this.facilityId = `test_facility_${Date.now()}`;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Civil Defense Integration Tests...\n');

    try {
      // Certificate Tests
      await this.testRequestSafetyCertificate();
      await this.testGetCertificateStatus();
      await this.testRenewSafetyCertificate();
      await this.testGetCertificatesForFacility();
      await this.testListCertificates();

      // Audit Tests
      await this.testScheduleSafetyAudit();
      await this.testGetAuditDetails();
      await this.testGetAuditsByFacility();
      await this.testGetAvailableAuditSlots();
      await this.testCompleteAudit();

      // Compliance Tests
      await this.testGetComplianceStatus();
      await this.testGetViolations();
      await this.testResolveViolation();
      await this.testGenerateComplianceReport();

      // Fire Safety Tests
      await this.testScheduleFireSafetyInspection();
      await this.testGetFireSafetyStatus();
      await this.testUpdateFireSafetyEquipment();
      await this.testLogMaintenanceActivity();

      // Emergency Drill Tests
      await this.testScheduleEmergencyDrill();
      await this.testGetEmergencyDrillResults();
      await this.testGetEmergencyDrillsByFacility();
      await this.testCompleteEmergencyDrill();

      // Document Tests
      await this.testGetRequiredDocuments();
      await this.testGetFacilityDocuments();

      // Notification Tests
      await this.testGetFacilityNotifications();

      // Report Tests
      await this.testGetDashboardData();
      await this.testGenerateFacilityReport();

      // Print Results
      this.printResults();
    } catch (error) {
      console.error('❌ Test execution error:', error.message);
    }
  }

  /**
   * ==================== CERTIFICATE TESTS ====================
   */

  async testRequestSafetyCertificate() {
    try {
      const response = await axios.post(
        `${API_BASE}/civil-defense/certificates/request`,
        {
          facilityId: this.facilityId,
          buildingType: 'commercial',
          facilitySizeMeters: 5000,
          address: {
            street: 'King Fahd Road',
            city: 'Riyadh',
            region: 'Riyadh',
            postalCode: '12345',
          },
          numberOfFloors: 5,
          occupancyCapacity: 500,
          contactPerson: {
            name: 'Ahmed Al-Saud',
            phone: '+966541234567',
            email: 'ahmed@example.com',
          },
        },
        { headers }
      );

      this.addTestResult('Request Safety Certificate', response.status === 201);
      this.certificateId = response.data.data.certificateId;
    } catch (error) {
      this.addTestResult('Request Safety Certificate', false, error.message);
    }
  }

  async testGetCertificateStatus() {
    try {
      if (!this.certificateId) {
        this.addTestResult('Get Certificate Status', false, 'Certificate ID not set');
        return;
      }

      const response = await axios.get(
        `${API_BASE}/civil-defense/certificates/${this.certificateId}/status`,
        { headers }
      );

      this.addTestResult('Get Certificate Status', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Certificate Status', false, error.message);
    }
  }

  async testRenewSafetyCertificate() {
    try {
      if (!this.certificateId) {
        this.addTestResult('Renew Safety Certificate', false, 'Certificate ID not set');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/civil-defense/certificates/${this.certificateId}/renew`,
        {
          buildingData: {
            facilitySizeMeters: 5000,
            numberOfFloors: 5,
            occupancyCapacity: 500,
          },
        },
        { headers }
      );

      this.addTestResult('Renew Safety Certificate', response.status === 200);
      this.newCertificateId = response.data.data?.newCertificateId;
    } catch (error) {
      this.addTestResult('Renew Safety Certificate', false, error.message);
    }
  }

  async testGetCertificatesForFacility() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/certificates/facility/${this.facilityId}`,
        { headers }
      );

      this.addTestResult(
        'Get Certificates for Facility',
        response.status === 200 && response.data.data.certificates
      );
    } catch (error) {
      this.addTestResult('Get Certificates for Facility', false, error.message);
    }
  }

  async testListCertificates() {
    try {
      const response = await axios.get(`${API_BASE}/civil-defense/certificates?page=1&limit=10`, {
        headers,
      });

      this.addTestResult('List Certificates', response.status === 200);
    } catch (error) {
      this.addTestResult('List Certificates', false, error.message);
    }
  }

  /**
   * ==================== AUDIT TESTS ====================
   */

  async testScheduleSafetyAudit() {
    try {
      const response = await axios.post(
        `${API_BASE}/civil-defense/audits/schedule`,
        {
          facilityId: this.facilityId,
          auditType: 'periodic',
          buildingType: 'commercial',
          facilitySizeMeters: 5000,
          preferredDate: moment().add(7, 'days').toDate(),
          contactPerson: {
            name: 'Ahmed Al-Saud',
            phone: '+966541234567',
            email: 'ahmed@example.com',
          },
        },
        { headers }
      );

      this.addTestResult('Schedule Safety Audit', response.status === 201);
      this.auditId = response.data.data.auditId;
    } catch (error) {
      this.addTestResult('Schedule Safety Audit', false, error.message);
    }
  }

  async testGetAuditDetails() {
    try {
      if (!this.auditId) {
        this.addTestResult('Get Audit Details', false, 'Audit ID not set');
        return;
      }

      const response = await axios.get(
        `${API_BASE}/civil-defense/audits/${this.auditId}`,
        { headers }
      );

      this.addTestResult('Get Audit Details', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Audit Details', false, error.message);
    }
  }

  async testGetAuditsByFacility() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/audits/facility/${this.facilityId}`,
        { headers }
      );

      this.addTestResult('Get Audits by Facility', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Audits by Facility', false, error.message);
    }
  }

  async testGetAvailableAuditSlots() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/audit-slots/available?facilityId=${this.facilityId}&date=${moment()
          .add(7, 'days')
          .format('YYYY-MM-DD')}`,
        { headers }
      );

      this.addTestResult('Get Available Audit Slots', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Available Audit Slots', false, error.message);
    }
  }

  async testCompleteAudit() {
    try {
      if (!this.auditId) {
        this.addTestResult('Complete Audit', false, 'Audit ID not set');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/civil-defense/audits/${this.auditId}/complete`,
        {
          findings: {
            totalCheckpoints: 50,
            passedCheckpoints: 48,
            failedCheckpoints: 2,
            compliancePercentage: 96,
          },
          recommendations: [
            {
              recommendation: 'Update fire extinguishers',
              priority: 'high',
            },
          ],
          rating: 'excellent',
          notes: 'Audit completed successfully',
        },
        { headers }
      );

      this.addTestResult('Complete Audit', response.status === 200);
    } catch (error) {
      this.addTestResult('Complete Audit', false, error.message);
    }
  }

  /**
   * ==================== COMPLIANCE TESTS ====================
   */

  async testGetComplianceStatus() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/compliance/${this.facilityId}`,
        { headers }
      );

      this.addTestResult('Get Compliance Status', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Compliance Status', false, error.message);
    }
  }

  async testGetViolations() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/compliance/${this.facilityId}/violations`,
        { headers }
      );

      this.addTestResult('Get Violations', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Violations', false, error.message);
    }
  }

  async testResolveViolation() {
    try {
      const response = await axios.post(
        `${API_BASE}/civil-defense/compliance/${this.facilityId}/resolve-violation`,
        {
          violationId: 'vio_test_1',
          actions: ['Repair equipment', 'Update procedures'],
          completionDate: moment().add(30, 'days').toDate(),
        },
        { headers }
      );

      this.addTestResult('Resolve Violation', response.status === 200);
    } catch (error) {
      this.addTestResult('Resolve Violation', false, error.message);
    }
  }

  async testGenerateComplianceReport() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/compliance/report/${this.facilityId}`,
        { headers }
      );

      this.addTestResult('Generate Compliance Report', response.status === 200);
    } catch (error) {
      this.addTestResult('Generate Compliance Report', false, error.message);
    }
  }

  /**
   * ==================== FIRE SAFETY TESTS ====================
   */

  async testScheduleFireSafetyInspection() {
    try {
      const response = await axios.post(
        `${API_BASE}/civil-defense/fire-safety/inspections/schedule`,
        {
          facilityId: this.facilityId,
          buildingType: 'commercial',
          facilitySizeMeters: 5000,
          numberOfFloors: 5,
          occupancyCapacity: 500,
          contactPerson: {
            name: 'Ahmed Al-Saud',
            phone: '+966541234567',
          },
          preferredDate: moment().add(14, 'days').toDate(),
        },
        { headers }
      );

      this.addTestResult('Schedule Fire Safety Inspection', response.status === 201);
      this.inspectionId = response.data.data?.inspectionId;
    } catch (error) {
      this.addTestResult('Schedule Fire Safety Inspection', false, error.message);
    }
  }

  async testGetFireSafetyStatus() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/fire-safety/status/${this.facilityId}`,
        { headers }
      );

      this.addTestResult('Get Fire Safety Status', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Fire Safety Status', false, error.message);
    }
  }

  async testUpdateFireSafetyEquipment() {
    try {
      const response = await axios.post(
        `${API_BASE}/civil-defense/fire-safety/equipment/update`,
        {
          facilityId: this.facilityId,
          equipmentType: 'fire_extinguishers',
          status: {
            functional: 25,
          },
          nextMaintenanceDue: moment().add(6, 'months').toDate(),
        },
        { headers }
      );

      this.addTestResult('Update Fire Safety Equipment', response.status === 200);
    } catch (error) {
      this.addTestResult('Update Fire Safety Equipment', false, error.message);
    }
  }

  async testLogMaintenanceActivity() {
    try {
      const response = await axios.post(
        `${API_BASE}/civil-defense/fire-safety/maintenance/log`,
        {
          facilityId: this.facilityId,
          maintenanceType: 'fire_extinguisher_refill',
          completedBy: 'Maintenance Team',
          notes: 'All 25 fire extinguishers refilled and tested',
          nextScheduled: moment().add(6, 'months').toDate(),
        },
        { headers }
      );

      this.addTestResult('Log Maintenance Activity', response.status === 200);
    } catch (error) {
      this.addTestResult('Log Maintenance Activity', false, error.message);
    }
  }

  /**
   * ==================== EMERGENCY DRILL TESTS ====================
   */

  async testScheduleEmergencyDrill() {
    try {
      const response = await axios.post(
        `${API_BASE}/civil-defense/emergency-drills/schedule`,
        {
          facilityId: this.facilityId,
          drillType: 'fire_evacuation',
          scenario: 'Fire on 3rd floor',
          expectedParticipants: 500,
          scheduledDate: moment().add(21, 'days').toDate(),
          scheduledTime: '10:00 AM',
          durationMinutes: 30,
          coordinator: {
            name: 'Ahmed Al-Saud',
            phone: '+966541234567',
            email: 'ahmed@example.com',
          },
        },
        { headers }
      );

      this.addTestResult('Schedule Emergency Drill', response.status === 201);
      this.drillId = response.data.data?.drillId;
    } catch (error) {
      this.addTestResult('Schedule Emergency Drill', false, error.message);
    }
  }

  async testGetEmergencyDrillResults() {
    try {
      if (!this.drillId) {
        this.addTestResult('Get Emergency Drill Results', false, 'Drill ID not set');
        return;
      }

      const response = await axios.get(
        `${API_BASE}/civil-defense/emergency-drills/${this.drillId}/results`,
        { headers }
      );

      this.addTestResult('Get Emergency Drill Results', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Emergency Drill Results', false, error.message);
    }
  }

  async testGetEmergencyDrillsByFacility() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/emergency-drills/facility/${this.facilityId}`,
        { headers }
      );

      this.addTestResult('Get Emergency Drills by Facility', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Emergency Drills by Facility', false, error.message);
    }
  }

  async testCompleteEmergencyDrill() {
    try {
      if (!this.drillId) {
        this.addTestResult('Complete Emergency Drill', false, 'Drill ID not set');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/civil-defense/emergency-drills/${this.drillId}/complete`,
        {
          results: {
            totalParticipants: 495,
            averageEvacuationTime: '4 minutes 30 seconds',
            issues: [
              {
                description: 'Stairwell 2 was crowded',
                severity: 'low',
                suggestedSolution: 'Use stairwell 1 instead',
              },
            ],
            recommendations: ['Conduct monthly drills', 'Update evacuation procedures'],
            performanceRating: 'good',
          },
          notes: 'Drill completed successfully',
        },
        { headers }
      );

      this.addTestResult('Complete Emergency Drill', response.status === 200);
    } catch (error) {
      this.addTestResult('Complete Emergency Drill', false, error.message);
    }
  }

  /**
   * ==================== DOCUMENT TESTS ====================
   */

  async testGetRequiredDocuments() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/documents/requirements/commercial`,
        { headers }
      );

      this.addTestResult('Get Required Documents', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Required Documents', false, error.message);
    }
  }

  async testGetFacilityDocuments() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/documents/${this.facilityId}`,
        { headers }
      );

      this.addTestResult('Get Facility Documents', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Facility Documents', false, error.message);
    }
  }

  /**
   * ==================== NOTIFICATION TESTS ====================
   */

  async testGetFacilityNotifications() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/notifications/facility/${this.facilityId}`,
        { headers }
      );

      this.addTestResult('Get Facility Notifications', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Facility Notifications', false, error.message);
    }
  }

  /**
   * ==================== REPORT TESTS ====================
   */

  async testGetDashboardData() {
    try {
      const response = await axios.get(`${API_BASE}/civil-defense/reports/dashboard`, {
        headers,
      });

      this.addTestResult('Get Dashboard Data', response.status === 200);
    } catch (error) {
      this.addTestResult('Get Dashboard Data', false, error.message);
    }
  }

  async testGenerateFacilityReport() {
    try {
      const response = await axios.get(
        `${API_BASE}/civil-defense/reports/facility/${this.facilityId}`,
        { headers }
      );

      this.addTestResult('Generate Facility Report', response.status === 200);
    } catch (error) {
      this.addTestResult('Generate Facility Report', false, error.message);
    }
  }

  /**
   * ==================== HELPER METHODS ====================
   */

  addTestResult(testName, passed, error = null) {
    this.testResults.push({
      name: testName,
      status: passed ? '✅ PASS' : '❌ FAIL',
      error,
    });
  }

  printResults() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const passed = this.testResults.filter(r => r.status.includes('✅')).length;
    const failed = this.testResults.filter(r => r.status.includes('❌')).length;
    const total = this.testResults.length;

    this.testResults.forEach(result => {
      console.log(`${result.status} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(2)}%`);
    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

// Run tests
const tester = new CivilDefenseTests();
tester.runAllTests().catch(console.error);
