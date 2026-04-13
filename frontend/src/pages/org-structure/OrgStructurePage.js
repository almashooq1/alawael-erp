/**
 * Org Structure Management Page — إدارة الهيكل التنظيمي
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import orgStructureService from '../../services/orgStructure.service';

const DEMO_DEPARTMENTS = [
  {
    _id: '1',
    name: 'الإدارة العامة',
    code: 'GM',
    manager: 'أ. أحمد المحمد',
    employeeCount: 8,
    level: 0,
    parent: null,
    status: 'active',
  },
  {
    _id: '2',
    name: 'التأهيل والعلاج',
    code: 'REHAB',
    manager: 'د. فاطمة الراشد',
    employeeCount: 25,
    level: 1,
    parent: '1',
    status: 'active',
  },
  {
    _id: '3',
    name: 'التعليم الخاص',
    code: 'EDU',
    manager: 'أ. خالد العمري',
    employeeCount: 30,
    level: 1,
    parent: '1',
    status: 'active',
  },
  {
    _id: '4',
    name: 'الموارد البشرية',
    code: 'HR',
    manager: 'أ. سارة المطيري',
    employeeCount: 6,
    level: 1,
    parent: '1',
    status: 'active',
  },
  {
    _id: '5',
    name: 'الشؤون المالية',
    code: 'FIN',
    manager: 'أ. محمد الحربي',
    employeeCount: 10,
    level: 1,
    parent: '1',
    status: 'active',
  },
  {
    _id: '6',
    name: 'تقنية المعلومات',
    code: 'IT',
    manager: 'م. عبدالله الشمري',
    employeeCount: 8,
    level: 1,
    parent: '1',
    status: 'active',
  },
  {
    _id: '7',
    name: 'العلاج الطبيعي',
    code: 'PT',
    manager: 'د. نوف السعيد',
    employeeCount: 12,
    level: 2,
    parent: '2',
    status: 'active',
  },
  {
    _id: '8',
    name: 'العلاج الوظيفي',
    code: 'OT',
    manager: 'د. ريم القحطاني',
    employeeCount: 10,
    level: 2,
    parent: '2',
    status: 'active',
  },
  {
    _id: '9',
    name: 'النطق والتخاطب',
    code: 'SLP',
    manager: 'د. هند العنزي',
    employeeCount: 8,
    level: 2,
    parent: '2',
    status: 'active',
  },
];

const DEMO_POSITIONS = [
  {
    _id: '1',
    title: 'المدير العام',
    department: 'الإدارة العامة',
    grade: 'A1',
    type: 'executive',
    vacancies: 0,
    total: 1,
  },
  {
    _id: '2',
    title: 'مدير التأهيل',
    department: 'التأهيل والعلاج',
    grade: 'B1',
    type: 'management',
    vacancies: 0,
    total: 1,
  },
  {
    _id: '3',
    title: 'أخصائي علاج طبيعي',
    department: 'العلاج الطبيعي',
    grade: 'C2',
    type: 'specialist',
    vacancies: 2,
    total: 8,
  },
  {
    _id: '4',
    title: 'معلم تربية خاصة',
    department: 'التعليم الخاص',
    grade: 'C2',
    type: 'specialist',
    vacancies: 3,
    total: 15,
  },
  {
    _id: '5',
    title: 'محاسب',
    department: 'الشؤون المالية',
    grade: 'C3',
    type: 'professional',
    vacancies: 1,
    total: 4,
  },
  {
    _id: '6',
    title: 'مطور أنظمة',
    department: 'تقنية المعلومات',
    grade: 'C2',
    type: 'professional',
    vacancies: 1,
    total: 3,
  },
  {
    _id: '7',
    title: 'أخصائي موارد بشرية',
    department: 'الموارد البشرية',
    grade: 'C3',
    type: 'professional',
    vacancies: 0,
    total: 3,
  },
];

const TYPE_LABELS = {
  executive: 'تنفيذي',
  management: 'إداري',
  specialist: 'أخصائي',
  professional: 'مهني',
  support: 'دعم',
};

export default function OrgStructurePage() {
  const [tab, setTab] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [_isDemo, setIsDemo] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: '', data: null });
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, posRes] = await Promise.all([
        orgStructureService.getDepartments(),
        orgStructureService.getPositions(),
      ]);
      setDepartments(deptRes?.data?.data?.length ? deptRes.data.data : DEMO_DEPARTMENTS);
      setPositions(posRes?.data?.data?.length ? posRes.data.data : DEMO_POSITIONS);
      const anyDemo = !deptRes?.data?.data?.length || !posRes?.data?.data?.length;
      setIsDemo(anyDemo);
    } catch {
      setDepartments(DEMO_DEPARTMENTS);
      setPositions(DEMO_POSITIONS);
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.type === 'department') {
        if (dialog.data?._id) await orgStructureService.updateDepartment(dialog.data._id, form);
        else await orgStructureService.createDepartment(form);
      } else {
        if (dialog.data?._id) await orgStructureService.updatePosition(dialog.data._id, form);
        else await orgStructureService.createPosition(form);
      }
      setDialog({ open: false, type: '', data: null });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const totalEmployees = departments.reduce((s, d) => s + (d.employeeCount || 0), 0);
  const totalVacancies = positions.reduce((s, p) => s + (p.vacancies || 0), 0);

  const toggleExpand = id => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const rootDepts = departments.filter(d => !d.parent || d.level === 0);
  const getChildren = parentId => departments.filter(d => d.parent === parentId);

  const renderDeptRow = (dept, indent = 0) => {
    const children = getChildren(dept._id);
    const hasChildren = children.length > 0;
    return [
      <TableRow key={dept._id} hover>
        <TableCell>
          <Stack direction="row" alignItems="center" sx={{ pl: indent * 3 }}>
            {hasChildren && (
              <IconButton size="small" onClick={() => toggleExpand(dept._id)}>
                {expanded[dept._id] ? (
                  <CollapseIcon fontSize="small" />
                ) : (
                  <ExpandIcon fontSize="small" />
                )}
              </IconButton>
            )}
            {!hasChildren && <Box sx={{ width: 34 }} />}
            <DeptIcon
              sx={{
                mr: 1,
                color: indent === 0 ? '#1565c0' : indent === 1 ? '#4CAF50' : '#FF9800',
                fontSize: 20,
              }}
            />
            <Typography variant="body2" fontWeight={indent === 0 ? 700 : 500}>
              {dept.name}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell>
          <Chip size="small" label={dept.code} variant="outlined" />
        </TableCell>
        <TableCell>{dept.manager}</TableCell>
        <TableCell align="center">{dept.employeeCount}</TableCell>
        <TableCell>
          <Chip
            size="small"
            label={dept.status === 'active' ? 'نشط' : 'معلّق'}
            color={dept.status === 'active' ? 'success' : 'default'}
          />
        </TableCell>
        <TableCell>
          <IconButton
            size="small"
            onClick={() => {
              setDialog({ open: true, type: 'department', data: dept });
              setForm(dept);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>,
      ...(expanded[dept._id] ? children.flatMap(c => renderDeptRow(c, indent + 1)) : []),
    ];
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%)',
          color: '#fff',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <OrgIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  الهيكل التنظيمي
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  إدارة الأقسام والوظائف والمسمّيات الوظيفية
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setDialog({
                    open: true,
                    type: tab === 0 ? 'department' : 'position',
                    data: null,
                  });
                  setForm({});
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                {tab === 0 ? 'قسم جديد' : 'وظيفة جديدة'}
              </Button>
              <IconButton sx={{ color: '#fff' }} onClick={fetchData}>
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'الأقسام', value: departments.length, icon: <DeptIcon />, color: '#1b5e20' },
          {
            label: 'المسمّيات الوظيفية',
            value: positions.length,
            icon: <PositionIcon />,
            color: '#1565c0',
          },
          {
            label: 'إجمالي الموظفين',
            value: totalEmployees,
            icon: <GroupIcon />,
            color: '#FF9800',
          },
          { label: 'الشواغر', value: totalVacancies, icon: <WorkIcon />, color: '#f44336' },
        ].map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderRadius: 2.5, textAlign: 'center' }}>
              <CardContent sx={{ py: 2 }}>
                <Avatar
                  sx={{
                    mx: 'auto',
                    mb: 1,
                    bgcolor: s.color + '22',
                    color: s.color,
                    width: 44,
                    height: 44,
                  }}
                >
                  {s.icon}
                </Avatar>
                <Typography variant="h5" fontWeight={700}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, bgcolor: '#fff', borderRadius: 2, boxShadow: 1 }}
      >
        <Tab label={`الأقسام (${departments.length})`} />
        <Tab label={`المسمّيات الوظيفية (${positions.length})`} />
      </Tabs>

      {tab === 0 ? (
        <Card sx={{ borderRadius: 2 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المدير</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    الموظفون
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{rootDepts.flatMap(d => renderDeptRow(d))}</TableBody>
            </Table>
          </TableContainer>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 2 }}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 700 }}>المسمى الوظيفي</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الدرجة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    العدد
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    شواغر
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {positions.map(p => (
                  <TableRow key={p._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {p.title}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell>
                      <Chip size="small" label={p.grade} variant="outlined" />
                    </TableCell>
                    <TableCell>{TYPE_LABELS[p.type] || p.type}</TableCell>
                    <TableCell align="center">{p.total}</TableCell>
                    <TableCell align="center">
                      {p.vacancies > 0 ? (
                        <Chip size="small" label={p.vacancies} color="error" />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setDialog({ open: true, type: 'position', data: p });
                          setForm(p);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, type: '', data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialog.data?._id
            ? 'تعديل'
            : dialog.type === 'department'
              ? 'إضافة قسم جديد'
              : 'إضافة وظيفة جديدة'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog.type === 'department' ? (
              <>
                <TextField
                  fullWidth
                  label="اسم القسم"
                  value={form.name || ''}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="الرمز"
                      value={form.code || ''}
                      onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="المدير"
                      value={form.manager || ''}
                      onChange={e => setForm(p => ({ ...p, manager: e.target.value }))}
                    />
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  select
                  label="القسم الأب"
                  value={form.parent || ''}
                  onChange={e => setForm(p => ({ ...p, parent: e.target.value }))}
                >
                  <MenuItem value="">بدون (قسم رئيسي)</MenuItem>
                  {departments.map(d => (
                    <MenuItem key={d._id} value={d._id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="المسمى الوظيفي"
                  value={form.title || ''}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
                <TextField
                  fullWidth
                  select
                  label="القسم"
                  value={form.department || ''}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                >
                  {departments.map(d => (
                    <MenuItem key={d._id} value={d._id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="الدرجة"
                      value={form.grade || ''}
                      onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="العدد الكلي"
                      type="number"
                      value={form.total || ''}
                      onChange={e => setForm(p => ({ ...p, total: +e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      label="الشواغر"
                      type="number"
                      value={form.vacancies || ''}
                      onChange={e => setForm(p => ({ ...p, vacancies: +e.target.value }))}
                    />
                  </Grid>
                </Grid>
                <TextField
                  fullWidth
                  select
                  label="النوع"
                  value={form.type || 'professional'}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialog({ open: false, type: '', data: null })}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
