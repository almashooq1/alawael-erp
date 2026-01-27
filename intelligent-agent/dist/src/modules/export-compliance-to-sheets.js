"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportComplianceEventsToGoogleSheets = exportComplianceEventsToGoogleSheets;
// Export compliance events to Google Sheets
const compliance_event_1 = __importDefault(require("../models/compliance-event"));
const googleapis_1 = require("googleapis");
const google_oauth_1 = require("./google-oauth");
const export_import_logger_1 = require("./export-import-logger");
async function exportComplianceEventsToGoogleSheets({ userId, sheetId, range = 'Sheet1!A1', }) {
    const oAuth2Client = (0, google_oauth_1.getOAuth2Client)(userId);
    const sheets = googleapis_1.google.sheets({ version: 'v4', auth: oAuth2Client });
    const events = await compliance_event_1.default.find().lean();
    if (!events.length)
        return 0;
    const headers = [
        'timestamp',
        'userId',
        'action',
        'resource',
        'resourceId',
        'status',
        'details',
        'policy',
    ];
    const values = [headers].concat(events.map(e => headers.map(h => e[h] || '')));
    await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values },
    });
    export_import_logger_1.ExportImportLogger.log({
        userId,
        operation: 'export',
        format: 'google-sheets',
        details: { sheetId, count: events.length },
    });
    return events.length;
}
