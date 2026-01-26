/**
 * Barcode Routes
 * Complete barcode management API
 */

const express = require('express');
const router = express.Router();
const Barcode = require('../models/Barcode');
const { authenticateToken } = require('../middleware/auth');
const JsBarcode = require('jsbarcode');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Middleware
router.use(authenticateToken);

/**
 * @route POST /api/barcodes/generate
 * @desc Generate a new barcode
 * @access Private
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      code,
      barcodeType = 'CODE128',
      entityType,
      entityId,
      entityName,
      expiresAt,
      tags = [],
      customFields = {},
    } = req.body;

    // Validate required fields
    if (!barcodeType || !entityType || !entityId || !entityName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: barcodeType, entityType, entityId, entityName',
      });
    }

    // Check if code already exists
    const existingBarcode = await Barcode.findOne({ code });
    if (existingBarcode && existingBarcode.status !== 'ARCHIVED') {
      return res.status(409).json({
        success: false,
        message: 'Barcode code already exists',
        barcode: existingBarcode,
      });
    }

    // Generate barcode data
    const barcodeData = code || Barcode.generateCode(entityType.substring(0, 3), 12);

    let barcodeImage = '';

    // Generate barcode image based on type
    try {
      if (barcodeType === 'QR') {
        barcodeImage = await QRCode.toDataURL(barcodeData, {
          width: 300,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
      } else {
        const canvas = require('canvas');
        const svgCanvas = canvas.createCanvas(200, 100);

        // For now, store a simple representation
        barcodeImage = `data:image/svg+xml;base64,${Buffer.from(
          `<svg><text>${barcodeData}</text></svg>`
        ).toString('base64')}`;
      }
    } catch (error) {
      console.warn('Barcode image generation warning:', error.message);
    }

    // Create barcode document
    const newBarcode = new Barcode({
      code: barcodeData,
      barcodeType,
      entityType,
      entityId,
      entityName,
      barcodeData,
      barcodeImage,
      expiresAt,
      tags,
      customFields,
      createdBy: req.user.id,
      workflowStatus: 'GENERATED',
    });

    await newBarcode.save();

    res.status(201).json({
      success: true,
      message: 'Barcode generated successfully',
      barcode: newBarcode,
    });
  } catch (error) {
    console.error('Generate barcode error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating barcode',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/barcodes/:id
 * @desc Get barcode details
 * @access Private
 */
router.get('/:id', async (req, res) => {
  try {
    const barcode = await Barcode.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('scanHistory.scannedBy', 'name email');

    if (!barcode) {
      return res.status(404).json({
        success: false,
        message: 'Barcode not found',
      });
    }

    res.json({
      success: true,
      barcode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving barcode',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/barcodes/code/:code
 * @desc Get barcode by code
 * @access Private
 */
router.get('/code/:code', async (req, res) => {
  try {
    const barcode = await Barcode.findOne({
      code: req.params.code.toUpperCase(),
      status: 'ACTIVE',
    })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!barcode) {
      return res.status(404).json({
        success: false,
        message: 'Barcode not found or inactive',
      });
    }

    // Check if expired
    if (!barcode.isValid()) {
      return res.status(410).json({
        success: false,
        message: 'Barcode is no longer valid',
        barcode,
      });
    }

    res.json({
      success: true,
      barcode,
      isValid: barcode.isValid(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving barcode',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/barcodes/scan
 * @desc Record a barcode scan
 * @access Private
 */
router.post('/scan', async (req, res) => {
  try {
    const { code, action = 'SCAN', location = '', device = '', details = {} } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Barcode code is required',
      });
    }

    const barcode = await Barcode.findOne({
      code: code.toUpperCase(),
      status: 'ACTIVE',
    });

    if (!barcode) {
      return res.status(404).json({
        success: false,
        message: 'Barcode not found or inactive',
      });
    }

    // Check validity
    if (!barcode.isValid()) {
      return res.status(410).json({
        success: false,
        message: 'Barcode is no longer valid',
        barcode,
      });
    }

    // Record scan
    await barcode.recordScan(req.user.id, action, {
      location,
      device,
      ...details,
    });

    res.json({
      success: true,
      message: 'Scan recorded successfully',
      barcode,
      scanInfo: {
        totalScans: barcode.totalScans,
        lastScannedAt: barcode.lastScannedAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error recording scan',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/barcodes/:id/scans
 * @desc Get scan history for a barcode
 * @access Private
 */
router.get('/:id/scans', async (req, res) => {
  try {
    const barcode = await Barcode.findById(req.params.id).select(
      'scanHistory totalScans lastScannedAt'
    );

    if (!barcode) {
      return res.status(404).json({
        success: false,
        message: 'Barcode not found',
      });
    }

    res.json({
      success: true,
      barcode: {
        id: barcode._id,
        totalScans: barcode.totalScans,
        lastScannedAt: barcode.lastScannedAt,
        scanHistory: barcode.scanHistory,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving scan history',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/barcodes
 * @desc List barcodes with filters
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const {
      entityType,
      status = 'ACTIVE',
      page = 1,
      limit = 20,
      search = '',
      sortBy = '-createdAt',
    } = req.query;

    const filter = { status };

    if (entityType) filter.entityType = entityType;
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { entityName: { $regex: search, $options: 'i' } },
        { barcodeData: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [barcodes, total] = await Promise.all([
      Barcode.find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email')
        .populate('lastScannedBy', 'name email'),
      Barcode.countDocuments(filter),
    ]);

    res.json({
      success: true,
      barcodes,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error listing barcodes',
      error: error.message,
    });
  }
});

/**
 * @route PUT /api/barcodes/:id
 * @desc Update barcode
 * @access Private
 */
router.put('/:id', async (req, res) => {
  try {
    const { tags, customFields, expiresAt, description, category } = req.body;

    const barcode = await Barcode.findById(req.params.id);
    if (!barcode) {
      return res.status(404).json({
        success: false,
        message: 'Barcode not found',
      });
    }

    // Update fields
    if (tags) barcode.tags = tags;
    if (customFields) barcode.customFields = { ...barcode.customFields, ...customFields };
    if (expiresAt) barcode.expiresAt = new Date(expiresAt);
    if (description !== undefined) barcode.description = description;
    if (category) barcode.category = category;

    barcode.updatedBy = req.user.id;
    barcode.updatedAt = new Date();

    await barcode.save();

    res.json({
      success: true,
      message: 'Barcode updated successfully',
      barcode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating barcode',
      error: error.message,
    });
  }
});

/**
 * @route DELETE /api/barcodes/:id
 * @desc Deactivate/delete barcode
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const { reason = '' } = req.body;

    const barcode = await Barcode.findById(req.params.id);
    if (!barcode) {
      return res.status(404).json({
        success: false,
        message: 'Barcode not found',
      });
    }

    await barcode.deactivate(req.user.id, reason);

    res.json({
      success: true,
      message: 'Barcode deactivated successfully',
      barcode,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating barcode',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/barcodes/batch/generate
 * @desc Generate batch of barcodes
 * @access Private
 */
router.post('/batch/generate', async (req, res) => {
  try {
    const {
      quantity = 10,
      prefix = '',
      barcodeType = 'CODE128',
      entityType,
      baseEntityName,
      tags = [],
    } = req.body;

    if (!entityType || !baseEntityName) {
      return res.status(400).json({
        success: false,
        message: 'entityType and baseEntityName are required',
      });
    }

    const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const barcodes = [];

    for (let i = 1; i <= quantity; i++) {
      const code = Barcode.generateCode(prefix || entityType.substring(0, 3), 12);

      const newBarcode = new Barcode({
        code,
        barcodeType,
        entityType,
        entityId: require('mongoose').Types.ObjectId(),
        entityName: `${baseEntityName}-${i}`,
        barcodeData: code,
        tags,
        batchId,
        batchNumber: i,
        totalInBatch: quantity,
        createdBy: req.user.id,
        workflowStatus: 'GENERATED',
      });

      barcodes.push(newBarcode);
    }

    await Barcode.insertMany(barcodes);

    res.status(201).json({
      success: true,
      message: `Batch of ${quantity} barcodes generated successfully`,
      batchId,
      barcodes: barcodes.map(b => ({
        id: b._id,
        code: b.code,
        barcodeData: b.barcodeData,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating batch',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/barcodes/batch/:batchId
 * @desc Get all barcodes in a batch
 * @access Private
 */
router.get('/batch/:batchId', async (req, res) => {
  try {
    const barcodes = await Barcode.find({ batchId: req.params.batchId })
      .populate('createdBy', 'name email')
      .sort({ batchNumber: 1 });

    if (barcodes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found',
      });
    }

    res.json({
      success: true,
      batchId: req.params.batchId,
      totalBarcodes: barcodes.length,
      barcodes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving batch',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/barcodes/stats/overview
 * @desc Get barcode statistics overview
 * @access Private
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalBarcodes,
      activeBarcodes,
      inactiveBarcodes,
      archivedBarcodes,
      totalScans,
      byEntityType,
      byBarcodeType,
    ] = await Promise.all([
      Barcode.countDocuments(),
      Barcode.countDocuments({ status: 'ACTIVE' }),
      Barcode.countDocuments({ status: 'INACTIVE' }),
      Barcode.countDocuments({ status: 'ARCHIVED' }),
      Barcode.aggregate([{ $group: { _id: null, totalScans: { $sum: '$totalScans' } } }]),
      Barcode.aggregate([{ $group: { _id: '$entityType', count: { $sum: 1 } } }]),
      Barcode.aggregate([{ $group: { _id: '$barcodeType', count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      statistics: {
        total: totalBarcodes,
        active: activeBarcodes,
        inactive: inactiveBarcodes,
        archived: archivedBarcodes,
        totalScans: totalScans[0]?.totalScans || 0,
        byEntityType: Object.fromEntries(byEntityType.map(item => [item._id, item.count])),
        byBarcodeType: Object.fromEntries(byBarcodeType.map(item => [item._id, item.count])),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving statistics',
      error: error.message,
    });
  }
});

module.exports = router;
