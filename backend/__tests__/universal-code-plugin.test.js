'use strict';

jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const universalCodePlugin = require('../services/universalCode/plugin');
const UniversalCode = require('../models/UniversalCode');

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
afterEach(async () => {
  await UniversalCode.deleteMany({});
});

describe('UniversalCode plugin', () => {
  test('issues a code on save for any schema that opts in', async () => {
    const schema = new mongoose.Schema({ name: String });
    schema.plugin(universalCodePlugin, {
      entityType: 'BNF',
      labelFrom: doc => doc.name,
    });
    const Toy = mongoose.models.PluginToyBnf || mongoose.model('PluginToyBnf', schema);
    const doc = await Toy.create({ name: 'Test Subject' });
    // post('save') runs async — wait a tick.
    await new Promise(r => setTimeout(r, 50));
    const code = await UniversalCode.findOne({ entityType: 'BNF', entityId: doc._id });
    expect(code).toBeTruthy();
    expect(code.code).toMatch(/^RH-BNF-[0-9A-Z]{6}$/);
    expect(code.entityLabel).toBe('Test Subject');
  });

  test('updating the doc does NOT mint a new code (idempotent)', async () => {
    const schema = new mongoose.Schema({ name: String });
    schema.plugin(universalCodePlugin, { entityType: 'EMP', labelFrom: d => d.name });
    const Toy = mongoose.models.PluginToyEmp || mongoose.model('PluginToyEmp', schema);
    const doc = await Toy.create({ name: 'old' });
    await new Promise(r => setTimeout(r, 50));
    const firstCode = (await UniversalCode.findOne({ entityType: 'EMP', entityId: doc._id })).code;

    doc.name = 'new';
    await doc.save();
    await new Promise(r => setTimeout(r, 50));

    const secondDocs = await UniversalCode.find({ entityType: 'EMP', entityId: doc._id });
    expect(secondDocs.length).toBe(1);
    expect(secondDocs[0].code).toBe(firstCode);
    expect(secondDocs[0].entityLabel).toBe('new'); // label refreshed
  });

  test('getUniversalCode() instance method returns the code', async () => {
    const schema = new mongoose.Schema({ name: String });
    schema.plugin(universalCodePlugin, { entityType: 'AST' });
    const Toy = mongoose.models.PluginToyAst || mongoose.model('PluginToyAst', schema);
    const doc = await Toy.create({ name: 'My Asset' });
    const code = await doc.getUniversalCode();
    expect(code.code).toMatch(/^RH-AST-[0-9A-Z]{6}$/);
  });

  test('rejects invalid entityType option', () => {
    const schema = new mongoose.Schema({ name: String });
    expect(() => schema.plugin(universalCodePlugin, { entityType: 'xx' })).toThrow(/3 uppercase/);
    expect(() => schema.plugin(universalCodePlugin, {})).toThrow(/3 uppercase/);
  });
});
