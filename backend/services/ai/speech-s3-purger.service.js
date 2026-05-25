'use strict';

/**
 * speech-s3-purger.service.js — real S3-backed storagePurger for the W284c
 * speech retention sweeper. Closes the PDPL-compliance gap that the W284c
 * log-only placeholder left open.
 *
 * Returns NULL if either:
 *   • `@aws-sdk/client-s3` isn't installed (loadOptional fails)
 *   • `AWS_REGION` env var isn't set (no client construction path)
 *
 * Caller (speechBootstrap) checks for null + falls back to the log-only
 * purger with a LOUD warning so the PDPL gap is visible in logs at boot.
 *
 * Test pattern: inject `s3Client` + `_sdkOverride` to exercise the real
 * code path without requiring the SDK to be installed.
 *
 * Intentionally NOT auto-installing `@aws-sdk/client-s3` to package.json —
 * that's an ops decision per environment (some pilots stay log-only until
 * S3 bucket + IAM role exist).
 */

function loadOptional(modulePath) {
  try {
    return require(modulePath);
  } catch {
    return null;
  }
}

/**
 * @param {object} [opts]
 * @param {string} [opts.region] — AWS region. Defaults to `process.env.AWS_REGION`.
 * @param {object} [opts.s3Client] — pre-constructed S3 client (test injection).
 * @param {object} [opts.logger] — optional pino-shape logger.
 * @param {object} [opts.sdk] — explicit SDK module (test override; bypasses loadOptional).
 * @returns {(input: {bucket: string, key: string}) => Promise<void> | null}
 *   The purger function, or null if no viable construction path.
 */
function createS3Purger(opts = {}) {
  const { region = process.env.AWS_REGION, s3Client = null, logger = null, sdk = null } = opts;

  let client = s3Client;
  let DeleteObjectCommand;

  if (client) {
    // Test path: caller injected a stub client + (optionally) sdk override
    // for the DeleteObjectCommand constructor.
    DeleteObjectCommand =
      (sdk && sdk.DeleteObjectCommand) ||
      function PassthroughDelCmd(args) {
        return { input: args, __passthroughCommand: true };
      };
  } else {
    const realSdk = sdk || loadOptional('@aws-sdk/client-s3');
    if (!realSdk) return null;
    if (!region) return null;
    client = new realSdk.S3Client({ region });
    DeleteObjectCommand = realSdk.DeleteObjectCommand;
  }

  return async function s3Purger({ bucket, key } = {}) {
    if (!bucket || typeof bucket !== 'string') {
      throw new Error('speech-s3-purger: bucket required (string)');
    }
    if (!key || typeof key !== 'string') {
      throw new Error('speech-s3-purger: key required (string)');
    }
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    if (logger && typeof logger.debug === 'function') {
      logger.debug(`[speech-retention] purged s3://${bucket}/${key}`);
    }
  };
}

module.exports = { createS3Purger };
