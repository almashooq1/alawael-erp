import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface WebhookSubscription {
  id: string;
  event: string;
  url: string;
}

const HOOKS_FILE = 'hooks.json';

function loadHooks(): WebhookSubscription[] {
  if (!fs.existsSync(HOOKS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HOOKS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveHooks(hooks: WebhookSubscription[]) {
  fs.writeFileSync(HOOKS_FILE, JSON.stringify(hooks, null, 2));
}

export class WebhookManager {
  static subscribe(event: string, url: string): WebhookSubscription {
    const hooks = loadHooks();
    const sub: WebhookSubscription = { id: uuidv4(), event, url };
    hooks.push(sub);
    saveHooks(hooks);
    return sub;
  }
  static unsubscribe(id: string): boolean {
    let hooks = loadHooks();
    const before = hooks.length;
    hooks = hooks.filter(h => h.id !== id);
    saveHooks(hooks);
    return hooks.length < before;
  }
  static getHooks(event: string): WebhookSubscription[] {
    return loadHooks().filter(h => h.event === event);
  }
}
