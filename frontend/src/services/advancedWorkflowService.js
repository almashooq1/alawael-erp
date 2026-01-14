/**
 * Advanced Workflow Service - Clean Version
 * نظام إدارة سير العمل والمصادقات المتقدم
 *
 * API Integration Layer - Connects to Backend APIs
 */

import axios from 'axios';

class AdvancedWorkflowService {
  constructor() {
    this.apiBaseUrl = '/api';
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(config) {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/workflows`,
        {
          templateId: config.templateId,
          title: config.title,
          description: config.description,
          metadata: config.metadata,
          priority: config.priority,
          category: config.category,
        },
        { headers: this.getAuthHeaders() },
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error('Failed to create workflow');
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  /**
   * Get all workflows with filters
   */
  async getWorkflows(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${this.apiBaseUrl}/workflows?${params.toString()}`, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error('Failed to get workflows');
    } catch (error) {
      console.error('Error getting workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(workflowId) {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/workflows/${workflowId}`, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error('Workflow not found');
    } catch (error) {
      console.error('Error getting workflow:', error);
      throw error;
    }
  }

  /**
   * Process approval/rejection
   */
  async processApproval(workflowId, stageId, approvalData) {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/workflows/${workflowId}/approve`,
        {
          stageId,
          decision: approvalData.decision,
          comments: approvalData.comments,
          attachments: approvalData.attachments,
          signatureId: approvalData.signatureId,
        },
        { headers: this.getAuthHeaders() },
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error('Failed to process approval');
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  /**
   * Delegate workflow to another user
   */
  async delegateWorkflow(workflowId, stageId, delegateToUserId, reason) {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/workflows/${workflowId}/delegate`,
        {
          stageId,
          delegateToUserId,
          reason,
        },
        { headers: this.getAuthHeaders() },
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error('Failed to delegate workflow');
    } catch (error) {
      console.error('Error delegating workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow analytics
   */
  async getWorkflowAnalytics(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${this.apiBaseUrl}/analytics?${params.toString()}`, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error('Failed to get analytics');
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Get workflow templates
   */
  async getTemplates() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/templates`, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error('Failed to get templates');
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * Get audit log
   */
  async getAuditLog(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${this.apiBaseUrl}/audit-log?${params.toString()}`, { headers: this.getAuthHeaders() });

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error('Failed to get audit log');
    } catch (error) {
      console.error('Error getting audit log:', error);
      throw error;
    }
  }
}

const advancedWorkflowServiceInstance = new AdvancedWorkflowService();
export default advancedWorkflowServiceInstance;
