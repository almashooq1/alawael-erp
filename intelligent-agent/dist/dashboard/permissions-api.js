"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const permissions_1 = require("../src/modules/permissions");
const router = express_1.default.Router();
// إضافة دور
router.post('/add', (req, res) => {
    const { name, permissions } = req.body;
    if (!name || !permissions)
        return res.status(400).json({ error: 'name, permissions required' });
    const role = (0, permissions_1.addRole)(name, permissions);
    res.json(role);
});
// تحديث دور
router.post('/update', (req, res) => {
    const { id, patch } = req.body;
    if (!id || !patch)
        return res.status(400).json({ error: 'id, patch required' });
    const role = (0, permissions_1.updateRole)(id, patch);
    res.json(role);
});
// قائمة الأدوار
router.get('/list', (req, res) => {
    res.json((0, permissions_1.listRoles)());
});
// صلاحيات دور
router.get('/permissions/:roleId', (req, res) => {
    res.json((0, permissions_1.getRolePermissions)(req.params.roleId));
});
exports.default = router;
