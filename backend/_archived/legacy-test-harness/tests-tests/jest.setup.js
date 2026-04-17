const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongo;

beforeAll(async () => {
  // Ensure test-friendly env
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
  // Disable mock DB so Mongoose connects to memory server
  process.env.USE_MOCK_DB = 'false';
  // Keep cache mocked to avoid external dependencies
  process.env.USE_MOCK_CACHE = process.env.USE_MOCK_CACHE || 'true';

  try {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();

    await mongoose.connect(uri, {
      dbName: 'beneficiary_portal_test',
    });
  } catch (error) {
    console.error('MongoDB setup failed:', error);
    throw error;
  }
});

afterEach(async () => {
  // Clear all collections after each test
  try {
    if (mongoose.connection && mongoose.connection.db) {
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const { name } of collections) {
        const collection = mongoose.connection.db.collection(name);
        await collection.deleteMany({});
      }
    }
  } catch (error) {
    console.warn('Error clearing collections:', error);
  }
});

afterAll(async () => {
  // Disconnect and stop MongoDB memory server
  try {
    await mongoose.disconnect();
  } catch (error) {
    console.warn('Error disconnecting mongoose:', error);
  }

  if (mongo) {
    try {
      await mongo.stop();
    } catch (error) {
      console.warn('Error stopping MongoMemoryServer:', error);
    }
  }
});
