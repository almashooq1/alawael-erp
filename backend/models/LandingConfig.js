/**
 * LandingConfig Model — content + design settings for the public landing page.
 *
 * Phase 25 Commit 1. A single-document config (one per tenant) the admin
 * UI edits and the public site renders. Sections are intentionally
 * loose-typed so the admin can re-order or add custom ones without a
 * schema migration; the editor still pins down a fixed set of "well-known"
 * sections (hero / features / services / about / testimonials / cta /
 * contact / footer) that have first-class UI.
 *
 * Design decisions:
 *   1. One singleton per tenant (`tenantId` indexed unique). Read is public,
 *      write is admin-only. Frontend caches the GET aggressively.
 *   2. `Mixed` for section bodies — admin sends whole-section updates so the
 *      shape lives in the editor + renderer, not in the schema. This keeps
 *      the schema stable while features evolve.
 *   3. `version` increments on every save so the public site can cache-bust.
 */

'use strict';

const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // e.g. 'hero', 'features', 'about'
    type: { type: String, required: true }, // hero | features | services | …
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    title: String,
    titleEn: String,
    subtitle: String,
    subtitleEn: String,
    body: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const ThemeSchema = new mongoose.Schema(
  {
    primaryColor: { type: String, default: '#1976d2' },
    secondaryColor: { type: String, default: '#dc004e' },
    accentColor: { type: String, default: '#ff9800' },
    backgroundColor: { type: String, default: '#ffffff' },
    textColor: { type: String, default: '#111827' },
    fontFamily: { type: String, default: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" },
    logoUrl: String,
    logoUrlDark: String,
    faviconUrl: String,
    direction: { type: String, enum: ['rtl', 'ltr'], default: 'rtl' },
    locale: { type: String, default: 'ar' },
  },
  { _id: false }
);

const SeoSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'منصة العواعل لإعادة التأهيل' },
    description: String,
    keywords: [String],
    ogImage: String,
    twitterCard: { type: String, default: 'summary_large_image' },
    canonicalUrl: String,
  },
  { _id: false }
);

const ContactSchema = new mongoose.Schema(
  {
    address: String,
    phone: String,
    whatsapp: String,
    email: String,
    workingHours: String,
    mapEmbedUrl: String,
  },
  { _id: false }
);

const SocialLinkSchema = new mongoose.Schema(
  {
    platform: String, // twitter / x / instagram / linkedin / youtube / facebook
    url: String,
    label: String,
  },
  { _id: false }
);

const LandingConfigSchema = new mongoose.Schema(
  {
    tenantId: { type: String, default: 'default', index: true, unique: true },
    siteName: { type: String, default: 'منصة العواعل لإعادة التأهيل' },
    siteNameEn: { type: String, default: 'Al-Awael Rehabilitation' },
    sections: [SectionSchema],
    theme: { type: ThemeSchema, default: () => ({}) },
    seo: { type: SeoSchema, default: () => ({}) },
    contact: { type: ContactSchema, default: () => ({}) },
    social: [SocialLinkSchema],
    customCss: String,
    customHead: String,
    publishedAt: Date,
    version: { type: Number, default: 1 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: String,
  },
  { timestamps: true }
);

LandingConfigSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.version = (this.version || 0) + 1;
    if (!this.publishedAt) this.publishedAt = new Date();
  }
  next();
});

// ─── Static: get-or-create singleton ──────────────────────────────────────

LandingConfigSchema.statics.getOrCreate = async function (tenantId = 'default') {
  let cfg = await this.findOne({ tenantId });
  if (!cfg) {
    cfg = await this.create(buildDefaultConfig(tenantId));
  }
  return cfg;
};

function buildDefaultConfig(tenantId) {
  return {
    tenantId,
    siteName: 'منصة العواعل لإعادة التأهيل',
    siteNameEn: 'Al-Awael Rehabilitation',
    sections: [
      {
        id: 'hero',
        type: 'hero',
        enabled: true,
        order: 0,
        title: 'نهتم بكم لأن إنسانيتنا أمانة',
        subtitle: 'مراكز إعادة تأهيل متكاملة لذوي الاحتياجات الخاصة في المملكة العربية السعودية',
        body: {
          ctaPrimary: { label: 'احجز استشارة', href: '#contact' },
          ctaSecondary: { label: 'تعرّف علينا', href: '#about' },
          backgroundImage: '',
          alignment: 'center',
        },
      },
      {
        id: 'stats',
        type: 'stats',
        enabled: true,
        order: 1,
        title: 'أرقامنا',
        body: {
          items: [
            { label: 'فرع', value: '4', icon: 'MapPin' },
            { label: 'مستفيد سنوياً', value: '+2,500', icon: 'Users' },
            { label: 'سنة خبرة', value: '15+', icon: 'Award' },
            { label: 'تخصص علاجي', value: '12', icon: 'Stethoscope' },
          ],
        },
      },
      {
        id: 'services',
        type: 'services',
        enabled: true,
        order: 2,
        title: 'خدماتنا',
        subtitle: 'برامج علاجية وتأهيلية متكاملة بإشراف أخصائيين معتمدين',
        body: {
          items: [
            { title: 'العلاج الطبيعي', description: 'تأهيل حركي شامل', icon: 'Activity' },
            {
              title: 'العلاج الوظيفي',
              description: 'استقلالية في الحياة اليومية',
              icon: 'HandHeart',
            },
            { title: 'علاج النطق', description: 'تطوير التواصل والكلام', icon: 'MessageCircle' },
            { title: 'التأهيل السلوكي', description: 'برامج ABA وتعديل سلوك', icon: 'Brain' },
            { title: 'العلاج المائي', description: 'مسبح علاجي مُجهَّز', icon: 'Droplets' },
            { title: 'الاحتياج التعليمي', description: 'تربية خاصة وفصول دامجة', icon: 'BookOpen' },
          ],
        },
      },
      {
        id: 'about',
        type: 'about',
        enabled: true,
        order: 3,
        title: 'عنا',
        subtitle: 'رحلة 15 عاماً من العطاء',
        body: {
          paragraphs: [
            'تأسّست مراكز العواعل لتكون بيتاً ثانياً لكل مستفيد، نُقدِّم خدماتنا بحرفية ومحبة منذ عام 2010.',
            'نؤمن أن كل إنسان يستحق فرصةً للنمو والاستقلال — مهمتنا أن نوفّرها بأعلى المعايير العالمية.',
          ],
          highlights: [
            { label: 'ترخيص هيئة الصحة', icon: 'Check' },
            { label: 'اعتماد CBAHI', icon: 'Check' },
            { label: 'كادر سعودي مؤهل', icon: 'Check' },
            { label: 'تأمينات معتمدة', icon: 'Check' },
          ],
        },
      },
      {
        id: 'testimonials',
        type: 'testimonials',
        enabled: true,
        order: 4,
        title: 'شهادات أهالينا',
        body: {
          items: [
            {
              name: 'أم محمد',
              role: 'ولية أمر',
              quote: 'لمست تطوّر ابني خلال أشهر قليلة. الفريق متعاون وصبور وذو خبرة عالية.',
            },
            {
              name: 'أبو سارة',
              role: 'ولي أمر',
              quote: 'مكان يبعث على الطمأنينة. التعامل راقٍ والنتائج ملموسة بإذن الله.',
            },
          ],
        },
      },
      {
        id: 'cta',
        type: 'cta',
        enabled: true,
        order: 5,
        title: 'ابدأ رحلة التأهيل اليوم',
        subtitle: 'احجز موعدك الأول واحصل على تقييم شامل',
        body: {
          buttonText: 'احجز موعد',
          buttonLink: 'https://wa.me/966500000000',
          backgroundColor: '#1976d2',
        },
      },
      {
        id: 'contact',
        type: 'contact',
        enabled: true,
        order: 6,
        title: 'تواصل معنا',
        body: {},
      },
    ],
    theme: {
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      accentColor: '#ff9800',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif",
      direction: 'rtl',
      locale: 'ar',
    },
    seo: {
      title: 'منصة العواعل لإعادة التأهيل — مراكز معتمدة في السعودية',
      description:
        'مراكز العواعل لإعادة التأهيل: علاج طبيعي ووظيفي ونطق وسلوكي بإشراف أخصائيين معتمدين.',
      keywords: ['تأهيل', 'علاج طبيعي', 'علاج وظيفي', 'علاج نطق', 'ذوي الإعاقة', 'السعودية'],
      twitterCard: 'summary_large_image',
    },
    contact: {
      address: 'الرياض، المملكة العربية السعودية',
      phone: '+966 11 000 0000',
      whatsapp: '+966 50 000 0000',
      email: 'info@alaweal.org',
      workingHours: 'الأحد - الخميس: 8 صباحاً - 6 مساءً',
    },
    social: [
      { platform: 'twitter', url: 'https://twitter.com/alaweal_org', label: 'تويتر' },
      { platform: 'instagram', url: 'https://instagram.com/alaweal_org', label: 'إنستجرام' },
    ],
  };
}

LandingConfigSchema.statics.buildDefault = buildDefaultConfig;

module.exports = mongoose.model('LandingConfig', LandingConfigSchema);
