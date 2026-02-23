/**
 * Specialized Rehabilitation Center Systems
 * أنظمة متخصصة لمراكز تأهيل ذوي الإعاقة
 *
 * @module models/rehabilitation-specialized
 * @description أنظمة متخصصة إضافية للتأهيل الشامل
 * @version 4.0.0
 * @date 2026-02-21
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============================================
// 1. نظام إدارة النقل والمواصلات
// Transportation Management System
// ============================================

const transportationSchema = new Schema({
  transport_id: {
    type: String,
    unique: true,
    default: () => `TRN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات المركبة
  vehicle_info: {
    vehicle_type: { type: String, enum: ['bus', 'van', 'car', 'wheelchair_van', 'ambulance'] },
    plate_number: { type: String, required: true },
    model: String,
    year: Number,
    capacity: Number,
    wheelchair_capacity: Number,
    features: [{
      type: String,
      enum: ['wheelchair_lift', 'air_conditioning', 'gps', 'first_aid_kit', 'cctv', 'intercom']
    }],
    ownership: { type: String, enum: ['owned', 'rented', 'contracted'] }
  },

  // السائق
  driver: {
    driver_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    phone: String,
    license_number: String,
    license_expiry: Date,
    license_type: String,
    training_completed: [String],
    background_check: { type: Boolean, default: false },
    background_check_date: Date
  },

  // المرافق (إن وجد)
  attendant: {
    attendant_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: String,
    phone: String
  },

  // الصيانة
  maintenance: {
    last_service_date: Date,
    next_service_date: Date,
    last_inspection_date: Date,
    next_inspection_date: Date,
    insurance_expiry: Date,
    mileage: Number,
    maintenance_records: [{
      date: Date,
      type: String,
      description: String,
      cost: Number,
      garage: String
    }]
  },

  // الرحلات المجدولة
  scheduled_trips: [{
    trip_id: String,
    trip_name: String,
    trip_type: { type: String, enum: ['pickup', 'dropoff', 'field_trip', 'medical', 'other'] },
    days: [String],
    pickup_time: String,
    route: [{
      stop_order: Number,
      location_name: String,
      address: String,
      coordinates: { lat: Number, lng: Number },
      scheduled_time: String,
      beneficiaries: [{ type: Schema.Types.ObjectId, ref: 'Beneficiary' }]
    }],
    is_active: { type: Boolean, default: true }
  }],

  // سجل الرحلات
  trip_logs: [{
    trip_date: Date,
    trip_id: String,
    driver: { type: Schema.Types.ObjectId, ref: 'User' },
    start_time: String,
    end_time: String,
    start_mileage: Number,
    end_mileage: Number,
    passengers_count: Number,
    incidents: String,
    notes: String
  }],

  // التوفر
  availability: {
    status: { type: String, enum: ['available', 'in_use', 'maintenance', 'out_of_service'], default: 'available' },
    current_location: { lat: Number, lng: Number },
    assigned_trips_today: [String]
  },

  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// ============================================
// 2. نظام إدارة التأمين والفوترة
// Insurance and Billing Management System
// ============================================

const insuranceClaimSchema = new Schema({
  claim_id: {
    type: String,
    unique: true,
    default: () => `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // معلومات التأمين
  insurance_info: {
    insurance_company: { type: String, required: true },
    policy_number: String,
    member_id: String,
    group_number: String,
    policy_holder: String,
    relation_to_beneficiary: String,
    coverage_type: String,
    effective_date: Date,
    expiry_date: Date,
    pre_authorization_required: { type: Boolean, default: true }
  },

  // تفاصيل المطالبة
  claim_details: {
    claim_type: { type: String, enum: ['service', 'medication', 'equipment', 'therapy', 'assessment'] },
    service_date: { type: Date, required: true },
    submission_date: { type: Date, default: Date.now },
    diagnosis_codes: [String], // ICD-10
    procedure_codes: [String], // CPT/HCPCS
    services: [{
      service_name: String,
      code: String,
      quantity: Number,
      unit_price: Number,
      total_price: Number
    }],
    total_amount: { type: Number, required: true },
    approved_amount: Number
  },

  // الموافقة المسبقة
  pre_authorization: {
    required: { type: Boolean, default: true },
    authorization_number: String,
    request_date: Date,
    approval_date: Date,
    expiry_date: Date,
    approved_sessions: Number,
    used_sessions: Number,
    denied_reason: String
  },

  // حالة المطالبة
  status: {
    current_status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'denied', 'paid', 'appealed'],
      default: 'draft'
    },
    status_history: [{
      status: String,
      date: { type: Date, default: Date.now },
      notes: String,
      updated_by: { type: Schema.Types.ObjectId, ref: 'User' }
    }]
  },

  // الدفع
  payment: {
    patient_responsibility: Number,
    insurance_responsibility: Number,
    payment_received: { type: Boolean, default: false },
    payment_date: Date,
    payment_reference: String,
    outstanding_balance: Number
  },

  // الاستئناف
  appeals: [{
    appeal_date: Date,
    appeal_reason: String,
    additional_documents: [String],
    outcome: String,
    outcome_date: Date
  }],

  // المستندات
  documents: [{
    document_type: String,
    file_name: String,
    file_url: String,
    upload_date: { type: Date, default: Date.now }
  }],

  submitted_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const billingRecordSchema = new Schema({
  invoice_id: {
    type: String,
    unique: true,
    default: () => `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // معلومات الفاتورة
  invoice_info: {
    invoice_number: String,
    invoice_date: { type: Date, default: Date.now },
    due_date: Date,
    billing_period: { start: Date, end: Date }
  },

  // الخدمات المُفوترة
  services: [{
    service_id: String,
    service_name: String,
    service_date: Date,
    therapist: String,
    duration: Number,
    rate: Number,
    quantity: Number,
    subtotal: Number,
    discount: Number,
    total: Number
  }],

  // ملخص الفاتورة
  summary: {
    subtotal: Number,
    discount: Number,
    tax: Number,
    total_amount: Number,
    amount_paid: Number,
    balance_due: Number
  },

  // الدفعات
  payments: [{
    payment_date: Date,
    payment_method: { type: String, enum: ['cash', 'credit_card', 'bank_transfer', 'check', 'insurance'] },
    amount: Number,
    reference_number: String,
    received_by: { type: Schema.Types.ObjectId, ref: 'User' }
  }],

  // حالة الفاتورة
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft'
  },

  notes: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 3. نظام إدارة المتطوعين
// Volunteer Management System
// ============================================

const volunteerSchema = new Schema({
  volunteer_id: {
    type: String,
    unique: true,
    default: () => `VOL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },

  // المعلومات الشخصية
  personal_info: {
    full_name: { type: String, required: true },
    national_id: String,
    date_of_birth: Date,
    gender: String,
    phone: String,
    email: String,
    address: String,
    emergency_contact: {
      name: String,
      relationship: String,
      phone: String
    }
  },

  // المهارات والاهتمامات
  skills_interests: {
    skills: [String],
    languages: [String],
    interests: [String],
    preferred_activities: [String],
    experience_with_disabilities: { type: Boolean, default: false },
    experience_details: String
  },

  // التوفر
  availability: {
    preferred_days: [String],
    preferred_times: [String],
    hours_per_week: Number,
    start_date: Date,
    end_date: Date,
    is_flexible: { type: Boolean, default: false }
  },

  // التدريب
  training: {
    orientation_completed: { type: Boolean, default: false },
    orientation_date: Date,
    trainings_completed: [{
      training_name: String,
      date: Date,
      hours: Number,
      certificate_url: String
    }],
    required_trainings: [String]
  },

  // الفحوصات
  screening: {
    application_date: Date,
    interview_date: Date,
    interview_by: { type: Schema.Types.ObjectId, ref: 'User' },
    background_check: {
      status: { type: String, enum: ['pending', 'cleared', 'failed'] },
      check_date: Date,
      expiry_date: Date
    },
    medical_clearance: {
      status: { type: String, enum: ['pending', 'cleared', 'failed'] },
      clearance_date: Date
    },
    references_checked: { type: Boolean, default: false }
  },

  // التعيينات
  assignments: [{
    assignment_id: String,
    department: String,
    role: String,
    supervisor: { type: Schema.Types.ObjectId, ref: 'User' },
    start_date: Date,
    end_date: Date,
    status: { type: String, enum: ['active', 'completed', 'terminated'] },
    termination_reason: String
  }],

  // سجل الساعات
  hours_log: [{
    date: Date,
    hours: Number,
    activity: String,
    department: String,
    supervisor: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String
  }],

  // التقييم
  performance: {
    evaluations: [{
      date: Date,
      evaluator: { type: Schema.Types.ObjectId, ref: 'User' },
      rating: { type: Number, min: 1, max: 5 },
      strengths: [String],
      areas_for_improvement: [String],
      comments: String
    }],
    recognition: [String]
  },

  // الحالة
  status: {
    type: String,
    enum: ['applicant', 'screening', 'active', 'inactive', 'suspended', 'terminated'],
    default: 'applicant'
  }
}, { timestamps: true });

// ============================================
// 4. نظام التبرعات والكفالات
// Donations and Sponsorship System
// ============================================

const donationSchema = new Schema({
  donation_id: {
    type: String,
    unique: true,
    default: () => `DON-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات المتبرع
  donor_info: {
    donor_type: { type: String, enum: ['individual', 'corporate', 'government', 'foundation', 'anonymous'] },
    name: String,
    contact_person: String,
    email: String,
    phone: String,
    address: String,
    national_id: String,
    cr_number: String, // للشركات
    is_recurring_donor: { type: Boolean, default: false }
  },

  // تفاصيل التبرع
  donation_details: {
    donation_type: { type: String, enum: ['monetary', 'in_kind', 'service', 'property'] },
    amount: Number,
    currency: { type: String, default: 'SAR' },
    payment_method: { type: String, enum: ['cash', 'credit_card', 'bank_transfer', 'check', 'online'] },
    payment_reference: String,
    donation_date: { type: Date, default: Date.now },
    recurring: { type: Boolean, default: false },
    recurring_frequency: { type: String, enum: ['monthly', 'quarterly', 'annually'] },
    in_kind_description: String,
    estimated_value: Number
  },

  // تخصيص التبرع
  allocation: {
    unrestricted: { type: Boolean, default: false },
    restricted_to: [String], // برامج أو مشاريع محددة
    beneficiary_specific: {
      beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
      purpose: String
    }
  },

  // الاعتراف
  recognition: {
    anonymous: { type: Boolean, default: false },
    recognition_type: { type: String, enum: ['public', 'private', 'certificate', 'plaque', 'naming'] },
    thank_you_sent: { type: Boolean, default: false },
    thank_you_date: Date,
    certificate_issued: { type: Boolean, default: false },
    certificate_url: String
  },

  // الإيصال الضريبي
  tax_receipt: {
    issued: { type: Boolean, default: false },
    receipt_number: String,
    issue_date: Date,
    receipt_url: String
  },

  // الكفالة (إن وجدت)
  sponsorship: {
    is_sponsorship: { type: Boolean, default: false },
    sponsored_beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    sponsorship_start: Date,
    sponsorship_end: Date,
    monthly_amount: Number,
    status: { type: String, enum: ['active', 'paused', 'ended'] }
  },

  status: {
    type: String,
    enum: ['pending', 'received', 'deposited', 'allocated', 'refunded'],
    default: 'pending'
  },

  received_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 5. نظام الإقامة الداخلية
// Residential Care System
// ============================================

const residentialUnitSchema = new Schema({
  unit_id: {
    type: String,
    unique: true,
    default: () => `RES-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات الوحدة
  unit_info: {
    unit_name: { type: String, required: true },
    building: String,
    floor: String,
    unit_type: { type: String, enum: ['single', 'double', 'dormitory', 'family'] },
    capacity: Number,
    current_occupancy: { type: Number, default: 0 },
    gender: { type: String, enum: ['male', 'female', 'mixed'] },
    age_group: { type: String, enum: ['children', 'adolescents', 'adults', 'mixed'] }
  },

  // الميزات
  features: {
    wheelchair_accessible: { type: Boolean, default: true },
    private_bathroom: { type: Boolean, default: false },
    air_conditioning: { type: Boolean, default: true },
    furnished: { type: Boolean, default: true },
    special_equipment: [String]
  },

  // المقيمين
  residents: [{
    beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    bed_number: String,
    admission_date: Date,
    expected_discharge: Date,
    primary_diagnosis: String,
    care_level: { type: String, enum: ['independent', 'assisted', 'skilled'] },
    assigned_staff: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  }],

  // جدول الرعاية
  care_schedule: {
    wake_up_time: String,
    meal_times: { breakfast: String, lunch: String, dinner: String },
    medication_times: [String],
    activity_schedule: [{
      time: String,
      activity: String,
      location: String
    }],
    visiting_hours: { start: String, end: String }
  },

  // الفريق
  care_team: [{
    staff_id: { type: Schema.Types.ObjectId, ref: 'User' },
    role: String,
    shift: { type: String, enum: ['morning', 'afternoon', 'night', 'rotating'] },
    is_primary: { type: Boolean, default: false }
  }],

  // الصيانة
  maintenance: {
    last_inspection: Date,
    next_inspection: Date,
    issues: [{
      issue: String,
      reported_date: Date,
      status: { type: String, enum: ['reported', 'in_progress', 'resolved'] },
      resolved_date: Date
    }]
  },

  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// ============================================
// 6. نظام الأنشطة الترفيهية والتربوية
// Recreational and Educational Activities System
// ============================================

const activitySchema = new Schema({
  activity_id: {
    type: String,
    unique: true,
    default: () => `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات النشاط
  activity_info: {
    title: { type: String, required: true },
    description: String,
    category: {
      type: String,
      enum: ['sports', 'arts', 'music', 'educational', 'social', 'cultural', 'outdoor', 'therapeutic', 'vocational']
    },
    activity_type: { type: String, enum: ['individual', 'group', 'competition', 'trip', 'event'] },
    objectives: [String]
  },

  // الجدولة
  schedule: {
    start_date: Date,
    end_date: Date,
    frequency: { type: String, enum: ['one_time', 'daily', 'weekly', 'monthly'] },
    days: [String],
    start_time: String,
    end_time: String,
    duration_minutes: Number,
    location: String
  },

  // المشاركون
  participants: {
    max_participants: Number,
    current_participants: { type: Number, default: 0 },
    eligible_groups: [String],
    age_range: { min: Number, max: Number },
    disability_types: [String],
    skill_level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all'] },
    enrolled_beneficiaries: [{ type: Schema.Types.ObjectId, ref: 'Beneficiary' }],
    waiting_list: [{ type: Schema.Types.ObjectId, ref: 'Beneficiary' }]
  },

  // الموارد
  resources: {
    staff_required: [{
      role: String,
      count: Number,
      assigned: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    }],
    equipment_needed: [String],
    materials_needed: [String],
    budget: Number
  },

  // الرحلات والفعاليات الخاصة
  special_event: {
    is_special: { type: Boolean, default: false },
    venue: String,
    transportation_required: { type: Boolean, default: false },
    parent_involvement: { type: Boolean, default: false },
    external_partners: [String],
    cost_per_participant: Number
  },

  // سجل الجلسات
  sessions_log: [{
    session_date: Date,
    attendees_count: Number,
    attendees: [{ type: Schema.Types.ObjectId, ref: 'Beneficiary' }],
    facilitator: { type: Schema.Types.ObjectId, ref: 'User' },
    activities_completed: [String],
    notes: String,
    photos: [String]
  }],

  // التقييم
  evaluation: {
    participant_feedback: [{
      beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
      rating: { type: Number, min: 1, max: 5 },
      comments: String,
      date: Date
    }],
    outcomes_achieved: [String],
    recommendations: String
  },

  status: {
    type: String,
    enum: ['planning', 'registration', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },

  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 7. نظام التوثيق والأرشفة
// Documentation and Archiving System
// ============================================

const documentSchema = new Schema({
  document_id: {
    type: String,
    unique: true,
    default: () => `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات المستند
  document_info: {
    title: { type: String, required: true },
    description: String,
    document_type: {
      type: String,
      enum: ['assessment', 'report', 'certificate', 'correspondence', 'contract', 'policy', 'medical', 'educational', 'legal', 'other']
    },
    category: String,
    language: { type: String, default: 'ar' }
  },

  // الارتباط
  related_to: {
    entity_type: { type: String, enum: ['beneficiary', 'staff', 'center', 'program', 'general'] },
    entity_id: { type: Schema.Types.ObjectId }
  },

  // الملف
  file: {
    original_name: String,
    stored_name: String,
    file_path: String,
    file_url: String,
    file_size: Number,
    file_type: String,
    mime_type: String,
    checksum: String
  },

  // الإصدارات
  versions: [{
    version_number: String,
    upload_date: { type: Date, default: Date.now },
    uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' },
    changes: String,
    file_url: String
  }],

  // الأمان
  security: {
    access_level: { type: String, enum: ['public', 'internal', 'confidential', 'restricted'], default: 'internal' },
    password_protected: { type: Boolean, default: false },
    password_hash: String,
    watermark: { type: Boolean, default: false },
    download_tracking: { type: Boolean, default: false }
  },

  // التخزين
  retention: {
    retention_period_years: { type: Number, default: 10 },
    archive_date: Date,
    destruction_date: Date,
    legal_hold: { type: Boolean, default: false }
  },

  // الوصول
  access_log: [{
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    access_type: { type: String, enum: ['view', 'download', 'edit', 'print'] },
    access_date: { type: Date, default: Date.now },
    ip_address: String
  }],

  // الموافقات
  approvals: [{
    approver_id: { type: Schema.Types.ObjectId, ref: 'User' },
    approval_status: { type: String, enum: ['pending', 'approved', 'rejected'] },
    approval_date: Date,
    comments: String
  }],

  tags: [String],
  uploaded_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 8. نظام التقويم والأحداث
// Calendar and Events System
// ============================================

const eventSchema = new Schema({
  event_id: {
    type: String,
    unique: true,
    default: () => `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },

  // معلومات الحدث
  event_info: {
    title: { type: String, required: true },
    description: String,
    event_type: {
      type: String,
      enum: ['meeting', 'training', 'conference', 'celebration', 'fundraiser', 'assessment', 'review', 'deadline', 'reminder', 'other']
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] }
  },

  // التوقيت
  timing: {
    start_datetime: { type: Date, required: true },
    end_datetime: { type: Date, required: true },
    is_all_day: { type: Boolean, default: false },
    timezone: { type: String, default: 'Asia/Riyadh' },
    recurrence: {
      is_recurring: { type: Boolean, default: false },
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
      interval: Number,
      end_date: Date,
      count: Number
    }
  },

  // الموقع
  location: {
    venue: String,
    address: String,
    room: String,
    is_virtual: { type: Boolean, default: false },
    virtual_link: String,
    coordinates: { lat: Number, lng: Number }
  },

  // المشاركون
  participants: {
    organizers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    attendees: [{
      entity_type: { type: String, enum: ['staff', 'beneficiary', 'family', 'external'] },
      entity_id: { type: Schema.Types.ObjectId },
      name: String,
      email: String,
      response_status: { type: String, enum: ['pending', 'accepted', 'declined', 'tentative'] }
    }],
    max_attendees: Number,
    required_roles: [String]
  },

  // التذكيرات
  reminders: [{
    reminder_type: { type: String, enum: ['email', 'sms', 'push', 'in_app'] },
    time_before: Number, // بالدقائق
    recipients: [String],
    sent: { type: Boolean, default: false }
  }],

  // المرفقات
  attachments: [{
    file_name: String,
    file_url: String,
    file_type: String
  }],

  // الملاحظات
  notes: String,
  agenda: [String],

  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed'],
    default: 'scheduled'
  },

  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// ============================================
// 9. نظام الملاحظات السريرية
// Clinical Notes System
// ============================================

const clinicalNoteSchema = new Schema({
  note_id: {
    type: String,
    unique: true,
    default: () => `CLN-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  },
  beneficiary_id: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

  // معلومات الملاحظة
  note_info: {
    note_type: {
      type: String,
      enum: ['progress', 'session', 'observation', 'consultation', 'evaluation', 'discharge', 'follow_up', 'incident'],
      required: true
    },
    session_date: { type: Date, required: true },
    session_number: Number,
    duration: Number
  },

  // المحتوى (SOAP format)
  content: {
    subjective: String, // ما ذكره المستفيد/ولي الأمر
    objective: String,  // الملاحظات الموضوعية
    assessment: String, // تقييم المعالج
    plan: String        // الخطة المستقبلية
  },

  // الأهداف المستهدفة
  goals_addressed: [{
    goal_id: String,
    goal_description: String,
    progress_notes: String,
    achievement_level: { type: String, enum: ['not_started', 'emerging', 'developing', 'achieving', 'achieved'] }
  }],

  // التدخلات
  interventions: [{
    intervention: String,
    techniques_used: [String],
    materials_used: [String],
    response: String,
    effectiveness: { type: String, enum: ['not_effective', 'somewhat_effective', 'effective', 'very_effective'] }
  }],

  // الملاحظات السلوكية
  behavioral_observations: {
    mood: String,
    affect: String,
    behavior: String,
    attention: String,
    cooperation: String,
    special_observations: String
  },

  // التوصيات
  recommendations: {
    for_next_session: [String],
    for_home: [String],
    referrals_needed: [String],
    modifications: [String]
  },

  // التوقيعات
  signatures: {
    therapist: {
      user_id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      credential: String,
      signature_date: Date
    },
    supervisor: {
      user_id: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      review_date: Date,
      comments: String
    }
  },

  // الحالة
  status: {
    type: String,
    enum: ['draft', 'pending_signature', 'pending_review', 'approved', 'amended'],
    default: 'draft'
  },

  amendments: [{
    amendment_date: Date,
    reason: String,
    changes: String,
    amended_by: { type: Schema.Types.ObjectId, ref: 'User' }
  }]
}, { timestamps: true });

// ============================================
// إنشاء الفهارس
// ============================================

transportationSchema.index({ 'vehicle_info.plate_number': 1 });
insuranceClaimSchema.index({ beneficiary_id: 1, 'status.current_status': 1 });
billingRecordSchema.index({ beneficiary_id: 1, status: 1 });
volunteerSchema.index({ status: 1 });
donationSchema.index({ 'donor_info.name': 1, 'donation_details.donation_date': -1 });
residentialUnitSchema.index({ 'unit_info.unit_type': 1, is_active: 1 });
activitySchema.index({ status: 1, 'schedule.start_date': 1 });
documentSchema.index({ 'document_info.document_type': 1, 'related_to.entity_type': 1 });
eventSchema.index({ 'timing.start_datetime': 1, status: 1 });
clinicalNoteSchema.index({ beneficiary_id: 1, 'note_info.session_date': -1 });

// ============================================
// تصدير النماذج
// ============================================

module.exports = {
  // النقل
  Transportation: mongoose.model('Transportation', transportationSchema),

  // التأمين والفوترة
  InsuranceClaim: mongoose.model('InsuranceClaim', insuranceClaimSchema),
  BillingRecord: mongoose.model('BillingRecord', billingRecordSchema),

  // المتطوعين
  Volunteer: mongoose.model('Volunteer', volunteerSchema),

  // التبرعات
  Donation: mongoose.model('Donation', donationSchema),

  // الإقامة
  ResidentialUnit: mongoose.model('ResidentialUnit', residentialUnitSchema),

  // الأنشطة
  Activity: mongoose.model('Activity', activitySchema),

  // التوثيق
  Document: mongoose.model('Document', documentSchema),

  // التقويم
  Event: mongoose.model('Event', eventSchema),

  // الملاحظات السريرية
  ClinicalNote: mongoose.model('ClinicalNote', clinicalNoteSchema)
};
