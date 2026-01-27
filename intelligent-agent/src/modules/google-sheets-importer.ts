// Google Sheets Learning Data Importer
import axios from 'axios';
import { InteractionLogger } from './interaction-logger';

export async function importFromGoogleSheets(sheetId: string, apiKey: string, range = 'Sheet1!A1:F1000') {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  const response = await axios.get(url);
  const rows = response.data.values;
  if (!rows || rows.length < 2) return 0;
  const headers = rows[0];
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = rows[i][j];
    InteractionLogger.log({
      timestamp: new Date().toISOString(),
      input: JSON.stringify(obj),
      output: '',
    });
    count++;
  }
  return count;
}
