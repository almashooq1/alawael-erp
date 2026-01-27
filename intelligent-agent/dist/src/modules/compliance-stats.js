"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComplianceStats = getComplianceStats;
// خدمة إحصائيات الامتثال
const compliance_event_1 = __importDefault(require("../models/compliance-event"));
async function getComplianceStats({ from, to }) {
    const match = {};
    if (from)
        match.timestamp = { ...(match.timestamp || {}), $gte: from };
    if (to)
        match.timestamp = { ...(match.timestamp || {}), $lte: to };
    // عدد الخروقات حسب النوع
    const byStatus = await compliance_event_1.default.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    // توزيع زمني (آخر 30 يوم)
    const now = new Date();
    const daysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const timeline = await compliance_event_1.default.aggregate([
        { $match: { ...match, timestamp: { $gte: daysAgo } } },
        { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } } },
        { $group: { _id: '$day', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    // أكثر السياسات اختراقًا
    const byPolicy = await compliance_event_1.default.aggregate([
        { $match: { ...match, status: { $in: ['fail', 'warning'] } } },
        { $group: { _id: '$policy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);
    // أكثر الموارد تعرضًا للخرق
    const byResource = await compliance_event_1.default.aggregate([
        { $match: { ...match, status: { $in: ['fail', 'warning'] } } },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);
    return {
        byStatus,
        timeline,
        byPolicy,
        byResource
    };
}
