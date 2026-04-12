'use strict';
/**
 * ██████████████████████████████████████████████████████████████
 * ██  DDD Research Protocol — Phase 28                        ██
 * ██  Manage research protocols, IRB approvals & study designs██
 * ██████████████████████████████████████████████████████████████
 */

const { DDDResearchProtocol, DDDIRBSubmission, DDDResearchTeam, DDDDataCollection, PROTOCOL_TYPES, PROTOCOL_STATUSES, IRB_STATUSES, STUDY_PHASES, RISK_LEVELS, FUNDING_TYPES, BUILTIN_PROTOCOL_TEMPLATES } = require('../models/DddResearchProtocol');

const BaseCrudService = require('./base/BaseCrudService');

class ResearchProtocol extends BaseCrudService {
  constructor() {
    super('ResearchProtocol');
  }

  async listProtocols(filter = {}) { return this._list(DDDResearchProtocol, filter); }
  async getProtocol(id) { return this._getById(DDDResearchProtocol, id); }
  async createProtocol(data) {
    data.protocolId = data.protocolId || `RP-${Date.now()}`;
    return DDDResearchProtocol.create(data);
  }
  async updateProtocol(id, data) { return this._update(DDDResearchProtocol, id, data); }

  async listIRBSubmissions(filter = {}) { return this._list(DDDIRBSubmission, filter); }
  async submitToIRB(data) {
    data.submissionId = data.submissionId || `IRB-${Date.now()}`;
    data.submittedAt = new Date();
    return DDDIRBSubmission.create(data);
  }
  async updateIRBStatus(id, data) { return this._update(DDDIRBSubmission, id, data); }

  async listTeams(filter = {}) { return this._list(DDDResearchTeam, filter); }
  async createTeam(data) {
    data.teamId = data.teamId || `RT-${Date.now()}`;
    return DDDResearchTeam.create(data);
  }

  async listDataCollections(filter = {}) { return this._list(DDDDataCollection, filter); }
  async createDataCollection(data) {
    data.collectionId = data.collectionId || `DC-${Date.now()}`;
    return DDDDataCollection.create(data);
  }

  async getProtocolAnalytics(filter = {}) {
    const [protocols, irbs, teams, collections] = await Promise.all([
      DDDResearchProtocol.countDocuments(filter),
      DDDIRBSubmission.countDocuments(),
      DDDResearchTeam.countDocuments(),
      DDDDataCollection.countDocuments(),
    ]);
    return {
      totalProtocols: protocols,
      totalIRBs: irbs,
      totalTeams: teams,
      totalCollections: collections,
    };
  }
}

module.exports = new ResearchProtocol();
