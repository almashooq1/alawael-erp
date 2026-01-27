"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketI18n = void 0;
class TicketI18n {
    constructor() {
        this.entries = [
            { key: 'ticket_created', translations: { en: 'Ticket created', ar: 'تم إنشاء التذكرة', fr: 'Ticket créé' } },
            { key: 'ticket_closed', translations: { en: 'Ticket closed', ar: 'تم إغلاق التذكرة', fr: 'Ticket fermé' } },
            { key: 'escalated', translations: { en: 'Ticket escalated', ar: 'تم تصعيد التذكرة', fr: 'Ticket escaladé' } },
            { key: 'satisfaction_survey', translations: { en: 'Satisfaction Survey', ar: 'استبيان الرضا', fr: 'Enquête de satisfaction' } },
        ];
    }
    translate(key, lang) {
        const entry = this.entries.find(e => e.key === key);
        if (!entry)
            return key;
        return entry.translations[lang] || entry.translations['en'] || key;
    }
    addEntry(entry) {
        this.entries.push(entry);
    }
    listEntries() {
        return this.entries;
    }
}
exports.TicketI18n = TicketI18n;
