"use strict";
// Multilingual (i18n) & Dynamic Translation Support Module
// Manages translations, languages, and dynamic text for the system
Object.defineProperty(exports, "__esModule", { value: true });
exports.I18nManager = void 0;
class I18nManager {
    constructor() {
        this.translations = [];
        this.supportedLangs = ['en', 'ar', 'fr', 'de', 'es'];
        this.defaultLang = 'en';
    }
    addTranslation(key, lang, value) {
        let entry = this.translations.find(t => t.key === key && t.lang === lang);
        if (entry) {
            entry.value = value;
            entry.updatedAt = new Date().toISOString();
        }
        else {
            entry = { key, lang, value, updatedAt: new Date().toISOString() };
            this.translations.push(entry);
        }
        return entry;
    }
    translate(key, lang) {
        const entry = this.translations.find(t => t.key === key && t.lang === lang);
        if (entry)
            return entry.value;
        // fallback to default
        const fallback = this.translations.find(t => t.key === key && t.lang === this.defaultLang);
        return fallback ? fallback.value : key;
    }
    listTranslations(lang) {
        return lang ? this.translations.filter(t => t.lang === lang) : this.translations;
    }
    listSupportedLangs() {
        return this.supportedLangs;
    }
}
exports.I18nManager = I18nManager;
