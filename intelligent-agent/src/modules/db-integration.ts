// وحدة التكامل مع قاعدة بيانات (MongoDB كمثال)
// @ts-ignore
let MongoClient: any, Db: any;
try {
  ({ MongoClient, Db } = require('mongodb'));
} catch (e) {
  // mongodb not installed, provide fallback or error
  MongoClient = null;
  Db = null;
}

export class DBIntegration {
  private client: any;
  private db?: any;

  constructor(private uri: string, private dbName: string) {
    this.client = new MongoClient(uri);
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    console.log('Connected to database:', this.dbName);
  }

  async insert(collection: string, doc: any) {
    if (!this.db) throw new Error('DB not connected');
    return this.db.collection(collection).insertOne(doc);
  }

  async find(collection: string, query: any) {
    if (!this.db) throw new Error('DB not connected');
    return this.db.collection(collection).find(query).toArray();
  }

  async close() {
    await this.client.close();
  }
}
