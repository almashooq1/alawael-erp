// i18n (Internationalization) Module for Ticketing
// Simple in-memory translation store for demo. In production, use i18next or similar.
export type SupportedLang = 'en' | 'ar' | 'fr';

export interface I18nEntry {
  key: string;
  translations: Record<SupportedLang, string>;
}

export class TicketI18n {
  private entries: I18nEntry[] = [
    { key: 'ticket_created', translations: { en: 'Ticket created', ar: 'تم إنشاء التذكرة', fr: 'Ticket créé' } },
    { key: 'ticket_closed', translations: { en: 'Ticket closed', ar: 'تم إغلاق التذكرة', fr: 'Ticket fermé' } },
    { key: 'escalated', translations: { en: 'Ticket escalated', ar: 'تم تصعيد التذكرة', fr: 'Ticket escaladé' } },
    { key: 'satisfaction_survey', translations: { en: 'Satisfaction Survey', ar: 'استبيان الرضا', fr: 'Enquête de satisfaction' } },
  ];

  translate(key: string, lang: SupportedLang): string {
    const entry = this.entries.find(e => e.key === key);
    if (!entry) return key;
    return entry.translations[lang] || entry.translations['en'] || key;
  }

  addEntry(entry: I18nEntry) {
    this.entries.push(entry);
  }

  listEntries() {
    return this.entries;
  }
}
