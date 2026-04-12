'use strict';
/**
 * HealthEducation Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddHealthEducation.js
 */

const {
  DDDEducationContent,
  DDDHealthEduPath,
  DDDEducationAssessment,
  DDDLiteracyTracking,
  CONTENT_TYPES,
  CONTENT_STATUSES,
  HEALTH_TOPICS,
  TARGET_AUDIENCES,
  LITERACY_LEVELS,
  LANGUAGE_OPTIONS,
  BUILTIN_EDUCATION_PROGRAMS,
} = require('../models/DddHealthEducation');

const BaseCrudService = require('./base/BaseCrudService');

class HealthEducation extends BaseCrudService {
  constructor() {
    super('HealthEducation', {}, {
      educationContents: DDDEducationContent,
      healthEduPaths: DDDHealthEduPath,
      educationAssessments: DDDEducationAssessment,
      literacyTrackings: DDDLiteracyTracking,
    });
  }

  async createContent(data) { return this._create(DDDEducationContent, data); }
  async listContent(filter = {}, page = 1, limit = 20) { return this._list(DDDEducationContent, filter, { page: page, limit: limit, sort: { updatedAt: -1 } }); }
  async getContentById(id) {
    await DDDEducationContent.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
    return DDDEducationContent.findById(id).lean();
  }
  async updateContent(id, data) { return this._update(DDDEducationContent, id, data); }

  async createPath(data) { return this._create(DDDHealthEduPath, data); }
  async listPaths(filter = {}) { return this._list(DDDHealthEduPath, filter); }

  async submitAssessment(data) { return this._create(DDDEducationAssessment, data); }
  async listAssessments(filter = {}, page = 1, limit = 20) { return this._list(DDDEducationAssessment, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async updateLiteracy(beneficiaryId, data) {
    return DDDLiteracyTracking.findOneAndUpdate({ beneficiaryId }, data, {
      upsert: true,
      new: true,
    }).lean();
  }
  async getLiteracy(beneficiaryId) {
    return DDDLiteracyTracking.findOne({ beneficiaryId }).lean();
  }

  async getEducationStats() {
    const [content, paths, assessments, trackers] = await Promise.all([
      DDDEducationContent.countDocuments({ status: 'published' }),
      DDDHealthEduPath.countDocuments({ isActive: true }),
      DDDEducationAssessment.countDocuments(),
      DDDLiteracyTracking.countDocuments(),
    ]);
    return {
      publishedContent: content,
      activePaths: paths,
      assessments,
      trackedPatients: trackers,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new HealthEducation();
