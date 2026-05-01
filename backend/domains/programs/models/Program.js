/**
 * Program (Domain Re-export Shim)
 *
 * This file used to define a parallel `Program` mongoose schema that
 * collided with the canonical model in `backend/models/Program.js`. The
 * duplicate schema was archived to
 * `_archived/dead-models/domains-programs-Program.js`.
 *
 * @module domains/programs/models/Program
 */

const Program = require('../../../models/Program');

module.exports = { Program, programSchema: Program.schema };
