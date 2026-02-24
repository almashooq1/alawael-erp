const mongoose = require('mongoose');

// نموذج السجل الطبي للمستفيد
const MedicalRecordSchema = new mongoose.Schema({
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'غير معروف']
  },
  allergies: [{
    name: String,
    severity: {
      type: String,
      enum: ['خفيف', 'متوسط', 'شديد', 'خطر']
    },
    notes: String
  }],
  chronicDiseases: [{
    name: String,
    diagnosisDate: Date,
    status: {
      type: String,
      enum: ['نشط', 'تحت السيطرة', 'غير نشط']
    },
    medications: String
  }],
  surgicalHistory: [{
    procedure: String,
    date: Date,
    hospital: String,
    notes: String
  }],
  familyHistory: {
    father: String,
    mother: String,
    siblings: String,
    notes: String
  }
});

// نموذج التشخيص متعدد التخصصات
const DiagnosisSchema = new mongoose.Schema({
  date: {
    type: Date,
    default: Date.now
  },
  specialty: {
    type: String,
    required: true,
    enum: ['طب عام', 'طب أطفال', 'جراحة', 'أمراض باطنية', 'عظام', 'نفسية', 'تأهيل', 'تخاطب', 'علاج طبيعي', 'أخرى']
  },
  doctor: {
    name: String,
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  diagnosis: {
    type: String,
    required: true
  },
  icdCode: String, // رمز التصنيف الدولي للأمراض
  severity: {
    type: String,
    enum: ['خفيف', 'متوسط', 'شديد', 'حرج']
  },
  notes: String,
  recommendations: [String],
  followUpDate: Date
});

// نموذج الملفات الطبية المرفقة
const MedicalFileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['أشعة', 'تحاليل', 'تقرير طبي', 'وصفة طبية', 'صورة', 'مستند', 'أخرى']
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: Number,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  description: String,
  relatedDiagnosis: {
    type: mongoose.Schema.Types.ObjectId
  },
  tags: [String]
});

// نموذج خطة العلاج
const TreatmentPlanSchema = new mongoose.Schema({
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  goal: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['مخطط', 'قيد التنفيذ', 'مكتمل', 'متوقف', 'ملغى'],
    default: 'مخطط'
  },
  sessions: [{
    sessionNumber: Number,
    date: Date,
    duration: Number, // بالدقائق
    type: {
      type: String,
      enum: ['علاج طبيعي', 'تخاطب', 'علاج وظيفي', 'جلسة نفسية', 'متابعة طبية', 'أخرى']
    },
    therapist: {
      name: String,
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    notes: String,
    progress: {
      type: String,
      enum: ['ممتاز', 'جيد', 'متوسط', 'ضعيف']
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: String,
    active: {
      type: Boolean,
      default: true
    }
  }],
  exercises: [{
    name: String,
    description: String,
    frequency: String,
    duration: String,
    instructions: String
  }],
  progress: {
    currentLevel: String,
    improvements: [String],
    challenges: [String],
    nextSteps: [String]
  }
});

// نموذج الحالة الرئيسي
const CaseManagementSchema = new mongoose.Schema({
  // البيانات الأساسية
  caseNumber: {
    type: String,
    required: true,
    unique: true
  },
  beneficiary: {
    name: {
      type: String,
      required: true
    },
    nationalId: String,
    dateOfBirth: Date,
    age: Number,
    gender: {
      type: String,
      enum: ['ذكر', 'أنثى']
    },
    phone: String,
    email: String,
    address: {
      street: String,
      city: String,
      region: String,
      postalCode: String
    },
    emergencyContact: {
      name: String,
      relation: String,
      phone: String
    }
  },
  
  // الحالة والأولوية
  status: {
    type: String,
    enum: ['جديدة', 'قيد الدراسة', 'نشطة', 'متوقفة', 'مكتملة', 'ملغاة'],
    default: 'جديدة'
  },
  priority: {
    type: String,
    enum: ['عادية', 'متوسطة', 'عالية', 'عاجلة'],
    default: 'عادية'
  },
  
  // السجل الطبي الشامل
  medicalRecord: MedicalRecordSchema,
  
  // التشخيصات متعددة التخصصات
  diagnoses: [DiagnosisSchema],
  
  // الملفات الطبية المرفقة
  medicalFiles: [MedicalFileSchema],
  
  // خطط العلاج
  treatmentPlans: [TreatmentPlanSchema],
  
  // التاريخ التأهيلي
  rehabilitationHistory: {
    previousServices: [{
      service: String,
      provider: String,
      startDate: Date,
      endDate: Date,
      outcome: String
    }],
    currentServices: [{
      service: String,
      provider: String,
      startDate: Date,
      frequency: String,
      status: String
    }],
    assistiveDevices: [{
      deviceType: String,
      dateProvided: Date,
      condition: String,
      notes: String
    }]
  },
  
  // فريق العمل المسؤول
  team: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String,
    assignedDate: Date,
    active: {
      type: Boolean,
      default: true
    }
  }],
  
  // الملاحظات والتقييمات
  notes: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    date: {
      type: Date,
      default: Date.now
    },
    category: {
      type: String,
      enum: ['تقييم', 'ملاحظة', 'تحديث', 'تحذير', 'أخرى']
    }
  }],
  
  // تواريخ مهمة
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastUpdateDate: {
    type: Date,
    default: Date.now
  },
  lastVisitDate: Date,
  nextAppointmentDate: Date,
  
  // البيانات التعريفية
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// إنشاء فهارس للبحث السريع
CaseManagementSchema.index({ caseNumber: 1 });
CaseManagementSchema.index({ 'beneficiary.name': 'text' });
CaseManagementSchema.index({ 'beneficiary.nationalId': 1 });
CaseManagementSchema.index({ status: 1, priority: 1 });
CaseManagementSchema.index({ registrationDate: -1 });
CaseManagementSchema.index({ nextAppointmentDate: 1 });

// دالة لتوليد رقم الحالة التلقائي
CaseManagementSchema.pre('save', async function() {
  if (this.isNew && !this.caseNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.caseNumber = `CASE-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  this.lastUpdateDate = new Date();
});

// دالة لحساب العمر
CaseManagementSchema.methods.calculateAge = function() {
  if (this.beneficiary.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.beneficiary.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.beneficiary.age = age;
  }
};

// دالة للحصول على آخر تشخيص
CaseManagementSchema.methods.getLatestDiagnosis = function() {
  if (this.diagnoses && this.diagnoses.length > 0) {
    return this.diagnoses.sort((a, b) => b.date - a.date)[0];
  }
  return null;
};

// دالة للحصول على خطة العلاج النشطة
CaseManagementSchema.methods.getActiveTreatmentPlan = function() {
  return this.treatmentPlans.find(plan => plan.status === 'قيد التنفيذ');
};

// دالة للحصول على إحصائيات الحالة
CaseManagementSchema.methods.getStatistics = function() {
  return {
    totalDiagnoses: this.diagnoses.length,
    totalFiles: this.medicalFiles.length,
    totalTreatmentPlans: this.treatmentPlans.length,
    totalNotes: this.notes.length,
    totalSessions: this.treatmentPlans.reduce((sum, plan) => sum + plan.sessions.length, 0),
    completedSessions: this.treatmentPlans.reduce((sum, plan) => 
      sum + plan.sessions.filter(s => s.completed).length, 0
    )
  };
};

const CaseManagement = mongoose.model('CaseManagement', CaseManagementSchema);

module.exports = CaseManagement;
