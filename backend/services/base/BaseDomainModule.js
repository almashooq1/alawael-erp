'use strict';
const logger = require('../../utils/logger');
/**
 * BaseDomainModule — Shared base class for DDD service modules
 * ═══════════════════════════════════════════════════════════════
 * Provides:
 *   - Named logging: this.log(msg)
 *   - Module metadata: this.name, this.opts
 *
 * Previously copy-pasted into 44 DDD service files.
 * Now shared from this single location.
 *
 * Usage:
 *   const BaseDomainModule = require('./base/BaseDomainModule');
 *   class MyService extends BaseDomainModule {
 *     constructor() {
 *       super('MyService', { description: '...', version: '1.0.0' });
 *     }
 *   }
 * ═══════════════════════════════════════════════════════════════
 */

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    logger.info(`[${this.name}] ${msg}`);
  }
}

module.exports = BaseDomainModule;
