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
const net = require('net');
const { promisify } = require('util');
const { URL } = require('url');

const dnsLookup = promisify(dns.lookup);

// Allowed schemes
const ALLOWED_SCHEMES = new Set(['https:', 'http:']);

// Cloud metadata and internal hostnames to block
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '[::1]',
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
]);

// Sensitive ports (common internal services) — block from outbound URLs
const BLOCKED_PORTS = new Set([27017, 6379, 5432, 3306, 11211, 9200, 2379, 8500, 22]);

// ── IP range helpers ──────────────────────────────────────────────────────

function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

const BLOCKED_RANGES = [
  { start: ipToInt('0.0.0.0'),   end: ipToInt('0.255.255.255') },
  { start: ipToInt('10.0.0.0'),  end: ipToInt('10.255.255.255') },
  { start: ipToInt('127.0.0.0'), end: ipToInt('127.255.255.255') },
  { start: ipToInt('169.254.0.0'), end: ipToInt('169.254.255.255') },
  { start: ipToInt('172.16.0.0'), end: ipToInt('172.31.255.255') },
  { start: ipToInt('192.168.0.0'), end: ipToInt('192.168.255.255') },
];

/**
 * Returns true if the IP address is private / reserved.
 */
function isPrivateIP(ip) {
  if (
    ip === '::1' || ip === '::' ||
    ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd')
  ) return true;

  if (!net.isIPv4(ip)) return false;

  const n = ipToInt(ip);
  return BLOCKED_RANGES.some(r => n >= r.start && n <= r.end);
}

/**
 * Synchronous SSRF check (no DNS resolution — catches direct IPs and hostname tricks).
 * Returns { valid: true, url } or { valid: false, reason }.
 */
function validateOutboundUrlSync(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, reason: 'URL is required and must be a string' };
  }

  let parsed;
  try { parsed = new URL(urlString); } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return { valid: false, reason: `Protocol "${parsed.protocol}" is not allowed` };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) return { valid: false, reason: 'URL must include a hostname' };
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, reason: `Hostname "${hostname}" is blocked` };
  }

  // Block IP tricks: decimal notation (http://2130706433), hex (http://0x7f000001)
  if (/^\d+$/.test(hostname)) return { valid: false, reason: 'Numeric-only hostnames are not allowed' };
  if (/^0x/i.test(hostname))  return { valid: false, reason: 'Hex hostnames are not allowed' };

  // Block .localhost / .local / .internal domains
  if (hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { valid: false, reason: 'Local/internal domain suffixes are not allowed' };
  }

  // If hostname is a literal IP, check ranges
  if (net.isIP(hostname) && isPrivateIP(hostname)) {
    return { valid: false, reason: 'Internal/private IP addresses are not allowed' };
  }

  // Block sensitive ports
  const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
  if (BLOCKED_PORTS.has(port)) {
    return { valid: false, reason: `Port ${port} is blocked (sensitive service)` };
  }

  return { valid: true, url: parsed };
}

/**
 * Async SSRF check — adds DNS resolution to catch DNS-rebinding attacks.
 * Throws on invalid/dangerous URLs. Returns parsed URL on success.
 */
async function validateOutboundUrl(rawUrl) {
  const sync = validateOutboundUrlSync(rawUrl);
  if (!sync.valid) throw new Error(sync.reason);

  const hostname = sync.url.hostname;
  // Skip DNS check for literal IPs (already checked above)
  if (net.isIP(hostname)) return sync.url;

  try {
    const { address } = await dnsLookup(hostname);
    if (isPrivateIP(address)) {
      throw new Error(`URL resolves to a private IP address (${address})`);
    }
  } catch (err) {
    if (err.message.includes('private IP')) throw err;
    throw new Error(`Cannot resolve hostname: ${hostname}`);
  }

  return sync.url;
}

module.exports = { validateOutboundUrl, validateOutboundUrlSync, isPrivateIP };
