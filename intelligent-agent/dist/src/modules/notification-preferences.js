"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPreferencesManager = void 0;
class NotificationPreferencesManager {
    constructor() {
        this.prefs = [];
    }
    setPreference(pref) {
        const idx = this.prefs.findIndex(p => p.userId === pref.userId);
        if (idx >= 0)
            this.prefs[idx] = pref;
        else
            this.prefs.push(pref);
        return pref;
    }
    getPreference(userId) {
        return this.prefs.find(p => p.userId === userId);
    }
    listPreferences() {
        return this.prefs;
    }
}
exports.NotificationPreferencesManager = NotificationPreferencesManager;
