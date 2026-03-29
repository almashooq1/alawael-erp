/**
 * @migration 20250201000000_create-all-collections
 * @description إنشاء جميع المجموعات الأساسية مع الـ Validators
 * Creates all core collections with JSON Schema validators
 *
 * يضمن هذا الـ migration وجود جميع المجموعات الأساسية في قاعدة البيانات
 * مع قواعد التحقق المناسبة
 */

'use strict';

/**
 * @param {import('mongoose').Connection} db
 */
async function up(db) {
  const collections = await db.listCollections().toArray();
  const existingNames = new Set(collections.map(c => c.name));

  /**
   * إنشاء مجموعة إذا لم تكن موجودة
   */
  async function ensureCollection(name, options = {}) {
    if (!existingNames.has(name)) {
      await db.createCollection(name, options);
      console.log(`  ✅ Created collection: ${name}`);
    } else {
      console.log(`  ⏩ Exists: ${name}`);
    }
  }

  // ── CORE IDENTITY & AUTH ──────────────────────────────────────────
  await ensureCollection('users', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'createdAt'],
        properties: {
          name: { bsonType: 'string', description: 'User name is required' },
          email: { bsonType: 'string', pattern: '^[^@]+@[^@]+$' },
          role: {
            bsonType: 'string',
            enum: [
              'superadmin',
              'admin',
              'manager',
              'staff',
              'therapist',
              'receptionist',
              'viewer',
              'parent',
              'employee',
            ],
          },
          isActive: { bsonType: 'bool' },
          createdAt: { bsonType: 'date' },
        },
      },
    },
    validationAction: 'warn',
    validationLevel: 'moderate',
  });

  await ensureCollection('sessions');
  await ensureCollection('apikeys');
  await ensureCollection('tokens');

  // ── BENEFICIARY MANAGEMENT ────────────────────────────────────────
  await ensureCollection('beneficiaries', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['createdAt'],
        properties: {
          nationalId: { bsonType: 'string', minLength: 10, maxLength: 10 },
          caseStatus: {
            bsonType: 'string',
            enum: ['active', 'inactive', 'waitlist', 'graduated', 'transferred', 'deceased'],
          },
          createdAt: { bsonType: 'date' },
        },
      },
    },
    validationAction: 'warn',
    validationLevel: 'moderate',
  });

  await ensureCollection('beneficiaryfiles');
  await ensureCollection('beneficiaryprogresses');
  await ensureCollection('waitlists');
  await ensureCollection('guardians');
  await ensureCollection('careplanhistories');

  // ── REHABILITATION & PROGRAMS ─────────────────────────────────────
  await ensureCollection('programs');
  await ensureCollection('rehabilitationplans');
  await ensureCollection('therapysessions');
  await ensureCollection('therapyrooms');
  await ensureCollection('appointments');
  await ensureCollection('assessments');
  await ensureCollection('goals');
  await ensureCollection('goalprogresshistories');
  await ensureCollection('goalbankitems');
  await ensureCollection('sessiondocumentations');
  await ensureCollection('icfassessments');
  await ensureCollection('adlassessments');
  await ensureCollection('standardizedassessments');
  await ensureCollection('specializedassessmentscales');
  await ensureCollection('therapeuticplans');
  await ensureCollection('groupsessions');
  await ensureCollection('grouptherapies');
  await ensureCollection('earlyinterventions');
  await ensureCollection('postrehabilationfollowups');
  await ensureCollection('outcomemeasures');
  await ensureCollection('virtualsessions');
  await ensureCollection('telerehabilitations');

  // ── HR & WORKFORCE ────────────────────────────────────────────────
  await ensureCollection('employees', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['createdAt'],
        properties: {
          nationalId: { bsonType: 'string' },
          status: {
            bsonType: 'string',
            enum: ['active', 'inactive', 'suspended', 'resigned', 'terminated', 'retired'],
          },
          createdAt: { bsonType: 'date' },
        },
      },
    },
    validationAction: 'warn',
    validationLevel: 'moderate',
  });

  await ensureCollection('departments');
  await ensureCollection('positions');
  await ensureCollection('attendances');
  await ensureCollection('leaves');
  await ensureCollection('leaverequests');
  await ensureCollection('shifts');
  await ensureCollection('workshifts');
  await ensureCollection('payrolls');
  await ensureCollection('salaries');
  await ensureCollection('employeeprofiles');
  await ensureCollection('employeeinsurances');
  await ensureCollection('employeeloans');
  await ensureCollection('employeerequests');
  await ensureCollection('performanceevaluations');
  await ensureCollection('trainingplans');
  await ensureCollection('trainings');
  await ensureCollection('successionplans');
  await ensureCollection('onboardings');
  await ensureCollection('offboardings');
  await ensureCollection('recruitments');
  await ensureCollection('disciplinaryactions');
  await ensureCollection('grievances');
  await ensureCollection('delegations');
  await ensureCollection('gratuities');
  await ensureCollection('gratuitiesaudits');
  await ensureCollection('overtimes');
  await ensureCollection('zktecodevices');

  // ── FINANCE & ACCOUNTING ──────────────────────────────────────────
  await ensureCollection('invoices');
  await ensureCollection('payments');
  await ensureCollection('transactions');
  await ensureCollection('journalentries');
  await ensureCollection('accounts');
  await ensureCollection('chartofaccounts');
  await ensureCollection('costcenters');
  await ensureCollection('budgets');
  await ensureCollection('expenses');
  await ensureCollection('accountingexpenses');
  await ensureCollection('accountingpayments');
  await ensureCollection('accountinginvoices');
  await ensureCollection('accountingreconciliations');
  await ensureCollection('fiscalperiods');
  await ensureCollection('taxfilings');
  await ensureCollection('vatreturns');
  await ensureCollection('taxcalendars');
  await ensureCollection('taxplanningstrategies');
  await ensureCollection('zakatreturns');
  await ensureCollection('einvoices');
  await ensureCollection('creditnotes');
  await ensureCollection('cashflows');
  await ensureCollection('cashforecasts');
  await ensureCollection('bankaccounts');
  await ensureCollection('bankreconciliations');
  await ensureCollection('bankguarantees');
  await ensureCollection('chequebooks');
  await ensureCollection('pettycashes');
  await ensureCollection('paymentvouchers');
  await ensureCollection('financialtransactions');
  await ensureCollection('financialreports');
  await ensureCollection('financialplannings');
  await ensureCollection('fixedassets');
  await ensureCollection('assetdepreciations');
  await ensureCollection('recurringtransactions');
  await ensureCollection('leasings');
  await ensureCollection('investments');
  await ensureCollection('revenuerecognitions');
  await ensureCollection('costallocations');
  await ensureCollection('intercompanysettlements');
  await ensureCollection('debtinstruments');
  await ensureCollection('creditmanagements');
  await ensureCollection('dungings');
  await ensureCollection('financialworkflows');
  await ensureCollection('withholdingaxes');

  // ── BRANCHES & ORGANIZATION ───────────────────────────────────────
  await ensureCollection('branches');
  await ensureCollection('organizations');
  await ensureCollection('orgbrandings');
  await ensureCollection('branchauditlogs');
  await ensureCollection('branchperformancelogs');
  await ensureCollection('branchtargets');

  // ── FLEET & VEHICLES ──────────────────────────────────────────────
  await ensureCollection('vehicles');
  await ensureCollection('drivers');
  await ensureCollection('trips');
  await ensureCollection('transportroutes');
  await ensureCollection('vehicleassignments');
  await ensureCollection('vehicleinsurances');
  await ensureCollection('fleetfuels');
  await ensureCollection('fleetfuelcards');
  await ensureCollection('fleetmaintenances');
  await ensureCollection('fleetaccidents');
  await ensureCollection('fleetsafetyincidents');
  await ensureCollection('fleetalerts');
  await ensureCollection('fleetbudgets');
  await ensureCollection('fleetdocuments');
  await ensureCollection('fleetkpis');
  await ensureCollection('fleetparts');
  await ensureCollection('fleetreservations');
  await ensureCollection('fleetrouteplans');
  await ensureCollection('fleetpenalties');
  await ensureCollection('fleetparking');
  await ensureCollection('fleettires');
  await ensureCollection('fleettolls');
  await ensureCollection('fleetwarranties');
  await ensureCollection('fleetcompliances');
  await ensureCollection('fleetdisposals');
  await ensureCollection('fleetinspections');
  await ensureCollection('gpslocations');
  await ensureCollection('geofences');
  await ensureCollection('trafficfines');
  await ensureCollection('trafficaccidentreports');

  // ── DOCUMENTS & ARCHIVE ───────────────────────────────────────────
  await ensureCollection('documents');
  await ensureCollection('documentversions');
  await ensureCollection('digitallibrary');
  await ensureCollection('correspondences');
  await ensureCollection('formssubmissions');
  await ensureCollection('formstemplates');
  await ensureCollection('esignatures');
  await ensureCollection('esignaturetemplates');
  await ensureCollection('estamps');
  await ensureCollection('mediaitems');
  await ensureCollection('mediaalbums');
  await ensureCollection('importexportjobs');
  await ensureCollection('importexporttemplates');

  // ── NOTIFICATIONS & COMMUNICATIONS ───────────────────────────────
  await ensureCollection('notifications');
  await ensureCollection('notificationtemplates');
  await ensureCollection('notificationtemplateaudits');
  await ensureCollection('notificationanalytics');
  await ensureCollection('schedulednotifications');
  await ensureCollection('smartnotifications');
  await ensureCollection('communications');
  await ensureCollection('messages');
  await ensureCollection('conversations');
  await ensureCollection('portalmessages');
  await ensureCollection('portalnotifications');
  await ensureCollection('portalpayments');
  await ensureCollection('campaigns');
  await ensureCollection('webhooks');
  await ensureCollection('webhookdeliveries');

  // ── INVENTORY & PROCUREMENT ───────────────────────────────────────
  await ensureCollection('inventories');
  await ensureCollection('inventoryitems');
  await ensureCollection('warehouses');
  await ensureCollection('products');
  await ensureCollection('suppliers');
  await ensureCollection('vendors');
  await ensureCollection('vendorevaluations');
  await ensureCollection('purchaseorders');
  await ensureCollection('purchaserequests');
  await ensureCollection('dispatchorders');
  await ensureCollection('cargos');
  await ensureCollection('orders');

  // ── PROJECTS & TASKS ──────────────────────────────────────────────
  await ensureCollection('projects');
  await ensureCollection('tasks');
  await ensureCollection('activities');
  await ensureCollection('approvalrequests');
  await ensureCollection('approvalworkflows');
  await ensureCollection('workflowenhanceds');

  // ── QUALITY & COMPLIANCE ──────────────────────────────────────────
  await ensureCollection('qualitymanagements');
  await ensureCollection('compliancecontrols');
  await ensureCollection('compliancelogs');
  await ensureCollection('compliancemetrics');
  await ensureCollection('riskassessments');
  await ensureCollection('riskmanagements');
  await ensureCollection('auditengagements');
  await ensureCollection('internalaudits');
  await ensureCollection('hserecords');
  await ensureCollection('incidents');
  await ensureCollection('benchmarkingreports');

  // ── AUDIT LOGS ────────────────────────────────────────────────────
  await ensureCollection('auditlogs', {
    capped: false, // TTL index used instead
  });
  await ensureCollection('securitylogs');
  await ensureCollection('branchauditlogs');

  // ── ANALYTICS & BI ────────────────────────────────────────────────
  await ensureCollection('analyticsevents');
  await ensureCollection('analyticscaches');
  await ensureCollection('bireports');
  await ensureCollection('bikpis');
  await ensureCollection('kpis');
  await ensureCollection('strategicgoals');
  await ensureCollection('strategicinitiatives');
  await ensureCollection('strategickpis');
  await ensureCollection('performancemetrics');
  await ensureCollection('predictions');
  await ensureCollection('aimlinsights');

  // ── SYSTEM CONFIGURATION ──────────────────────────────────────────
  await ensureCollection('systemsettings');
  await ensureCollection('roles');
  await ensureCollection('permissions');
  await ensureCollection('subscriptionplans');
  await ensureCollection('usersubscriptions');
  await ensureCollection('licensealerts');
  await ensureCollection('licenseauditlogs');
  await ensureCollection('licensedocuments');
  await ensureCollection('licenseenhanceds');

  console.log('\n  ✅ All collections ensured successfully');
}

/**
 * @param {import('mongoose').Connection} db
 */
async function down(db) {
  console.log('  ℹ️  Down migration: Collections are not dropped to prevent data loss.');
  console.log('  ℹ️  To drop collections manually, use the database admin tools.');
}

module.exports = { up, down };
