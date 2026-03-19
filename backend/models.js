/**
 * Models - Stub for testing
 * Provides minimal model interfaces required by seeds and server
 */

class Model {
  static countDocuments() {
    return Promise.resolve(0);
  }
  
  static find() {
    return Promise.resolve([]);
  }
  
  static findById() {
    return Promise.resolve(null);
  }
  
  static create() {
    return Promise.resolve({});
  }
}

const Supplier = {
  countDocuments: () => Promise.resolve(0),
  create: () => Promise.resolve({}),
};

const Product = {
  countDocuments: () => Promise.resolve(0),
  create: () => Promise.resolve({}),
};

const PurchaseOrder = {
  countDocuments: () => Promise.resolve(0),
  create: () => Promise.resolve({}),
};

const Shipment = {
  countDocuments: () => Promise.resolve(0),
  create: () => Promise.resolve({}),
};

module.exports = {
  Supplier,
  Product,
  PurchaseOrder,
  Shipment,
  Model,
};
