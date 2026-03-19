/**
 * Insurance Routes — مسارات التأمين
 *
 * ✅ CRUD كامل لوثائق التأمين
 * ✅ إدارة المطالبات
 * ✅ الإحصائيات والتقارير
 * ✅ التجديد وعروض الأسعار
 * ✅ البيانات المرجعية (شركات، أنواع، مخالفات)
 */

const express = require('express');
const router = express.Router();
const InsuranceController = require('../controllers/insurance.controller');

// ─── البيانات المرجعية ───────────────────────────────────────────────
router.get('/companies', InsuranceController.getInsuranceCompanies);
router.get('/policy-types', InsuranceController.getPolicyTypes);
router.get('/violation-codes', InsuranceController.getViolationCodes);

// ─── الإحصائيات ──────────────────────────────────────────────────────
router.get('/statistics', InsuranceController.getStatistics);
router.get('/expiring', InsuranceController.getExpiringPolicies);

// ─── عروض الأسعار ────────────────────────────────────────────────────
router.post('/quote', InsuranceController.getQuote);

// ─── التأمين حسب المركبة ─────────────────────────────────────────────
router.get('/vehicle/:vehicleId', InsuranceController.getVehicleInsurance);

// ─── CRUD الوثائق ────────────────────────────────────────────────────
router.get('/', InsuranceController.getAllPolicies);
router.get('/:id', InsuranceController.getPolicy);
router.post('/', InsuranceController.createPolicy);
router.put('/:id', InsuranceController.updatePolicy);
router.delete('/:id', InsuranceController.deletePolicy);

// ─── التجديد ─────────────────────────────────────────────────────────
router.post('/:id/renew', InsuranceController.renewPolicy);

// ─── المطالبات ───────────────────────────────────────────────────────
router.get('/:id/claims', InsuranceController.getPolicyClaims);
router.post('/:id/claims', InsuranceController.addClaim);
router.put('/:id/claims/:claimId', InsuranceController.updateClaimStatus);

module.exports = router;
