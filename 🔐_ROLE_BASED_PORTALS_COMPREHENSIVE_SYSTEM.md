# 🔐 نظام البوابات حسب الصلاحيات والأدوار

## Role-Based Portal System with Branch & Shift Management

**التاريخ**: يناير 17، 2026  
**النسخة**: 1.0  
**الحالة**: جاهز للتطبيق

---

## 📋 نظرة عامة على البوابات

```
┌─────────────────────────────────────────────────────────────────┐
│                    نظام إدارة البوابات                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ 1️⃣ بوابة الإدارة العامة    ──────→ جميع الفروع + إحصائيات شاملة │
│                                                                   │
│ 2️⃣ بوابة مدراء الفروع     ──────→ فرعهم فقط + الموظفين          │
│                                                                   │
│ 3️⃣ بوابة الموظفين         ──────→ فرعهم + جدول دوامهم          │
│                                                                   │
│ 4️⃣ بوابة المعلمين/المعالجين ──→ طلابهم + الجدول الزمني        │
│                                                                   │
│ 5️⃣ بوابة الطلاب           ──────→ بيانات شخصية + دراساتهم      │
│                                                                   │
│ 6️⃣ بوابة أولياء الأمور     ──────→ بيانات أطفالهم فقط         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏢 1. بوابة الإدارة العامة (Admin Portal)

### الوصول والصلاحيات

```javascript
// backend/models/role.model.js
const AdminRole = {
  name: 'admin',
  title: 'مسؤول النظام / الإدارة العامة',
  description: 'الوصول الكامل لجميع الفروع والبيانات',
  permissions: [
    'view_all_branches',
    'manage_branches',
    'view_all_departments',
    'manage_departments',
    'view_all_users',
    'manage_users',
    'view_reports',
    'export_data',
    'manage_shifts',
    'manage_schedule',
    'view_analytics',
  ],
  canViewBranches: ['all'], // جميع الفروع
  canEditBranches: ['all'],
};
```

### لوحة التحكم (Dashboard)

```jsx
// frontend/src/pages/admin/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';

export const AdminDashboard = () => {
  const [branches, setBranches] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [stats, setStats] = useState({
    totalBranches: 0,
    totalUsers: 0,
    totalStudents: 0,
    totalEmployees: 0,
  });

  useEffect(() => {
    // جلب بيانات جميع الفروع
    fetchAllBranchesData();
    fetchStats();
  }, []);

  const fetchAllBranchesData = async () => {
    try {
      const response = await fetch('/api/admin/branches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setBranches(data); // جميع الفروع
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* الإحصائيات العامة */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Typography color="inherit" gutterBottom>
                عدد الفروع
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.totalBranches}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Typography color="inherit" gutterBottom>
                إجمالي المستخدمين
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.totalUsers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Typography color="inherit" gutterBottom>
                إجمالي الطلاب
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.totalStudents}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Typography color="inherit" gutterBottom>
                إجمالي الموظفين
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {stats.totalEmployees}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الفروع */}
      <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)} sx={{ mb: 2 }}>
        <Tab label="🏢 قائمة الفروع" />
        <Tab label="📊 التقارير" />
        <Tab label="⚙️ الإعدادات" />
      </Tabs>

      {selectedTab === 0 && (
        <Paper sx={{ overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الفرع</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الموقع</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المدير</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الموظفون</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الطلاب</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {branches.map(branch => (
                <TableRow key={branch._id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{branch.name}</TableCell>
                  <TableCell>{branch.location}</TableCell>
                  <TableCell>{branch.managerName}</TableCell>
                  <TableCell>{branch.employeeCount}</TableCell>
                  <TableCell>{branch.studentCount}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">
                      عرض
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};
```

---

## 🏪 2. بوابة مدراء الفروع (Branch Manager Portal)

### الوصول والصلاحيات

```javascript
const BranchManagerRole = {
  name: 'branch_manager',
  title: 'مدير الفرع',
  description: 'إدارة فرع واحد فقط',
  permissions: ['view_branch_data', 'manage_employees', 'view_schedule', 'manage_schedule', 'view_reports_branch'],
  canViewBranches: ['their_branch_only'],
  canEditBranches: ['their_branch_only'],
  branchRestriction: true, // مقيد بفرع واحد
};
```

### التوثيق والتحقق

```javascript
// backend/middleware/branchRestriction.middleware.js

export const checkBranchAccess = async (req, res, next) => {
  try {
    const user = req.user;
    const branchId = req.params.branchId || req.body.branchId;

    // التحقق من أن المستخدم يعمل في هذا الفرع
    if (user.role === 'branch_manager') {
      if (user.branchId !== branchId) {
        return res.status(403).json({
          error: 'ليس لديك صلاحية للوصول لبيانات هذا الفرع',
          message: 'Branch access denied',
        });
      }
    }

    // الإدارة العامة لديها وصول كامل
    if (user.role !== 'admin' && user.role !== 'branch_manager') {
      return res.status(403).json({
        error: 'صلاحية غير كافية',
        message: 'Insufficient permissions',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### لوحة التحكم للمدير

```jsx
// frontend/src/pages/branchManager/BranchManagerDashboard.jsx

import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';

export const BranchManagerDashboard = () => {
  const [branchData, setBranchData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranchData();
  }, []);

  const fetchBranchData = async () => {
    try {
      // جلب بيانات الفرع الخاص به فقط
      const response = await fetch('/api/branches/my-branch', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setBranchData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Typography>جاري التحميل...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        🏢 {branchData?.name}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">الموظفون</Typography>
              <Typography variant="h3">{branchData?.employeeCount}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">الطلاب</Typography>
              <Typography variant="h3">{branchData?.studentCount}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">الحضور اليوم</Typography>
              <Typography variant="h3">{branchData?.todayAttendance}%</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">الدوام</Typography>
              <Typography variant="body2">صباح: {branchData?.morningShift}</Typography>
              <Typography variant="body2">مساء: {branchData?.eveningShift}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
```

---

## 👔 3. بوابة الموظفين (Employee Portal)

### النموذج والصلاحيات

```javascript
// backend/models/employee.model.js

const EmployeeSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  role: String,
  department: String,

  // جدول الدوام
  schedule: {
    morningShift: {
      startTime: '08:00', // 8 صباحاً
      endTime: '13:00', // 1 ظهراً
    },
    eveningShift: {
      startTime: '14:00', // 2 مساءً
      endTime: '19:00', // 7 مساءً
    },
    currentShift: {
      type: String,
      enum: ['morning', 'evening'],
    },
    workDays: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], // أيام العمل
  },

  // سجل الحضور
  attendance: [
    {
      date: Date,
      shift: { type: String, enum: ['morning', 'evening'] },
      checkIn: Date,
      checkOut: Date,
      status: {
        type: String,
        enum: ['present', 'absent', 'late', 'early_leave'],
      },
    },
  ],

  // الإجازات
  leaves: [
    {
      startDate: Date,
      endDate: Date,
      type: { type: String, enum: ['sick', 'personal', 'annual'] },
      approved: Boolean,
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

const EmployeeRole = {
  name: 'employee',
  title: 'موظف',
  description: 'الوصول لبيانات فرعه والجدول الزمني',
  permissions: [
    'view_own_schedule',
    'view_own_attendance',
    'view_own_leaves',
    'request_leave',
    'view_branch_employees', // زملاء العمل في نفس الفرع فقط
  ],
  canViewBranches: ['their_branch_only'],
  branchRestriction: true,
};
```

### لوحة تحكم الموظف

```jsx
// frontend/src/pages/employee/EmployeeDashboard.jsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

export const EmployeeDashboard = () => {
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: '',
    endDate: '',
    type: 'personal',
    reason: '',
  });

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const response = await fetch('/api/employees/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setEmployee(data);
      setSchedule(data.schedule);
      setAttendance(data.attendance.slice(-30)); // آخر 30 يوم
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getShiftInfo = shift => {
    if (shift === 'morning') {
      return { label: 'فترة صباحية', color: 'warning', time: '8:00 - 13:00' };
    } else if (shift === 'evening') {
      return { label: 'فترة مسائية', color: 'info', time: '14:00 - 19:00' };
    }
    return { label: 'غير محدد', color: 'default', time: '' };
  };

  const handleLeaveRequest = async () => {
    try {
      const response = await fetch('/api/employees/request-leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(leaveForm),
      });
      if (response.ok) {
        alert('✅ تم إرسال طلب الإجازة بنجاح');
        setLeaveDialog(false);
        fetchEmployeeData();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (!employee) return <Typography>جاري التحميل...</Typography>;

  const shiftInfo = getShiftInfo(schedule?.currentShift);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        👋 مرحباً {employee.name}
      </Typography>

      {/* معلومات الجدول الزمني */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Typography variant="body2" gutterBottom>
                فترة الدوام الحالية
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                {shiftInfo.label}
              </Typography>
              <Typography variant="body2">⏰ {shiftInfo.time}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                ساعات العمل
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  🌅 صباحي: {schedule?.morningShift?.startTime} - {schedule?.morningShift?.endTime}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  🌙 مسائي: {schedule?.eveningShift?.startTime} - {schedule?.eveningShift?.endTime}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                أيام العمل
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {schedule?.workDays?.map(day => (
                  <Chip key={day} label={day} size="small" variant="outlined" />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* جدول الحضور */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 سجل الحضور (آخر 30 يوم)
          </Typography>
          <Table size="small">
            <TableHead sx={{ background: '#f5f5f5' }}>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell>الفترة</TableCell>
                <TableCell>الحضور</TableCell>
                <TableCell>وقت الدخول</TableCell>
                <TableCell>وقت الخروج</TableCell>
                <TableCell>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance.map(record => (
                <TableRow key={record._id}>
                  <TableCell>{new Date(record.date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{record.shift === 'morning' ? '🌅 صباحي' : '🌙 مسائي'}</TableCell>
                  <TableCell>
                    {record.checkIn ? (
                      <Typography sx={{ color: 'green' }}>✓ حاضر</Typography>
                    ) : (
                      <Typography sx={{ color: 'red' }}>✗ غائب</Typography>
                    )}
                  </TableCell>
                  <TableCell>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString('ar-SA') : '-'}</TableCell>
                  <TableCell>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString('ar-SA') : '-'}</TableCell>
                  <TableCell>
                    <Chip label={record.status} size="small" color={record.status === 'present' ? 'success' : 'warning'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* طلب إجازة */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            🗓️ طلب إجازة
          </Typography>
          <Button variant="contained" onClick={() => setLeaveDialog(true)}>
            طلب إجازة جديدة
          </Button>
        </CardContent>
      </Card>

      {/* Dialog طلب الإجازة */}
      <Dialog open={leaveDialog} onClose={() => setLeaveDialog(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            label="من تاريخ"
            type="date"
            fullWidth
            value={leaveForm.startDate}
            onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="إلى تاريخ"
            type="date"
            fullWidth
            value={leaveForm.endDate}
            onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>نوع الإجازة</InputLabel>
            <Select value={leaveForm.type} onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })} label="نوع الإجازة">
              <MenuItem value="personal">إجازة شخصية</MenuItem>
              <MenuItem value="sick">إجازة مرضية</MenuItem>
              <MenuItem value="annual">إجازة سنوية</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="السبب"
            fullWidth
            multiline
            rows={3}
            value={leaveForm.reason}
            onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => setLeaveDialog(false)}>
              إلغاء
            </Button>
            <Button variant="contained" onClick={handleLeaveRequest}>
              إرسال الطلب
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
```

---

## 👨‍🏫 4. بوابة المعلمين والمعالجين (Teacher/Therapist Portal)

```javascript
// backend/models/teacher.model.js

const TeacherSchema = new mongoose.Schema({
  name: String,
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  specialization: String,
  qualifications: [String],

  // جدول الدوام
  schedule: {
    morningShift: {
      startTime: '08:00',
      endTime: '13:00',
      classes: [
        {
          className: String,
          gradeLevel: String,
          startTime: String,
          endTime: String,
          room: String,
        },
      ],
    },
    eveningShift: {
      startTime: '14:00',
      endTime: '19:00',
      classes: [],
    },
    currentShift: { type: String, enum: ['morning', 'evening'] },
  },

  // الطلاب الموكولين للمعلم
  assignedStudents: [
    {
      studentId: mongoose.Schema.Types.ObjectId,
      studentName: String,
      gradeLevel: String,
      shift: { type: String, enum: ['morning', 'evening'] },
    },
  ],

  // السجلات
  classRecords: [
    {
      date: Date,
      shift: String,
      className: String,
      attendanceRecord: [
        {
          studentId: mongoose.Schema.Types.ObjectId,
          status: { type: String, enum: ['present', 'absent', 'late'] },
        },
      ],
      notes: String,
    },
  ],

  createdAt: { type: Date, default: Date.now },
});

const TeacherRole = {
  name: 'teacher',
  title: 'معلم / معالج',
  permissions: ['view_own_schedule', 'view_assigned_students', 'manage_attendance', 'upload_grades', 'send_messages_to_parents'],
  branchRestriction: true,
  shiftAware: true,
};
```

### لوحة تحكم المعلم

```jsx
// frontend/src/pages/teacher/TeacherDashboard.jsx

export const TeacherDashboard = () => {
  const [teacher, setTeacher] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    const response = await fetch('/api/teachers/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setTeacher(data);
    setSchedule(data.schedule);
    setStudents(data.assignedStudents);
  };

  const markAttendance = async (classId, attendanceData) => {
    await fetch(`/api/teachers/attendance/${classId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(attendanceData),
    });
    alert('✅ تم تسجيل الحضور');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">📚 جدول المعلم</Typography>

      {/* الجدول الزمني */}
      <Grid container spacing={2} sx={{ my: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">🌅 الفترة الصباحية</Typography>
              {schedule?.morningShift?.classes?.map((cls, idx) => (
                <Box key={idx} sx={{ p: 1, my: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2">
                    {cls.className} - {cls.startTime} إلى {cls.endTime}
                  </Typography>
                  <Typography variant="caption">الفصل: {cls.room}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6">🌙 الفترة المسائية</Typography>
              {schedule?.eveningShift?.classes?.map((cls, idx) => (
                <Box key={idx} sx={{ p: 1, my: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body2">
                    {cls.className} - {cls.startTime} إلى {cls.endTime}
                  </Typography>
                  <Typography variant="caption">الفصل: {cls.room}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الطلاب */}
      <Card>
        <CardContent>
          <Typography variant="h6">👥 الطلاب الموكولون</Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: '#f5f5f5' }}>
                <TableCell>اسم الطالب</TableCell>
                <TableCell>المستوى</TableCell>
                <TableCell>الفترة</TableCell>
                <TableCell>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map(student => (
                <TableRow key={student.studentId}>
                  <TableCell>{student.studentName}</TableCell>
                  <TableCell>{student.gradeLevel}</TableCell>
                  <TableCell>
                    <Chip label={student.shift === 'morning' ? '🌅 صباحي' : '🌙 مسائي'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">
                      عرض
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};
```

---

## 👨‍🎓 5. بوابة الطلاب (Student Portal)

```javascript
const StudentRole = {
  name: 'student',
  title: 'طالب',
  permissions: ['view_own_data', 'view_grades', 'view_schedule', 'view_assignments', 'submit_assignments', 'message_teacher'],
  branchRestriction: true,
  shiftAware: true,
  dataRestriction: 'own_data_only',
};
```

### لوحة تحكم الطالب

```jsx
// frontend/src/pages/student/StudentDashboard.jsx

export const StudentDashboard = () => {
  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    const response = await fetch('/api/students/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setStudent(data);
    setGrades(data.grades);
    setSchedule(data.schedule);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">👋 أهلاً {student?.name}</Typography>

      {/* معلومات الطالب الشخصية */}
      <Grid container spacing={2} sx={{ my: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="textSecondary">
                بيانات شخصية
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                📅 تاريخ الميلاد: {student?.dateOfBirth}
              </Typography>
              <Typography variant="body2">📞 رقم الهاتف: {student?.phone}</Typography>
              <Typography variant="body2">🏢 الفرع: {student?.branch?.name}</Typography>
              <Typography variant="body2">📚 المستوى: {student?.gradeLevel}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="textSecondary">
                جدول الدوام
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                {student?.schedule?.shift === 'morning' ? '🌅 فترة صباحية' : '🌙 فترة مسائية'}
              </Typography>
              <Typography variant="body2">
                ⏰ {student?.schedule?.startTime} - {student?.schedule?.endTime}
              </Typography>
              <Typography variant="body2">🏛️ الفصل: {student?.classroom}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الدرجات */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">📊 الدرجات</Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: '#f5f5f5' }}>
                <TableCell>المادة</TableCell>
                <TableCell>الدرجة</TableCell>
                <TableCell>التقييم</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grades.map(grade => (
                <TableRow key={grade._id}>
                  <TableCell>{grade.subject}</TableCell>
                  <TableCell>{grade.score}/100</TableCell>
                  <TableCell>
                    <Chip label={grade.score >= 80 ? 'ممتاز' : 'جيد'} size="small" color={grade.score >= 80 ? 'success' : 'warning'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
};
```

---

## 👨‍👩‍👧 6. بوابة أولياء الأمور (Parent Portal)

```javascript
const ParentRole = {
  name: 'parent',
  title: 'ولي أمر',
  permissions: ['view_children_data', 'view_children_grades', 'view_children_attendance', 'message_teacher', 'view_children_schedule'],
  dataRestriction: 'children_data_only',
  branchRestriction: false, // قد يكون لديهم أطفال في فروع مختلفة
};
```

### لوحة تحكم ولي الأمر

```jsx
// frontend/src/pages/parent/ParentDashboard.jsx

export const ParentDashboard = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);

  useEffect(() => {
    fetchChildrenData();
  }, []);

  const fetchChildrenData = async () => {
    const response = await fetch('/api/parents/my-children', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setChildren(data);
    if (data.length > 0) setSelectedChild(data[0]);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">👨‍👩‍👧 تابع أطفالك</Typography>

      {/* اختيار الطفل */}
      <Box sx={{ my: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {children.map(child => (
          <Button
            key={child._id}
            variant={selectedChild?._id === child._id ? 'contained' : 'outlined'}
            onClick={() => setSelectedChild(child)}
          >
            {child.name}
          </Button>
        ))}
      </Box>

      {selectedChild && (
        <Grid container spacing={2}>
          {/* بيانات الطفل */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">📋 بيانات {selectedChild.name}</Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  📚 المستوى: {selectedChild.gradeLevel}
                </Typography>
                <Typography variant="body2">🏢 الفرع: {selectedChild.branch?.name}</Typography>
                <Typography variant="body2">
                  {selectedChild.schedule?.shift === 'morning' ? '🌅 صباحي' : '🌙 مسائي'}: {selectedChild.schedule?.startTime} -{' '}
                  {selectedChild.schedule?.endTime}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* الدرجات والحضور */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">📊 الإحصائيات</Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  🎯 المعدل: {selectedChild.gpa?.toFixed(2)}/4.0
                </Typography>
                <Typography variant="body2">✅ نسبة الحضور: {selectedChild.attendancePercentage}%</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* تفاصيل الدرجات */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6">📈 الدرجات</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ background: '#f5f5f5' }}>
                      <TableCell>المادة</TableCell>
                      <TableCell>المعلم</TableCell>
                      <TableCell>الدرجة</TableCell>
                      <TableCell>التقييم</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedChild.grades?.map(grade => (
                      <TableRow key={grade._id}>
                        <TableCell>{grade.subject}</TableCell>
                        <TableCell>{grade.teacher}</TableCell>
                        <TableCell>{grade.score}</TableCell>
                        <TableCell>
                          <Chip
                            label={grade.score >= 80 ? 'ممتاز' : 'جيد'}
                            size="small"
                            color={grade.score >= 80 ? 'success' : 'warning'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
```

---

## ⏰ نظام الفترات الصباحية والمسائية

### نموذج الفترات

```javascript
// backend/models/shift.model.js

const ShiftSchema = new mongoose.Schema({
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
  },
  name: {
    type: String,
    enum: ['morning', 'evening'],
  },
  startTime: String, // "08:00"
  endTime: String, // "13:00"
  breakStartTime: String,
  breakEndTime: String,
  maxCapacity: Number,
  employees: [
    {
      employeeId: mongoose.Schema.Types.ObjectId,
      name: String,
      role: String,
      department: String,
    },
  ],
  classes: [
    {
      classId: mongoose.Schema.Types.ObjectId,
      className: String,
      teacher: String,
      students: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Shift', ShiftSchema);
```

### خدمة إدارة الفترات

```javascript
// backend/services/shiftManagement.service.js

class ShiftManagementService {
  // الحصول على بيانات الفترة الحالية
  async getCurrentShift(branchId) {
    const currentTime = new Date().getHours();
    const shift = currentTime < 14 ? 'morning' : 'evening';

    return await Shift.findOne({
      branchId,
      name: shift,
    }).populate(['employees', 'classes']);
  }

  // جدول الموظفين حسب الفترة
  async getEmployeesByShift(branchId, shift) {
    return await Shift.findOne({ branchId, name: shift }).populate('employees');
  }

  // التحقق من عمل الموظف في الوقت الحالي
  async isEmployeeWorkingNow(employeeId) {
    const employee = await Employee.findById(employeeId);
    const currentTime = new Date();
    const currentHour = currentTime.getHours();

    if (currentHour >= 8 && currentHour < 14) {
      return employee.schedule.currentShift === 'morning';
    } else if (currentHour >= 14 && currentHour < 19) {
      return employee.schedule.currentShift === 'evening';
    }
    return false;
  }

  // إحصائيات الفترة
  async getShiftStatistics(branchId, shift) {
    const shiftData = await Shift.findOne({ branchId, name: shift });
    const attendance = await Attendance.find({
      branchId,
      shift,
      date: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999),
      },
    });

    return {
      totalEmployees: shiftData?.employees?.length || 0,
      totalClasses: shiftData?.classes?.length || 0,
      presentCount: attendance.filter(a => a.status === 'present').length,
      absentCount: attendance.filter(a => a.status === 'absent').length,
      lateCount: attendance.filter(a => a.status === 'late').length,
      attendance: attendance,
    };
  }
}

module.exports = new ShiftManagementService();
```

---

## 🔐 Middleware التحقق من الصلاحيات

```javascript
// backend/middleware/roleAuthorization.middleware.js

export const authorizeRole = allowedRoles => {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'ليس لديك صلاحية للوصول لهذه الموارد',
        message: 'Unauthorized',
        userRole,
        allowedRoles,
      });
    }

    next();
  };
};

export const checkBranchAccess = (req, res, next) => {
  const user = req.user;
  const requestedBranchId = req.params.branchId || req.body.branchId;

  // الإدارة العامة لديها وصول كامل
  if (user.role === 'admin') {
    return next();
  }

  // مدراء الفروع والموظفون مقيدون بفرعهم
  if (['branch_manager', 'employee', 'teacher', 'student'].includes(user.role)) {
    if (user.branchId !== requestedBranchId) {
      return res.status(403).json({
        error: 'لا يمكنك الوصول لبيانات هذا الفرع',
        message: 'Branch access denied',
      });
    }
  }

  next();
};

export const checkShiftAccess = (req, res, next) => {
  const user = req.user;
  const requestedShift = req.params.shift || req.body.shift;

  // التحقق من أن الموظف يعمل في هذه الفترة
  if (['employee', 'teacher', 'student'].includes(user.role)) {
    if (user.schedule?.currentShift !== requestedShift) {
      return res.status(403).json({
        error: 'لا تعمل في هذه الفترة الزمنية',
        message: 'Shift access denied',
        userShift: user.schedule?.currentShift,
        requestedShift,
      });
    }
  }

  next();
};
```

---

## 🛣️ المسارات (Routes)

```javascript
// backend/routes/portals.routes.js

import express from 'express';
import { authorizeRole, checkBranchAccess, checkShiftAccess } from '../middleware/roleAuthorization.middleware';

const router = express.Router();

// بوابة الإدارة العامة
router.get('/admin/dashboard', authorizeRole(['admin']), adminDashboard);
router.get('/admin/branches', authorizeRole(['admin']), getAllBranches);
router.get('/admin/statistics', authorizeRole(['admin']), getStatistics);

// بوابة مدراء الفروع
router.get('/branch-manager/dashboard', authorizeRole(['branch_manager']), branchManagerDashboard);
router.get('/branch-manager/employees', authorizeRole(['branch_manager']), checkBranchAccess, getEmployeesByBranch);
router.get('/branch-manager/schedule', authorizeRole(['branch_manager']), checkBranchAccess, getBranchSchedule);

// بوابة الموظفين
router.get('/employee/dashboard', authorizeRole(['employee']), employeeDashboard);
router.get('/employee/attendance', authorizeRole(['employee']), checkBranchAccess, getEmployeeAttendance);
router.post('/employee/leave-request', authorizeRole(['employee']), checkBranchAccess, requestLeave);

// بوابة المعلمين
router.get('/teacher/dashboard', authorizeRole(['teacher']), teacherDashboard);
router.get('/teacher/classes', authorizeRole(['teacher']), checkBranchAccess, getTeacherClasses);
router.post('/teacher/attendance', authorizeRole(['teacher']), checkBranchAccess, markAttendance);

// بوابة الطلاب
router.get('/student/dashboard', authorizeRole(['student']), studentDashboard);
router.get('/student/grades', authorizeRole(['student']), checkBranchAccess, getStudentGrades);
router.get('/student/schedule', authorizeRole(['student']), checkBranchAccess, getStudentSchedule);

// بوابة أولياء الأمور
router.get('/parent/dashboard', authorizeRole(['parent']), parentDashboard);
router.get('/parent/children', authorizeRole(['parent']), getParentChildren);
router.get('/parent/child-grades/:childId', authorizeRole(['parent']), getChildGrades);

export default router;
```

---

## ✅ قائمة التحقق

- ✅ 6 بوابات منفصلة حسب الأدوار
- ✅ نظام الفترات الصباحية والمسائية
- ✅ قيود البيانات حسب الفرع
- ✅ الإدارة العامة ترى جميع الفروع
- ✅ كل فرع يرى بيانات فرعه فقط
- ✅ نظام Middleware للتحقق من الصلاحيات
- ✅ جداول زمنية مرنة
- ✅ إدارة الحضور والغياب
- ✅ نظام طلب الإجازات
- ✅ عرض الدرجات والتقييمات

---

**الحالة**: 🟢 جاهز للتطبيق الفوري ✅
