"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookManager = void 0;
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const HOOKS_FILE = 'hooks.json';
function loadHooks() {
    if (!fs_1.default.existsSync(HOOKS_FILE))
        return [];
    try {
        return JSON.parse(fs_1.default.readFileSync(HOOKS_FILE, 'utf8'));
    }
    catch {
        return [];
    }
}
function saveHooks(hooks) {
    fs_1.default.writeFileSync(HOOKS_FILE, JSON.stringify(hooks, null, 2));
}
class WebhookManager {
    static subscribe(event, url) {
        const hooks = loadHooks();
        const sub = { id: (0, uuid_1.v4)(), event, url };
        hooks.push(sub);
        saveHooks(hooks);
        return sub;
    }
    static unsubscribe(id) {
        let hooks = loadHooks();
        const before = hooks.length;
        hooks = hooks.filter(h => h.id !== id);
        saveHooks(hooks);
        return hooks.length < before;
    }
    static getHooks(event) {
        return loadHooks().filter(h => h.event === event);
    }
}
exports.WebhookManager = WebhookManager;
