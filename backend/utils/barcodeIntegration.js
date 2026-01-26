/**
 * Barcode Integration Helper
 * Functions to integrate barcodes with existing entities
 */

const Barcode = require('../models/Barcode');

// ============================================
// 1. ATTACH BARCODE TO EXISTING ENTITY
// ============================================

/**
 * Attach a barcode to an existing entity (Product, Vehicle, Employee, etc)
 *
 * @param {string} entityType - Type of entity (PRODUCT, VEHICLE, EMPLOYEE, etc)
 * @param {string} entityId - ID of the entity
 * @param {string} barcodeCode - The barcode code to attach
 */
const attachBarcodeToEntity = async (entityType, entityId, barcodeCode) => {
  try {
    // Step 1: Get the entity
    let entity;
    let EntityModel;

    switch (entityType) {
      case 'PRODUCT':
        EntityModel = require('../models/Product');
        break;
      case 'VEHICLE':
        EntityModel = require('../models/Vehicle');
        break;
      case 'EMPLOYEE':
        EntityModel = require('../models/Employee');
        break;
      case 'ASSET':
        EntityModel = require('../models/Asset');
        break;
      // Add other entity types as needed
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    entity = await EntityModel.findById(entityId);
    if (!entity) {
      throw new Error(`${entityType} not found with ID: ${entityId}`);
    }

    // Step 2: Get or create barcode
    let barcode = await Barcode.findOne({ code: barcodeCode });

    if (!barcode) {
      barcode = await Barcode.create({
        code: barcodeCode,
        barcodeType: 'CODE128',
        entityType,
        entityId,
        entityName: entity.name || entity.title || entity.firstName,
        status: 'ACTIVE',
      });
    } else {
      // Update existing barcode
      barcode.entityId = entityId;
      barcode.entityName = entity.name || entity.title || entity.firstName;
      await barcode.save();
    }

    // Step 3: Update entity with barcode reference
    entity.barcode = {
      code: barcode.code,
      barcodeId: barcode._id,
      linkedAt: new Date(),
    };

    await entity.save();

    return {
      success: true,
      message: `Barcode ${barcodeCode} attached to ${entityType} ${entityId}`,
      barcode,
      entity,
    };
  } catch (error) {
    throw new Error(`Failed to attach barcode: ${error.message}`);
  }
};

// ============================================
// 2. CREATE BARCODE FOR NEW ENTITY
// ============================================

/**
 * Create barcode when creating a new entity
 * Call this from your entity creation routes
 *
 * @param {string} entityType - Type of entity
 * @param {object} entityData - The entity data
 * @returns {object} - Created entity with barcode
 */
const createEntityWithBarcode = async (entityType, entityData) => {
  const Barcode = require('../models/Barcode');

  try {
    // Step 1: Create the entity (use your existing entity service)
    let entity;
    let EntityModel;

    switch (entityType) {
      case 'PRODUCT':
        EntityModel = require('../models/Product');
        entity = new EntityModel(entityData);
        break;
      case 'VEHICLE':
        EntityModel = require('../models/Vehicle');
        entity = new EntityModel(entityData);
        break;
      case 'EMPLOYEE':
        EntityModel = require('../models/Employee');
        entity = new EntityModel(entityData);
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    await entity.save();

    // Step 2: Create barcode for the entity
    const barcodeCode = await Barcode.generateCode(entityType.substring(0, 3), 8);

    const barcode = await Barcode.create({
      code: barcodeCode,
      barcodeType: 'CODE128',
      entityType,
      entityId: entity._id,
      entityName: entity.name || entity.title || `${entity.firstName} ${entity.lastName}`,
      status: 'ACTIVE',
      createdBy: entityData.createdBy,
    });

    // Step 3: Link barcode to entity
    entity.barcode = {
      code: barcode.code,
      barcodeId: barcode._id,
    };

    await entity.save();

    return {
      success: true,
      entity,
      barcode,
    };
  } catch (error) {
    throw new Error(`Failed to create entity with barcode: ${error.message}`);
  }
};

// ============================================
// 3. BULK ATTACH BARCODES
// ============================================

/**
 * Attach barcodes to multiple existing entities
 *
 * @param {string} entityType - Type of entity
 * @param {array} entityIds - Array of entity IDs
 * @param {object} barcodeOptions - Barcode options
 */
const bulkAttachBarcodes = async (entityType, entityIds, barcodeOptions = {}) => {
  const Barcode = require('../models/Barcode');

  try {
    const results = [];
    const prefix = barcodeOptions.prefix || entityType.substring(0, 3);
    const barcodeType = barcodeOptions.barcodeType || 'CODE128';

    for (let i = 0; i < entityIds.length; i++) {
      const entityId = entityIds[i];

      try {
        // Generate unique barcode
        const barcodeCode = await Barcode.generateCode(prefix, 8);

        // Get entity details
        let entity;
        let EntityModel;

        switch (entityType) {
          case 'PRODUCT':
            EntityModel = require('../models/Product');
            break;
          case 'VEHICLE':
            EntityModel = require('../models/Vehicle');
            break;
          case 'EMPLOYEE':
            EntityModel = require('../models/Employee');
            break;
          default:
            throw new Error(`Unsupported entity type: ${entityType}`);
        }

        entity = await EntityModel.findById(entityId);
        if (!entity) continue;

        // Create barcode
        const barcode = await Barcode.create({
          code: barcodeCode,
          barcodeType,
          entityType,
          entityId,
          entityName: entity.name || entity.title || `${entity.firstName} ${entity.lastName}`,
          tags: barcodeOptions.tags || [],
          status: 'ACTIVE',
          createdBy: barcodeOptions.createdBy,
        });

        // Update entity
        entity.barcode = {
          code: barcode.code,
          barcodeId: barcode._id,
        };

        await entity.save();

        results.push({
          entityId,
          barcodeCode,
          status: 'success',
        });
      } catch (error) {
        results.push({
          entityId,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return {
      total: entityIds.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    };
  } catch (error) {
    throw new Error(`Bulk attach failed: ${error.message}`);
  }
};

// ============================================
// 4. GET ENTITY WITH BARCODE HISTORY
// ============================================

/**
 * Get complete entity information including barcode and scan history
 *
 * @param {string} entityType - Type of entity
 * @param {string} entityId - ID of the entity
 */
const getEntityWithBarcodeHistory = async (entityType, entityId) => {
  const Barcode = require('../models/Barcode');

  try {
    // Get entity
    let entity;
    let EntityModel;

    switch (entityType) {
      case 'PRODUCT':
        EntityModel = require('../models/Product');
        break;
      case 'VEHICLE':
        EntityModel = require('../models/Vehicle');
        break;
      case 'EMPLOYEE':
        EntityModel = require('../models/Employee');
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    entity = await EntityModel.findById(entityId);
    if (!entity) {
      throw new Error(`${entityType} not found`);
    }

    // Get barcode
    const barcode = await Barcode.findOne({ entityId, entityType });

    if (!barcode) {
      return {
        entity,
        barcode: null,
        scanHistory: [],
      };
    }

    // Get scan history
    const scanHistory = barcode.scanHistory || [];

    return {
      entity,
      barcode: {
        code: barcode.code,
        barcodeType: barcode.barcodeType,
        status: barcode.status,
        totalScans: barcode.totalScans,
        lastScannedAt: barcode.lastScannedAt,
        tags: barcode.tags,
      },
      scanHistory,
      summary: {
        totalScans: barcode.totalScans,
        lastScan: barcode.lastScannedAt,
        created: barcode.createdAt,
        isActive: barcode.status === 'ACTIVE',
      },
    };
  } catch (error) {
    throw new Error(`Failed to get entity with barcode: ${error.message}`);
  }
};

// ============================================
// 5. MIGRATE EXISTING ENTITIES TO BARCODES
// ============================================

/**
 * Migrate all existing entities of a type to have barcodes
 * WARNING: This is a one-time operation
 *
 * @param {string} entityType - Type of entity to migrate
 * @param {object} options - Migration options
 */
const migrateEntitiesToBarcodes = async (entityType, options = {}) => {
  const Barcode = require('../models/Barcode');

  try {
    let EntityModel;
    let count = 0;
    let errors = [];

    switch (entityType) {
      case 'PRODUCT':
        EntityModel = require('../models/Product');
        break;
      case 'VEHICLE':
        EntityModel = require('../models/Vehicle');
        break;
      case 'EMPLOYEE':
        EntityModel = require('../models/Employee');
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    // Get all entities without barcodes
    const entities = await EntityModel.find({ barcode: { $exists: false } });

    console.log(`Migrating ${entities.length} ${entityType} entities...`);

    for (const entity of entities) {
      try {
        // Check if barcode already exists
        let existingBarcode = await Barcode.findOne({
          entityId: entity._id,
          entityType,
        });

        if (!existingBarcode) {
          const prefix = options.prefix || entityType.substring(0, 3);
          const barcodeCode = await Barcode.generateCode(prefix, 8);

          const barcode = await Barcode.create({
            code: barcodeCode,
            barcodeType: options.barcodeType || 'CODE128',
            entityType,
            entityId: entity._id,
            entityName: entity.name || entity.title || `${entity.firstName} ${entity.lastName}`,
            status: 'ACTIVE',
            createdBy: 'migration',
            tags: options.tags || ['migrated'],
          });

          // Update entity
          entity.barcode = {
            code: barcode.code,
            barcodeId: barcode._id,
          };

          await entity.save();
          count++;
        }
      } catch (error) {
        errors.push({
          entityId: entity._id,
          error: error.message,
        });
      }
    }

    return {
      totalEntities: entities.length,
      migratedSuccessfully: count,
      errors,
      message: `Migration completed: ${count}/${entities.length} entities migrated`,
    };
  } catch (error) {
    throw new Error(`Migration failed: ${error.message}`);
  }
};

// ============================================
// 6. EXAMPLE ROUTE USAGE
// ============================================

/**
 * Example route for creating product with barcode
 *
 * POST /api/products
 * Body: {
 *   name: "Product Name",
 *   category: "Electronics",
 *   price: 99.99,
 *   autoBarcode: true  // Set to true to auto-generate barcode
 * }
 */
const exampleProductRoute = async (req, res) => {
  try {
    const { autoBarcode, ...productData } = req.body;

    if (autoBarcode) {
      const result = await createEntityWithBarcode('PRODUCT', productData);
      return res.status(201).json({
        success: true,
        product: result.entity,
        barcode: result.barcode,
      });
    } else {
      // Create product without barcode
      const Product = require('../models/Product');
      const product = new Product(productData);
      await product.save();

      return res.status(201).json({
        success: true,
        product,
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  attachBarcodeToEntity,
  createEntityWithBarcode,
  bulkAttachBarcodes,
  getEntityWithBarcodeHistory,
  migrateEntitiesToBarcodes,
  exampleProductRoute,
};

/**
 * USAGE EXAMPLES:
 *
 * // 1. Attach barcode to existing product
 * const result = await attachBarcodeToEntity('PRODUCT', '123', 'PRD000001');
 *
 * // 2. Create product with auto-generated barcode
 * const result = await createEntityWithBarcode('PRODUCT', {
 *   name: 'New Product',
 *   price: 99.99
 * });
 *
 * // 3. Bulk attach to multiple entities
 * const result = await bulkAttachBarcodes('PRODUCT', ['id1', 'id2', 'id3']);
 *
 * // 4. Get entity with full barcode history
 * const data = await getEntityWithBarcodeHistory('PRODUCT', '123');
 *
 * // 5. Migrate all existing entities
 * const migration = await migrateEntitiesToBarcodes('PRODUCT');
 */
