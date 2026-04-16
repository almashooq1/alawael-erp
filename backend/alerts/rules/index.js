'use strict';

module.exports = [
  require('./credential-expiry-30d'),
  require('./irp-overdue-approval'),
  require('./invoice-overdue-60d'),
  require('./incident-major'),
  require('./zatca-submission-rejected'),
];
