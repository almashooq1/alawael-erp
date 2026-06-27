/**
 * Token Storage Utility — TypeScript Version
 * أداة مركزية لإدارة رموز المصادقة (Secure Cookies + localStorage fallback)
 */

import { User } from '../types';

const COOKIE_PREFIX = '__Secure-';

const TOKEN_KEY = 'token';
const LEGACY_TOKEN_KEYS: string[] = ['authToken', 'auth_token', 'access_token', 'accessToken'];

const REFRESH_KEY = 'refreshToken';
const LEGACY_REFRESH_KEYS: string[] = ['refresh_token'];

const USER_KEY = 'user';
const LEGACY_USER_KEYS: string[] = ['userData'];

// ─── Cookie Helpers ────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_PREFIX}${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, maxAge = 86400): boolean {
  try {
    const isSecure = window.location.protocol === 'https:';
    const flags = [
      `${COOKIE_PREFIX}${name}=${encodeURIComponent(value)}`,
      'path=/',
      'SameSite=Strict',
    ];
    if (isSecure) flags.push('Secure');
    if (maxAge) flags.push(`max-age=${maxAge}`);
    document.cookie = flags.join('; ');
    return true;
  } catch {
    return false;
  }
}

function removeCookie(name: string): void {
  try {
    document.cookie = `${COOKIE_PREFIX}${name}=; path=/; max-age=0`;
  } catch {
    /* ignore */
  }
}

// ─── localStorage Helpers ────────────────────────────────────────────────

function readFirst(primary: string, legacy: string[]): string | null {
  const value = localStorage.getItem(primary);
  if (value) return value;
  for (const key of legacy) {
    const v = localStorage.getItem(key);
    if (v) return v;
  }
  return null;
}

function removeAll(primary: string, legacy: string[]): void {
  localStorage.removeItem(primary);
  for (const key of legacy) {
    localStorage.removeItem(key);
  }
}

// ─── Public API — Access Token ───────────────────────────────────────────

export function getToken(): string | null {
  const cookieToken = getCookie(TOKEN_KEY);
  if (cookieToken) return cookieToken;
  return readFirst(TOKEN_KEY, LEGACY_TOKEN_KEYS);
}

export function setToken(token: string): void {
  const cookieSet = setCookie(TOKEN_KEY, token, 86400);
  if (!cookieSet) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  localStorage.setItem('authToken', token);
  localStorage.removeItem('auth_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('accessToken');
}

export function removeToken(): void {
  removeCookie(TOKEN_KEY);
  removeAll(TOKEN_KEY, LEGACY_TOKEN_KEYS);
}

// ─── Public API — Refresh Token ──────────────────────────────────────────

export function getRefreshToken(): string | null {
  const cookieToken = getCookie(REFRESH_KEY);
  if (cookieToken) return cookieToken;
  return readFirst(REFRESH_KEY, LEGACY_REFRESH_KEYS);
}

export function setRefreshToken(token: string): void {
  const cookieSet = setCookie(REFRESH_KEY, token, 604800);
  if (!cookieSet) {
    localStorage.setItem(REFRESH_KEY, token);
  }
  localStorage.removeItem('refresh_token');
}

export function removeRefreshToken(): void {
  removeCookie(REFRESH_KEY);
  removeAll(REFRESH_KEY, LEGACY_REFRESH_KEYS);
}

// ─── Public API — User Data ───────────────────────────────────────────────

export function getUserData(): User | null {
  const raw = readFirst(USER_KEY, LEGACY_USER_KEYS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setUserData(data: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(data));
  localStorage.removeItem('userData');
}

export function removeUserData(): void {
  removeAll(USER_KEY, LEGACY_USER_KEYS);
}

// ─── Convenience ─────────────────────────────────────────────────────────

export function clearAuthData(): void {
  removeToken();
  removeRefreshToken();
  removeUserData();
  localStorage.removeItem('userId');
}

// ─── Default Export ───────────────────────────────────────────────────────

const tokenStorage = {
  getToken,
  setToken,
  removeToken,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  getUserData,
  setUserData,
  removeUserData,
  clearAuthData,
};

export default tokenStorage;
