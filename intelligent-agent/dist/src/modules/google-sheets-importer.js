"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFromGoogleSheets = importFromGoogleSheets;
// Google Sheets Learning Data Importer
const axios_1 = __importDefault(require("axios"));
const interaction_logger_1 = require("./interaction-logger");
async function importFromGoogleSheets(sheetId, apiKey, range = 'Sheet1!A1:F1000') {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
    const response = await axios_1.default.get(url);
    const rows = response.data.values;
    if (!rows || rows.length < 2)
        return 0;
    const headers = rows[0];
    let count = 0;
    for (let i = 1; i < rows.length; i++) {
        const obj = {};
        for (let j = 0; j < headers.length; j++)
            obj[headers[j]] = rows[i][j];
        interaction_logger_1.InteractionLogger.log({
            timestamp: new Date().toISOString(),
            input: JSON.stringify(obj),
            output: '',
        });
        count++;
    }
    return count;
}
