// backend/services/incidentService.js
// خدمة إدارة الحوادث الشاملة
// Comprehensive Incident Management Service

const Incident = require('../models/Incident');
const logger = require('../utils/logger');

class IncidentService {
  // 1. إنشاء حادثة جديدة
  async createIncident(incidentData, userId) {
    try {
      logger.info('Creating new incident', { userId });

      const incident = new Incident({
        ...incidentData,
        'discoveryInfo.discoveredBy': userId,
        'auditInfo.createdBy': userId,
        'auditInfo.ipAddress': incidentData.ipAddress
      });

      incident.generateIncidentNumber();
      await incident.save();

      logger.info('Incident created successfully', {
        incidentNumber: incident.incidentNumber,
        userId
      });

      return incident;
    } catch (error) {
      logger.error('Error creating incident', { error: error.message });
      throw error;
    }
  }

  // 2. الحصول على جميع الحوادث
  async getAllIncidents(filters = {}, page = 1, limit = 20) {
    try {
      const query = {};

      if (filters.status) query.status = filters.status;
      if (filters.severity) query.severity = filters.severity;
      if (filters.category) query.category = filters.category;
      if (filters.priority) query.priority = filters.priority;
      if (filters.searchText) {
        query.$text = { $search: filters.searchText };
      }
      if (filters.departmentId) {
        query['organizationInfo.departmentId'] = filters.departmentId;
      }

      const skip = (page - 1) * limit;
      const incidents = await Incident.find(query)
        .sort({ 'discoveryInfo.discoveredAt': -1 })
        .skip(skip)
        .limit(limit)
        .populate('discoveryInfo.discoveredBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('auditInfo.createdBy', 'name email');

      const total = await Incident.countDocuments(query);

      logger.info('Fetched incidents', {
        total,
        page,
        limit,
        filters
      });

      return {
        incidents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching incidents', { error: error.message });
      throw error;
    }
  }

  // 3. الحصول على حادثة بواسطة ID
  async getIncidentById(incidentId) {
    try {
      const incident = await Incident.findById(incidentId)
        .populate('discoveryInfo.discoveredBy', 'name email')
        .populate('responders.employeeId', 'name email')
        .populate('assignedTo', 'name email')
        .populate('teamLead', 'name email')
        .populate('escalations.escalatedTo', 'name email')
        .populate('resolution.resolvedBy', 'name email')
        .populate('resolution.verifiedBy', 'name email')
        .populate('closure.closedBy', 'name email')
        .populate('auditInfo.createdBy', 'name email')
        .populate('auditInfo.lastModifiedBy', 'name email');

      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      logger.info('Fetched incident details', {
        incidentNumber: incident.incidentNumber
      });

      return incident;
    } catch (error) {
      logger.error('Error fetching incident', { error: error.message });
      throw error;
    }
  }

  // 4. تحديث حادثة
  async updateIncident(incidentId, updateData, userId) {
    try {
      logger.info('Updating incident', { incidentId, userId });

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      // تحديث البيانات
      Object.assign(incident, updateData);
      incident.auditInfo.lastModifiedBy = userId;
      incident.auditInfo.lastModifiedAt = new Date();

      await incident.save();

      logger.info('Incident updated successfully', {
        incidentNumber: incident.incidentNumber,
        userId
      });

      return incident;
    } catch (error) {
      logger.error('Error updating incident', { error: error.message });
      throw error;
    }
  }

  // 5. حذف حادثة
  async deleteIncident(incidentId, userId) {
    try {
      logger.info('Deleting incident', { incidentId, userId });

      const incident = await Incident.findByIdAndDelete(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      logger.info('Incident deleted successfully', {
        incidentNumber: incident.incidentNumber,
        userId
      });

      return { message: 'تم حذف الحادثة بنجاح' };
    } catch (error) {
      logger.error('Error deleting incident', { error: error.message });
      throw error;
    }
  }

  // 6. تحديث حالة الحادثة
  async updateIncidentStatus(incidentId, newStatus, userId, notes = '') {
    try {
      logger.info('Updating incident status', {
        incidentId,
        newStatus,
        userId
      });

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      incident.updateStatus(newStatus, userId);

      // إضافة الملاحظات إلى الجدول الزمني
      if (notes) {
        incident.timeline.push({
          timestamp: new Date(),
          eventType: 'STATUS_CHANGE',
          description: notes,
          performedBy: userId
        });
      }

      await incident.save();

      logger.info('Incident status updated', {
        incidentNumber: incident.incidentNumber,
        newStatus
      });

      return incident;
    } catch (error) {
      logger.error('Error updating incident status', { error: error.message });
      throw error;
    }
  }

  // 7. إسناد الحادثة إلى فريق
  async assignIncident(incidentId, assignedToIds, teamLeadId, userId) {
    try {
      logger.info('Assigning incident', {
        incidentId,
        assignedToIds,
        userId
      });

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      incident.assignedTo = assignedToIds;
      incident.teamLead = teamLeadId;

      incident.timeline.push({
        timestamp: new Date(),
        eventType: 'ASSIGNED',
        description: `تم إسناد الحادثة إلى فريق من ${assignedToIds.length} أشخاص`,
        performedBy: userId,
        details: { assignedToIds, teamLeadId }
      });

      await incident.save();

      logger.info('Incident assigned', {
        incidentNumber: incident.incidentNumber
      });

      return incident;
    } catch (error) {
      logger.error('Error assigning incident', { error: error.message });
      throw error;
    }
  }

  // 8. إضافة مستجيب إلى الحادثة
  async addResponder(incidentId, responderData, userId) {
    try {
      logger.info('Adding responder to incident', {
        incidentId,
        userId
      });

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      incident.addResponder({
        ...responderData,
        assignedBy: userId,
        assignedAt: new Date()
      });

      incident.timeline.push({
        timestamp: new Date(),
        eventType: 'RESPONDER_ADDED',
        description: `تم إضافة مستجيب: ${responderData.name} بدور ${responderData.role}`,
        performedBy: userId
      });

      await incident.save();

      logger.info('Responder added', {
        incidentNumber: incident.incidentNumber
      });

      return incident;
    } catch (error) {
      logger.error('Error adding responder', { error: error.message });
      throw error;
    }
  }

  // 9. تصعيد الحادثة
  async escalateIncident(incidentId, escalationData, userId) {
    try {
      logger.info('Escalating incident', {
        incidentId,
        userId
      });

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      incident.isEscalated = true;
      incident.currentEscalationLevel = incident.escalations.length + 1;

      incident.escalations.push({
        escalationLevel: incident.currentEscalationLevel,
        escalatedTo: escalationData.escalatedTo,
        escalatedBy: userId,
        escalationReason: escalationData.reason,
        escalationNotes: escalationData.notes,
        status: 'PENDING'
      });

      incident.timeline.push({
        timestamp: new Date(),
        eventType: 'ESCALATED',
        description: `تم تصعيد الحادثة إلى المستوى ${incident.currentEscalationLevel}`,
        performedBy: userId,
        details: escalationData
      });

      await incident.save();

      logger.info('Incident escalated', {
        incidentNumber: incident.incidentNumber,
        escalationLevel: incident.currentEscalationLevel
      });

      return incident;
    } catch (error) {
      logger.error('Error escalating incident', { error: error.message });
      throw error;
    }
  }

  // 10. إضافة التعليقات
  async addComment(incidentId, commentData, userId) {
    try {
      logger.info('Adding comment to incident', {
        incidentId,
        userId
      });

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      incident.addComment({
        userId,
        ...commentData,
        timestamp: new Date()
      });

      incident.timeline.push({
        timestamp: new Date(),
        eventType: 'COMMENT_ADDED',
        description: `تم إضافة تعليق: ${commentData.comment.substring(0, 50)}...`,
        performedBy: userId
      });

      await incident.save();

      logger.info('Comment added', {
        incidentNumber: incident.incidentNumber
      });

      return incident;
    } catch (error) {
      logger.error('Error adding comment', { error: error.message });
      throw error;
    }
  }

  // 11. إضافة المرفقات
  async addAttachment(incidentId, attachmentData, userId) {
    try {
      logger.info('Adding attachment to incident', {
        incidentId,
        userId
      });

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      incident.addAttachment({
        ...attachmentData,
        uploadedBy: userId,
        uploadedAt: new Date()
      });

      incident.timeline.push({
        timestamp: new Date(),
        eventType: 'ATTACHMENT_ADDED',
        description: `تم إضافة مرفق: ${attachmentData.fileName}`,
        performedBy: userId
      });

      await incident.save();

      logger.info('Attachment added', {
        incidentNumber: incident.incidentNumber
      });

      return incident;
    } catch (error) {
      logger.error('Error adding attachment', { error: error.message });
      throw error;
    }
  }

  // 12. تسجيل الحل
  async resolveIncident(incidentId, resolutionData, userId) {
    try {
      logger.info('Resolving incident', {
        incidentId,
        userId
      });

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      incident.resolution = {
        ...resolutionData,
        resolvedBy: userId,
        resolvedAt: new Date()
      };

      incident.updateStatus('RESOLVED', userId);

      incident.timeline.push({
        timestamp: new Date(),
        eventType: 'RESOLVED',
        description: `تم حل الحادثة: ${resolutionData.solution}`,
        performedBy: userId
      });

      incident.calculateMetrics();
      incident.checkSLABreach();

      await incident.save();

      logger.info('Incident resolved', {
        incidentNumber: incident.incidentNumber,
        resolutionTime: incident.metrics.timeToResolve
      });

      return incident;
    } catch (error) {
      logger.error('Error resolving incident', { error: error.message });
      throw error;
    }
  }

  // 13. إغلاق الحادثة
  async closeIncident(incidentId, closureData, userId) {
    try {
      logger.info('Closing incident', {
        incidentId,
        userId
      });

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      incident.closure = {
        ...closureData,
        closedBy: userId,
        closedAt: new Date()
      };

      incident.updateStatus('CLOSED', userId);

      incident.timeline.push({
        timestamp: new Date(),
        eventType: 'CLOSED',
        description: `تم إغلاق الحادثة - السبب: ${closureData.closureReason}`,
        performedBy: userId
      });

      await incident.save();

      logger.info('Incident closed', {
        incidentNumber: incident.incidentNumber
      });

      return incident;
    } catch (error) {
      logger.error('Error closing incident', { error: error.message });
      throw error;
    }
  }

  // 14. توليد تقرير الحادثة
  async generateIncidentReport(incidentId) {
    try {
      logger.info('Generating incident report', { incidentId });

      const incident = await this.getIncidentById(incidentId);

      const report = {
        incidentNumber: incident.incidentNumber,
        title: incident.title,
        severity: incident.severity,
        category: incident.category,
        status: incident.status,
        discoveredAt: incident.discoveryInfo.discoveredAt,
        resolvedAt: incident.resolution?.resolvedAt,
        metrics: incident.metrics,
        sla: incident.sla,
        rootCause: incident.resolution?.rootCause,
        solution: incident.resolution?.solution,
        lessonsLearned: incident.postMortem?.lessonsLearned,
        responders: incident.responders.map(r => ({
          name: r.name,
          role: r.role,
          timeSpent: r.timeSpent
        })),
        comments: incident.comments.length,
        attachments: incident.attachments.length
      };

      logger.info('Incident report generated', {
        incidentNumber: incident.incidentNumber
      });

      return report;
    } catch (error) {
      logger.error('Error generating incident report', { error: error.message });
      throw error;
    }
  }

  // 15. الحصول على إحصائيات الحوادث
  async getIncidentStatistics(filters = {}) {
    try {
      logger.info('Fetching incident statistics', { filters });

      const query = {};
      if (filters.departmentId) {
        query['organizationInfo.departmentId'] = filters.departmentId;
      }
      if (filters.dateRange) {
        query['discoveryInfo.discoveredAt'] = {
          $gte: filters.dateRange.start,
          $lte: filters.dateRange.end
        };
      }

      const [
        total,
        bySeverity,
        byCategory,
        byStatus,
        avgResolutionTime,
        slaBreaches
      ] = await Promise.all([
        Incident.countDocuments(query),
        Incident.countDocuments({ ...query, severity: { $in: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] } }),
        Incident.aggregate([
          { $match: query },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        Incident.aggregate([
          { $match: query },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Incident.aggregate([
          { $match: { ...query, 'resolution.resolvedAt': { $exists: true } } },
          { $group: { _id: null, avgTime: { $avg: '$metrics.timeToResolve' } } }
        ]),
        Incident.countDocuments({ ...query, 'sla.slaStatus': 'BREACHED' })
      ]);

      const statistics = {
        total,
        bySeverity,
        byCategory,
        byStatus,
        avgResolutionTime: avgResolutionTime[0]?.avgTime || 0,
        slaBreaches,
        slaBreachRate: ((slaBreaches / total) * 100).toFixed(2) + '%'
      };

      logger.info('Statistics fetched', { statistics });

      return statistics;
    } catch (error) {
      logger.error('Error fetching statistics', { error: error.message });
      throw error;
    }
  }

  // 16. البحث المتقدم
  async searchIncidents(searchTerm, filters = {}, page = 1, limit = 20) {
    try {
      logger.info('Searching incidents', { searchTerm, filters });

      const query = {
        $text: { $search: searchTerm }
      };

      if (filters.severity) query.severity = filters.severity;
      if (filters.status) query.status = filters.status;
      if (filters.category) query.category = filters.category;

      const skip = (page - 1) * limit;
      const incidents = await Incident.find(query)
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit);

      const total = await Incident.countDocuments(query);

      logger.info('Search completed', { total, searchTerm });

      return {
        incidents,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error searching incidents', { error: error.message });
      throw error;
    }
  }

  // 17. أرشفة الحادثة
  async archiveIncident(incidentId, userId) {
    try {
      logger.info('Archiving incident', { incidentId, userId });

      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      incident.isArchived = true;
      incident.archivedAt = new Date();
      incident.archivedBy = userId;

      await incident.save();

      logger.info('Incident archived', {
        incidentNumber: incident.incidentNumber
      });

      return incident;
    } catch (error) {
      logger.error('Error archiving incident', { error: error.message });
      throw error;
    }
  }

  // 18. الحصول على الحوادث المتعلقة
  async getRelatedIncidents(incidentId, limit = 5) {
    try {
      const incident = await Incident.findById(incidentId);
      if (!incident) {
        throw new Error('الحادثة غير موجودة');
      }

      const related = await Incident.find({
        _id: { $in: incident.relatedIncidents }
      }).limit(limit);

      return related;
    } catch (error) {
      logger.error('Error fetching related incidents', { error: error.message });
      throw error;
    }
  }
}

module.exports = new IncidentService();
