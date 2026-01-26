/**
 * Supply & Support System API Routes
 * نظام الإمداد والمساندة - مسارات API
 */

const express = require('express');
const SupplySupportSystem = require('../lib/supply_support_system');

const router = express.Router();
const supplySystem = new SupplySupportSystem();

/**
 * @route   GET /api/supply/system-status
 * @desc    Get system statistics and status
 */
router.get('/system-status', (req, res) => {
  try {
    const statistics = supplySystem.getSystemStatistics();
    res.json({
      success: true,
      data: statistics,
      message: 'System statistics retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/supply/branches
 * @desc    Get all branches
 */
router.get('/branches', (req, res) => {
  try {
    const branches = supplySystem.getAllBranches();
    res.json({
      success: true,
      data: branches,
      message: 'All branches retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/supply/branches/:branchId
 * @desc    Get branch details
 */
router.get('/branches/:branchId', (req, res) => {
  try {
    const { branchId } = req.params;
    const inventory = supplySystem.getBranchInventory(branchId);

    if (!inventory.success) {
      return res.status(404).json(inventory);
    }

    res.json({
      success: true,
      data: inventory,
      message: 'Branch inventory retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/supply/branches/:branchId/metrics
 * @desc    Get branch performance metrics
 */
router.get('/branches/:branchId/metrics', (req, res) => {
  try {
    const { branchId } = req.params;
    const metrics = supplySystem.getBranchMetrics(branchId);

    if (!metrics.success) {
      return res.status(404).json(metrics);
    }

    res.json({
      success: true,
      data: metrics,
      message: 'Branch metrics retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/supply/branches/:branchId/report
 * @desc    Generate branch report
 */
router.get('/branches/:branchId/report', (req, res) => {
  try {
    const { branchId } = req.params;
    const report = supplySystem.generateBranchReport(branchId);

    if (!report.success) {
      return res.status(404).json(report);
    }

    res.json({
      success: true,
      data: report,
      message: 'Branch report generated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/supply/requests
 * @desc    Create supply request
 * @body    {fromBranch, toBranch, items[], priority}
 */
router.post('/requests', (req, res) => {
  try {
    const { fromBranch, toBranch, items, priority = 'normal' } = req.body;

    if (!fromBranch || !toBranch || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromBranch, toBranch, items',
      });
    }

    const request = supplySystem.createSupplyRequest(fromBranch, toBranch, items, priority);

    res.status(201).json({
      success: true,
      data: request,
      message: 'Supply request created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/supply/requests/:requestId/approve
 * @desc    Approve supply request
 */
router.post('/requests/:requestId/approve', (req, res) => {
  try {
    const { requestId } = req.params;
    const result = supplySystem.approveSupplyRequest(requestId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result,
      message: 'Supply request approved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/supply/transfers
 * @desc    Create inter-branch transfer
 * @body    {fromBranch, toBranch, items[]}
 */
router.post('/transfers', (req, res) => {
  try {
    const { fromBranch, toBranch, items } = req.body;

    if (!fromBranch || !toBranch || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromBranch, toBranch, items',
      });
    }

    const transfer = supplySystem.createTransfer(fromBranch, toBranch, items);

    res.status(201).json({
      success: true,
      data: transfer,
      message: 'Transfer created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/supply/transfers/:transferId
 * @desc    Update transfer status
 * @body    {status, notes}
 */
router.put('/transfers/:transferId', (req, res) => {
  try {
    const { transferId } = req.params;
    const { status, notes = '' } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: status',
      });
    }

    const result = supplySystem.updateTransferStatus(transferId, status, notes);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result,
      message: 'Transfer status updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/supply/branches/:branchId/transfers
 * @desc    Get transfer history for branch
 * @query   {direction: 'sent' | 'received' | 'both'}
 */
router.get('/branches/:branchId/transfers', (req, res) => {
  try {
    const { branchId } = req.params;
    const { direction = 'both' } = req.query;

    const history = supplySystem.getTransferHistory(branchId, direction);

    if (!history.success) {
      return res.status(404).json(history);
    }

    res.json({
      success: true,
      data: history,
      message: 'Transfer history retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/supply/tickets
 * @desc    Create support ticket
 * @body    {fromBranch, category, description, priority}
 */
router.post('/tickets', (req, res) => {
  try {
    const { fromBranch, category, description, priority = 'normal' } = req.body;

    if (!fromBranch || !category || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromBranch, category, description',
      });
    }

    const ticket = supplySystem.createSupportTicket(fromBranch, category, description, priority);

    res.status(201).json({
      success: true,
      data: ticket,
      message: 'Support ticket created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/supply/tickets/:ticketId/comments
 * @desc    Add comment to ticket
 * @body    {author, comment}
 */
router.post('/tickets/:ticketId/comments', (req, res) => {
  try {
    const { ticketId } = req.params;
    const { author, comment } = req.body;

    if (!author || !comment) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: author, comment',
      });
    }

    const result = supplySystem.addTicketComment(ticketId, author, comment);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result,
      message: 'Comment added successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/supply/tickets/:ticketId/resolve
 * @desc    Resolve support ticket
 * @body    {resolution}
 */
router.post('/tickets/:ticketId/resolve', (req, res) => {
  try {
    const { ticketId } = req.params;
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: resolution',
      });
    }

    const result = supplySystem.resolveSupportTicket(ticketId, resolution);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result,
      message: 'Support ticket resolved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/supply/branches/:branchId/predictions
 * @desc    Get predictive inventory analysis
 */
router.get('/branches/:branchId/predictions', (req, res) => {
  try {
    const { branchId } = req.params;
    const predictions = supplySystem.predictiveInventoryAnalysis(branchId);

    if (!predictions.success) {
      return res.status(404).json(predictions);
    }

    res.json({
      success: true,
      data: predictions,
      message: 'Predictive inventory analysis retrieved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Supply System Health Check
 */
router.get('/health', (req, res) => {
  try {
    const stats = supplySystem.getSystemStatistics();
    res.json({
      success: true,
      status: 'operational',
      timestamp: new Date(),
      data: {
        branches: stats.total_branches,
        requests: stats.total_supply_requests,
        transfers: stats.total_transfers,
        tickets: stats.total_support_tickets,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      error: error.message,
    });
  }
});

module.exports = router;
