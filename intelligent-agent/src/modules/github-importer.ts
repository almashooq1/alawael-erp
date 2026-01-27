// GitHub Learning Data Importer
import axios from 'axios';
import { InteractionLogger } from './interaction-logger';

export async function importFromGitHubRaw(rawUrl: string) {
  const response = await axios.get(rawUrl);
  let arr = response.data;
  if (typeof arr === 'string' && rawUrl.endsWith('.json')) arr = JSON.parse(arr);
  if (!Array.isArray(arr)) arr = [arr];
  for (const row of arr) InteractionLogger.log({
    timestamp: new Date().toISOString(),
    input: JSON.stringify(row),
    output: '',
  });
  return arr.length;
}
