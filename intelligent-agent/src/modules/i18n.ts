// Multilingual (i18n) & Dynamic Translation Support Module
// Manages translations, languages, and dynamic text for the system

export interface TranslationEntry {
  key: string;
  lang: string;
  value: string;
  updatedAt: string;
}

export class I18nManager {
  private translations: TranslationEntry[] = [];
  private supportedLangs: string[] = ['en', 'ar', 'fr', 'de', 'es'];
  private defaultLang = 'en';

  addTranslation(key: string, lang: string, value: string): TranslationEntry {
    let entry = this.translations.find(t => t.key === key && t.lang === lang);
    if (entry) {
      entry.value = value;
      entry.updatedAt = new Date().toISOString();
    } else {
      entry = { key, lang, value, updatedAt: new Date().toISOString() };
      this.translations.push(entry);
    }
    return entry;
  }

  translate(key: string, lang: string): string {
    const entry = this.translations.find(t => t.key === key && t.lang === lang);
    if (entry) return entry.value;
    // fallback to default
    const fallback = this.translations.find(t => t.key === key && t.lang === this.defaultLang);
    return fallback ? fallback.value : key;
  }

  listTranslations(lang?: string): TranslationEntry[] {
    return lang ? this.translations.filter(t => t.lang === lang) : this.translations;
  }

  listSupportedLangs(): string[] {
    return this.supportedLangs;
  }
}
