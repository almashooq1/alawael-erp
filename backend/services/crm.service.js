/**
 * ALAWAEL ERP - ADVANCED CRM & CUSTOMER MANAGEMENT SERVICE
 * Customer Profiles, Lead Management, Opportunity Tracking, Analytics
 * Phase 16 - Advanced CRM & Customer Management
 *
 * Features:
 * - Customer profile management with segmentation
 * - Lead management and lead scoring
 * - Opportunity tracking and pipeline management
 * - Customer activity history and interaction tracking
 * - Contact hierarchy and relationship management
 * - Customer lifecycle management
 * - CRM analytics and insights
 */

class CRMService {
  constructor() {
    this.customers = [];
    this.leads = [];
    this.opportunities = [];
    this.activities = [];
    this.segments = new Map();
    this.interactions = [];
    this.contactHierarchy = [];
  }

  /**
   * CUSTOMER PROFILE MANAGEMENT
   */

  async createCustomer(customerData) {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        company,
        industry,
        website,
        address,
        city,
        state,
        country,
        zipCode,
        customProperties = {},
      } = customerData;

      if (!firstName || !lastName || !email) {
        throw new Error('Missing required fields: firstName, lastName, email');
      }

      const customer = {
        id: `CUST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email,
        phone,
        company,
        industry,
        website,
        address: {
          street: address,
          city,
          state,
          country,
          zipCode,
        },
        status: 'active',
        segment: this.determineSegment(company, industry),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastInteraction: null,
        totalValue: 0,
        lifetime: 0,
        interactionCount: 0,
        customProperties,
        tags: [],
      };

      this.customers.push(customer);
      return customer;
    } catch (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async updateCustomer(customerId, updates) {
    try {
      const customer = this.customers.find((c) => c.id === customerId);
      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      Object.assign(customer, updates, { updatedAt: new Date() });
      return customer;
    } catch (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  async getCustomerProfile(customerId) {
    try {
      const customer = this.customers.find((c) => c.id === customerId);
      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      const relatedOpportunities = this.opportunities.filter(
        (o) => o.customerId === customerId
      );
      const relatedActivities = this.activities.filter((a) => a.customerId === customerId);

      return {
        ...customer,
        opportunities: relatedOpportunities,
        activities: relatedActivities,
        totalOpportunities: relatedOpportunities.length,
        totalActivities: relatedActivities.length,
        opportunityValue: relatedOpportunities.reduce((sum, o) => sum + o.value, 0),
      };
    } catch (error) {
      throw new Error(`Failed to get customer profile: ${error.message}`);
    }
  }

  async getCustomers(filters = {}) {
    try {
      let results = [...this.customers];

      if (filters.segment) {
        results = results.filter((c) => c.segment === filters.segment);
      }
      if (filters.industry) {
        results = results.filter((c) => c.industry === filters.industry);
      }
      if (filters.status) {
        results = results.filter((c) => c.status === filters.status);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        results = results.filter(
          (c) =>
            c.fullName.toLowerCase().includes(search) ||
            c.email.toLowerCase().includes(search) ||
            (c.company && c.company.toLowerCase().includes(search))
        );
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to get customers: ${error.message}`);
    }
  }

  /**
   * LEAD MANAGEMENT
   */

  async createLead(leadData) {
    try {
      const { name, email, phone, company, source, status = 'new', score = 0 } = leadData;

      if (!name || !email) {
        throw new Error('Missing required fields: name, email');
      }

      const lead = {
        id: `LEAD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        email,
        phone,
        company,
        source,
        status,
        score,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastContacted: null,
        convertedAt: null,
        convertedTo: null,
        interactions: 0,
        followUps: [],
        tags: [],
      };

      this.leads.push(lead);
      return lead;
    } catch (error) {
      throw new Error(`Failed to create lead: ${error.message}`);
    }
  }

  async scoreLead(leadId, scoreData) {
    try {
      const lead = this.leads.find((l) => l.id === leadId);
      if (!lead) {
        throw new Error(`Lead ${leadId} not found`);
      }

      const {
        engagementScore = 0,
        fitScore = 0,
        behavioralScore = 0,
        activityScore = 0,
      } = scoreData;

      const totalScore = engagementScore + fitScore + behavioralScore + activityScore;
      lead.score = Math.min(totalScore, 100);
      lead.updatedAt = new Date();

      // Auto promote hot leads
      if (lead.score >= 80 && lead.status !== 'qualified') {
        lead.status = 'qualified';
      }

      return lead;
    } catch (error) {
      throw new Error(`Failed to score lead: ${error.message}`);
    }
  }

  async convertLead(leadId, customerId) {
    try {
      const lead = this.leads.find((l) => l.id === leadId);
      if (!lead) {
        throw new Error(`Lead ${leadId} not found`);
      }

      lead.status = 'converted';
      lead.convertedAt = new Date();
      lead.convertedTo = customerId;

      return lead;
    } catch (error) {
      throw new Error(`Failed to convert lead: ${error.message}`);
    }
  }

  async getLeads(filters = {}) {
    try {
      let results = [...this.leads];

      if (filters.status) {
        results = results.filter((l) => l.status === filters.status);
      }
      if (filters.source) {
        results = results.filter((l) => l.source === filters.source);
      }
      if (filters.minScore !== undefined) {
        results = results.filter((l) => l.score >= filters.minScore);
      }

      return results.sort((a, b) => b.score - a.score);
    } catch (error) {
      throw new Error(`Failed to get leads: ${error.message}`);
    }
  }

  /**
   * OPPORTUNITY MANAGEMENT
   */

  async createOpportunity(opportunityData) {
    try {
      const {
        customerId,
        name,
        description,
        value,
        stage,
        expectedCloseDate,
        probability = 0,
      } = opportunityData;

      if (!customerId || !name || !value) {
        throw new Error('Missing required fields: customerId, name, value');
      }

      const opportunity = {
        id: `OPP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId,
        name,
        description,
        value,
        stage: stage || 'prospecting',
        expectedCloseDate,
        probability,
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        won: false,
        lost: false,
        lossReason: null,
        notes: [],
        activities: [],
      };

      this.opportunities.push(opportunity);
      return opportunity;
    } catch (error) {
      throw new Error(`Failed to create opportunity: ${error.message}`);
    }
  }

  async updateOpportunityStage(opportunityId, newStage) {
    try {
      const opp = this.opportunities.find((o) => o.id === opportunityId);
      if (!opp) {
        throw new Error(`Opportunity ${opportunityId} not found`);
      }

      const stageProgression = [
        'prospecting',
        'qualification',
        'proposal',
        'negotiation',
        'closing',
        'won',
        'lost',
      ];

      if (!stageProgression.includes(newStage)) {
        throw new Error(`Invalid stage: ${newStage}`);
      }

      opp.stage = newStage;
      opp.updatedAt = new Date();

      if (newStage === 'won') {
        opp.won = true;
        opp.closedAt = new Date();
      } else if (newStage === 'lost') {
        opp.lost = true;
        opp.closedAt = new Date();
      }

      return opp;
    } catch (error) {
      throw new Error(`Failed to update opportunity stage: ${error.message}`);
    }
  }

  async getOpportunitiesByCustomer(customerId) {
    try {
      const opps = this.opportunities.filter((o) => o.customerId === customerId);
      const total = opps.reduce((sum, o) => sum + o.value, 0);
      const won = opps.filter((o) => o.won).reduce((sum, o) => sum + o.value, 0);

      return {
        opportunities: opps,
        totalValue: total,
        wonValue: won,
        winRate: opps.length > 0 ? (won / total) * 100 : 0,
      };
    } catch (error) {
      throw new Error(`Failed to get opportunities: ${error.message}`);
    }
  }

  async getSalesPipeline() {
    try {
      const stages = [
        'prospecting',
        'qualification',
        'proposal',
        'negotiation',
        'closing',
      ];
      const pipeline = {};

      stages.forEach((stage) => {
        const opps = this.opportunities.filter((o) => o.stage === stage && !o.lost);
        pipeline[stage] = {
          count: opps.length,
          value: opps.reduce((sum, o) => sum + o.value, 0),
          opportunities: opps,
        };
      });

      return pipeline;
    } catch (error) {
      throw new Error(`Failed to get sales pipeline: ${error.message}`);
    }
  }

  /**
   * ACTIVITY & INTERACTION MANAGEMENT
   */

  async logActivity(customerId, activityData) {
    try {
      const { type, description, createdBy, dueDate } = activityData;

      if (!customerId || !type) {
        throw new Error('Missing required fields: customerId, type');
      }

      const activity = {
        id: `ACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId,
        type,
        description,
        createdBy,
        dueDate,
        completedAt: null,
        completed: false,
        createdAt: new Date(),
        reminders: [],
      };

      this.activities.push(activity);

      // Update customer last interaction
      const customer = this.customers.find((c) => c.id === customerId);
      if (customer) {
        customer.lastInteraction = new Date();
        customer.interactionCount = (customer.interactionCount || 0) + 1;
      }

      return activity;
    } catch (error) {
      throw new Error(`Failed to log activity: ${error.message}`);
    }
  }

  async completeActivity(activityId) {
    try {
      const activity = this.activities.find((a) => a.id === activityId);
      if (!activity) {
        throw new Error(`Activity ${activityId} not found`);
      }

      activity.completed = true;
      activity.completedAt = new Date();
      return activity;
    } catch (error) {
      throw new Error(`Failed to complete activity: ${error.message}`);
    }
  }

  async getCustomerActivities(customerId, limit = 50) {
    try {
      const activities = this.activities
        .filter((a) => a.customerId === customerId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);

      return activities;
    } catch (error) {
      throw new Error(`Failed to get customer activities: ${error.message}`);
    }
  }

  /**
   * CUSTOMER SEGMENTATION
   */

  async createSegment(segmentData) {
    try {
      const { name, description, criteria, color } = segmentData;

      if (!name || !criteria) {
        throw new Error('Missing required fields: name, criteria');
      }

      const segment = {
        id: `SEG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        criteria,
        color,
        createdAt: new Date(),
        memberCount: 0,
      };

      this.segments.set(segment.id, segment);
      this.recalculateSegments();
      return segment;
    } catch (error) {
      throw new Error(`Failed to create segment: ${error.message}`);
    }
  }

  async getSegments() {
    try {
      return Array.from(this.segments.values());
    } catch (error) {
      throw new Error(`Failed to get segments: ${error.message}`);
    }
  }

  determineSegment(company, industry) {
    if (company && company.length > 100) return 'enterprise';
    if (industry && ['tech', 'finance', 'healthcare'].includes(industry.toLowerCase()))
      return 'strategic';
    return 'standard';
  }

  recalculateSegments() {
    this.segments.forEach((segment) => {
      segment.memberCount = this.customers.filter((c) => c.segment === segment.name).length;
    });
  }

  /**
   * CRM ANALYTICS & INSIGHTS
   */

  async getCRMAnalytics() {
    try {
      const totalCustomers = this.customers.length;
      const totalLeads = this.leads.length;
      const convertedLeads = this.leads.filter((l) => l.status === 'converted').length;
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      const opportunities = this.opportunities.filter((o) => !o.lost);
      const totalPipelineValue = opportunities.reduce((sum, o) => sum + o.value, 0);
      const wonOpportunities = this.opportunities.filter((o) => o.won);
      const totalRevenue = wonOpportunities.reduce((sum, o) => sum + o.value, 0);

      const avgDealSize = opportunities.length > 0 ? totalPipelineValue / opportunities.length : 0;
      const winRate = this.opportunities.length > 0
        ? (wonOpportunities.length / this.opportunities.length) * 100
        : 0;

      const customerLifetimeValue = this.customers.reduce(
        (sum, c) => sum + (this.opportunities.filter((o) => o.customerId === c.id && o.won)
          .reduce((s, o) => s + o.value, 0) || 0),
        0
      );

      const avgCustomerValue = totalCustomers > 0 ? customerLifetimeValue / totalCustomers : 0;

      const topCustomers = this.customers
        .map((c) => ({
          ...c,
          value: this.opportunities
            .filter((o) => o.customerId === c.id && o.won)
            .reduce((sum, o) => sum + o.value, 0),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const hotLeads = this.leads
        .filter((l) => l.status !== 'converted' && l.score >= 80)
        .sort((a, b) => b.score - a.score);

      return {
        summary: {
          totalCustomers,
          totalLeads,
          conversionRate: parseFloat(conversionRate.toFixed(2)),
          totalPipelineValue,
          totalRevenue,
          avgDealSize: parseFloat(avgDealSize.toFixed(2)),
          winRate: parseFloat(winRate.toFixed(2)),
          avgCustomerValue: parseFloat(avgCustomerValue.toFixed(2)),
        },
        topCustomers,
        hotLeads,
        pipelineByStage: await this.getSalesPipeline(),
      };
    } catch (error) {
      throw new Error(`Failed to get CRM analytics: ${error.message}`);
    }
  }

  async getCustomerInsights(customerId) {
    try {
      const customer = this.customers.find((c) => c.id === customerId);
      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      const relatedOpportunities = this.opportunities.filter(
        (o) => o.customerId === customerId
      );
      const activities = this.activities.filter((a) => a.customerId === customerId);

      const totalValue = relatedOpportunities.reduce((sum, o) => sum + o.value, 0);
      const wonValue = relatedOpportunities
        .filter((o) => o.won)
        .reduce((sum, o) => sum + o.value, 0);
      const avgResponseTime = activities.length > 0
        ? activities.reduce((sum, a) => sum + (a.completedAt - a.createdAt || 0), 0) /
          activities.length
        : 0;

      return {
        customer,
        totalOpportunities: relatedOpportunities.length,
        totalValue,
        wonValue,
        winRate: relatedOpportunities.length > 0 ? (wonValue / totalValue) * 100 : 0,
        totalActivities: activities.length,
        avgResponseTime,
        lastFiveActivities: activities.slice(-5).reverse(),
        engagement: {
          level: activities.length > 10 ? 'high' : activities.length > 5 ? 'medium' : 'low',
          score: Math.min((activities.length / 10) * 100, 100),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get customer insights: ${error.message}`);
    }
  }

  /**
   * CONTACT HIERARCHY & RELATIONSHIPS
   */

  async createContact(contactData) {
    try {
      const { customerId, firstName, lastName, title, email, phone, role } = contactData;

      if (!customerId || !firstName || !lastName) {
        throw new Error('Missing required fields: customerId, firstName, lastName');
      }

      const contact = {
        id: `CONT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        title,
        email,
        phone,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastInteraction: null,
        influenceLevel: 0,
      };

      this.contactHierarchy.push(contact);
      return contact;
    } catch (error) {
      throw new Error(`Failed to create contact: ${error.message}`);
    }
  }

  async getCustomerContacts(customerId) {
    try {
      const contacts = this.contactHierarchy.filter((c) => c.customerId === customerId);
      return contacts;
    } catch (error) {
      throw new Error(`Failed to get customer contacts: ${error.message}`);
    }
  }

  /**
   * CUSTOMER LIFECYCLE MANAGEMENT
   */

  async updateCustomerLifecycleStage(customerId, stage) {
    try {
      const customer = this.customers.find((c) => c.id === customerId);
      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      const validStages = [
        'prospect',
        'customer',
        'power_user',
        'advocate',
        'at_risk',
        'inactive',
      ];
      if (!validStages.includes(stage)) {
        throw new Error(`Invalid lifecycle stage: ${stage}`);
      }

      customer.lifecycleStage = stage;
      customer.updatedAt = new Date();

      return customer;
    } catch (error) {
      throw new Error(`Failed to update lifecycle stage: ${error.message}`);
    }
  }

  async getCustomerLifecycleReport() {
    try {
      const stages = [
        'prospect',
        'customer',
        'power_user',
        'advocate',
        'at_risk',
        'inactive',
      ];
      const report = {};

      stages.forEach((stage) => {
        const customers = this.customers.filter((c) => c.lifecycleStage === stage);
        report[stage] = {
          count: customers.length,
          customers: customers,
          avgValue: customers.length > 0
            ? customers.reduce((sum, c) => sum + (c.totalValue || 0), 0) / customers.length
            : 0,
        };
      });

      return report;
    } catch (error) {
      throw new Error(`Failed to get lifecycle report: ${error.message}`);
    }
  }
}

module.exports = new CRMService();
