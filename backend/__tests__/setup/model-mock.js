/* eslint-disable no-unused-vars */
/**
 * Universal Model Mock
 * Returns mock implementations for all mongoose models
 */

const { Types } = require('mongoose');

const mockCollection = [];

module.exports = {
  find: jest.fn(function (q = {}) {
    this.q = q;
    return this;
  }),
  findById: jest.fn(
    async id => mockCollection.find(i => i._id?.toString() === id?.toString()) || null
  ),
  findByIdAndUpdate: jest.fn(async (id, u) => {
    const item = mockCollection.find(i => i._id?.toString() === id?.toString());
    if (item) Object.assign(item, u);
    return item;
  }),
  findByIdAndDelete: jest.fn(async id => {
    const idx = mockCollection.findIndex(i => i._id?.toString() === id?.toString());
    return idx !== -1 ? mockCollection.splice(idx, 1)[0] : null;
  }),
  findOne: jest.fn(function (q = {}) {
    this.q = q;
    return this;
  }),
  findOneAndUpdate: jest.fn(async (q, u) => {
    const item = mockCollection.find(i => i._id?.toString() === q._id?.toString());
    if (item) Object.assign(item, u);
    return item;
  }),
  create: jest.fn(async (...args) => {
    const docs = Array.isArray(args[0]) ? args[0] : args;
    const res = [];
    for (const doc of docs) {
      const newDoc = { _id: new Types.ObjectId(), ...doc, createdAt: new Date() };
      mockCollection.push(newDoc);
      res.push(newDoc);
    }
    return docs.length === 1 ? res[0] : res;
  }),
  insertMany: jest.fn(async docs => {
    const res = [];
    for (const doc of docs) {
      const newDoc = { _id: new Types.ObjectId(), ...doc };
      mockCollection.push(newDoc);
      res.push(newDoc);
    }
    return res;
  }),
  updateMany: jest.fn(async () => ({ modifiedCount: 0, ok: 1 })),
  deleteMany: jest.fn(async () => ({ deletedCount: 0, ok: 1 })),
  countDocuments: jest.fn(async () => mockCollection.length),
  exists: jest.fn(async () => ({ _id: true })),
  aggregate: jest.fn(() => ({ exec: jest.fn(async () => []) })),
  select: jest.fn(function () {
    return this;
  }),
  lean: jest.fn(function () {
    return this;
  }),
  limit: jest.fn(function () {
    return this;
  }),
  skip: jest.fn(function () {
    return this;
  }),
  sort: jest.fn(function () {
    return this;
  }),
  exec: jest.fn(async function () {
    return [];
  }),
  then: jest.fn(async function (cb) {
    return cb([]);
  }),
};
