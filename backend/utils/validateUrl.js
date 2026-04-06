/**
 * SSRF Protection — حماية من هجمات Server-Side Request Forgery
 *
 * يمنع الطلبات الصادرة إلى:
 *  - عناوين IP المحلية (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 *  - عناوين Cloud Metadata (169.254.169.254)
 *  - عناوين IPv6 المحلية (::1, fe80::, fc00::)
 *  - بروتوكولات غير آمنة (file://, ftp://, gopher://)
 *  - منافذ حساسة (MongoDB, Redis, etc.)
 */

'use strict';

const { URL } = require('url');
const net = require('net');

// Blocked IP ranges (CIDR notation logic)
const BLOCKED_IP_RANGES = [
  // Loopback
  { start: '127.0.0.0', end: '127.255.255.255' },
  // Private networks
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  // Link-local
  { start: '169.254.0.0', end: '169.254.255.255' },
  // Current network
  { start: '0.0.0.0', end: '0.255.255.255' },
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
];

// Sensitive ports (common internal services)
const BLOCKED_PORTS = [
  27017, // MongoDB
  6379, // Redis
  5432, // PostgreSQL
  3306, // MySQL
  11211, // Memcached
  9200, // Elasticsearch
  2379, // etcd
  8500, // Consul
  22, // SSH
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Convert IP string to integer for range comparison
 */
function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Check if an IP is in a blocked range
 */
function isBlockedIP(ip) {
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

  // Not IPv4 — skip range check
  if (!net.isIPv4(ip)) return false;

  const ipInt = ipToInt(ip);
  for (const range of BLOCKED_IP_RANGES) {
    const startInt = ipToInt(range.start);
    const endInt = ipToInt(range.end);
    if (ipInt >= startInt && ipInt <= endInt) {
      return true;
    }
  }
  return false;
}

/**
 * Validate an outbound URL for SSRF protection
 *
 * @param {string} urlString - The URL to validate
 * @returns {{ valid: boolean, reason?: string, url?: URL }}
 */
function validateOutboundUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, reason: 'URL is required and must be a string' };
  }

  // Parse URL
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // Check protocol
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return {
      valid: false,
      reason: `Protocol "${parsed.protocol}" is not allowed. Use http: or https:`,
    };
  }

  // Check blocked hostnames
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { valid: false, reason: `Hostname "${hostname}" is blocked` };
  }

  // Check if hostname is an IP address
  if (net.isIP(hostname)) {
    if (isBlockedIP(hostname)) {
      return { valid: false, reason: 'Internal/private IP addresses are not allowed' };
    }
  }

  // Check for hostname tricks (e.g., 0x7f000001 = 127.0.0.1)
  // Decimal IP notation: http://2130706433 = http://127.0.0.1
  if (/^\d+$/.test(hostname)) {
    return { valid: false, reason: 'Numeric-only hostnames are not allowed' };
  }

  // Check for hex IP tricks
  if (/^0x/i.test(hostname)) {
    return { valid: false, reason: 'Hex hostnames are not allowed' };
  }

  // Check blocked ports
  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
  if (BLOCKED_PORTS.includes(port)) {
    return { valid: false, reason: `Port ${port} is blocked (sensitive service)` };
  }

  // Check for localhost variants
  if (
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { valid: false, reason: 'Local/internal domain suffixes are not allowed' };
  }

  return { valid: true, url: parsed };
}

module.exports = { validateOutboundUrl, isBlockedIP };
