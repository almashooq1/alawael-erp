"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFromAirtable = importFromAirtable;
// استيراد بيانات التعلم من Airtable
// مبدئي: يستخدم airtable
const airtable_1 = __importDefault(require("airtable"));
async function importFromAirtable({ baseId, tableName, apiKey }) {
    const base = new airtable_1.default({ apiKey }).base(baseId);
    const records = [];
    await base(tableName).select().eachPage((page, fetchNextPage) => {
        records.push(...page);
        fetchNextPage();
    });
    return records.map(r => ({ id: r.id, fields: r.fields }));
}
