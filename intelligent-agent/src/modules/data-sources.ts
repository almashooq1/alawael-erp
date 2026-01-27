// إدارة مصادر البيانات الذكية
export interface DataSource {
  id: string;
  type: 'google-sheets' | 'github' | 'notion' | 'airtable' | 'sharepoint' | 'api' | 'custom';
  name: string;
  config: any;
  enabled: boolean;
  schedule: string; // كرون
  lastImport?: string;
  lastStatus?: 'success' | 'error';
}

const sources: DataSource[] = [];

export function addSource(type: DataSource['type'], name: string, config: any, schedule: string) {
  const src: DataSource = {
    id: Math.random().toString(36).slice(2),
    type, name, config, enabled: true, schedule
  };
  sources.push(src);
  return src;
}

export function updateSource(id: string, patch: Partial<DataSource>) {
  const src = sources.find(s => s.id === id);
  if (src) Object.assign(src, patch);
  return src;
}

export function listSources() {
  return sources;
}

export function removeSource(id: string) {
  const idx = sources.findIndex(s => s.id === id);
  if (idx >= 0) sources.splice(idx, 1);
}
