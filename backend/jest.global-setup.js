const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  try {
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Persist info for teardown
    const infoPath = path.join(__dirname, '.mongo-info.json');
    fs.writeFileSync(infoPath, JSON.stringify({ uri }), 'utf8');
    
    // Expose to environment so tests that call mongoose.connect(process.env.MONGODB_URI) will use it
    process.env.MONGODB_URI = uri;
    process.env.NODE_ENV = 'test';
    process.env.USE_MOCK_DB = 'true';
    process.env.SKIP_PHASE17 = 'true';
    
    console.log('✅ In-memory MongoDB server initialized');
  } catch (error) {
    console.error('Failed to initialize test database:', error.message);
    throw error;
  }
};
