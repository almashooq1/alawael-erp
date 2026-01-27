"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importFromSharePoint = importFromSharePoint;
// استيراد بيانات التعلم من SharePoint
// مبدئي: يستخدم @pnp/sp
const sp_1 = require("@pnp/sp");
require("@pnp/sp/webs");
require("@pnp/sp/lists");
require("@pnp/sp/items");
async function importFromSharePoint({ siteUrl, listTitle, username, password }) {
    const sp = (0, sp_1.spfi)(siteUrl);
    // ملاحظة: يجب تفعيل المصادقة المناسبة (مثلاً باستخدام node-sp-auth)
    const items = await sp.web.lists.getByTitle(listTitle).items();
    return items;
}
