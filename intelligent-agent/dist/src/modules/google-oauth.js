"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGoogleOAuthConfig = getGoogleOAuthConfig;
exports.saveGoogleOAuthConfig = saveGoogleOAuthConfig;
exports.getUserGoogleToken = getUserGoogleToken;
exports.saveUserGoogleToken = saveUserGoogleToken;
exports.getOAuth2Client = getOAuth2Client;
// Google OAuth2 & Calendar Integration (basic structure)
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const googleapis_1 = require("googleapis");
const CONFIG_PATH = path_1.default.join(__dirname, '../../data/google-oauth-config.json');
const TOKENS_PATH = path_1.default.join(__dirname, '../../data/google-oauth-tokens.json');
function getGoogleOAuthConfig() {
    if (!fs_1.default.existsSync(CONFIG_PATH))
        return null;
    return JSON.parse(fs_1.default.readFileSync(CONFIG_PATH, 'utf-8'));
}
function saveGoogleOAuthConfig(config) {
    fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
function getUserGoogleToken(userId) {
    if (!fs_1.default.existsSync(TOKENS_PATH))
        return null;
    const all = JSON.parse(fs_1.default.readFileSync(TOKENS_PATH, 'utf-8'));
    return all[userId] || null;
}
function saveUserGoogleToken(userId, token) {
    let all = {};
    if (fs_1.default.existsSync(TOKENS_PATH))
        all = JSON.parse(fs_1.default.readFileSync(TOKENS_PATH, 'utf-8'));
    all[userId] = token;
    fs_1.default.writeFileSync(TOKENS_PATH, JSON.stringify(all, null, 2), 'utf-8');
}
function getOAuth2Client(userId) {
    const config = getGoogleOAuthConfig();
    if (!config)
        throw new Error('Google OAuth config not set');
    const { client_id, client_secret, redirect_uris } = config.installed || config.web || {};
    const oAuth2Client = new googleapis_1.google.auth.OAuth2(client_id, client_secret, (redirect_uris || [])[0]);
    if (userId) {
        const token = getUserGoogleToken(userId);
        if (token)
            oAuth2Client.setCredentials(token);
    }
    return oAuth2Client;
}
