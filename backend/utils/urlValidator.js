/**
 * URL Validator — حماية ضد هجمات SSRF
 *
 * Validates that outbound URLs do not target internal/private infrastructure.
 * Used before storing webhook URLs or making server-initiated HTTP requests
 * to user-supplied destinations.
 *
 * Blocks:
 *  - Private IPv4 ranges (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 *  - Link-local (169.254.0.0/16)
 *  - IPv6 loopback (::1) and private ranges
 *  - Non-HTTP(S) schemes (file://, ftp://, gopher://)
 *  - Hostnames that resolve to private IPs (DNS rebinding defence)
 *
 * Usage:
 *   const { validateOutboundUrl } = require('../utils/urlValidator');
 *   await validateOutboundUrl('https://example.com/hook'); // OK
 *   await validateOutboundUrl('http://127.0.0.1:9200');    // throws
 */

'use strict';

const dns = require('dns');
const { promisify } = require('util');
const { URL } = require('url');

const dnsLookup = promisify(dns.lookup);

// ── Private / reserved IPv4 ranges ──────────────────────────────
const PRIVATE_RANGES = [
  { prefix: '127.', mask: null }, // 127.0.0.0/8  loopback
  { prefix: '10.', mask: null }, // 10.0.0.0/8   class A private
  { prefix: '0.', mask: null }, // 0.0.0.0/8    this network
  { prefix: '169.254.', mask: null }, // 169.254.0.0/16 link-local
  { prefix: '192.168.', mask: null }, // 192.168.0.0/16 class C private
];

/**
 * Check if an IPv4 address falls in 172.16.0.0/12
 */
function isIn172Private(ip) {
  if (!ip.startsWith('172.')) return false;
  const second = parseInt(ip.split('.')[1], 10);
  return second >= 16 && second <= 31;
}

/**
 * Returns true if the IP address is private / reserved.
 */
function isPrivateIP(ip) {
  // IPv6 loopback
  if (
    ip === '::1' ||
    ip === '::' ||
    ip.startsWith('fe80:') ||
    ip.startsWith('fc00:') ||
    ip.startsWith('fd')
  ) {
    return true;
  }

  // IPv4 simple prefix checks
  for (const range of PRIVATE_RANGES) {
    if (ip.startsWith(range.prefix)) return true;
  }

  // 172.16–31.*
  if (isIn172Private(ip)) return true;

  return false;
}

// Allowed schemes
const ALLOWED_SCHEMES = new Set(['https:', 'http:']);

/**
 * Validate that a URL is safe for outbound server requests.
 *
 * @param {string} rawUrl — The URL to validate
 * @throws {Error} If the URL targets private infrastructure or uses a disallowed scheme
 * @returns {URL} The parsed URL object
 */
async function validateOutboundUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('URL is required');
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format');
  }

  // ── Scheme check ──────────────────────────────────────────────
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new Error(`Disallowed URL scheme: ${parsed.protocol} — only http/https allowed`);
  }

  // ── Hostname basics ───────────────────────────────────────────
  const hostname = parsed.hostname;

  if (!hostname) {
    throw new Error('URL must include a hostname');
  }

  // Block obvious private hostnames
  if (hostname === 'localhost' || hostname === '[::1]') {
    throw new Error('URLs targeting localhost are not allowed');
  }

  // ── DNS resolution check ──────────────────────────────────────
  try {
    const { address } = await dnsLookup(hostname);
    if (isPrivateIP(address)) {
      throw new Error(`URL resolves to a private IP address (${address})`);
    }
  } catch (err) {
    if (err.message.includes('private IP')) throw err;
    // DNS resolution failure — reject to be safe
    throw new Error(`Cannot resolve hostname: ${hostname}`);
  }

  return parsed;
}

module.exports = { validateOutboundUrl, isPrivateIP };
