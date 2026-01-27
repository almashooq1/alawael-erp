import express from 'express';
import { addRole, updateRole, listRoles, getRolePermissions } from '../src/modules/permissions';
const router = express.Router();

// إضافة دور
router.post('/add', (req, res) => {
  const { name, permissions } = req.body;
  if (!name || !permissions) return res.status(400).json({ error: 'name, permissions required' });
  const role = addRole(name, permissions);
  res.json(role);
});

// تحديث دور
router.post('/update', (req, res) => {
  const { id, patch } = req.body;
  if (!id || !patch) return res.status(400).json({ error: 'id, patch required' });
  const role = updateRole(id, patch);
  res.json(role);
});

// قائمة الأدوار
router.get('/list', (req, res) => {
  res.json(listRoles());
});

// صلاحيات دور
router.get('/permissions/:roleId', (req, res) => {
  res.json(getRolePermissions(req.params.roleId));
});

export default router;
