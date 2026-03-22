import React, { useState, useEffect, useCallback } from 'react';
import advancedTicketsService from '../../services/advancedTickets.service';
import { useSocketEvent } from '../../contexts/SocketContext';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tabs,
  Tab,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  ConfirmationNumber as TicketIcon,
  ArrowUpward as EscalateIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors } from '../../theme/palette';

const demoTickets = [
  {
    _id: 't1',
    ticketNumber: 'TKT-2026-001',
    subject: 'مشكلة في الطابعة',
    category: 'IT',
    priority: 'high',
    status: 'open',
    assignedTo: 'أحمد فني',
    createdBy: 'محمد علي',
    slaPercent: 65,
  },
  {
    _id: 't2',
    ticketNumber: 'TKT-2026-002',
    subject: 'طلب صيانة مكيف',
    category: 'maintenance',
    priority: 'medium',
    status: 'in_progress',
    assignedTo: 'خالد صيانة',
    createdBy: 'سارة أحمد',
    slaPercent: 40,
  },
  {
    _id: 't3',
    ticketNumber: 'TKT-2026-003',
    subject: 'استفسار عن التقارير',
    category: 'general',
    priority: 'low',
    status: 'resolved',
    assignedTo: 'نورة دعم',
    createdBy: 'فهد خالد',
    slaPercent: 100,
  },
  {
    _id: 't4',
    ticketNumber: 'TKT-2026-004',
    subject: 'خلل في نظام الحضور',
    category: 'IT',
    priority: 'critical',
    status: 'escalated',
    assignedTo: 'مدير IT',
    createdBy: 'عبدالله سعد',
    slaPercent: 90,
  },
];

const demoStats = {
  total: 156,
  open: 23,
  inProgress: 18,
  resolved: 98,
  escalated: 5,
  slaCompliance: 94.2,
};
const statusMap = {
  open: { label: 'مفتوحة', color: 'info' },
  in_progress: { label: 'قيد التنفيذ', color: 'warning' },
  resolved: { label: 'محلولة', color: 'success' },
  closed: { label: 'مغلقة', color: 'default' },
  escalated: { label: 'مُصعّدة', color: 'error' },
};
const priorityMap = {
  critical: { label: 'حرجة', color: 'error' },
  high: { label: 'عالية', color: 'warning' },
  medium: { label: 'متوسطة', color: 'primary' },
  low: { label: 'منخفضة', color: 'default' },
};

export default function AdvancedTickets() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(demoStats);
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentTicketId, setCommentTicketId] = useState(null);
  const [form, setForm] = useState({
    subject: '',
    category: 'IT',
    priority: 'medium',
    description: '',
  });
  const showSnackbar = useSnackbar();

  // ─── Real-time ticket events via Socket.IO ─────────────────────────
  const handleTicketUpdate = useCallback(
    data => {
      if (data?.ticket) {
        setTickets(prev =>
          prev.map(t => (t._id === data.ticket._id ? { ...t, ...data.ticket } : t))
        );
        showSnackbar(`تحديث تذكرة: ${data.ticket.subject || data.ticket.ticketId}`, 'info');
      }
    },
    [showSnackbar]
  );
  const handleTicketEscalation = useCallback(
    data => {
      if (data?.ticket) {
        setTickets(prev =>
          prev.map(t =>
            t._id === data.ticket._id ? { ...t, ...data.ticket, status: 'escalated' } : t
          )
        );
        showSnackbar(`تصعيد تذكرة: ${data.ticket.subject || data.ticket.ticketId}`, 'warning');
      }
    },
    [showSnackbar]
  );
  useSocketEvent('ticket:updated', handleTicketUpdate);
  useSocketEvent('ticket:escalated', handleTicketEscalation);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await advancedTicketsService.getAll();
        setTickets(res.data || []);
        const slaRes = await advancedTicketsService.getSlaStats();
        setStats(slaRes.data || demoStats);
      } catch {
        setTickets(demoTickets);
        setStats(demoStats);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    if (!form.subject) {
      showSnackbar('الموضوع مطلوب', 'warning');
      return;
    }
    try {
      const res = await advancedTicketsService.create(form);
      setTickets(prev => [
        ...prev,
        res.data || {
          ...form,
          _id: Date.now().toString(),
          ticketNumber: `TKT-${Date.now()}`,
          status: 'open',
          assignedTo: '-',
          createdBy: 'أنا',
          slaPercent: 0,
        },
      ]);
      showSnackbar('تم إنشاء التذكرة بنجاح', 'success');
    } catch {
      showSnackbar('فشل في إنشاء التذكرة — تحقق من الاتصال بالخادم', 'error');
      return;
    }
    setDialogOpen(false);
    setForm({ subject: '', category: 'IT', priority: 'medium', description: '' });
  };

  const filtered =
    tab === 0
      ? tickets
      : tab === 1
        ? tickets.filter(t => t.status === 'open')
        : tab === 2
          ? tickets.filter(t => t.status === 'in_progress')
          : tickets.filter(t => t.status === 'escalated');

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TicketIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              نظام التذاكر المتقدم
            </Typography>
            <Typography variant="body2">إدارة تذاكر الدعم الفني والشكاوى</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          تذكرة جديدة
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'الإجمالي', value: stats.total, color: statusColors.primaryBlue },
          { label: 'مفتوحة', value: stats.open, color: statusColors.info },
          { label: 'قيد التنفيذ', value: stats.inProgress, color: statusColors.warning },
          { label: 'التزام SLA', value: `${stats.slaCompliance}%`, color: statusColors.success },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: s.color, fontWeight: 'bold' }}>
                  {s.value}
                </Typography>
                <Typography color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="الكل" />
          <Tab label="مفتوحة" />
          <Tab label="قيد التنفيذ" />
          <Tab label="مُصعّدة" />
        </Tabs>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>رقم التذكرة</TableCell>
              <TableCell>الموضوع</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>الأولوية</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>المسؤول</TableCell>
              <TableCell>SLA</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(t => (
              <TableRow key={t._id}>
                <TableCell>{t.ticketNumber}</TableCell>
                <TableCell>{t.subject}</TableCell>
                <TableCell>{t.category}</TableCell>
                <TableCell>
                  <Chip
                    label={priorityMap[t.priority]?.label}
                    color={priorityMap[t.priority]?.color}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={statusMap[t.status]?.label}
                    color={statusMap[t.status]?.color}
                    size="small"
                  />
                </TableCell>
                <TableCell>{t.assignedTo}</TableCell>
                <TableCell sx={{ minWidth: 100 }}>
                  <LinearProgress
                    variant="determinate"
                    value={t.slaPercent}
                    color={t.slaPercent > 80 ? 'error' : t.slaPercent > 50 ? 'warning' : 'success'}
                  />
                  <Typography variant="caption">{t.slaPercent}%</Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="تعليق">
                    <IconButton
                      aria-label="إضافة تعليق"
                      size="small"
                      onClick={() => {
                        setCommentTicketId(t._id);
                        setCommentText('');
                        setCommentDialogOpen(true);
                      }}
                    >
                      <CommentIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تصعيد">
                    <IconButton
                      aria-label="تصعيد التذكرة"
                      size="small"
                      color="error"
                      onClick={async () => {
                        try {
                          await advancedTicketsService.escalate(t._id, { reason: 'تصعيد يدوي' });
                          setTickets(prev =>
                            prev.map(tk => (tk._id === t._id ? { ...tk, status: 'escalated' } : tk))
                          );
                          showSnackbar('تم تصعيد التذكرة', 'warning');
                        } catch {
                          showSnackbar('خطأ في تصعيد التذكرة', 'error');
                        }
                      }}
                    >
                      <EscalateIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تعديل">
                    <IconButton
                      aria-label="تعديل التذكرة"
                      size="small"
                      onClick={() => {
                        setForm({
                          subject: t.subject,
                          category: t.category,
                          priority: t.priority,
                          description: t.description || '',
                        });
                        setDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تذكرة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="الموضوع"
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="الفئة"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            sx={{ mb: 2 }}
          >
            {['IT', 'maintenance', 'general', 'HR', 'finance'].map(c => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="الأولوية"
            value={form.priority}
            onChange={e => setForm({ ...form, priority: e.target.value })}
            sx={{ mb: 2 }}
          >
            {Object.entries(priorityMap).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="الوصف"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog
        open={commentDialogOpen}
        onClose={() => setCommentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة تعليق</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="التعليق"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            sx={{ mt: 2 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!commentText.trim()}
            onClick={async () => {
              try {
                await advancedTicketsService.addComment(commentTicketId, { text: commentText });
                showSnackbar('تم إضافة التعليق', 'success');
                setCommentDialogOpen(false);
              } catch {
                showSnackbar('خطأ في إضافة التعليق', 'error');
              }
            }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
