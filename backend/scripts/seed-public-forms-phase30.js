#!/usr/bin/env node
/**
 * Seed three additional public form templates for visitor-facing services.
 * Idempotent — re-running upserts on templateId.
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const FormTemplate = require('../models/FormTemplate');

const TEMPLATES = [
  {
    templateId: 'beneficiary.request.appointment',
    name: 'طلب موعد',
    nameEn: 'Appointment Request',
    description: 'حجز موعد للزيارة، المعاينة، أو الاستشارة.',
    category: 'beneficiary',
    subcategory: 'beneficiary.request',
    icon: 'CalendarPlus',
    isPublic: true,
    isActive: true,
    isPublished: true,
    isBuiltIn: true,
    version: 1,
    tags: ['catalog', 'aud:beneficiary', 'cat:request', 'ver:1.0.0'],
    fields: [
      { name: 'submitter_name', label: 'الاسم الكامل', type: 'text', required: true },
      { name: 'phone', label: 'رقم الهاتف', type: 'tel', required: true },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email' },
      {
        name: 'service_type',
        label: 'نوع الخدمة',
        type: 'select',
        required: true,
        options: [
          { label: 'علاج طبيعي', value: 'physical-therapy' },
          { label: 'علاج وظيفي', value: 'occupational-therapy' },
          { label: 'علاج نطق', value: 'speech-therapy' },
          { label: 'تقييم أولي', value: 'initial-assessment' },
          { label: 'استشارة عامة', value: 'consultation' },
        ],
      },
      { name: 'preferred_date', label: 'التاريخ المفضل', type: 'date', required: true },
      {
        name: 'preferred_time',
        label: 'الفترة المفضلة',
        type: 'select',
        options: [
          { label: 'صباحاً', value: 'morning' },
          { label: 'مساءً', value: 'afternoon' },
        ],
      },
      { name: 'notes', label: 'ملاحظات إضافية', type: 'textarea' },
    ],
  },
  {
    templateId: 'community.volunteer.signup',
    name: 'طلب تطوع',
    nameEn: 'Volunteer Signup',
    description: 'انضم إلى فريق المتطوعين لدعم مستفيدي العواعل.',
    category: 'community',
    subcategory: 'community.volunteer',
    icon: 'HeartHandshake',
    isPublic: true,
    isActive: true,
    isPublished: true,
    isBuiltIn: true,
    version: 1,
    tags: ['catalog', 'aud:public', 'cat:volunteer', 'ver:1.0.0'],
    fields: [
      { name: 'submitter_name', label: 'الاسم الكامل', type: 'text', required: true },
      { name: 'phone', label: 'رقم الهاتف', type: 'tel', required: true },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true },
      {
        name: 'age_group',
        label: 'الفئة العمرية',
        type: 'select',
        options: [
          { label: '18-24', value: '18-24' },
          { label: '25-34', value: '25-34' },
          { label: '35-49', value: '35-49' },
          { label: '50+', value: '50+' },
        ],
      },
      {
        name: 'interests',
        label: 'مجال الاهتمام',
        type: 'select',
        required: true,
        options: [
          { label: 'مرافقة المستفيدين', value: 'companion' },
          { label: 'فعاليات وأنشطة', value: 'events' },
          { label: 'تعليم ومهارات', value: 'training' },
          { label: 'دعم إداري', value: 'admin' },
        ],
      },
      {
        name: 'availability',
        label: 'الأيام المتاحة',
        type: 'select',
        options: [
          { label: 'أيام الأسبوع', value: 'weekdays' },
          { label: 'نهاية الأسبوع', value: 'weekends' },
          { label: 'مرنة', value: 'flexible' },
        ],
      },
      { name: 'experience', label: 'خبرات سابقة', type: 'textarea' },
    ],
  },
  {
    templateId: 'community.inquiry.general',
    name: 'استفسار عام',
    nameEn: 'General Inquiry',
    description: 'لديك سؤال عام؟ سنردّ عليك خلال 24 ساعة.',
    category: 'community',
    subcategory: 'community.inquiry',
    icon: 'MessageCircle',
    isPublic: true,
    isActive: true,
    isPublished: true,
    isBuiltIn: true,
    version: 1,
    tags: ['catalog', 'aud:public', 'cat:inquiry', 'ver:1.0.0'],
    fields: [
      { name: 'submitter_name', label: 'الاسم', type: 'text', required: true },
      { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true },
      { name: 'phone', label: 'الهاتف (اختياري)', type: 'tel' },
      { name: 'subject', label: 'موضوع الاستفسار', type: 'text', required: true },
      { name: 'message', label: 'تفاصيل الاستفسار', type: 'textarea', required: true },
    ],
  },
];

(async () => {
  const uri =
    process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alawael';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('connected:', uri.replace(/:\/\/.*@/, '://***@'));

  for (const t of TEMPLATES) {
    const r = await FormTemplate.findOneAndUpdate(
      { templateId: t.templateId },
      { $set: t },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✓ ${t.templateId} (${r.isPublic ? 'public' : 'internal'})`);
  }

  const count = await FormTemplate.countDocuments({ isPublic: true, isActive: true });
  console.log(`\nTotal public + active templates: ${count}`);
  await mongoose.disconnect();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
