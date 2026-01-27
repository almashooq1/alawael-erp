// Google OAuth2 & Calendar Integration (basic structure)
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const CONFIG_PATH = path.join(__dirname, '../../data/google-oauth-config.json');
const TOKENS_PATH = path.join(__dirname, '../../data/google-oauth-tokens.json');

export function getGoogleOAuthConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}
export function saveGoogleOAuthConfig(config: any) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
export function getUserGoogleToken(userId: string) {
  if (!fs.existsSync(TOKENS_PATH)) return null;
  const all: Record<string, any> = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'));
  return all[userId] || null;
}
export function saveUserGoogleToken(userId: string, token: any) {
  let all: Record<string, any> = {};
  if (fs.existsSync(TOKENS_PATH)) all = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf-8'));
  all[userId] = token;
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(all, null, 2), 'utf-8');
}
export function getOAuth2Client(userId?: string) {
  const config = getGoogleOAuthConfig();
  if (!config) throw new Error('Google OAuth config not set');
  const { client_id, client_secret, redirect_uris } = config.installed || config.web || {};
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, (redirect_uris||[])[0]);
  if (userId) {
    const token = getUserGoogleToken(userId);
    if (token) oAuth2Client.setCredentials(token);
  }
  return oAuth2Client;
}
