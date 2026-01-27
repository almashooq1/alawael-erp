"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToGoogleDrive = uploadToGoogleDrive;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
async function uploadToGoogleDrive({ credentials, token, filePath, mimeType, name }) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new googleapis_1.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);
    const drive = googleapis_1.google.drive({ version: 'v3', auth: oAuth2Client });
    const fileMetadata = { name };
    const media = { mimeType, body: fs_1.default.createReadStream(filePath) };
    const res = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id',
    });
    return res.data.id;
}
