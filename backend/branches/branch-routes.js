/**
 * Branch Routes - مسارات الفروع
 * API Endpoints for Branch Management
 */

const express = require('express');
const router = express.Router();
const { branchManagementService } = require('./branch-service');

/**
 * @route   GET /api/branches
 * @desc    Get all branches with filters
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const options = {
      type: req.query.type,
      status: req.query.status,
      region: req.query.region,
      parentBranch: req.query.parentBranch,
      tenantId: req.user?.tenantId,
      limit: parseInt(req.query.limit) || 100,
      sort: req.query.sort || { code: 1 },
    };
    
    const branches = await branchManagementService.getBranches(options);
    
    res.json({
      success: true,
      data: branches,
      count: branches.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/branches/hierarchy
 * @desc    Get branches hierarchy
 * @access  Private
 */
router.get('/hierarchy', async (req, res) => {
  try {
    const hierarchy = await branchManagementService.getBranchHierarchy();
    
    res.json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/branches/statistics
 * @desc    Get branch statistics
 * @access  Private
 */
router.get('/statistics', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const stats = await branchManagementService.getStatistics(tenantId);
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/branches/open
 * @desc    Get currently open branches
 * @access  Public
 */
router.get('/open', async (req, res) => {
  try {
    const branches = await branchManagementService.getOpenBranches(req.query.region);
    
    res.json({
      success: true,
      data: branches,
      count: branches.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/branches/search
 * @desc    Search branches
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required',
      });
    }
    
    const branches = await branchManagementService.searchBranches(q, {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 20,
    });
    
    res.json({
      success: true,
      data: branches,
      count: branches.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/branches/region/:region
 * @desc    Get branches by region
 * @access  Public
 */
router.get('/region/:region', async (req, res) => {
  try {
    const branches = await branchManagementService.getBranchesByRegion(req.params.region);
    
    res.json({
      success: true,
      data: branches,
      count: branches.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/branches/nearby
 * @desc    Get nearby branches
 * @access  Public
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, distance } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required',
      });
    }
    
    const branches = await branchManagementService.getNearbyBranches(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(distance) || 50
    );
    
    res.json({
      success: true,
      data: branches,
      count: branches.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/branches/:id
 * @desc    Get branch by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const branch = await branchManagementService.getBranch(req.params.id);
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }
    
    res.json({
      success: true,
      data: branch,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/branches/code/:code
 * @desc    Get branch by code
 * @access  Public
 */
router.get('/code/:code', async (req, res) => {
  try {
    const branch = await branchManagementService.getBranchByCode(req.params.code);
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }
    
    res.json({
      success: true,
      data: branch,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/branches/:id/open
 * @desc    Check if branch is open
 * @access  Public
 */
router.get('/:id/open', async (req, res) => {
  try {
    const isOpen = await branchManagementService.isBranchOpen(req.params.id);
    
    res.json({
      success: true,
      isOpen,
      branchId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/branches
 * @desc    Create new branch
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
  try {
    const branchData = {
      ...req.body,
      createdBy: req.user?.id,
      tenantId: req.user?.tenantId,
    };
    
    const branch = await branchManagementService.createBranch(branchData);
    
    res.status(201).json({
      success: true,
      data: branch,
      message: 'تم إنشاء الفرع بنجاح',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/branches/:id
 * @desc    Update branch
 * @access  Private (Admin/Manager)
 */
router.put('/:id', async (req, res) => {
  try {
    const branch = await branchManagementService.updateBranch(
      req.params.id,
      req.body,
      req.user?.id
    );
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }
    
    res.json({
      success: true,
      data: branch,
      message: 'تم تحديث الفرع بنجاح',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/branches/:id/status
 * @desc    Update branch status
 * @access  Private (Admin)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
      });
    }
    
    const branch = await branchManagementService.updateStatus(
      req.params.id,
      status,
      req.user?.id,
      reason
    );
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }
    
    res.json({
      success: true,
      data: branch,
      message: 'تم تحديث حالة الفرع',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/branches/:id/manager
 * @desc    Assign manager to branch
 * @access  Private (Admin)
 */
router.put('/:id/manager', async (req, res) => {
  try {
    const branch = await branchManagementService.assignManager(
      req.params.id,
      req.body
    );
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }
    
    res.json({
      success: true,
      data: branch,
      message: 'تم تعيين مدير الفرع',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/branches/:id
 * @desc    Delete branch (soft delete by setting status to closed)
 * @access  Private (Admin)
 */
router.delete('/:id', async (req, res) => {
  try {
    const branch = await branchManagementService.updateStatus(
      req.params.id,
      'closed',
      req.user?.id,
      req.body.reason || 'Closed via API'
    );
    
    if (!branch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found',
      });
    }
    
    res.json({
      success: true,
      message: 'تم إغلاق الفرع',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============ Transfers ============

/**
 * @route   GET /api/branches/:branchId/transfers
 * @desc    Get transfers for branch
 * @access  Private
 */
router.get('/:branchId/transfers', async (req, res) => {
  try {
    const transfers = await branchManagementService.getTransfers(
      req.params.branchId,
      {
        status: req.query.status,
        type: req.query.type,
        limit: parseInt(req.query.limit) || 50,
      }
    );
    
    res.json({
      success: true,
      data: transfers,
      count: transfers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/branches/transfers
 * @desc    Create transfer
 * @access  Private
 */
router.post('/transfers', async (req, res) => {
  try {
    const transferData = {
      ...req.body,
      createdBy: req.user?.id,
      tenantId: req.user?.tenantId,
    };
    
    const transfer = await branchManagementService.createTransfer(transferData);
    
    res.status(201).json({
      success: true,
      data: transfer,
      message: 'تم إنشاء طلب التحويل',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/branches/transfers/:transferId/approve
 * @desc    Approve transfer
 * @access  Private
 */
router.put('/transfers/:transferId/approve', async (req, res) => {
  try {
    const { branchType } = req.body; // 'from' or 'to'
    
    const transfer = await branchManagementService.approveTransfer(
      req.params.transferId,
      branchType,
      req.user?.id,
      req.user?.name
    );
    
    res.json({
      success: true,
      data: transfer,
      message: 'تم اعتماد التحويل',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/branches/transfers/:transferId/ship
 * @desc    Ship transfer
 * @access  Private
 */
router.put('/transfers/:transferId/ship', async (req, res) => {
  try {
    const transfer = await branchManagementService.shipTransfer(
      req.params.transferId,
      req.body
    );
    
    res.json({
      success: true,
      data: transfer,
      message: 'تم شحن التحويل',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/branches/transfers/:transferId/receive
 * @desc    Receive transfer
 * @access  Private
 */
router.put('/transfers/:transferId/receive', async (req, res) => {
  try {
    const transfer = await branchManagementService.receiveTransfer(
      req.params.transferId,
      req.user?.id,
      req.user?.name
    );
    
    res.json({
      success: true,
      data: transfer,
      message: 'تم استلام التحويل',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============ Performance ============

/**
 * @route   GET /api/branches/:branchId/performance
 * @desc    Get performance report
 * @access  Private
 */
router.get('/:branchId/performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required',
      });
    }
    
    const report = await branchManagementService.getPerformanceReport(
      req.params.branchId,
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/branches/:branchId/performance
 * @desc    Log performance data
 * @access  Private (System)
 */
router.post('/:branchId/performance', async (req, res) => {
  try {
    const { date, metrics } = req.body;
    
    const log = await branchManagementService.logPerformance(
      req.params.branchId,
      new Date(date),
      metrics
    );
    
    res.status(201).json({
      success: true,
      data: log,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;