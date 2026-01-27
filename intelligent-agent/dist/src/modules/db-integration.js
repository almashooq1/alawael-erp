"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBIntegration = void 0;
// وحدة التكامل مع قاعدة بيانات (MongoDB كمثال)
// @ts-ignore
let MongoClient, Db;
try {
    ({ MongoClient, Db } = require('mongodb'));
}
catch (e) {
    // mongodb not installed, provide fallback or error
    MongoClient = null;
    Db = null;
}
class DBIntegration {
    constructor(uri, dbName) {
        this.uri = uri;
        this.dbName = dbName;
        this.client = new MongoClient(uri);
    }
    async connect() {
        await this.client.connect();
        this.db = this.client.db(this.dbName);
        console.log('Connected to database:', this.dbName);
    }
    async insert(collection, doc) {
        if (!this.db)
            throw new Error('DB not connected');
        return this.db.collection(collection).insertOne(doc);
    }
    async find(collection, query) {
        if (!this.db)
            throw new Error('DB not connected');
        return this.db.collection(collection).find(query).toArray();
    }
    async close() {
        await this.client.close();
    }
}
exports.DBIntegration = DBIntegration;
