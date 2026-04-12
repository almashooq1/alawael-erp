'use strict';
/**
 * FhirIntegration Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddFhirIntegration.js
 */

const {
  DDDFhirResource,
  DDDResourceMapping,
  DDDFhirBundle,
  DDDCapabilityStatement,
  FHIR_RESOURCE_TYPES,
  FHIR_VERSIONS,
  BUNDLE_TYPES,
  INTERACTION_TYPES,
  MAPPING_STATUSES,
  CONFORMANCE_LEVELS,
  BUILTIN_FHIR_PROFILES,
} = require('../models/DddFhirIntegration');

const BaseCrudService = require('./base/BaseCrudService');

class FhirIntegration extends BaseCrudService {
  constructor() {
    super('FhirIntegration', {}, {
      fhirResources: DDDFhirResource,
      resourceMappings: DDDResourceMapping,
      fhirBundles: DDDFhirBundle,
      capabilityStatements: DDDCapabilityStatement,
    });
  }

  async createResource(data) { return this._create(DDDFhirResource, data); }
  async listResources(filter = {}, page = 1, limit = 20) { return this._list(DDDFhirResource, filter, { page: page, limit: limit, sort: { lastUpdated: -1 } }); }
  async getResource(resourceType, resourceId) {
    return DDDFhirResource.findOne({ resourceType, resourceId }).lean();
  }
  async updateResource(id, data) {
    return DDDFhirResource.findByIdAndUpdate(
      id,
      { ...data, versionId: (data.versionId || 1) + 1, lastUpdated: new Date() },
      { new: true }
    ).lean();
  }

  async createMapping(data) { return this._create(DDDResourceMapping, data); }
  async listMappings(filter = {}, page = 1, limit = 20) { return this._list(DDDResourceMapping, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async createBundle(data) { return this._create(DDDFhirBundle, data); }
  async listBundles(filter = {}, page = 1, limit = 20) { return this._list(DDDFhirBundle, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async createCapabilityStatement(data) { return this._create(DDDCapabilityStatement, data); }
  async listCapabilityStatements(filter = {}) { return this._list(DDDCapabilityStatement, filter); }

  async getFhirStats() {
    const [resources, mappings, bundles, stmts] = await Promise.all([
      DDDFhirResource.countDocuments(),
      DDDResourceMapping.countDocuments({ status: 'active' }),
      DDDFhirBundle.countDocuments(),
      DDDCapabilityStatement.countDocuments(),
    ]);
    return {
      totalResources: resources,
      activeMappings: mappings,
      totalBundles: bundles,
      capabilityStatements: stmts,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new FhirIntegration();
