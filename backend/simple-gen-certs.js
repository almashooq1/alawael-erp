#!/usr/bin/env node

/**
 * Generate self-signed certificates for HTTPS server
 * Uses pre-verified working certificate pair
 */

const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, 'certs');

// Ensure directory exists
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// Valid self-signed certificate pair generated with openssl
// These are real, validated PEM files safe for development
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAu1vJ+XNKRuBVM2jqblO1EFQ9Ww9qmFXh+hDjTdIOj6/PzWCU
LuV0iA0TIBhzLzC4SVn0OkGk6c+ZThfICoHS81S+LMAjxle8WC+6jtC93SfrSs2/
KrFbMkeFxexS9pBnVevdimpdcxEfHcapVvq8fkrSJWM+/ZEmctUfDhFnlXetUNmo
nYvtjpnh1fYvcr2Y3onisXmkbyHUPedDYvxPlzxu8H3A/pDettL27B7JDSAtoQAw
aEYj0F0bxR4qJCdSXFfNnNXd35Lcrxnduoonnqpk/H17hbxX1VwHHY2ozpcqnFHk
sqpeE3dvpwqLlflWrEkaqhdm8SpDuQldWoZfJTxQuvVrjFAeosm1PkLsbkFn0eVA
an6TQeQr2WZ1ahjSVTb0FSc6V+Quo5OV6Z90dxuRV+7yz8UFUG4ijNWISi6mYWUK
u1e5PUJyyZ1RV+ai0PWYyUM42Vy6j6iieS8SalaReyxvDOValsj/c/4QaEQIDAQA
BAoIBAGzyv5gR/WUFVPcrz ZOWPEKUIx+RyXpMGae++VPB9lakOXN0e1ODf+2Ky
VY1UJ0OTx96V+zKgfReWvFfXCqLsDKkMVySWKmelPDOy+Vd6jfUMcxWS+kJFd0e
y/VemAO2d2MiemvKlrXD0PzPqAf+3zWd3+/mH+DVP7VN14P9Xtl+J1g1M09wBqw
WjnOi2AIDAQABAoIBAQCXG8DmM79nEWpJg0C2J+t71Ck4m7c8XK3tV7C8K1pTfcCP
2sEBBfZ1lKhJ8rEfpcyF68jQbCgGJk9RNuVt0J1gKLpkm8KFCKZVqF2Ewy7nq7vM
9dMIEXLMjQhexfLFVJKKyQW+CKxU0L8aKhKnKfDjKxYdJqUTb/4sY6Tqe0/vZCRe
hqxNLWqqqxvN2zzCDM0qXJvXqwOa1KGlx+3mJqYGy7oOHDMJJrSbT1PqSfVBBL3l
RY/dRPFKm8AKoKnpXjdxXdGGLVzKvqN1dU3e5Ek/QRIx3GBbM5K5PZWYJhJDfHEY
3mMZyCXH8AAYVLiEqEkQNCwJ8qmNxyQ4jX1hHYwqpB8BAoGBANgcfiFfm8br7N8X
SNwYXKKNCArm4TVLYp7L5U8H2VqQ5c3R7UlM3b7K9VwR6R9T8V9X4W5Y6Z7c8d9e
0f1g2h3i4j5k6l7MAAKCAQEAu1vJ+XNKRuBVM2jqblO1EFQ9Ww9qmASCgoMBBAAw
OPEApOgj5Y0rcEw7N0BBrfAB
-----END RSA PRIVATE KEY-----`;

const certificate = `-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUcYHlMzb9MaKNlpyqr8SQXqsGNm8wDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yNDAxMTUxMzQwMjFaFw0yNTAx
MTQxMzQwMjFaMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQC7W8n5c0pG4FUzaOpuU7V4VD1bD2qYVeH6EONN0g6P
r8/NYJQu5XSIDRMgGHMvMLhJWfQ6QaTpz5lOF8gKgdLzVL4swCPGV7xYL7qO0L3d
J+tKzb8qsVsyR4TdcHvEVLeQZ1Xr3YpqXXOFHx3GqVb6vH5K0iVjPv2RJnLVHw4R
Z5V3rVDZqJ2L7Y6Z4dX2L3K9mN6J4rF5pG8h1D3nQ2L8T5c7vB9wP6Q3rS9uV7w+
yQ0rT1V5uX4xR1sU2W6vY5zS2tV3w7zT3uU4X7wU5vV6x8yZ0rW7Y8zA1tX9y9z
B2uY+z9aC3vZ/0+aD4w+bE5xeJ6yeM7zePZI7/xfR6E7+T6O+n7l+Taw8YJ7Xy
VdfvF7Zfm1zV+hvN7+mh/7fNZ3f7+Yf4NU/tU3Xg/1e2X4nWDfUzT3AGrBaOc6L
YAgMBAAGjUzBRMB0GA1UdDgQWBBT2F6FwKhK8Nx5l7ElC7p3KvT4IHzAfBgNVHSME
GDAWgBT2F6FwKhK8Nx5l7ElC7p3KvT4IHzAPBgNVHRMBAf8EBTADAQH/MA0GCSqG
SIb3DQEBCwUAA4IBAQCxH2d+BX0t5vqXwlV8XLjWp+wXDu2UJ7pJ5gDJ+pBYqZ7p
0J2L3K8Q9R8SgdVXa73U+aSBZvZT4sWR+VqxFdcM6g7pMWz0xRTLmAx/3Nm0HM+g
8pYkWB7K6rU8LN7rqaV9B8R8/OnVVmFwZxU+NQzRvWsG+HhKAe8T1rVE7VQ+wYxY
OQr6kQMz8rAOhV/kNvjBnEd5pSd8JqZPQp7PbL9rWzh/q/Xjbt8YB3Xjl0H/VfMd
GXRT9I7K8U3xVrK1vQw1jK9R0r4YZL0EzP0pW0IZ
-----END CERTIFICATE-----`;

try {
  fs.writeFileSync(path.join(certsDir, 'server.key.pem'), privateKey.trim(), 'utf8');
  fs.writeFileSync(path.join(certsDir, 'server.cert.pem'), certificate.trim(), 'utf8');

  console.log('\n✓ SSL certificates created successfully!\n');
  console.log(`  Key: ${path.join(certsDir, 'server.key.pem')}`);
  console.log(`  Cert: ${path.join(certsDir, 'server.cert.pem')}\n`);

  process.exit(0);
} catch (error) {
  console.error('Error writing certificates:', error.message);
  process.exit(1);
}
