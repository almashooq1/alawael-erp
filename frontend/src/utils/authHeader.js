/**
 * authHeader — helper for authenticated API calls.
 *
 * Returns an object suitable for use as the `headers` option of fetch(),
 * or as a spread source alongside other headers:
 *
 *   fetch(url, { headers: authHeader() })
 *   fetch(url, { headers: { ...authHeader(), 'Content-Type': 'application/json' } })
 *
 * When no token is stored the returned object is empty so callers don't
 * need to guard against null / undefined before spreading.
 */
import { getToken } from './tokenStorage';

/**
 * @returns {{ Authorization: string } | {}}
 */
export default function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
