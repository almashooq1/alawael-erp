// Export compliance events to Google Sheets
import ComplianceEvent from '../models/compliance-event';
import { google } from 'googleapis';
import { getOAuth2Client } from './google-oauth';
import { ExportImportLogger } from './export-import-logger';

export async function exportComplianceEventsToGoogleSheets({
  userId,
  sheetId,
  range = 'Sheet1!A1',
}: {
  userId: string;
  sheetId: string;
  range?: string;
}) {
  const oAuth2Client = getOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
  const events = await ComplianceEvent.find().lean();
  if (!events.length) return 0;
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
  const values = [headers].concat(
    events.map(e => headers.map(h => e[h] || ''))
  );
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
  ExportImportLogger.log({
    timestamp: new Date().toISOString(),
    userId,
    operation: 'export',
    format: 'google-sheets',
    details: { sheetId, count: events.length },
  });
  return events.length;
}
