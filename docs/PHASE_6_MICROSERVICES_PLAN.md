# Phase 6: New Microservices Extraction Plan

## Al-Awael ERP — 15 New Microservices (Ports 3450–3590)

> **Analysis Date**: 2026-03-19
> **Methodology**: Deep scan of backend/routes/, backend/services/, backend/models/, frontend/src/pages/, and alawael-wiki/ to identify monolith-embedded functionality not yet extracted into standalone microservices.

---

## Summary Matrix

| # | Service Name | Port | Extracts From | Endpoints | Priority |
|---|---|---|---|---|---|
| 1 | inventory-warehouse-service | 3450 | enterprisePro, inventory.routes.unified, dashboard.stats | ~40 | HIGH |
| 2 | academic-curriculum-service | 3460 | curriculum, gradebook, exams, subjects, timetable, academicYear | ~50 | HIGH |
| 3 | student-health-medical-service | 3470 | studentHealthTracker, medicalFiles, caseManagement (medical) | ~35 | HIGH |
| 4 | visitor-campus-security-service | 3480 | visitors.routes, civilDefense, security.real | ~40 | HIGH |
| 5 | crisis-safety-service | 3490 | crisis.routes, civilDefense.routes, enterpriseProPlus (EHS) | ~45 | HIGH |
| 6 | compliance-accreditation-service | 3500 | compliance.routes, quality, disabilityAuthority, rehabCenterLicenses | ~35 | MEDIUM |
| 7 | events-activities-service | 3510 | studentEvents, enterprisePro (calendar-hub), community | ~30 | MEDIUM |
| 8 | asset-equipment-service | 3520 | assets, equipment, enterpriseProPlus (ITAsset), maintenance | ~40 | HIGH |
| 9 | staff-training-development-service | 3530 | training-development, employeeAffairs (career), driverTraining | ~30 | MEDIUM |
| 10 | cms-announcements-service | 3540 | cms, beneficiaryPortal (announcements), smartContent | ~25 | MEDIUM |
| 11 | forms-survey-service | 3550 | formTemplates, familySatisfaction, beneficiaryPortal (surveys) | ~30 | MEDIUM |
| 12 | budget-financial-planning-service | 3560 | budgetManagement, finance (forecast/planning), costBudget | ~35 | HIGH |
| 13 | student-lifecycle-service | 3570 | studentCertificates, waitlist, student-complaints, rewards | ~40 | MEDIUM |
| 14 | external-integration-hub-service | 3580 | noor, mudad, taqat, qiwa, gosi, governmentIntegration, moi-passport | ~50 | HIGH |
| 15 | facility-space-management-service | 3590 | facilities.routes, enterpriseProPlus (Facility, SpaceBooking, Lease) | ~30 | MEDIUM |

---

## Detailed Service Specifications

---

### 1. inventory-warehouse-service (Port 3450)

**What it extracts from the monolith:**
- [backend/routes/inventory.routes.unified.js](backend/routes/inventory.routes.unified.js) — 23+ endpoints: products, categories, warehouses, stock movements, stock-takes, transfers, dashboard
- [backend/routes/enterprisePro.routes.js](backend/routes/enterprisePro.routes.js#L881) — Section 5: Warehouse Intelligence (~20 endpoints): `Warehouse`, `WarehouseBin`, `StockLevel`, `StockAlert`, `StockTransferOrder`
- [backend/routes/dashboard.stats.js](backend/routes/dashboard.stats.js#L128) — Inventory/stock KPI aggregation
- [backend/services/smartInventory.service.js](backend/services/smartInventory.service.js) — Smart inventory predictions
- [backend/services/smartProcurement.service.js](backend/services/smartProcurement.service.js) — Procurement automation
- [backend/models/Inventory.js](backend/models/Inventory.js), [backend/models/inventory.model.js](backend/models/inventory.model.js), [backend/models/InventoryItem.js](backend/models/InventoryItem.js)
- [backend/models/EnterprisePro.js](backend/models/EnterprisePro.js) — Warehouse, WarehouseBin, StockLevel, StockAlert, StockTransferOrder schemas

**Key Models/Schemas:**
- `Product` — SKU, barcode, name, category, unit, reorderLevel
- `Warehouse` — name, location, manager, capacity, type (school supplies / medical / food)
- `WarehouseBin` — warehouseId, binCode, zone, capacity
- `StockLevel` — productId, warehouseId, quantity, reservedQty
- `StockMovement` — type (in/out/transfer/adjustment), source, destination, quantity, reference
- `StockAlert` — productId, alertType (low/expiry/overstock), threshold
- `StockTransferOrder` — sourceWarehouse, destWarehouse, items[], status, requestedBy
- `StockTake` — warehouseId, items[], startDate, completedDate, discrepancies
- `PurchaseRequisition` — items[], requester, department, urgency, budgetRef

**Main API Endpoints:**
```
GET    /api/inventory/products                     # List with barcode/category/search filters
POST   /api/inventory/products                     # Create product
GET    /api/inventory/products/low-stock            # Low-stock alerts
GET    /api/inventory/warehouses                    # List warehouses (school supplies, medical supplies, etc.)
POST   /api/inventory/warehouses                    # Create warehouse
GET    /api/inventory/warehouses/:id/stock          # Stock levels for specific warehouse
POST   /api/inventory/movements                     # Record stock movement (receive/issue/adjust)
POST   /api/inventory/transfers                     # Inter-warehouse transfer
GET    /api/inventory/stock-takes                    # Physical inventory audits
POST   /api/inventory/stock-takes                    # Start stock take
GET    /api/inventory/alerts                         # All stock alerts (low, expiry, overstock)
GET    /api/inventory/dashboard                      # KPIs: total value, turnover rate, shrinkage
POST   /api/inventory/requisitions                   # Auto-purchase requisition from low stock
GET    /api/inventory/reports/valuation               # FIFO/LIFO/weighted-average valuation
```

**Why it adds unique value:**
The monolith currently mixes school supplies, medical supplies, rehabilitation equipment consumables, and kitchen supplies in a single Inventory model. A dedicated microservice enables multi-warehouse management (school supplies warehouse, medical supplies, rehab equipment room), barcode/RFID integration, automated reorder-point triggers, and stock valuation reports — critical for Saudi Ministry of Education and CBAHI audits.

---

### 2. academic-curriculum-service (Port 3460)

**What it extracts from the monolith:**
- [backend/routes/curriculum.routes.js](backend/routes/curriculum.routes.js) — Curriculum CRUD (120 lines)
- [backend/routes/gradebook.routes.js](backend/routes/gradebook.routes.js) — Gradebook entries + semester reports (395 lines)
- [backend/routes/exams.routes.js](backend/routes/exams.routes.js) — Exam management + submissions (332 lines)
- [backend/routes/subjects.routes.js](backend/routes/subjects.routes.js) — Subject CRUD
- [backend/routes/timetable.routes.js](backend/routes/timetable.routes.js) — Timetable/schedule grid
- [backend/routes/academicYear.routes.js](backend/routes/academicYear.routes.js) — Academic year configuration
- [backend/routes/teachers.routes.js](backend/routes/teachers.routes.js) — Teacher assignments
- [backend/routes/classrooms.routes.js](backend/routes/classrooms.routes.js) — Classroom CRUD
- [backend/models/Curriculum.js](backend/models/Curriculum.js), [backend/models/Gradebook.js](backend/models/Gradebook.js), [backend/models/Exam.js](backend/models/Exam.js), [backend/models/Subject.js](backend/models/Subject.js), [backend/models/Timetable.js](backend/models/Timetable.js), [backend/models/AcademicYear.js](backend/models/AcademicYear.js), [backend/models/Teacher.js](backend/models/Teacher.js), [backend/models/Classroom.js](backend/models/Classroom.js)
- [backend/services/smartAcademic.service.js](backend/services/smartAcademic.service.js) — AI-driven academic analytics

**Key Models/Schemas:**
- `AcademicYear` — name, startDate, endDate, semesters[], isActive
- `Curriculum` — name, gradeLevel, subject, lessons[], objectives[], standards[]
- `Subject` — name, code, department, credits, prerequisites
- `Timetable` — classroomId, day, timeSlot, subjectId, teacherId
- `Gradebook` — studentId, subjectId, assessments[], finalGrade, semester
- `Exam` — title, subjectId, type (quiz/midterm/final), questions[], duration, scheduledDate
- `ExamSubmission` — examId, studentId, answers[], score, submittedAt
- `SemesterReport` — studentId, semester, subjectGrades[], GPA, comments, rank

**Main API Endpoints:**
```
GET/POST /api/academic/years                        # Academic year management
GET/POST /api/academic/curricula                     # Curriculum plans with learning objectives
GET/POST /api/academic/subjects                      # Subject catalog
GET/POST /api/academic/timetables                    # Weekly timetable grid
GET/POST /api/academic/gradebook                     # Grade entry + calculation
GET/POST /api/academic/exams                         # Exam creation + scheduling
POST     /api/academic/exams/:id/submit              # Student exam submission
GET      /api/academic/exams/:id/results             # Results + analytics
GET      /api/academic/reports/semester/:studentId    # Semester report card
GET      /api/academic/reports/class-performance      # Class-level analytics
GET      /api/academic/dashboard                      # Academic KPIs
POST     /api/academic/lesson-plans                   # Teacher lesson planning
```

**Why it adds unique value:**
Currently 8 separate route files (1,800+ combined lines) handle academics within the monolith. Extracting them into one cohesive microservice enables: lesson plan workflows, standards-aligned curriculum mapping, automated GPA calculation, transcript generation, and integration with Noor (Saudi MOE system). Also enables independent scaling during exam periods when load spikes significantly.

---

### 3. student-health-medical-service (Port 3470)

**What it extracts from the monolith:**
- [backend/routes/studentHealthTracker.routes.js](backend/routes/studentHealthTracker.routes.js) — 373 lines: daily health checks, vital signs, symptoms, medications, vaccinations, mood tracking, allergies
- [backend/routes/medicalFiles.js](backend/routes/medicalFiles.js) — 487 lines: medical file upload/storage (radiology, lab results, prescriptions, medical reports)
- [backend/routes/caseManagement.js](backend/routes/caseManagement.js#L672) — Medical record section within case management (bloodType, allergies, chronic diseases)
- [backend/services/smartClinical.service.js](backend/services/smartClinical.service.js) — Clinical decision support
- [backend/services/smartNutrition.service.js](backend/services/smartNutrition.service.js) — Nutrition tracking for students with dietary needs
- Frontend: [frontend/src/pages/education/StudentHealthTracker.js](frontend/src/pages/education/StudentHealthTracker.js)

**Key Models/Schemas:**
- `HealthRecord` — studentId, date, type (daily check/vaccination/medication/emergency), vitalSigns {temperature, heartRate, BP, weight, height, oxygenLevel}, generalCondition
- `MedicalFile` — studentId, fileType (radiology/lab/prescription/report), filePath, uploadedBy, encryptionHash
- `Medication` — studentId, name, dosage, frequency, startDate, endDate, administeredBy
- `Vaccination` — studentId, name, doseNumber, administeredAt, nextDoseDate, batchNumber
- `Allergy` — studentId, allergen, reaction, severity (mild/moderate/severe/life-threatening)
- `MoodTracking` — studentId, date, mood, energyLevel, sleepQuality, sleepHours
- `GrowthChart` — studentId, date, weight, height, BMI, percentile

**Main API Endpoints:**
```
GET/POST /api/student-health/records                 # Health records CRUD
POST     /api/student-health/daily-check             # Daily health screening entry
GET      /api/student-health/students/:id/history     # Full health history
POST     /api/student-health/medications/administer   # Record medication administration
GET      /api/student-health/vaccinations/schedule     # Vaccination schedule + reminders
POST     /api/student-health/incidents                 # Medical incident reporting
GET      /api/student-health/allergies/:studentId      # Allergy alerts
POST     /api/student-health/files/upload              # Encrypted medical file upload
GET      /api/student-health/files/:id/download        # Secure medical file access
GET      /api/student-health/growth-chart/:studentId   # Growth tracking over time
GET      /api/student-health/dashboard                  # Health KPIs (vaccination rates, incident stats)
GET      /api/student-health/reports/class/:classId     # Class health summary
POST     /api/student-health/emergency-alerts           # Emergency health notification to parents
```

**Why it adds unique value:**
Medical records require HIPAA/CBAHI-level data isolation, encryption-at-rest, and strict access controls. A dedicated microservice provides an independent security boundary, enables proper audit logging for medical data access, and allows integration with Saudi health platforms (Seha, NPHIES). Essential for rehabilitation centers handling disability care where medical records are central to operations.

---

### 4. visitor-campus-security-service (Port 3480)

**What it extracts from the monolith:**
- [backend/routes/visitors.routes.js](backend/routes/visitors.routes.js) — 231 lines: Full CRUD, analytics, blacklist, check-in/out, audit logs
- [backend/services/visitor-advanced.service.js](backend/services/visitor-advanced.service.js) — Advanced visitor service (stats, analytics, currently-inside tracking)
- [backend/models/Visitor.js](backend/models/Visitor.js) — Visitor model
- [backend/services/smartSecurity.service.js](backend/services/smartSecurity.service.js) — Security intelligence
- [backend/services/smartCameraManager.service.js](backend/services/smartCameraManager.service.js) — Camera/CCTV management
- [backend/services/hikvisionService.js](backend/services/hikvisionService.js) — Hikvision camera integration
- [backend/models/Camera.js](backend/models/Camera.js), [backend/models/securityLog.model.js](backend/models/securityLog.model.js)
- Frontend: [frontend/src/pages/visitors/VisitorManagementPage.js](frontend/src/pages/visitors/VisitorManagementPage.js)

**Key Models/Schemas:**
- `Visitor` — name, idNumber, phone, company, purpose, hostEmployee, photo, badgeNumber, status (pre-registered/checked-in/checked-out)
- `VisitLog` — visitorId, checkInTime, checkOutTime, gateUsed, badgeId, escortedBy
- `Blacklist` — name, idNumber, reason, addedBy, addedAt
- `AccessZone` — name, securityLevel, requiresEscort, authorizedRoles[]
- `GateLog` — gateId, direction (in/out), personId, personType (student/staff/visitor), timestamp
- `SecurityIncident` — type, location, severity, description, respondedBy, resolution
- `CameraFeed` — cameraId, location, streamURL, status, recordingEnabled

**Main API Endpoints:**
```
GET/POST /api/campus-security/visitors               # Visitor CRUD
POST     /api/campus-security/visitors/:id/check-in   # Check-in with badge print
POST     /api/campus-security/visitors/:id/check-out   # Check-out
GET      /api/campus-security/visitors/currently-inside # Currently on-campus visitors
GET      /api/campus-security/visitors/expected-today   # Pre-registered visitors
POST     /api/campus-security/blacklist                  # Manage blacklisted individuals
GET      /api/campus-security/gates/logs                 # Gate access logs
GET      /api/campus-security/cameras                    # Camera feeds management
POST     /api/campus-security/incidents                  # Security incident reporting
GET      /api/campus-security/zones                      # Access zone configuration
GET      /api/campus-security/dashboard                  # Real-time security overview
GET      /api/campus-security/analytics                  # Visitor patterns, peak hours
POST     /api/campus-security/alerts                     # Emergency lockdown/notifications
```

**Why it adds unique value:**
Saudi childcare/rehabilitation centers have strict child protection requirements. A dedicated security microservice enables real-time awareness of who is on campus, parent verification before child pickup, visitor photo capture, blacklist enforcement, integration with Hikvision/ZKTeco hardware, and zone-based access control — all operating independently from the main monolith for reliability.

---

### 5. crisis-safety-service (Port 3490)

**What it extracts from the monolith:**
- [backend/routes/crisis.routes.js](backend/routes/crisis.routes.js) — 458 lines: Emergency plans, crisis incidents, emergency drills, emergency contacts, crisis dashboard
- [backend/routes/civilDefense.routes.js](backend/routes/civilDefense.routes.js) — 399 lines: Safety certificates, inspections, fire drills, evacuation plans, civil defense reporting
- [backend/routes/enterpriseProPlus.routes.js](backend/routes/enterpriseProPlus.routes.js) — Section 5 EHS: SafetyIncident, SafetyInspection, HazardRegister, PPERecord
- [backend/routes/enterpriseUltra.routes.js](backend/routes/enterpriseUltra.routes.js) — Section 3 BCP: BCPPlan, BusinessImpactAnalysis, CrisisIncident, BCDrill, DisasterRecoveryPlan
- [backend/models/crisis.model.js](backend/models/crisis.model.js) — EmergencyPlan, CrisisIncident, EmergencyDrill, EmergencyContact
- [backend/services/smartCrisis.service.js](backend/services/smartCrisis.service.js), [backend/services/civilDefenseIntegration.service.js](backend/services/civilDefenseIntegration.service.js)

**Key Models/Schemas:**
- `EmergencyPlan` — type (fire/earthquake/flood/medical/security/pandemic), procedures[], requiredEquipment[], assignedRoles[], status
- `CrisisIncident` — type, severity (critical/high/medium/low), location, reportedBy, responders[], timeline[], status, rootCauseAnalysis
- `EmergencyDrill` — planId, scheduledDate, participantCount, evaluationScore, findings[], improvements[]
- `EmergencyContact` — name, role, phone, email, priority, zone
- `SafetyCertificate` — facilityId, type, issuedBy (Civil Defense), issueDate, expiryDate, status
- `SafetyInspection` — inspectorId, facilityId, checklist[], findings[], overallScore, nextInspectionDate
- `HazardRegister` — location, hazardType, riskLevel, mitigationMeasures[], status
- `EvacuationRoute` — buildingId, floor, routeMap, assemblyPoint, capacity

**Main API Endpoints:**
```
GET/POST /api/crisis/plans                            # Emergency plan management
POST     /api/crisis/plans/:id/activate                # Activate emergency plan
GET/POST /api/crisis/incidents                         # Crisis incident reporting
PATCH    /api/crisis/incidents/:id/status               # Update incident status
GET/POST /api/crisis/drills                             # Schedule and log drills
POST     /api/crisis/drills/:id/evaluate                # Post-drill evaluation
GET/POST /api/crisis/contacts                           # Emergency contact tree
POST     /api/crisis/alerts/broadcast                    # Mass notification to all staff/parents
GET      /api/crisis/certificates                        # Civil defense safety certificates
POST     /api/crisis/certificates/request                # Request safety certificate
GET/POST /api/crisis/inspections                         # Safety inspections
GET      /api/crisis/hazards                             # Hazard register
GET      /api/crisis/dashboard                           # Real-time crisis dashboard
GET      /api/crisis/compliance/civil-defense            # Civil defense compliance status
```

**Why it adds unique value:**
Emergency management spans 3 separate monolith modules (crisis, civilDefense, EHS in enterpriseProPlus). Unifying them into one microservice gives a single source of truth for safety compliance, enables instant mass-notification broadcasting during emergencies (critical for child safety), centralized drill scheduling, and direct Civil Defense (الدفاع المدني) reporting integration.

---

### 6. compliance-accreditation-service (Port 3500)

**What it extracts from the monolith:**
- [backend/routes/compliance.routes.js](backend/routes/compliance.routes.js) — 381 lines: Compliance dashboard, controls, logs, metrics
- [backend/routes/quality.js](backend/routes/quality.js) — Quality management routes
- [backend/routes/rehabCenterLicenses.routes.js](backend/routes/rehabCenterLicenses.routes.js) — Rehab center license management (60+ endpoints)
- [backend/routes/disabilityAuthority.routes.js](backend/routes/disabilityAuthority.routes.js) — Disability Authority & CBAHI standards
- [backend/quality-compliance/quality-compliance-service.js](backend/quality-compliance/quality-compliance-service.js)
- [backend/models/ComplianceControl.js](backend/models/ComplianceControl.js), [backend/models/ComplianceLog.js](backend/models/ComplianceLog.js), [backend/models/ComplianceMetric.js](backend/models/ComplianceMetric.js)
- [backend/models/qualityManagement.js](backend/models/qualityManagement.js), [backend/models/RehabCenterLicense.js](backend/models/RehabCenterLicense.js)
- [backend/services/quality-management.service.js](backend/services/quality-management.service.js), [backend/services/smartQuality.service.js](backend/services/smartQuality.service.js)

**Key Models/Schemas:**
- `AccreditationStandard` — body (CBAHI/MOE/DisabilityAuthority), standardCode, category, requirement, evidenceRequired[]
- `ComplianceAssessment` — standardId, assessorId, score, findings[], correctiveActions[], status (compliant/non-compliant/partial)
- `ComplianceControl` — controlCode, description, category, owner, testFrequency, lastTestDate, status
- `ComplianceLog` — event, severity, detectedAt, resolvedAt, status
- `CenterLicense` — centerId, licenseType, issuingAuthority, issueDate, expiryDate, renewalStatus
- `QualityMetric` — metricName, category, target, actual, trend[], measureDate
- `CorrectiveAction` — finding, description, assignedTo, dueDate, status, evidence[]

**Main API Endpoints:**
```
GET/POST /api/compliance/standards                    # Accreditation standards library
GET      /api/compliance/standards/gaps                # Gap analysis
GET/POST /api/compliance/assessments                   # Self-assessment submissions
GET      /api/compliance/assessments/:id/report        # Assessment detail report
GET/POST /api/compliance/controls                      # Internal controls CRUD
GET      /api/compliance/logs                           # Compliance event log
GET/POST /api/compliance/metrics                       # Quality metrics tracking
GET/POST /api/compliance/licenses                      # Center license management
POST     /api/compliance/licenses/:id/renew             # License renewal workflow
GET      /api/compliance/corrective-actions              # CAP tracking
GET      /api/compliance/dashboard                       # Overall compliance score
GET      /api/compliance/reports/readiness               # Accreditation readiness report
GET      /api/compliance/reports/cbahi                   # CBAHI-specific compliance
```

**Why it adds unique value:**
Saudi rehabilitation centers must comply with multiple regulatory bodies simultaneously: CBAHI (healthcare), Ministry of Education (academics), Disability Authority, and Civil Defense. Consolidating compliance tracking into one microservice enables a unified compliance dashboard, automated deadline tracking for license renewals, evidence collection workflows, and gap analysis against specific accreditation frameworks.

---

### 7. events-activities-service (Port 3510)

**What it extracts from the monolith:**
- [backend/routes/studentEvents.routes.js](backend/routes/studentEvents.routes.js) — 425 lines: Events CRUD, registration, attendance, calendar, types (فعالية, رحلة, مسابقة, ورشة عمل, حفل, يوم مفتوح, معرض, ندوة)
- [backend/routes/enterprisePro.routes.js](backend/routes/enterprisePro.routes.js) — Section 3 Calendar Hub: CalendarEvent, RoomBooking
- [backend/routes/community.js](backend/routes/community.js) — Community activities and events
- [backend/routes/communityIntegration.routes.js](backend/routes/communityIntegration.routes.js)
- [backend/services/smartEventManager.service.js](backend/services/smartEventManager.service.js) — Event orchestration
- [backend/models/EventParticipation.js](backend/models/EventParticipation.js), [backend/models/CommunityActivity.js](backend/models/CommunityActivity.js)

**Key Models/Schemas:**
- `Event` — title, description, type (academic/sports/cultural/social/rehabilitation/entertainment/religious/health), category, startDate, endDate, location {name, isVirtual, virtualLink, coordinates}
- `EventRegistration` — eventId, participantId, participantType (student/parent/staff), status (registered/confirmed/attended/no-show)
- `Activity` — name, type, ageGroup, duration, instructor, materials[], recurrence
- `CalendarEntry` — eventId, recurring, reminders[], visibility (public/department/private)
- `RoomBooking` — roomId, eventId, startTime, endTime, setup[], equipmentNeeded[]
- `TripPlan` — destination, transportMode, guardianConsent[], medicalKit, firstAidStaff, itinerary[]

**Main API Endpoints:**
```
GET/POST /api/events                                  # Events CRUD with rich filters
GET      /api/events/calendar                          # Calendar view (month/week/day)
POST     /api/events/:id/register                      # Register participant
GET      /api/events/:id/registrations                  # Participant list
POST     /api/events/:id/check-attendance               # Mark attendance at event
GET      /api/events/upcoming                           # Upcoming events feed
GET      /api/events/categories                         # Event categories
POST     /api/events/trips/:id/consent                  # Parent consent for trips
POST     /api/events/room-bookings                      # Book room/space
GET      /api/events/activities                          # Recurring activities catalog
GET      /api/events/analytics                           # Participation rates, popular events
GET      /api/events/dashboard                           # Events overview + calendar widget
```

**Why it adds unique value:**
Events currently exist across three separate route files (student events, enterprise calendar, community). A unified events microservice enables comprehensive event lifecycle management (planning → registration → consent → attendance → evaluation), automatic parent notifications for trips, resource booking, and Saudi national holiday/Islamic calendar awareness.

---

### 8. asset-equipment-service (Port 3520)

**What it extracts from the monolith:**
- [backend/routes/assets.js](backend/routes/assets.js) — 258 lines: Asset CRUD
- [backend/routes/equipment.js](backend/routes/equipment.js) — 785 lines: Equipment CRUD, maintenance scheduling, lending, fault logs, calibration
- [backend/routes/maintenance.js](backend/routes/maintenance.js) — Maintenance management
- [backend/routes/enterpriseProPlus.routes.js](backend/routes/enterpriseProPlus.routes.js) — Section 4 ITSM: ITAsset, ServiceCatalogItem
- [backend/services/assetManagementService.js](backend/services/assetManagementService.js)
- [backend/services/maintenanceService.js](backend/services/maintenanceService.js), [backend/services/maintenanceAIService.js](backend/services/maintenanceAIService.js), [backend/services/advancedMaintenanceService.js](backend/services/advancedMaintenanceService.js)
- [backend/models/equipmentManagement.js](backend/models/equipmentManagement.js) — Equipment, MaintenanceSchedule, EquipmentLending, EquipmentFaultLog, EquipmentCalibration
- [backend/models/Asset.js](backend/models/Asset.js), [backend/models/Maintenance.js](backend/models/Maintenance.js), [backend/models/FixedAsset.js](backend/models/FixedAsset.js)
- Frontend: [src/modules/asset-management.js](src/modules/asset-management.js)

**Key Models/Schemas:**
- `Asset` — name, category (furniture/IT/medical/rehab/vehicle/building), serialNumber, barcode, purchaseDate, value, depreciationMethod, currentValue, location, assignedTo, status
- `Equipment` — equipmentId, name, manufacturer, model, serialNumber, category, department, calibrationDue, lastCalibrated, status (active/maintenance/retired/lending)
- `MaintenanceSchedule` — assetId, frequency, lastPerformed, nextDue, taskDescription, assignedTo
- `MaintenanceRequest` — assetId, requestedBy, issue, priority, status (open/in-progress/completed)
- `EquipmentLending` — equipmentId, borrower, checkOutDate, expectedReturn, actualReturn, condition
- `EquipmentCalibration` — equipmentId, calibratedBy, calibrationDate, result, certificate, nextCalibrationDate
- `FixedAssetRegister` — assetCode, description, acquisition, depreciation, netBookValue, disposalDate

**Main API Endpoints:**
```
GET/POST /api/assets                                   # Asset register CRUD
GET      /api/assets/barcode/:barcode                   # Scan barcode lookup
GET      /api/assets/depreciation/report                # Depreciation schedule report
GET/POST /api/assets/equipment                          # Equipment catalog
POST     /api/assets/equipment/:id/checkout              # Lend equipment
POST     /api/assets/equipment/:id/return                # Return equipment
GET      /api/assets/equipment/calibration/due           # Calibration due list
POST     /api/assets/maintenance/requests                # Submit maintenance request
GET      /api/assets/maintenance/schedule                # Maintenance schedule
POST     /api/assets/maintenance/:id/complete            # Close maintenance task
GET      /api/assets/equipment/:id/fault-history          # Fault history
GET      /api/assets/fixed-register                      # Fixed asset register
GET      /api/assets/dashboard                            # Asset KPIs (utilization, maintenance cost)
POST     /api/assets/dispose                              # Asset disposal workflow
```

**Why it adds unique value:**
Rehabilitation centers manage expensive medical/ rehab equipment (standing frames, sensory rooms, hydrotherapy pools, speech therapy tools) alongside standard school assets. A dedicated service enables proper equipment lifecycle management, calibration compliance tracking (required for medical devices), preventive maintenance scheduling, barcode-based checkout/return for shared equipment, and fixed asset depreciation for finance.

---

### 9. staff-training-development-service (Port 3530)

**What it extracts from the monolith:**
- [backend/training-development/professional-training-service.js](backend/training-development/professional-training-service.js) — Professional training management
- [backend/routes/driverTraining.js](backend/routes/driverTraining.js) — Training & certification routes (currently driver-specific but pattern applicable to all staff)
- [backend/routes/employeeAffairs.routes.js](backend/routes/employeeAffairs.routes.js#L248) — Career certification management
- [backend/routes/employeeProfile.js](backend/routes/employeeProfile.js#L188) — Professional certifications
- [backend/services/smartTraining.service.js](backend/services/smartTraining.service.js) — AI-powered training recommendations
- [backend/services/learning-development.service.js](backend/services/learning-development.service.js) — Learning paths
- [backend/models/training.model.js](backend/models/training.model.js), [backend/models/DevelopmentPlan.js](backend/models/DevelopmentPlan.js)

**Key Models/Schemas:**
- `TrainingProgram` — title, type (workshop/course/conference/certification/onboarding), provider, duration, mode (in-person/online/blended), targetRoles[], maxParticipants, cost
- `TrainingEnrollment` — programId, employeeId, status (enrolled/in-progress/completed/failed), completionDate, score, certificateUrl
- `ProfessionalCertification` — employeeId, certName, issuingBody, issueDate, expiryDate, renewalRequirements, status
- `DevelopmentPlan` — employeeId, goals[], skillGaps[], assignedTraining[], timeline, reviewDate
- `TrainingSession` — programId, date, instructorId, attendees[], materials[], evaluation
- `CompetencyMatrix` — role, requiredSkills[], proficiencyLevels[], gapAnalysis

**Main API Endpoints:**
```
GET/POST /api/training/programs                        # Training program catalog
POST     /api/training/programs/:id/enroll              # Employee enrollment
GET      /api/training/enrollments                       # My enrollments
POST     /api/training/enrollments/:id/complete          # Mark completion + upload certificate
GET/POST /api/training/certifications                    # Professional certifications tracking
GET      /api/training/certifications/expiring           # Certifications expiring soon
GET/POST /api/training/development-plans                 # Individual development plans
GET      /api/training/competency-matrix                 # Skills gap analysis
POST     /api/training/sessions                          # Log training delivery
GET      /api/training/reports/department                 # Department training summary
GET      /api/training/reports/compliance                 # Mandatory training compliance
GET      /api/training/dashboard                          # Training KPIs (hours, completion rate, spend)
POST     /api/training/recommendations/:employeeId       # AI-suggested training based on role/gaps
```

**Why it adds unique value:**
Saudi rehab centers require therapists/specialists to maintain professional certifications (SCFHS — Saudi Commission for Health Specialties). A dedicated service tracks certification expiry, automates renewal reminders, manages CPD (Continuing Professional Development) hours, and ensures staff meet CBAHI staffing competency requirements — currently scattered across 4+ route files.

---

### 10. cms-announcements-service (Port 3540)

**What it extracts from the monolith:**
- [backend/routes/cms.js](backend/routes/cms.js) — 442 lines: Pages, posts, banners, snippets, versioning
- [backend/services/cmsService.js](backend/services/cmsService.js) — CMS content management
- [backend/services/smartContent.service.js](backend/services/smartContent.service.js) — Smart content delivery
- [backend/routes/beneficiaryPortal.js](backend/routes/beneficiaryPortal.js) — Announcements section
- Frontend student portal: [frontend/src/pages/education/StudentAnnouncements.js](frontend/src/pages/education/StudentAnnouncements.js)

**Key Models/Schemas:**
- `Page` — title, slug, content (rich text), author, status (draft/published/archived), template, SEO metadata
- `Post` — title, content, category (news/announcement/alert/achievement), targetAudience (all/parents/staff/students), publishDate, expiryDate, featured, attachments[]
- `Banner` — title, imageUrl, linkUrl, position (hero/sidebar/footer), startDate, endDate, priority
- `Snippet` — key, content, locale, context (email/sms/portal)
- `ContentVersion` — contentId, versionNumber, content, changedBy, changeDescription

**Main API Endpoints:**
```
GET/POST /api/cms/pages                                # Website pages CRUD
GET      /api/cms/pages/:slug                           # Get page by slug
POST     /api/cms/pages/:id/publish                     # Publish page
GET/POST /api/cms/posts                                 # News/announcements CRUD
GET      /api/cms/posts/feed                             # Latest feed for portals
POST     /api/cms/posts/:id/notify                       # Push notification for new post
GET/POST /api/cms/banners                                # Banner/hero management
GET/POST /api/cms/snippets                               # Reusable content snippets
GET      /api/cms/versions/:contentId                    # Version history
POST     /api/cms/versions/:id/restore                   # Restore previous version
GET      /api/cms/search                                  # Full-text content search
GET      /api/cms/dashboard                               # Content analytics (views, engagement)
```

**Why it adds unique value:**
Currently the CMS is a basic in-memory service in the monolith. A dedicated microservice enables proper content management with versioning, multilingual support (Arabic/English), targeted content delivery (different announcements for parents vs. staff vs. students), scheduled publishing, and push notifications — essential for keeping parents informed about their children's activities, school closures, and achievement announcements.

---

### 11. forms-survey-service (Port 3550)

**What it extracts from the monolith:**
- [backend/routes/formTemplates.routes.js](backend/routes/formTemplates.routes.js) — 99 lines (MVC architecture with 48 built-in templates)
- [backend/routes/familySatisfaction.routes.js](backend/routes/familySatisfaction.routes.js) — Family satisfaction surveys
- [backend/routes/beneficiaryPortal.js](backend/routes/beneficiaryPortal.js#L460) — Survey routes (Survey, SurveyResponse models)
- [backend/models/FormTemplate.js](backend/models/FormTemplate.js), [backend/models/FormSubmission.js](backend/models/FormSubmission.js)
- [backend/models/familySatisfaction.models.js](backend/models/familySatisfaction.models.js)
- [backend/services/formTemplate.service.js](backend/services/formTemplate.service.js)
- [backend/services/familySatisfaction.service.js](backend/services/familySatisfaction.service.js)
- [backend/data/builtInFormTemplates.js](backend/data/builtInFormTemplates.js) — 48 built-in templates

**Key Models/Schemas:**
- `FormTemplate` — title, fields[], conditionalLogic{}, approvalWorkflow[], logo, header, footer, version, category (admission/medical/consent/evaluation/feedback)
- `FormSubmission` — templateId, respondentId, responses{}, status (draft/submitted/approved/rejected), submittedAt, approvedBy
- `Survey` — title, questions[], targetAudience, startDate, endDate, anonymous, status
- `SurveyResponse` — surveyId, respondentId, answers[], completedAt
- `SatisfactionScore` — surveyId, period, NPS, overallScore, breakdown{service, communication, facility, staff}

**Main API Endpoints:**
```
GET/POST /api/forms/templates                          # Form template CRUD
GET      /api/forms/templates/built-in                  # Pre-built templates (48+)
POST     /api/forms/templates/:id/publish               # Publish template
GET/POST /api/forms/submissions                         # Submit filled form
GET      /api/forms/submissions/:templateId/responses    # All responses for a form
POST     /api/forms/submissions/:id/approve              # Approve form submission
GET/POST /api/forms/surveys                              # Survey creation
GET      /api/forms/surveys/:id/respond                  # Take survey
GET      /api/forms/surveys/:id/results                  # Survey results + analytics
GET      /api/forms/surveys/:id/nps                      # Net Promoter Score calculation
GET      /api/forms/reports/satisfaction                  # Satisfaction trend report
GET      /api/forms/dashboard                            # Forms & surveys dashboard
POST     /api/forms/templates/:id/export-pdf             # Export form as PDF
```

**Why it adds unique value:**
Currently 3 separate systems handle forms (form templates, family satisfaction, beneficiary surveys). A unified service enables a form builder with conditional logic, reusable field libraries, multi-language templates, approval workflows for consent forms (critical for medical/therapy consent in rehab centers), NPS/CSAT tracking, and automated survey distribution — replacing paper forms still common in Saudi educational institutions.

---

### 12. budget-financial-planning-service (Port 3560)

**What it extracts from the monolith:**
- [backend/routes/budgetManagement.routes.js](backend/routes/budgetManagement.routes.js) — 195 lines: Budget CRUD, spending, overview stats
- [backend/models/Budget.js](backend/models/Budget.js) — Budget model
- [backend/models/CashForecast.js](backend/models/CashForecast.js), [backend/models/FinancialPlanning.js](backend/models/FinancialPlanning.js)
- [backend/models/CostAllocation.js](backend/models/CostAllocation.js), [backend/models/CostCenter.js](backend/models/CostCenter.js)
- [backend/services/costBudgetService.js](backend/services/costBudgetService.js) — Cost & budget management
- [backend/services/ai.forecasting.service.js](backend/services/ai.forecasting.service.js) — AI financial forecasting
- [backend/services/advancedFinancialReports.service.js](backend/services/advancedFinancialReports.service.js) — Financial reporting
- [backend/services/smartFinance.service.js](backend/services/smartFinance.service.js) — Smart finance

**Key Models/Schemas:**
- `Budget` — name, department, fiscalYear, totalAmount, spentAmount, categories[], status (draft/approved/active/closed)
- `BudgetCategory` — budgetId, name, allocatedAmount, spentAmount, subcategories[]
- `CostCenter` — code, name, department, manager, annualBudget
- `CostAllocation` — costCenterId, transactionId, amount, allocationMethod, period
- `CashForecast` — period, projectedInflows[], projectedOutflows[], netCashFlow, assumptions[]
- `FinancialPlan` — fiscalYear, departments[], revenueTargets[], expenseTargets[], capitalBudget[], status
- `BudgetVariance` — budgetId, period, planned, actual, variance, variancePercent, explanation

**Main API Endpoints:**
```
GET/POST /api/budget/budgets                           # Budget CRUD
GET      /api/budget/budgets/stats/overview             # Overall budget utilization
POST     /api/budget/budgets/:id/spend                  # Record spending against budget
GET      /api/budget/budgets/:id/variance               # Budget vs actual variance
GET/POST /api/budget/cost-centers                       # Cost center management
POST     /api/budget/cost-allocation                    # Allocate costs to centers
GET      /api/budget/forecasts                           # Cash flow forecasts
POST     /api/budget/forecasts/generate                  # AI-generated forecast
GET/POST /api/budget/plans                               # Annual financial plans
GET      /api/budget/plans/:id/scenarios                 # What-if scenario modeling
GET      /api/budget/reports/department                   # Department budget report
GET      /api/budget/reports/category                    # Spending by category
GET      /api/budget/dashboard                            # Budget KPIs
POST     /api/budget/approvals                            # Budget approval workflow
```

**Why it adds unique value:**
Budget management is currently a basic CRUD in the monolith. A dedicated microservice enables multi-department budget allocation, automated budget-to-actual variance alerts, AI-powered cash flow forecasting (important for tuition-dependent revenue), cost center accounting across branches, what-if scenario planning, and integration with the fee-billing-service for revenue tracking. Essential for financial sustainability of Saudi non-profit rehabilitation centers.

---

### 13. student-lifecycle-service (Port 3570)

**What it extracts from the monolith:**
- [backend/routes/studentCertificates.routes.js](backend/routes/studentCertificates.routes.js) — 333 lines: Certificates (attendance, completion, enrollment, transfer, graduation, achievement)
- [backend/routes/waitlist.routes.js](backend/routes/waitlist.routes.js) — Waitlist management
- [backend/routes/studentComplaints.routes.js](backend/routes/studentComplaints.routes.js) — Student complaint system
- [backend/routes/studentRewardsStore.routes.js](backend/routes/studentRewardsStore.routes.js) — Rewards and store system
- [backend/routes/studentElearning.routes.js](backend/routes/studentElearning.routes.js) — Student e-learning access
- [backend/models/Waitlist.js](backend/models/Waitlist.js), [backend/models/Complaint.js](backend/models/Complaint.js)
- [backend/services/smartAdmission.service.js](backend/services/smartAdmission.service.js) — Smart admissions
- [backend/services/smartAlumni.service.js](backend/services/smartAlumni.service.js) — Alumni tracking
- [backend/services/smartRetention.service.js](backend/services/smartRetention.service.js) — Retention analytics

**Key Models/Schemas:**
- `Admission` — studentId, applicationDate, status (waitlisted/admitted/enrolled/withdrawn/graduated/alumni), documents[], interviewDate, assessmentResults
- `Certificate` — studentId, type (الحضور/إتمام برنامج/إفادة قيد/تفوق/حسن سيرة/مشاركة/نقل/تخرج/إنجاز), status, templateData, printedAt, requestedBy
- `Waitlist` — studentId, program, priority, appliedAt, position, status
- `StudentReward` — studentId, points, source, rewardItem, redeemedAt
- `AlumniRecord` — studentId, graduationDate, program, outcomes, followUpVisits[], currentStatus, employmentStatus
- `TransferRequest` — studentId, fromCenter, toCenter, reason, documents[], status
- `Complaint` — studentId, submittedBy, category, description, priority, assignedTo, resolution, status

**Main API Endpoints:**
```
POST     /api/student-lifecycle/admissions                 # New admission application
GET      /api/student-lifecycle/admissions/pipeline        # Admission funnel
GET      /api/student-lifecycle/waitlist                    # Waitlist management
POST     /api/student-lifecycle/waitlist/:id/admit          # Admit from waitlist
POST     /api/student-lifecycle/certificates/request        # Request certificate
GET      /api/student-lifecycle/certificates/:id/download   # Download certificate PDF
POST     /api/student-lifecycle/transfers                    # Transfer request
GET      /api/student-lifecycle/rewards/:studentId           # Student rewards balance
POST     /api/student-lifecycle/rewards/redeem                # Redeem reward points
GET/POST /api/student-lifecycle/complaints                    # Complaint management
POST     /api/student-lifecycle/graduate/:studentId           # Graduation processing
GET      /api/student-lifecycle/alumni                        # Alumni registry
GET      /api/student-lifecycle/alumni/:id/follow-up          # Post-graduation follow-up
GET      /api/student-lifecycle/reports/retention              # Retention analytics
GET      /api/student-lifecycle/dashboard                     # Lifecycle KPIs (enrollment, graduation rate)
```

**Why it adds unique value:**
Student journey from waitlist → admission → enrollment → active → graduation → alumni tracking is currently scattered across 6+ route files. A unified microservice provides a complete student lifecycle view, enables automated certificate generation with Arabic calligraphy templates, admission pipeline analytics, alumni outcomes tracking (critical for rehabilitation center effectiveness reporting), and integration with the Noor education system for MOE reporting.

---

### 14. external-integration-hub-service (Port 3580)

**What it extracts from the monolith:**
- [backend/routes/noor.routes.js](backend/routes/noor.routes.js) — Ministry of Education integration (students, IEPs, progress reports, sync)
- [backend/routes/mudad.routes.js](backend/routes/mudad.routes.js) — Mudad wage protection system
- [backend/routes/taqat.routes.js](backend/routes/taqat.routes.js) — Taqat employment portal
- [backend/routes/qiwa.routes.js](backend/routes/qiwa.routes.js) — Qiwa labor market
- [backend/routes/gosi.routes.js](backend/routes/gosi.routes.js) — GOSI social insurance
- [backend/routes/governmentIntegration.routes.js](backend/routes/governmentIntegration.routes.js) — General Saudi gov integrations
- [backend/routes/moi-passport.routes.js](backend/routes/moi-passport.routes.js) — MOI passport/Absher
- [backend/routes/eInvoicing.routes.js](backend/routes/eInvoicing.routes.js) — ZATCA e-invoicing (Fatoorah)
- [backend/government-integration/saudi-government-integration-service.js](backend/government-integration/saudi-government-integration-service.js)
- [backend/services/noor.service.js](backend/services/noor.service.js), [backend/services/mudad.service.js](backend/services/mudad.service.js), [backend/services/taqat.service.js](backend/services/taqat.service.js), [backend/services/qiwa.service.js](backend/services/qiwa.service.js), [backend/services/gosi.service.js](backend/services/gosi.service.js), [backend/services/moi-passport.service.js](backend/services/moi-passport.service.js)
- [backend/models/noor.models.js](backend/models/noor.models.js), [backend/models/mudad.models.js](backend/models/mudad.models.js), [backend/models/taqat.models.js](backend/models/taqat.models.js), [backend/models/qiwa.models.js](backend/models/qiwa.models.js), [backend/models/gosi.models.js](backend/models/gosi.models.js)

**Key Models/Schemas:**
- `IntegrationConfig` — systemName, baseUrl, apiKey (encrypted), authMethod, retryPolicy, rateLimits, status
- `SyncJob` — integrationId, direction (push/pull/bidirectional), entity, lastSyncAt, recordsProcessed, errors[], status
- `SyncLog` — jobId, action, entityId, request, response, statusCode, duration
- `IntegrationMapping` — sourceField, targetField, transformation, defaultValue
- `WebhookSubscription` — externalSystem, eventType, callbackUrl, secret, active

**Main API Endpoints:**
```
GET      /api/integrations/systems                      # Available integration systems
GET/POST /api/integrations/configs                      # Integration configuration CRUD
POST     /api/integrations/configs/:id/test              # Test connectivity
POST     /api/integrations/sync/noor                     # Trigger Noor sync (students, IEPs)
POST     /api/integrations/sync/mudad                    # Trigger Mudad wage sync
POST     /api/integrations/sync/gosi                     # Trigger GOSI social insurance sync
POST     /api/integrations/sync/qiwa                     # Trigger Qiwa labor sync
POST     /api/integrations/sync/taqat                    # Trigger Taqat employment sync
POST     /api/integrations/sync/zatca                    # Trigger ZATCA e-invoicing sync
GET      /api/integrations/sync/jobs                     # Sync job history
GET      /api/integrations/sync/jobs/:id/logs            # Detailed sync logs
GET      /api/integrations/mappings/:system               # Field mappings
PUT      /api/integrations/mappings/:system               # Update field mappings
GET      /api/integrations/health                         # All integrations health check
GET      /api/integrations/dashboard                      # Integration status dashboard
POST     /api/integrations/webhooks                       # Register external webhooks
```

**Why it adds unique value:**
Saudi Arabia requires mandatory integration with 7+ government platforms (Noor, Mudad, GOSI, Qiwa, Taqat, MOI/Absher, ZATCA). Currently each has separate route files with duplicated sync logic, credential management, and retry handling. A unified integration hub provides: centralized credential vault, consistent retry/circuit-breaker patterns, sync scheduling, conflict resolution, field mapping UI, and comprehensive audit trail — critical for regulatory compliance and operational reliability.

---

### 15. facility-space-management-service (Port 3590)

**What it extracts from the monolith:**
- [backend/routes/facilities.routes.js](backend/routes/facilities.routes.js) — Facility management
- [backend/routes/enterpriseProPlus.routes.js](backend/routes/enterpriseProPlus.routes.js) — Section 2 Facilities: Facility, SpaceBooking, LeaseContract, UtilityReading
- [backend/routes/classrooms.routes.js](backend/routes/classrooms.routes.js) — Classroom management
- [backend/services/smartFacility.service.js](backend/services/smartFacility.service.js) — Facility intelligence
- [backend/services/smartEnvironment.service.js](backend/services/smartEnvironment.service.js) — Environmental monitoring
- [backend/models/Room.js](backend/models/Room.js), [backend/models/RoomBooking.js](backend/models/RoomBooking.js), [backend/models/Classroom.js](backend/models/Classroom.js)
- Frontend: [frontend/src/pages/facility/FacilityManagementPage.js](frontend/src/pages/facility/FacilityManagementPage.js)

**Key Models/Schemas:**
- `Facility` — name, type (building/wing/floor), address, capacity, operatingHours, amenities[], certifications[]
- `Space` — facilityId, name, type (classroom/therapy-room/sensory-room/pool/office/meeting/cafeteria/playground), capacity, equipment[], accessibility {wheelchair, audioLoop, braille}
- `SpaceBooking` — spaceId, bookedBy, startTime, endTime, purpose, status, recurringPattern
- `LeaseContract` — facilityId, lessor, startDate, endDate, monthlyRent, terms, status
- `UtilityReading` — facilityId, type (electricity/water/AC/internet), reading, date, cost
- `FloorPlan` — facilityId, floor, layoutImage, rooms[], emergencyExits[]
- `AccessibilityAudit` — facilityId, auditDate, findings[], complianceScore, improvementPlan[]

**Main API Endpoints:**
```
GET/POST /api/facilities                                # Facilities CRUD
GET/POST /api/facilities/spaces                         # Spaces/rooms within facilities
GET      /api/facilities/spaces/available                # Available spaces (filter by time, type, capacity)
POST     /api/facilities/spaces/:id/book                 # Book a space
GET      /api/facilities/bookings                        # All bookings calendar view
POST     /api/facilities/bookings/:id/cancel             # Cancel booking
GET/POST /api/facilities/leases                          # Lease contract management
POST     /api/facilities/utilities                       # Record utility readings
GET      /api/facilities/utilities/report                # Utility cost analysis
GET      /api/facilities/floor-plans                     # Floor plans with accessibility info
POST     /api/facilities/accessibility-audit             # Accessibility compliance audit
GET      /api/facilities/dashboard                       # Utilization rates, costs, occupancy
GET      /api/facilities/reports/utilization              # Space utilization report
```

**Why it adds unique value:**
Rehabilitation centers have specialized spaces (sensory rooms, hydrotherapy pools, therapy rooms) that need careful scheduling and accessibility compliance. A dedicated service enables real-time space availability, conflict-free booking for therapy sessions, accessibility compliance auditing (mandatory for disability centers), utility cost tracking per facility, lease management for multi-site operations, and space utilization analytics to optimize costly specialized rooms.

---

## Dependency Graph

```
                    ┌──────────────────────┐
                    │   api-gateway (8080)  │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼────┐           ┌────▼────┐           ┌────▼────┐
   │ identity │           │ backend │           │frontend │
   │  (3360)  │           │ (3001)  │           │ (3004)  │
   └──────────┘           └────┬────┘           └─────────┘
                               │
    ┌──────────┬──────────┬────┴────┬──────────┬──────────┐
    │          │          │         │          │          │
┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌──▼───┐  ┌──▼───┐  ┌──▼───┐
│3450  │  │3460  │  │3470  │  │3480  │  │3490  │  │3500  │
│Inven │  │Acad  │  │Health│  │Visit │  │Crisis│  │Compl │
└──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘
    │          │          │         │          │          │
┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌──▼───┐  ┌──▼───┐  ┌──▼───┐
│3510  │  │3520  │  │3530  │  │3540  │  │3550  │  │3560  │
│Event │  │Asset │  │Train │  │CMS   │  │Forms │  │Budgt │
└──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘
                                   │          │          │
                              ┌───▼──┐  ┌───▼──┐  ┌───▼──┐
                              │3570  │  │3580  │  │3590  │
                              │StdLC │  │IntHb │  │Facil │
                              └──────┘  └──────┘  └──────┘
```

## Inter-Service Communication

| From → To | Protocol | Purpose |
|---|---|---|
| academic(3460) → student-lifecycle(3570) | NATS event | Graduation triggers alumni record |
| student-health(3470) → crisis(3490) | NATS event | Medical emergency triggers crisis alert |
| events(3510) → facility(3590) | REST | Room booking for event |
| events(3510) → cms(3540) | NATS event | New event publishes announcement |
| inventory(3450) → budget(3560) | NATS event | PO triggers budget spend |
| compliance(3500) → facility(3590) | REST | Safety inspection of facility |
| asset-equipment(3520) → inventory(3450) | NATS event | Consumable stock check |
| student-lifecycle(3570) → integration-hub(3580) | REST | Sync admission with Noor |
| staff-training(3530) → compliance(3500) | NATS event | Certification update triggers compliance check |
| forms-survey(3550) → cms(3540) | NATS event | Survey results publish as report |
| crisis(3490) → visitor(3480) | NATS event | Lockdown triggers gate close |
| budget(3560) → integration-hub(3580) | REST | Sync with ZATCA e-invoicing |

## Recommended Implementation Order

**Wave 1 (Weeks 1-3) — Critical Data Isolation:**
1. student-health-medical-service (3470) — data sensitivity
2. external-integration-hub-service (3580) — gov compliance
3. inventory-warehouse-service (3450) — operational need

**Wave 2 (Weeks 4-6) — Core Business:**
4. academic-curriculum-service (3460) — education core
5. asset-equipment-service (3520) — asset tracking
6. budget-financial-planning-service (3560) — financial control

**Wave 3 (Weeks 7-9) — Safety & Compliance:**
7. crisis-safety-service (3490) — safety critical
8. compliance-accreditation-service (3500) — regulatory
9. visitor-campus-security-service (3480) — child protection

**Wave 4 (Weeks 10-12) — Experience & Operations:**
10. events-activities-service (3510) — engagement
11. student-lifecycle-service (3570) — student journey
12. forms-survey-service (3550) — digitization

**Wave 5 (Weeks 13-15) — Enhancement:**
13. staff-training-development-service (3530) — workforce
14. cms-announcements-service (3540) — communication
15. facility-space-management-service (3590) — optimization

## Docker Compose Port Allocation

```yaml
# Phase 6 Microservices
inventory-warehouse-service:       3450
academic-curriculum-service:       3460
student-health-medical-service:    3470
visitor-campus-security-service:   3480
crisis-safety-service:             3490
compliance-accreditation-service:  3500
events-activities-service:         3510
asset-equipment-service:           3520
staff-training-development-service: 3530
cms-announcements-service:         3540
forms-survey-service:              3550
budget-financial-planning-service: 3560
student-lifecycle-service:         3570
external-integration-hub-service:  3580
facility-space-management-service: 3590
```

## Total Backend Code Lines to Extract

| Service | Estimated Lines in Monolith | Route Files | Service Files | Model Files |
|---|---|---|---|---|
| inventory-warehouse | ~2,400 | 2 | 2 | 3 |
| academic-curriculum | ~1,800 | 8 | 1 | 8 |
| student-health-medical | ~860 | 2 | 2 | 2 |
| visitor-campus-security | ~550 | 1 | 3 | 2 |
| crisis-safety | ~1,600 | 3 | 2 | 3 |
| compliance-accreditation | ~900 | 4 | 3 | 4 |
| events-activities | ~700 | 3 | 1 | 2 |
| asset-equipment | ~1,800 | 3 | 4 | 4 |
| staff-training | ~600 | 3 | 2 | 2 |
| cms-announcements | ~600 | 2 | 2 | 1 |
| forms-survey | ~500 | 3 | 2 | 3 |
| budget-financial-planning | ~500 | 1 | 3 | 4 |
| student-lifecycle | ~1,200 | 5 | 3 | 3 |
| external-integration-hub | ~1,500 | 7 | 7 | 5 |
| facility-space-management | ~800 | 3 | 2 | 3 |

**Total: ~15,310 lines extracted from the monolith across 50+ route files, 39+ service files, and 49+ model files.**
