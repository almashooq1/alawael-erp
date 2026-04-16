# 04 — Canonical Data Model | النموذج الكنسي الموحّد

> نموذج البيانات المركزي الذي يربط جميع السياقات، مع الكيانات الـ26 الرئيسية والعلاقات

---

## 1. مبادئ النمذجة

1. **مصطلحات موحّدة (Ubiquitous Language)** — اسم واحد كنسي لكل مفهوم.
2. **Aggregate Roots** تحدد حدود التعديل الذرية.
3. **`branchId` إلزامي** على كل كيان تشغيلي (ما عدا الـ Global).
4. **Soft Delete دائم** (`deletedAt`) لكل الكيانات التشغيلية (لا حذف فعلي).
5. **Audit Fields** في كل كيان: `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `version`.
6. **IDs Globally Unique** — `UUIDv7` (sortable by time) أو `ObjectId`.
7. **Bilingual Fields** — حقول مثل `name` تكون `{ ar, en }`.
8. **Enums Canonical** — ثوابت في `/config/constants/` (مثل ROLES).
9. **Temporal Fields** — `effectiveFrom`, `effectiveTo` للسياسات والتعاقدات.
10. **Immutable Ledger** لكيانات مالية (لا تعديل قيد يومية — عكس فقط).

---

## 2. Entity Relationship Diagram (Conceptual)

```
                          ┌──────────────┐
                          │    Branch    │
                          └──────┬───────┘
                                 │ 1
                 ┌───────────────┼───────────────────────┐
                 │               │                       │
                 │ N             │ N                     │ N
         ┌───────▼────┐  ┌──────▼──────┐          ┌──────▼────┐
         │ Department │  │  Employee   │          │   User    │
         └─────┬──────┘  └──┬────┬─────┘          └──┬────────┘
               │            │    │                   │
               │            │    │                   │ 1
               │            │    │            ┌──────▼──────┐
               │            │    │            │    Role     │
               │            │    │            └──────┬──────┘
               │            │    │                   │ N
               │            │    │            ┌──────▼──────┐
               │            │    │            │ Permission  │
               │            │    │            └─────────────┘
               │            │    │
               │            │    │ N:1
               │            │    └──────────┐
               │            │               │
               │            │ N (therapist) ▼
               │            │        ┌─────────────┐
               │            │        │ Credential  │
               │            │        └─────────────┘
               ▼            │
                            │
      ┌──────────────┐      │
      │ Beneficiary  │◀─────┴──(primary therapist)
      │ (Patient)    │
      └──────┬───────┘
             │ 1
     ┌───────┴────────────────────────────────────┐
     │                                            │
     │ N                                          │ N
┌────▼─────────────┐                        ┌─────▼──────┐
│    Guardian      │                        │ Contract   │
│  (ولي الأمر)     │                        │            │
└──────────────────┘                        └─────┬──────┘
                                                  │
                                                  │ 1
     ┌──────────────┐                             │
     │   Referral   │─────▶ Beneficiary           │
     └──────────────┘                             │ N
                                            ┌─────▼──────┐
     ┌──────────────┐                       │  Invoice   │
     │  Assessment  │────▶ Beneficiary      └─────┬──────┘
     └──────┬───────┘                              │
            │ 1                                    │ N
            │                                ┌─────▼──────┐
            ▼                                │  Payment   │
   ┌─────────────────┐                       └────────────┘
   │ IRP             │◀────────┐
   │ (Individualized │         │ 1
   │  Rehab Plan)    │         │
   └──────┬──────────┘         │
          │ 1                  │
     ┌────┴──────┐             │
     │           │             │
     │ N         │ N           │
┌────▼────┐  ┌──▼────────┐     │
│  Goal   │  │ Program   │     │
│ (SMART) │  │ (Therapy) │     │
└────┬────┘  └────┬──────┘     │
     │            │             │
     │            │ N           │
     │       ┌────▼─────┐       │
     │       │ Session  │───────┘ (billed-via)
     │       │ (Therapy)│
     │       └────┬─────┘
     │            │ 1
     │            ▼
     │   ┌──────────────────┐
     │   │ SessionNote      │
     │   └──────────────────┘
     │
     │ 1
     ▼
┌──────────────┐
│ Measurement  │ (progress)
└──────────────┘


        ┌──────────────┐
        │   Document   │────▶ (polymorphic: Beneficiary/Employee/Contract/...)
        └──────┬───────┘
               │ 1
               ▼
        ┌──────────────┐
        │  Signature   │
        └──────────────┘

        ┌──────────────┐
        │ Appointment  │────▶ Beneficiary + Therapist + Room
        └──────────────┘

        ┌──────────────┐
        │ Attendance   │────▶ Employee (check-in/out)
        └──────────────┘

        ┌──────────────┐
        │ Transport    │────▶ Beneficiary + Vehicle + Driver
        │    Trip      │
        └──────────────┘

        ┌──────────────┐
        │  Incident    │────▶ Beneficiary/Employee (polymorphic)
        └──────────────┘

        ┌──────────────┐
        │  Complaint   │────▶ Beneficiary/Guardian
        └──────────────┘

        ┌──────────────┐
        │   Social     │────▶ Beneficiary
        │   Work Case  │
        └──────────────┘

        ┌──────────────┐
        │   Psych      │────▶ Beneficiary
        │ Support Case │
        └──────────────┘

        ┌──────────────┐
        │   Training   │────▶ Employee (enrollments)
        │   Program    │
        └──────────────┘

        ┌──────────────┐
        │   Asset      │────▶ Branch
        └──────┬───────┘
               │ 1
               ▼
        ┌──────────────┐
        │ Maintenance  │
        │    Task      │
        └──────────────┘

        ┌──────────────┐
        │PurchaseOrder │────▶ Supplier
        └──────────────┘
```

---

## 3. تعريف الكيانات الـ26

### Global/System Entities (لا branchId)

#### E-1: User

```
User {
  id: UUID
  email: String (unique)
  phoneNumber: String
  nationalId: String           # Saudi ID / Iqama
  username: String
  passwordHash: String
  mfaEnabled: Boolean
  defaultBranchId: UUID        # الفرع الافتراضي
  accessibleBranches: [UUID]   # للفروع التي يمكنه الوصول إليها
  roles: [String]              # canonical roles
  locale: Enum('ar', 'en')
  status: Enum('active', 'suspended', 'archived')
  lastLoginAt: DateTime
  audit: AuditFields
}
```

#### E-2: Role

```
Role {
  id: String                   # canonical snake_case (e.g., 'therapist')
  level: Integer               # 1-6 (hierarchy)
  nameAr: String
  nameEn: String
  permissions: [PermissionId]
  inheritsFrom: [RoleId]       # role inheritance
  audit: AuditFields
}
```

#### E-3: Permission

```
Permission {
  id: String                   # 'resource:action' (e.g., 'invoice:create')
  resource: String
  action: Enum('create', 'read', 'update', 'delete', 'approve', 'export', ...)
  scope: Enum('own', 'department', 'branch', 'region', 'group')   # ABAC-ready
  audit: AuditFields
}
```

#### E-4: Branch

```
Branch {
  id: UUID
  code: String (unique)         # RYD1, JED1, HQ...
  nameAr: String
  nameEn: String
  region: String                # Riyadh, Makkah, Eastern, ...
  city: String
  address: Address
  licenseNumber: String (MoH)
  cbahiAccreditationLevel: Enum
  status: Enum('active', 'inactive', 'pending')
  capacity: Integer             # max beneficiaries
  openingDate: Date
  managerEmployeeId: UUID
  audit: AuditFields
}
```

### Branch-scoped Entities (branchId إلزامي)

#### E-5: Beneficiary

```
Beneficiary {
  id: UUID
  branchId: UUID (FK)          # primary branch of care
  referenceCode: String (unique)  # B-2026-0001
  personal: {
    firstName: { ar, en }
    lastName: { ar, en }
    gender: Enum
    dateOfBirth: Date
    placeOfBirth: String
    nationalId: String         # Saudi ID / Iqama / Passport
    nationality: String
    photoUrl: String
  }
  contact: {
    phoneNumber: String
    email: String
    address: Address
  }
  disability: {
    primaryCategory: Enum       # autism, intellectual, physical, ...
    subCategories: [Enum]
    severityLevel: Enum         # mild, moderate, severe, profound
    dateOfOnset: Date
    diagnosisCodes: [String]    # ICD-10
  }
  guardianship: [GuardianRef]
  admissionStatus: Enum('applicant', 'active', 'on_hold', 'discharged', 'transferred')
  admissionDate: Date
  dischargeDate: Date
  dischargeReason: Enum
  primaryTherapistId: UUID
  programs: [ProgramId]        # enrolled programs
  tags: [String]
  privacyFlags: {
    photoConsent: Boolean
    researchConsent: Boolean
    directoryListing: Boolean
  }
  audit: AuditFields
  deletedAt: DateTime
}
```

#### E-6: Guardian

```
Guardian {
  id: UUID
  branchId: UUID (FK)
  beneficiaryIds: [UUID]       # can guard multiple
  relationshipType: Enum('father', 'mother', 'grandfather', 'sibling', 'legal_guardian', ...)
  isPrimary: Boolean
  personal: { firstName, lastName, nationalId, ... }
  contact: { phone, email, address }
  occupation: String
  portalUserId: UUID (FK User)  # portal login
  emergencyContact: Boolean
  custodyDocumentId: DocumentRef
  audit: AuditFields
}
```

#### E-7: Employee

```
Employee {
  id: UUID
  branchId: UUID (FK)
  employeeNumber: String (unique)
  userId: UUID (FK User)       # 1:1 with User
  personal: { firstName, lastName, nationalId, gender, DOB, ... }
  contact: { phone, email, address }
  employment: {
    position: String
    department: String
    hireDate: Date
    endDate: Date
    employmentType: Enum('full_time', 'part_time', 'contract', 'intern')
    salary: { base: Money, allowances: [Money], currency: 'SAR' }
    bankAccount: BankAccountRef
    gosiNumber: String
    qiwaContractId: String
  }
  credentials: [Credential]
  specializations: [String]     # ABA, PT, OT, Speech, ...
  status: Enum('active', 'on_leave', 'terminated', 'resigned')
  audit: AuditFields
}
```

#### E-8: Credential

```
Credential {
  id: UUID
  employeeId: UUID (FK)
  branchId: UUID (FK)
  type: Enum('license', 'certification', 'degree', 'training')
  issuingAuthority: String      # e.g., SCHS (Saudi Commission for Health Specialties)
  licenseNumber: String
  issueDate: Date
  expiryDate: Date
  documentRef: DocumentRef
  verificationStatus: Enum('pending', 'verified', 'expired', 'revoked')
  audit: AuditFields
}
```

#### E-9: Assessment

```
Assessment {
  id: UUID
  branchId: UUID (FK)
  beneficiaryId: UUID (FK)
  performedBy: UUID (FK Employee)
  reviewedBy: UUID (FK Employee)
  type: Enum('ICF', 'Bayley', 'Vineland', 'GMFCS', 'M-CHAT', 'CARS-2', ...)
  version: String
  administeredAt: DateTime
  completedAt: DateTime
  domains: [AssessmentDomain]   # e.g., motor, communication, social
  rawScores: { [domain]: Number }
  standardizedScores: { [domain]: Number }
  percentiles: { [domain]: Number }
  interpretation: String        # free-text
  recommendations: [String]
  attachments: [DocumentRef]
  signedBy: [SignatureRef]
  status: Enum('draft', 'in_review', 'finalized')
  audit: AuditFields
}
```

#### E-10: IRP (Individualized Rehab Plan)

```
IRP {
  id: UUID
  branchId: UUID (FK)
  beneficiaryId: UUID (FK)
  planCode: String              # IRP-2026-0042
  status: Enum('draft', 'pending_approval', 'active', 'on_hold', 'completed', 'terminated')
  effectivePeriod: { from: Date, to: Date }
  reviewFrequency: Enum('monthly', 'quarterly', 'semiannual')
  nextReviewDate: Date
  clinicalLead: UUID (FK Employee)
  teamMembers: [{ employeeId, role, hours }]
  baseAssessmentId: UUID (FK Assessment)
  overallStrategy: String (rich text)
  enrolledPrograms: [ProgramRef]
  approvals: [ApprovalRef]
  signedBy: [SignatureRef]      # clinical lead + guardian
  outcomeReports: [ReportRef]
  audit: AuditFields
}
```

#### E-11: Goal (SMART)

```
Goal {
  id: UUID
  branchId: UUID (FK)
  irpId: UUID (FK)
  domain: Enum('motor', 'communication', 'social', 'cognitive', 'self_care', 'academic', 'vocational', ...)
  specificDescription: String
  measurement: {
    baselineValue: Number
    targetValue: Number
    unit: String
    measurementMethod: String
  }
  timeline: { startDate, targetDate }
  currentProgress: Number       # 0-100%
  status: Enum('not_started', 'in_progress', 'achieved', 'partially_achieved', 'not_met', 'discontinued')
  achievedDate: Date
  relatedProgramIds: [UUID]
  audit: AuditFields
}
```

#### E-12: Program (Therapy Program)

```
Program {
  id: UUID
  branchId: UUID (FK)           # or NULL for group-wide programs
  code: String (unique)
  name: { ar, en }
  category: Enum('ABA', 'PT', 'OT', 'Speech', 'Art', 'Music', 'Cognitive', 'Early_Intervention', 'Vocational')
  description: String
  duration: { sessionMinutes, totalSessions, weeksToComplete }
  ratioRequirements: { therapistToBeneficiary: String }  # e.g., '1:1', '1:3'
  prerequisiteAssessments: [AssessmentType]
  outcomeMeasures: [String]
  audit: AuditFields
}
```

#### E-13: Session (Therapy Session)

```
Session {
  id: UUID
  branchId: UUID (FK)
  beneficiaryId: UUID (FK)
  irpId: UUID (FK)
  programId: UUID (FK)
  therapistId: UUID (FK Employee)
  goalIds: [UUID]               # goals targeted this session
  scheduledFor: DateTime
  duration: Integer (minutes)
  mode: Enum('in_person', 'virtual', 'home_visit', 'group')
  roomId: UUID (FK)
  status: Enum('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')
  startedAt: DateTime
  endedAt: DateTime
  sessionNote: SessionNoteRef
  measurements: [MeasurementRef]
  invoiceId: UUID (FK)          # billed in
  audit: AuditFields
}
```

#### E-14: SessionNote

```
SessionNote {
  id: UUID
  sessionId: UUID (FK)
  content: String (rich text)
  sbar: { situation, background, assessment, recommendation }  # optional SBAR structure
  attachments: [DocumentRef]
  signedBy: SignatureRef        # therapist
  status: Enum('draft', 'finalized', 'amended')
  audit: AuditFields
}
```

#### E-15: Measurement (Progress)

```
Measurement {
  id: UUID
  branchId: UUID (FK)
  beneficiaryId: UUID (FK)
  goalId: UUID (FK)
  sessionId: UUID (FK)          # nullable
  measuredAt: DateTime
  measuredBy: UUID (FK Employee)
  measurementMethod: String
  value: Number
  unit: String
  percentile: Number
  notes: String
  audit: AuditFields
}
```

#### E-16: Appointment

```
Appointment {
  id: UUID
  branchId: UUID (FK)
  beneficiaryId: UUID (FK)
  sessionId: UUID (FK)          # if linked to session
  therapistId: UUID (FK)
  roomId: UUID (FK)
  scheduledFor: DateTime
  duration: Integer
  type: Enum('therapy', 'assessment', 'review', 'consultation')
  status: Enum('booked', 'confirmed', 'attended', 'no_show', 'cancelled')
  remindersSent: [{ channel, sentAt }]
  audit: AuditFields
}
```

#### E-17: Attendance (Employee)

```
Attendance {
  id: UUID
  branchId: UUID (FK)
  employeeId: UUID (FK)
  date: Date
  checkIn: { timestamp, method: Enum('biometric', 'qr', 'manual'), location: GeoPoint }
  checkOut: { ... }
  workedMinutes: Integer
  status: Enum('present', 'absent', 'late', 'on_leave', 'holiday')
  leaveRequestId: UUID (FK)     # if on leave
  audit: AuditFields
}
```

#### E-18: TransportTrip

```
TransportTrip {
  id: UUID
  branchId: UUID (FK)
  vehicleId: UUID (FK)
  driverId: UUID (FK Employee)
  scheduledFor: DateTime
  route: [{ beneficiaryId, pickupAddress, estimatedTime }]
  status: Enum('planned', 'in_progress', 'completed', 'incident')
  actualStart: DateTime
  actualEnd: DateTime
  distance: Decimal
  fuelCost: Money
  incidents: [IncidentRef]
  audit: AuditFields
}
```

#### E-19: Invoice

```
Invoice {
  id: UUID
  branchId: UUID (FK)
  invoiceNumber: String (unique)  # per branch sequence
  beneficiaryId: UUID (FK)
  contractId: UUID (FK)
  issuedAt: DateTime
  dueDate: Date
  currency: 'SAR'
  lineItems: [{ sessionId, programId, description, quantity, unitPrice, taxRate, subtotal }]
  subtotal: Money
  taxAmount: Money              # VAT 15%
  total: Money
  paidAmount: Money
  outstandingAmount: Money
  status: Enum('draft', 'issued', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'disputed')
  zatcaSubmission: {
    status: Enum('pending', 'submitted', 'accepted', 'rejected')
    uuid: String                # ZATCA UUID
    qrCode: String
    hashed: String
    submittedAt: DateTime
  }
  insuranceClaimId: UUID (FK)
  audit: AuditFields
}
```

#### E-20: Contract

```
Contract {
  id: UUID
  branchId: UUID (FK)
  contractNumber: String (unique)
  beneficiaryId: UUID (FK)
  guardianId: UUID (FK)          # signing party
  pricingPlanId: UUID (FK)
  effectivePeriod: { from: Date, to: Date }
  totalValue: Money
  paymentSchedule: [{ dueDate, amount, status }]
  termsDocumentId: DocumentRef
  signedBy: [SignatureRef]
  status: Enum('draft', 'pending_signature', 'active', 'expired', 'terminated')
  audit: AuditFields
}
```

#### E-21: Referral

```
Referral {
  id: UUID
  branchId: UUID (FK)           # receiving branch
  beneficiaryId: UUID (FK)      # nullable if pre-registration
  referrerType: Enum('internal', 'external_physician', 'government', 'self')
  referrerName: String
  referrerContact: String
  referralReason: String
  clinicalSummary: String
  attachments: [DocumentRef]
  acceptanceStatus: Enum('pending', 'accepted', 'rejected', 'transferred')
  decisionBy: UUID (FK Employee)
  decisionAt: DateTime
  decisionNote: String
  audit: AuditFields
}
```

#### E-22: Document

```
Document {
  id: UUID
  branchId: UUID (FK)
  ownerType: String              # 'Beneficiary', 'Employee', 'Contract', 'Assessment', ...
  ownerId: UUID
  category: Enum('identity', 'medical', 'legal', 'clinical', 'financial', 'hr', 'quality', 'other')
  fileName: String
  mimeType: String
  sizeBytes: Integer
  storageUrl: String             # S3 URL
  checksumSha256: String
  versions: [{ version, storageUrl, uploadedBy, uploadedAt }]
  tags: [String]
  retentionPolicyId: UUID (FK)
  retainUntil: Date
  accessControl: [{ userId/roleId, permission }]
  signatures: [SignatureRef]
  audit: AuditFields
}
```

#### E-23: Incident (Quality)

```
Incident {
  id: UUID
  branchId: UUID (FK)
  incidentNumber: String (unique)
  category: Enum('patient_safety', 'medication_error', 'equipment_failure', 'staff_conduct', 'facility', ...)
  severity: Enum('minor', 'moderate', 'major', 'catastrophic')
  reportedBy: UUID (FK Employee)
  reportedAt: DateTime
  occurredAt: DateTime
  involvedPersons: [{ type, personId }]
  description: String
  immediateAction: String
  investigation: {
    assignedTo: UUID
    startedAt: DateTime
    findings: String
    rootCause: String
    completedAt: DateTime
  }
  capaIds: [UUID]
  status: Enum('open', 'under_investigation', 'pending_action', 'closed')
  attachments: [DocumentRef]
  regulatoryReported: Boolean    # CBAHI reportable?
  audit: AuditFields
}
```

#### E-24: Complaint (CRM)

```
Complaint {
  id: UUID
  branchId: UUID (FK)
  ticketNumber: String (unique)
  complainantType: Enum('beneficiary', 'guardian', 'staff', 'external')
  complainantId: UUID            # polymorphic
  category: Enum('service_quality', 'billing', 'staff_behavior', 'facility', 'scheduling', ...)
  priority: Enum('low', 'medium', 'high', 'critical')
  subject: String
  description: String
  channel: Enum('walk_in', 'phone', 'email', 'whatsapp', 'portal', 'social_media')
  assignedTo: UUID (FK Employee)
  slaDeadline: DateTime
  status: Enum('open', 'in_progress', 'pending_response', 'resolved', 'closed', 'escalated')
  resolution: {
    description: String
    resolvedBy: UUID
    resolvedAt: DateTime
    satisfactionRating: Integer  # 1-5 post-resolution
  }
  escalations: [{ toUserId, reason, timestamp }]
  attachments: [DocumentRef]
  relatedIncidentId: UUID (FK)
  audit: AuditFields
}
```

#### E-25: SocialWorkCase

```
SocialWorkCase {
  id: UUID
  branchId: UUID (FK)
  beneficiaryId: UUID (FK)
  caseType: Enum('family_support', 'financial_aid', 'housing', 'legal', 'welfare', 'community_integration', ...)
  socialWorkerId: UUID (FK Employee)
  openedAt: Date
  summary: String
  assessments: [{ date, note, socialWorkerId }]
  referralsMade: [ReferralRef]   # to external orgs
  aidGranted: [{ type, amount, grantedBy, grantedAt }]
  status: Enum('active', 'on_hold', 'closed')
  closedAt: Date
  audit: AuditFields
}
```

#### E-26: PsychSupportCase

```
PsychSupportCase {
  id: UUID
  branchId: UUID (FK)
  beneficiaryId: UUID (FK)       # or guardianId for family support
  psychologistId: UUID (FK Employee)
  presentingConcerns: [String]
  assessmentsDone: [AssessmentRef]
  therapyModality: Enum('CBT', 'play_therapy', 'family_therapy', 'group', ...)
  sessions: [SessionRef]          # psych-specific sessions
  crisisFlag: Boolean
  riskLevel: Enum('none', 'low', 'moderate', 'high', 'imminent')
  safetyPlan: String
  status: Enum('active', 'on_hold', 'closed')
  audit: AuditFields
}
```

### Supporting Entities (moved to appendix for brevity)

- **E-27**: Training Program, Enrollment
- **E-28**: MaintenanceTask, Asset
- **E-29**: PurchaseOrder, Supplier
- **E-30**: Vehicle, Driver, FuelLog

تفاصيل هذه في ملف تكميلي لاحق.

---

## 4. العلاقات الجوهرية

### العلاقات 1:N

| Parent      | Child                | Cardinality                       |
| ----------- | -------------------- | --------------------------------- |
| Branch      | Beneficiary          | 1:N                               |
| Branch      | Employee             | 1:N                               |
| Branch      | Invoice              | 1:N                               |
| Beneficiary | Guardian             | N:M (via GuardianRef)             |
| Beneficiary | Assessment           | 1:N                               |
| Beneficiary | IRP                  | 1:N (many historical, one active) |
| IRP         | Goal                 | 1:N                               |
| IRP         | Program (enrollment) | N:M                               |
| IRP         | Session              | 1:N                               |
| Session     | SessionNote          | 1:1                               |
| Session     | Measurement          | 1:N                               |
| Goal        | Measurement          | 1:N                               |
| Employee    | Credential           | 1:N                               |
| Employee    | Attendance           | 1:N                               |
| Contract    | Invoice              | 1:N                               |

### العلاقات Polymorphic

| Entity       | Related To                                                                            |
| ------------ | ------------------------------------------------------------------------------------- |
| Document     | Beneficiary / Employee / Contract / Assessment / Session / Incident / Complaint / ... |
| Incident     | Beneficiary / Employee (involvedPersons)                                              |
| AuditLog     | كل الكيانات                                                                           |
| Notification | User (recipient) + polymorphic trigger entity                                         |

---

## 5. Immutable Fields (لا تُحرّر بعد الإنشاء)

| Entity                 | Immutable Fields                                             |
| ---------------------- | ------------------------------------------------------------ |
| Invoice                | invoiceNumber, issuedAt, lineItems (post-issuance), zatca.\* |
| Payment                | amount, paidAt, methodDetails                                |
| JournalEntry           | كلها (العكس فقط)                                             |
| Signature              | signedAt, signerId, documentHash                             |
| AuditLog               | كلها                                                         |
| Beneficiary.nationalId | بعد الإنشاء (يحتاج approval workflow للتعديل)                |

---

## 6. Indexing Strategy (Mongo)

| Collection      | Required Indexes                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `users`         | `email`, `nationalId`, `phoneNumber` (unique); `defaultBranchId`                                             |
| `beneficiaries` | `branchId`, `nationalId` (unique), `referenceCode` (unique); compound `(branchId, admissionStatus)`          |
| `employees`     | `branchId`, `employeeNumber` (unique), `userId`                                                              |
| `sessions`      | `branchId`, `scheduledFor`, compound `(therapistId, scheduledFor)`, compound `(beneficiaryId, scheduledFor)` |
| `invoices`      | `branchId`, `invoiceNumber` (unique), compound `(beneficiaryId, status)`                                     |
| `attendance`    | compound `(employeeId, date)` unique                                                                         |
| `appointments`  | compound `(branchId, scheduledFor)`, compound `(therapistId, scheduledFor)`                                  |
| `documents`     | compound `(ownerType, ownerId)`, `retainUntil`                                                               |
| `auditLogs`     | compound `(resourceType, resourceId)`, `createdAt` (TTL optional)                                            |

---

## 7. Event Schema (Domain Events)

جميع الأحداث تتبع الشكل التالي:

```json
{
  "eventId": "UUID",
  "eventType": "IRPApproved",
  "eventVersion": "1.0",
  "occurredAt": "ISO8601",
  "aggregateType": "IRP",
  "aggregateId": "UUID",
  "branchId": "UUID",
  "triggeredBy": "userId",
  "correlationId": "UUID", // ربط events في saga
  "causationId": "UUID", // event السابق الذي سبب هذا
  "payload": {
    /* entity-specific */
  },
  "metadata": {
    "ip": "...",
    "userAgent": "..."
  }
}
```

### قائمة Events الأساسية (مختصرة)

- `BeneficiaryRegistered`, `BeneficiaryDischarged`, `BeneficiaryTransferred`
- `ReferralCreated`, `ReferralAccepted`, `ReferralRejected`
- `AssessmentCompleted`, `AssessmentReviewed`
- `IRPDraftCreated`, `IRPApproved`, `IRPReviewed`, `IRPCompleted`, `IRPTerminated`
- `GoalAdded`, `GoalAchieved`, `GoalDiscontinued`
- `SessionScheduled`, `SessionCompleted`, `SessionCancelled`, `NoShowRecorded`
- `InvoiceIssued`, `InvoicePaid`, `InvoiceOverdue`
- `ZatcaSubmitted`, `ZatcaAccepted`, `ZatcaRejected`
- `EmployeeHired`, `EmployeeTerminated`, `CredentialExpiring`
- `IncidentReported`, `IncidentEscalated`, `IncidentClosed`
- `ComplaintOpened`, `ComplaintSLABreach`, `ComplaintResolved`
- `DocumentUploaded`, `SignatureCompleted`

---

## 8. Data Classification & Sensitivity

| Classification                    | Examples                                                 | Access Controls                        |
| --------------------------------- | -------------------------------------------------------- | -------------------------------------- |
| **PHI (Protected Health)**        | Diagnoses, assessments, clinical notes, medications      | Clinical roles only + audit every read |
| **PII (Personally Identifiable)** | Name, nationalId, DOB, address, phone                    | Need-to-know + masked in lists         |
| **Financial Sensitive**           | Salary, bank account, insurance #, ZATCA data            | Finance roles + audit                  |
| **Public**                        | Branch name, services catalog, published prices          | Open                                   |
| **Internal**                      | Employee directory, schedules                            | Authenticated users                    |
| **Restricted**                    | Disciplinary actions, sensitive incidents, legal matters | Specific roles + approval              |

جميع الحقول الحساسة:

- مشفّرة at-rest (AES-256 على مستوى الحقل للأكثر حساسية مثل nationalId, bankAccount).
- لا تُسجَّل في logs (redaction).
- تُموَّه في exports عند الحاجة.

---

## 9. التالي

- **[05-role-matrix.md](05-role-matrix.md)** — من يستطيع القراءة/الكتابة لكل كيان.
- **[06-workflows.md](06-workflows.md)** — كيف تتحرك الكيانات عبر حالاتها.
