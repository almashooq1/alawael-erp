/**
 * HTTP Digest Authentication — minimal RFC 7616 client.
 *
 * Hikvision devices ship with Digest auth as default. We do the two-step
 * dance ourselves to avoid pulling in an extra package: send a probe → parse
 * the WWW-Authenticate challenge → compute the response → resend.
 *
 * Supports qop="auth" (the only mode Hikvision uses). MD5 only.
 */
'use strict';

const crypto = require('crypto');

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function parseChallenge(header) {
  if (!header || !/^Digest /i.test(header)) return null;
  const fields = {};
  const re = /(\w+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^,]+))/g;
  let m;
  while ((m = re.exec(header))) {
    fields[m[1].toLowerCase()] = (m[2] !== undefined ? m[2] : m[3]).trim();
  }
  return fields;
}

function buildResponse({ username, password, method, uri, challenge, nc = '00000001', cnonce }) {
  const realm = challenge.realm || '';
  const nonce = challenge.nonce || '';
  const qop = challenge.qop || 'auth';
  const algo = (challenge.algorithm || 'MD5').toUpperCase();
  if (algo !== 'MD5' && algo !== 'MD5-SESS') {
    throw new Error(`digestAuth: unsupported algorithm ${algo}`);
  }
  const cnonceVal = cnonce || crypto.randomBytes(8).toString('hex');
  let ha1 = md5(`${username}:${realm}:${password}`);
  if (algo === 'MD5-SESS') ha1 = md5(`${ha1}:${nonce}:${cnonceVal}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = md5(`${ha1}:${nonce}:${nc}:${cnonceVal}:${qop}:${ha2}`);
  const opaque = challenge.opaque ? `, opaque="${challenge.opaque}"` : '';
  return (
    `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", ` +
    `qop=${qop}, nc=${nc}, cnonce="${cnonceVal}", response="${response}", algorithm=${algo}${opaque}`
  );
}

module.exports = { parseChallenge, buildResponse, md5 };
