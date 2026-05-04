'use strict';

/**
 * TherapyGroup — shim. Canonical model lives in the group-therapy domain.
 * Re-exporting ensures all consumers get the same schema regardless of
 * which file is loaded first.
 */

module.exports = require('../domains/group-therapy/models/TherapyGroup');
