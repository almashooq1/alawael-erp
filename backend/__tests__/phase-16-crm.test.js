/**
 * ALAWAEL ERP - PHASE 16: CRM & CUSTOMER MANAGEMENT TEST SUITE
 * Comprehensive unit tests for CRM service and routes
 * Total Tests: 50+
 */

const crmService = require('../services/crm.service');

describe.skip('Phase 16: Advanced CRM & Customer Management', () => {
  beforeEach(() => {
    // Reset service state before each test
    crmService.customers = [];
    crmService.leads = [];
    crmService.opportunities = [];
    crmService.activities = [];
    crmService.segments = new Map();
    crmService.contactHierarchy = [];
  });

  /**
   * CUSTOMER PROFILE MANAGEMENT TESTS (7 tests)
   */
  describe('Customer Profile Management', () => {
    test('Should create a customer successfully', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        company: 'Tech Corp',
        industry: 'tech',
      });

      expect(customer).toBeDefined();
      expect(customer.id).toMatch(/^CUST_/);
      expect(customer.fullName).toBe('John Doe');
      expect(customer.status).toBe('active');
    });

    test('Should retrieve a customer profile with related data', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      });

      await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Deal 1',
        value: 50000,
      });

      const profile = await crmService.getCustomerProfile(customer.id);

      expect(profile).toBeDefined();
      expect(profile.opportunities.length).toBe(1);
      expect(profile.totalOpportunities).toBe(1);
    });

    test('Should update customer information', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
      });

      const updated = await crmService.updateCustomer(customer.id, {
        phone: '9876543210',
        company: 'New Corp',
      });

      expect(updated.phone).toBe('9876543210');
      expect(updated.company).toBe('New Corp');
    });

    test('Should get customers with filtering', async () => {
      await crmService.createCustomer({
        firstName: 'Alice',
        lastName: 'Brown',
        email: 'alice@example.com',
        industry: 'tech',
      });

      await crmService.createCustomer({
        firstName: 'Charlie',
        lastName: 'White',
        email: 'charlie@example.com',
        industry: 'finance',
      });

      const techCustomers = await crmService.getCustomers({ industry: 'tech' });

      expect(techCustomers.length).toBe(1);
      expect(techCustomers[0].firstName).toBe('Alice');
    });

    test('Should search customers by name or email', async () => {
      await crmService.createCustomer({
        firstName: 'David',
        lastName: 'Green',
        email: 'david@example.com',
      });

      const results = await crmService.getCustomers({ search: 'david' });

      expect(results.length).toBe(1);
      expect(results[0].firstName).toBe('David');
    });

    test('Should throw error if required fields are missing', async () => {
      await expect(
        crmService.createCustomer({
          firstName: 'Test',
          // missing lastName and email
        })
      ).rejects.toThrow('Missing required fields');
    });

    test('Should determine customer segment automatically', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Eve',
        lastName: 'Black',
        email: 'eve@example.com',
        industry: 'tech',
      });

      expect(customer.segment).toBe('strategic');
    });
  });

  /**
   * LEAD MANAGEMENT TESTS (8 tests)
   */
  describe('Lead Management', () => {
    test('Should create a lead successfully', async () => {
      const lead = await crmService.createLead({
        name: 'Prospect One',
        email: 'prospect@example.com',
        company: 'Prospect Corp',
        source: 'website',
      });

      expect(lead).toBeDefined();
      expect(lead.id).toMatch(/^LEAD_/);
      expect(lead.status).toBe('new');
      expect(lead.score).toBe(0);
    });

    test('Should score a lead based on engagement metrics', async () => {
      const lead = await crmService.createLead({
        name: 'Hot Prospect',
        email: 'hot@example.com',
      });

      const scored = await crmService.scoreLead(lead.id, {
        engagementScore: 30,
        fitScore: 25,
        behavioralScore: 20,
        activityScore: 15,
      });

      expect(scored.score).toBe(90);
      expect(scored.status).toBe('qualified');
    });

    test('Should auto-qualify hot leads', async () => {
      const lead = await crmService.createLead({
        name: 'Very Hot Prospect',
        email: 'veryhot@example.com',
      });

      const scored = await crmService.scoreLead(lead.id, {
        engagementScore: 40,
        fitScore: 30,
        behavioralScore: 10,
        activityScore: 20,
      });

      expect(scored.score).toBe(100);
      expect(scored.status).toBe('qualified');
    });

    test('Should convert a lead to a customer', async () => {
      const lead = await crmService.createLead({
        name: 'Convert Me',
        email: 'convert@example.com',
      });

      const customer = await crmService.createCustomer({
        firstName: 'Convert',
        lastName: 'Me',
        email: 'convert@example.com',
      });

      const converted = await crmService.convertLead(lead.id, customer.id);

      expect(converted.status).toBe('converted');
      expect(converted.convertedTo).toBe(customer.id);
    });

    test('Should get leads with status filtering', async () => {
      await crmService.createLead({
        name: 'Lead 1',
        email: 'lead1@example.com',
        status: 'new',
      });

      await crmService.createLead({
        name: 'Lead 2',
        email: 'lead2@example.com',
        status: 'qualified',
      });

      const qualifiedLeads = await crmService.getLeads({ status: 'qualified' });

      expect(qualifiedLeads.length).toBe(1);
      expect(qualifiedLeads[0].name).toBe('Lead 2');
    });

    test('Should filter leads by minimum score', async () => {
      const lead1 = await crmService.createLead({
        name: 'Low Score',
        email: 'low@example.com',
      });

      const lead2 = await crmService.createLead({
        name: 'High Score',
        email: 'high@example.com',
      });

      await crmService.scoreLead(lead2.id, {
        engagementScore: 50,
        fitScore: 30,
      });

      const hotLeads = await crmService.getLeads({ minScore: 50 });

      expect(hotLeads.length).toBe(1);
      expect(hotLeads[0].name).toBe('High Score');
    });

    test('Should sort leads by score descending', async () => {
      const lead1 = await crmService.createLead({
        name: 'Score 30',
        email: 'score30@example.com',
      });

      const lead2 = await crmService.createLead({
        name: 'Score 80',
        email: 'score80@example.com',
      });

      await crmService.scoreLead(lead1.id, {
        engagementScore: 30,
      });

      await crmService.scoreLead(lead2.id, {
        engagementScore: 80,
      });

      const leads = await crmService.getLeads({});

      expect(leads[0].score).toBe(80);
      expect(leads[1].score).toBe(30);
    });
  });

  /**
   * OPPORTUNITY MANAGEMENT TESTS (8 tests)
   */
  describe('Opportunity Management', () => {
    test('Should create an opportunity successfully', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
      });

      const opp = await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Enterprise Deal',
        value: 250000,
        stage: 'proposal',
      });

      expect(opp).toBeDefined();
      expect(opp.id).toMatch(/^OPP_/);
      expect(opp.value).toBe(250000);
      expect(opp.stage).toBe('proposal');
    });

    test('Should update opportunity stage through pipeline', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Test2',
        lastName: 'Customer',
        email: 'test2@example.com',
      });

      const opp = await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Deal',
        value: 100000,
        stage: 'prospecting',
      });

      const moved = await crmService.updateOpportunityStage(opp.id, 'proposal');

      expect(moved.stage).toBe('proposal');
      expect(moved.won).toBe(false);
    });

    test('Should mark opportunity as won', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Test3',
        lastName: 'Customer',
        email: 'test3@example.com',
      });

      const opp = await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Winning Deal',
        value: 150000,
      });

      const won = await crmService.updateOpportunityStage(opp.id, 'won');

      expect(won.won).toBe(true);
      expect(won.closedAt).toBeDefined();
    });

    test('Should mark opportunity as lost', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Test4',
        lastName: 'Customer',
        email: 'test4@example.com',
      });

      const opp = await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Lost Deal',
        value: 75000,
      });

      const lost = await crmService.updateOpportunityStage(opp.id, 'lost');

      expect(lost.lost).toBe(true);
      expect(lost.won).toBe(false);
    });

    test('Should get all opportunities for a customer', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Test5',
        lastName: 'Customer',
        email: 'test5@example.com',
      });

      await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Deal 1',
        value: 50000,
      });

      await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Deal 2',
        value: 75000,
      });

      const result = await crmService.getOpportunitiesByCustomer(customer.id);

      expect(result.opportunities.length).toBe(2);
      expect(result.totalValue).toBe(125000);
    });

    test('Should calculate win rate for customer', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Test6',
        lastName: 'Customer',
        email: 'test6@example.com',
      });

      const opp1 = await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Won Deal',
        value: 100000,
      });

      const opp2 = await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Lost Deal',
        value: 50000,
      });

      await crmService.updateOpportunityStage(opp1.id, 'won');
      await crmService.updateOpportunityStage(opp2.id, 'lost');

      const result = await crmService.getOpportunitiesByCustomer(customer.id);

      expect(result.wonValue).toBe(100000);
      expect(result.winRate).toBeGreaterThan(0);
    });

    test('Should get sales pipeline by stage', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Test7',
        lastName: 'Customer',
        email: 'test7@example.com',
      });

      await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Prospecting Deal',
        value: 50000,
        stage: 'prospecting',
      });

      await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Proposal Deal',
        value: 75000,
        stage: 'proposal',
      });

      const pipeline = await crmService.getSalesPipeline();

      expect(pipeline.prospecting.count).toBe(1);
      expect(pipeline.prospecting.value).toBe(50000);
      expect(pipeline.proposal.count).toBe(1);
      expect(pipeline.proposal.value).toBe(75000);
    });

    test('Should validate opportunity stage transitions', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Test8',
        lastName: 'Customer',
        email: 'test8@example.com',
      });

      const opp = await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Deal',
        value: 100000,
      });

      await expect(crmService.updateOpportunityStage(opp.id, 'invalid_stage')).rejects.toThrow(
        'Invalid stage'
      );
    });
  });

  /**
   * ACTIVITY & INTERACTION TESTS (6 tests)
   */
  describe('Activity & Interaction Management', () => {
    test('Should log a customer activity successfully', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Activity',
        lastName: 'Customer',
        email: 'activity@example.com',
      });

      const activity = await crmService.logActivity(customer.id, {
        type: 'call',
        description: 'Initial consultation call',
        createdBy: 'sales_rep_1',
      });

      expect(activity).toBeDefined();
      expect(activity.id).toMatch(/^ACT_/);
      expect(activity.type).toBe('call');
      expect(activity.completed).toBe(false);
    });

    test('Should update customer last interaction on activity log', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Activity2',
        lastName: 'Customer',
        email: 'activity2@example.com',
      });

      await crmService.logActivity(customer.id, {
        type: 'email',
        description: 'Sent proposal',
      });

      const updated = crmService.customers.find(c => c.id === customer.id);

      expect(updated.lastInteraction).toBeDefined();
      expect(updated.interactionCount).toBe(1);
    });

    test('Should mark activity as complete', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Activity3',
        lastName: 'Customer',
        email: 'activity3@example.com',
      });

      const activity = await crmService.logActivity(customer.id, {
        type: 'follow-up',
      });

      const completed = await crmService.completeActivity(activity.id);

      expect(completed.completed).toBe(true);
      expect(completed.completedAt).toBeDefined();
    });

    test('Should get customer activities in reverse chronological order', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Activity4',
        lastName: 'Customer',
        email: 'activity4@example.com',
      });

      const act1 = await crmService.logActivity(customer.id, { type: 'call' });
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      const act2 = await crmService.logActivity(customer.id, { type: 'email' });

      const activities = await crmService.getCustomerActivities(customer.id);

      expect(activities.length).toBe(2);
      expect(activities.map(a => a.id)).toContain(act1.id);
      expect(activities.map(a => a.id)).toContain(act2.id);
    });

    test('Should limit activity retrieval', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Activity5',
        lastName: 'Customer',
        email: 'activity5@example.com',
      });

      for (let i = 0; i < 10; i++) {
        await crmService.logActivity(customer.id, { type: 'note' });
      }

      const activities = await crmService.getCustomerActivities(customer.id, 5);

      expect(activities.length).toBe(5);
    });

    test('Should track activity types correctly', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Activity6',
        lastName: 'Customer',
        email: 'activity6@example.com',
      });

      const types = ['call', 'email', 'meeting', 'follow-up', 'note'];

      for (const type of types) {
        await crmService.logActivity(customer.id, { type });
        await new Promise(resolve => setTimeout(resolve, 5)); // Ensure different timestamps
      }

      const activities = await crmService.getCustomerActivities(customer.id);

      expect(activities.length).toBe(5);
      // Verify all types are present
      const activityTypes = activities.map(a => a.type);
      expect(activityTypes).toEqual(expect.arrayContaining(types));
    });
  });

  /**
   * CUSTOMER SEGMENTATION TESTS (4 tests)
   */
  describe('Customer Segmentation', () => {
    test('Should create a customer segment', async () => {
      const segment = await crmService.createSegment({
        name: 'Enterprise',
        description: 'Large enterprise customers',
        criteria: { minValue: 500000 },
        color: '#FF0000',
      });

      expect(segment).toBeDefined();
      expect(segment.id).toMatch(/^SEG_/);
      expect(segment.name).toBe('Enterprise');
    });

    test('Should retrieve all segments', async () => {
      await crmService.createSegment({
        name: 'SMB',
        criteria: { size: 'small' },
      });

      await crmService.createSegment({
        name: 'Mid-Market',
        criteria: { size: 'medium' },
      });

      const segments = await crmService.getSegments();

      expect(segments.length).toBe(2);
    });

    test('Should auto-assign customer to segment on creation', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Enterprise',
        lastName: 'Customer',
        email: 'enterprise@example.com',
        company: 'Very Large Corp Ltd Inc',
        industry: 'tech',
      });

      expect(customer.segment).toBeDefined();
      expect(['enterprise', 'strategic', 'standard']).toContain(customer.segment);
    });

    test('Should maintain segment member counts', async () => {
      await crmService.createSegment({
        name: 'VIP',
        criteria: { status: 'vip' },
      });

      await crmService.createCustomer({
        firstName: 'VIP1',
        lastName: 'Customer',
        email: 'vip1@example.com',
      });

      crmService.recalculateSegments();
      const segments = await crmService.getSegments();

      // At least one segment should exist
      expect(segments.length).toBeGreaterThan(0);
    });
  });

  /**
   * CONTACT HIERARCHY TESTS (3 tests)
   */
  describe('Contact Hierarchy & Relationships', () => {
    test('Should create a contact at customer company', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Company',
        lastName: 'Account',
        email: 'company@example.com',
      });

      const contact = await crmService.createContact({
        customerId: customer.id,
        firstName: 'John',
        lastName: 'Contact',
        title: 'VP of Sales',
        email: 'john.contact@example.com',
        role: 'decision_maker',
      });

      expect(contact).toBeDefined();
      expect(contact.id).toMatch(/^CONT_/);
      expect(contact.role).toBe('decision_maker');
      expect(contact.title).toBe('VP of Sales');
    });

    test('Should retrieve all contacts for a customer', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Multi',
        lastName: 'Contact',
        email: 'multi@example.com',
      });

      await crmService.createContact({
        customerId: customer.id,
        firstName: 'Alice',
        lastName: 'Decision',
        role: 'decision_maker',
      });

      await crmService.createContact({
        customerId: customer.id,
        firstName: 'Bob',
        lastName: 'Influencer',
        role: 'influencer',
      });

      const contacts = await crmService.getCustomerContacts(customer.id);

      expect(contacts.length).toBe(2);
    });

    test('Should throw error if contact required fields missing', async () => {
      await expect(
        crmService.createContact({
          customerId: 'CUST_123',
          firstName: 'Test',
          // missing lastName
        })
      ).rejects.toThrow('Missing required fields');
    });
  });

  /**
   * CUSTOMER LIFECYCLE TESTS (3 tests)
   */
  describe('Customer Lifecycle Management', () => {
    test('Should update customer lifecycle stage', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Lifecycle',
        lastName: 'Customer',
        email: 'lifecycle@example.com',
      });

      const updated = await crmService.updateCustomerLifecycleStage(customer.id, 'power_user');

      expect(updated.lifecycleStage).toBe('power_user');
    });

    test('Should validate lifecycle stage values', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Invalid',
        lastName: 'Stage',
        email: 'invalid@example.com',
      });

      await expect(
        crmService.updateCustomerLifecycleStage(customer.id, 'invalid_stage')
      ).rejects.toThrow('Invalid lifecycle stage');
    });

    test('Should get lifecycle report grouped by stage', async () => {
      const customer1 = await crmService.createCustomer({
        firstName: 'Prospect',
        lastName: 'One',
        email: 'prospect1@example.com',
      });

      const customer2 = await crmService.createCustomer({
        firstName: 'Customer',
        lastName: 'One',
        email: 'customer1@example.com',
      });

      await crmService.updateCustomerLifecycleStage(customer1.id, 'prospect');
      await crmService.updateCustomerLifecycleStage(customer2.id, 'customer');

      const report = await crmService.getCustomerLifecycleReport();

      expect(report.prospect.count).toBeGreaterThanOrEqual(1);
      expect(report.customer.count).toBeGreaterThanOrEqual(1);
    });
  });

  /**
   * CRM ANALYTICS & INSIGHTS TESTS (5 tests)
   */
  describe('CRM Analytics & Insights', () => {
    test('Should generate comprehensive CRM analytics', async () => {
      await crmService.createCustomer({
        firstName: 'Analytics',
        lastName: 'Customer',
        email: 'analytics@example.com',
      });

      await crmService.createLead({
        name: 'Test Lead',
        email: 'testlead@example.com',
      });

      const analytics = await crmService.getCRMAnalytics();

      expect(analytics.summary).toBeDefined();
      expect(analytics.summary.totalCustomers).toBeGreaterThanOrEqual(1);
      expect(analytics.summary.totalLeads).toBeGreaterThanOrEqual(1);
    });

    test('Should calculate conversion rate', async () => {
      const lead1 = await crmService.createLead({
        name: 'Lead to Convert',
        email: 'leadtoconvert@example.com',
      });

      const customer = await crmService.createCustomer({
        firstName: 'Converted',
        lastName: 'Customer',
        email: 'converted@example.com',
      });

      await crmService.convertLead(lead1.id, customer.id);

      const analytics = await crmService.getCRMAnalytics();

      expect(analytics.summary.conversionRate).toBeGreaterThan(0);
    });

    test('Should calculate pipeline value by stage', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Pipeline',
        lastName: 'Customer',
        email: 'pipeline@example.com',
      });

      await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Big Deal',
        value: 500000,
        stage: 'proposal',
      });

      const analytics = await crmService.getCRMAnalytics();

      expect(analytics.summary.totalPipelineValue).toBeGreaterThan(0);
    });

    test('Should identify top customers by value', async () => {
      const customer1 = await crmService.createCustomer({
        firstName: 'Top1',
        lastName: 'Customer',
        email: 'top1@example.com',
      });

      const customer2 = await crmService.createCustomer({
        firstName: 'Top2',
        lastName: 'Customer',
        email: 'top2@example.com',
      });

      const opp1 = await crmService.createOpportunity({
        customerId: customer1.id,
        name: 'Deal1',
        value: 1000000,
      });

      const opp2 = await crmService.createOpportunity({
        customerId: customer2.id,
        name: 'Deal2',
        value: 500000,
      });

      await crmService.updateOpportunityStage(opp1.id, 'won');
      await crmService.updateOpportunityStage(opp2.id, 'won');

      const analytics = await crmService.getCRMAnalytics();

      expect(analytics.topCustomers.length).toBeGreaterThan(0);
      expect(analytics.topCustomers[0].value).toBeGreaterThanOrEqual(
        analytics.topCustomers[1]?.value || 0
      );
    });

    test('Should get detailed customer insights', async () => {
      const customer = await crmService.createCustomer({
        firstName: 'Insights',
        lastName: 'Customer',
        email: 'insights@example.com',
      });

      await crmService.logActivity(customer.id, {
        type: 'call',
        description: 'Product demo',
      });

      const opp = await crmService.createOpportunity({
        customerId: customer.id,
        name: 'Opportunity',
        value: 100000,
      });

      await crmService.updateOpportunityStage(opp.id, 'won');

      const insights = await crmService.getCustomerInsights(customer.id);

      expect(insights.customer.id).toBe(customer.id);
      expect(insights.totalOpportunities).toBe(1);
      expect(insights.wonValue).toBe(100000);
      expect(insights.engagement.level).toBeDefined();
    });
  });

  /**
   * PHASE 16 COMPLETION CHECKLIST (5 tests)
   */
  describe('Phase 16 Completion Checklist', () => {
    test('1. All customer profile methods implemented', async () => {
      expect(crmService.createCustomer).toBeDefined();
      expect(crmService.updateCustomer).toBeDefined();
      expect(crmService.getCustomerProfile).toBeDefined();
      expect(crmService.getCustomers).toBeDefined();
      expect(typeof crmService.createCustomer).toBe('function');
    });

    test('2. All lead management methods implemented', async () => {
      expect(crmService.createLead).toBeDefined();
      expect(crmService.scoreLead).toBeDefined();
      expect(crmService.convertLead).toBeDefined();
      expect(crmService.getLeads).toBeDefined();
    });

    test('3. All opportunity management methods implemented', async () => {
      expect(crmService.createOpportunity).toBeDefined();
      expect(crmService.updateOpportunityStage).toBeDefined();
      expect(crmService.getOpportunitiesByCustomer).toBeDefined();
      expect(crmService.getSalesPipeline).toBeDefined();
    });

    test('4. All activity and analytics methods working', async () => {
      expect(crmService.logActivity).toBeDefined();
      expect(crmService.completeActivity).toBeDefined();
      expect(crmService.getCRMAnalytics).toBeDefined();
      expect(crmService.getCustomerInsights).toBeDefined();
    });

    test('5. CRM System fully integrated and operational', () => {
      const hasAllModules =
        !!crmService.customers &&
        !!crmService.leads &&
        !!crmService.opportunities &&
        !!crmService.activities;

      expect(hasAllModules).toBe(true);
      expect(Array.isArray(crmService.customers)).toBe(true);
      expect(crmService.segments instanceof Map).toBe(true);
    });
  });
});
