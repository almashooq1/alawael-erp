/**
 * OAuthClient — registered OAuth 2.0 / OIDC client (W205d).
 *
 * Replaces the single-tenant env-var OAUTH_CLIENT_SECRET with a real
 * client registry so multiple apps can integrate with our SSO without
 * sharing one global secret.
 *
 * Secret storage: we never store the plaintext secret; only a bcrypt
 * hash. `registerClient()` returns the plaintext once and discards it.
 * Verification: `verifyClientSecret(client, candidate)` does the bcrypt
 * compare.
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const OAuthClientSchema = new mongoose.Schema(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    clientName: { type: String, required: true, trim: true },
    // bcrypt hash of clientSecret — never store plaintext
    clientSecretHash: { type: String, required: true, select: false },

    // Confidential clients require a secret; public (PKCE-only) clients do not.
    // Public clients MUST use PKCE on the authorization code flow.
    tokenEndpointAuthMethod: {
      type: String,
      enum: ['client_secret_basic', 'client_secret_post', 'none'],
      default: 'client_secret_basic',
    },

    redirectUris: { type: [String], default: [], required: true },
    allowedScopes: {
      type: [String],
      default: ['openid', 'profile', 'email'],
    },
    grantTypes: {
      type: [String],
      enum: ['authorization_code', 'refresh_token', 'client_credentials', 'password'],
      default: ['authorization_code', 'refresh_token'],
    },
    responseTypes: { type: [String], default: ['code'] },

    contacts: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },

    // Rotation bookkeeping (W205g)
    secretRotatedAt: Date,
    secretRotationCount: { type: Number, default: 0 },

    // Bookkeeping
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastUsedAt: Date,
  },
  { timestamps: true }
);

/**
 * Compare a candidate secret against the stored bcrypt hash.
 * The model must be queried with `.select('+clientSecretHash')` for this
 * to have a value to compare against.
 */
OAuthClientSchema.methods.verifyClientSecret = async function (candidate) {
  if (!candidate || !this.clientSecretHash) return false;
  return bcrypt.compare(String(candidate), this.clientSecretHash);
};

OAuthClientSchema.methods.touchLastUsed = function () {
  return this.updateOne({ $set: { lastUsedAt: new Date() } });
};

/**
 * Mint a new clientSecret, bcrypt-hash it, and persist. Returns the
 * plaintext secret ONCE — caller must surface it to the operator
 * immediately and discard.
 *
 * For public clients (tokenEndpointAuthMethod:'none') rotation is a
 * no-op and returns null; PKCE is the credential.
 */
OAuthClientSchema.methods.rotateSecret = async function () {
  if (this.tokenEndpointAuthMethod === 'none') {
    return null;
  }
  const newSecret = crypto.randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(newSecret, 12);
  await this.updateOne({
    $set: {
      clientSecretHash: hash,
      secretRotatedAt: new Date(),
    },
    $inc: { secretRotationCount: 1 },
  });
  return newSecret;
};

const OAuthClient = mongoose.models.OAuthClient || mongoose.model('OAuthClient', OAuthClientSchema);

module.exports = OAuthClient;
