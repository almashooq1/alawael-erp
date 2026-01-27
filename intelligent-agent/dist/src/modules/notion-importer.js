"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFromNotion = importFromNotion;
// استيراد بيانات التعلم من Notion
// مبدئي: يستخدم notion-sdk-js
const client_1 = require("@notionhq/client");
async function importFromNotion({ databaseId, notionApiKey }) {
    const notion = new client_1.Client({ auth: notionApiKey });
    const response = await notion.databases.query({ database_id: databaseId });
    // تحويل النتائج إلى صيغة موحدة
    return response.results.map((page) => ({
        id: page.id,
        properties: page.properties
    }));
}
