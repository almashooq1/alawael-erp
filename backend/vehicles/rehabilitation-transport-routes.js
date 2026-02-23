/**
 * Rehabilitation Transport Routes - مسارات نقل مراكز التأهيل
 * API Endpoints for Disability Rehabilitation Center Transport
 */

const express = require('express');
const router = express.Router();
const { 
  rehabilitationTransportService, 
  nationalAddressConfig,
  AIRouteOptimizer 
} = require('./rehabilitation-transport-service');

// ============ Configuration ============

router.get('/config/regions', (req, res) => {
  res.json({ success: true, data: nationalAddressConfig.regions });
});

router.get('/config/shifts', (req, res) => {
  res.json({ success: true, data: nationalAddressConfig.shifts });
});

router.get('/config/disability-types', (req, res) => {
  res.json({ success: true, data: nationalAddressConfig.disabilityTypes });
});

router.get('/config/vehicle-types', (req, res) => {
  res.json({ success: true, data: nationalAddressConfig.vehicleTypes });
});

// ============ Statistics ============

router.get('/statistics/:centerId', async (req, res) => {
  try {
    const stats = await rehabilitationTransportService.getTransportStatistics(req.params.centerId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Branches ============

router.get('/branches/center/:centerId', async (req, res) => {
  try {
    const branches = await rehabilitationTransportService.getBranchesByCenter(req.params.centerId);
    res.json({ success: true, data: branches, count: branches.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/branches/:branchId', async (req, res) => {
  try {
    const branch = await rehabilitationTransportService.getBranch(req.params.branchId);
    if (!branch) return res.status(404).json({ success: false, error: 'Branch not found' });
    res.json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/branches', async (req, res) => {
  try {
    const branch = await rehabilitationTransportService.createBranch({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: branch, message: 'تم إضافة الفرع' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Beneficiaries ============

router.get('/beneficiaries/center/:centerId', async (req, res) => {
  try {
    const beneficiaries = await rehabilitationTransportService.getBeneficiariesByCenter(req.params.centerId);
    res.json({ success: true, data: beneficiaries, count: beneficiaries.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/beneficiaries/branch/:branchId', async (req, res) => {
  try {
    const shiftType = req.query.shift;
    const beneficiaries = await rehabilitationTransportService.getBeneficiariesByBranch(
      req.params.branchId, 
      shiftType
    );
    res.json({ success: true, data: beneficiaries, count: beneficiaries.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/beneficiaries/:beneficiaryId', async (req, res) => {
  try {
    const beneficiary = await rehabilitationTransportService.getBeneficiary(req.params.beneficiaryId);
    if (!beneficiary) return res.status(404).json({ success: false, error: 'Beneficiary not found' });
    res.json({ success: true, data: beneficiary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/beneficiaries', async (req, res) => {
  try {
    const beneficiary = await rehabilitationTransportService.createBeneficiary({
      ...req.body,
      tenantId: req.user?.tenantId,
    });
    res.status(201).json({ success: true, data: beneficiary, message: 'تم تسجيل المستفيد' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AI Route Optimization ============

router.post('/routes/optimize/:branchId/:shiftType', async (req, res) => {
  try {
    const { branchId, shiftType } = req.params;
    const route = await rehabilitationTransportService.optimizeBranchRoutes(branchId, shiftType);
    res.json({ 
      success: true, 
      data: route, 
      message: 'تم تحسين المسار بالذكاء الاصطناعي' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/routes/branch/:branchId', async (req, res) => {
  try {
    const routes = await rehabilitationTransportService.getBranchRoutes(req.params.branchId);
    res.json({ success: true, data: routes, count: routes.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/routes/today/:centerId', async (req, res) => {
  try {
    const routes = await rehabilitationTransportService.getTodayRoutes(req.params.centerId);
    res.json({ success: true, data: routes, count: routes.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AI Route Preview (without saving) ============

router.post('/routes/preview', async (req, res) => {
  try {
    const { branchCoordinates, beneficiaries } = req.body;
    
    const optimizer = new AIRouteOptimizer();
    const optimization = optimizer.optimizeRoute(branchCoordinates, beneficiaries);
    
    res.json({ 
      success: true, 
      data: optimization,
      message: 'معاينة المسار المحسن' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Geospatial Queries ============

router.get('/beneficiaries/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10 } = req.query; // maxDistance in km
    
    const beneficiaries = await rehabilitationTransportService.Beneficiary.find({
      'nationalAddress.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseFloat(maxDistance) * 1000, // convert to meters
        },
      },
      'subscription.active': true,
    });
    
    res.json({ success: true, data: beneficiaries, count: beneficiaries.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ Clustering ============

router.post('/cluster', async (req, res) => {
  try {
    const { beneficiaries, maxClusters = 5 } = req.body;
    
    const optimizer = new AIRouteOptimizer();
    const clusters = optimizer.clusterBeneficiaries(beneficiaries, maxClusters);
    
    res.json({ 
      success: true, 
      data: clusters,
      message: `تم تقسيم المستفيدين إلى ${clusters.length} مجموعات` 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;