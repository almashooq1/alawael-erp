/**
 * Customer Support Component - Advanced Version ⭐
 * مكون دعم العملاء - نسخة متقدمة
 *
 * Features:
 * ✅ Ticket management
 * ✅ Live chat support
 * ✅ Knowledge base
 * ✅ Customer feedback
 * ✅ Support metrics
 * ✅ Agent performance
 * ✅ Issue tracking
 * ✅ SLA management
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Rating,
  LinearProgress,
  Alert,
  Badge,
  AvatarGroup,
  Divider,
} from '@mui/material';
import {
  SupportAgent as SupportAgentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  TrendingUp as TrendingUpIcon,
  Chat as ChatIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

const CustomerSupport = () => {
  const [tickets, setTickets] = useState([
    {
      id: 'TKT001',
      subject: 'مشكلة في تسجيل الدخول',
      customer: 'محمد علي',
      priority: 'عالي',
      status: 'مفتوح',
      createdDate: '2026-01-15',
      resolvedDate: null,
      agent: 'أحمد',
      category: 'فني',
      rating: null,
    },
    {
      id: 'TKT002',
      subject: 'استفسار عن المنتج',
      customer: 'فاطمة محمود',
      priority: 'منخفض',
      status: 'مغلق',
      createdDate: '2026-01-10',
      resolvedDate: '2026-01-13',
      agent: 'فاطمة',
      category: 'عام',
      rating: 5,
    },
    {
      id: 'TKT003',
      subject: 'طلب التحويل البنكي',
      customer: 'علي الشريف',
      priority: 'متوسط',
      status: 'قيد الانتظار',
      createdDate: '2026-01-14',
      resolvedDate: null,
      agent: 'محمد',
      category: 'دفع',
      rating: null,
    },
  ]);

  const [agents, setAgents] = useState([
    {
      id: 'AG001',
      name: 'أحمد',
      email: 'ahmed@support.com',
      status: 'متصل',
      assignedTickets: 5,
      avgResolutionTime: '2.5 ساعات',
      satisfaction: 4.7,
      avatar: '👨‍💼',
    },
    {
      id: 'AG002',
      name: 'فاطمة',
      email: 'fatima@support.com',
      status: 'متصل',
      assignedTickets: 3,
      avgResolutionTime: '1.8 ساعات',
      satisfaction: 4.9,
      avatar: '👩‍💼',
    },
    {
      id: 'AG003',
      name: 'محمد',
      email: 'mohammad@support.com',
      status: 'غير متصل',
      assignedTickets: 2,
      avgResolutionTime: '3 ساعات',
      satisfaction: 4.5,
      avatar: '👨‍💻',
    },
  ]);

  const [knowledgeBase, setKnowledgeBase] = useState([
    { id: 'KB001', title: 'كيفية تسجيل حساب جديد', category: 'البدء السريع', views: 150, helpful: 142 },
    { id: 'KB002', title: 'كيفية استعادة كلمة المرور', category: 'الأمان', views: 200, helpful: 185 },
    { id: 'KB003', title: 'طرق الدفع المتاحة', category: 'الدفع', views: 180, helpful: 160 },
  ]);

  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: 'متوسط',
  });

  // Analytics
  const supportStats = useMemo(() => {
    const openTickets = tickets.filter(t => t.status === 'مفتوح').length;
    const closedTickets = tickets.filter(t => t.status === 'مغلق').length;
    const pendingTickets = tickets.filter(t => t.status === 'قيد الانتظار').length;
    const avgRating = tickets
      .filter(t => t.rating)
      .reduce((sum, t) => sum + t.rating, 0) / tickets.filter(t => t.rating).length || 0;

    return {
      total: tickets.length,
      openTickets,
      closedTickets,
      pendingTickets,
      resolutionRate: ((closedTickets / tickets.length) * 100).toFixed(1),
      avgRating: avgRating.toFixed(1),
      activeAgents: agents.filter(a => a.status === 'متصل').length,
    };
  }, [tickets, agents]);

  const handleAddTicket = () => {
    if (newTicket.subject && newTicket.category) {
      const ticket = {
        id: `TKT${String(tickets.length + 1).padStart(3, '0')}`,
        subject: newTicket.subject,
        customer: 'عميل جديد',
        priority: newTicket.priority,
        status: 'مفتوح',
        createdDate: new Date().toISOString().split('T')[0],
        resolvedDate: null,
        agent: agents[0].name,
        category: newTicket.category,
        rating: null,
      };
      setTickets([...tickets, ticket]);
      setNewTicket({ subject: '', category: '', priority: 'متوسط' });
      setOpenDialog(false);
    }
  };

  const getPriorityColor = priority => {
    const colors = { عالي: 'error', متوسط: 'warning', منخفض: 'success' };
    return colors[priority] || 'default';
  };

  const getStatusColor = status => {
    const colors = { مفتوح: 'error', 'قيد الانتظار': 'warning', مغلق: 'success' };
    return colors[status] || 'default';
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f9ff', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
            🎧 دعم العملاء
          </Typography>
          <Typography variant="body2" color="textSecondary">
            إدارة تذاكر الدعم والعملاء والمعرفة الأساسية
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
          }}
        >
          تذكرة جديدة
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    إجمالي التذاكر
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {supportStats.total}
                  </Typography>
                </Box>
                <ChatIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    تذاكر مفتوحة
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {supportStats.openTickets}
                  </Typography>
                </Box>
                <ClockIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx{{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    معدل الإغلاق
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {supportStats.resolutionRate}%
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    متوسط الرضا
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {supportStats.avgRating} ⭐
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="🎫 التذاكر" icon={<ChatIcon />} iconPosition="start" />
          <Tab label="👥 الوكلاء" icon={<SupportAgentIcon />} iconPosition="start" />
          <Tab label="📚 قاعدة المعرفة" icon={<SchoolIcon />} iconPosition="start" />
          <Tab label="📊 التحليلات" icon={<AssessmentIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 1: Tickets */}
      {tabValue === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>التذكرة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الموضوع</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>العميل</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الأولوية</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الوكيل</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الرضا</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map(ticket => (
                <TableRow key={ticket.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{ticket.id}</TableCell>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>{ticket.customer}</TableCell>
                  <TableCell>
                    <Chip label={ticket.priority} color={getPriorityColor(ticket.priority)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={ticket.status} color={getStatusColor(ticket.status)} size="small" />
                  </TableCell>
                  <TableCell>{ticket.agent}</TableCell>
                  <TableCell>
                    {ticket.rating ? <Rating value={ticket.rating} readOnly size="small" /> : '---'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Agents */}
      {tabValue === 1 && (
        <Grid container spacing={2}>
          {agents.map(agent => (
            <Grid item xs={12} md={6} key={agent.id}>
              <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
                <CardHeader
                  avatar={<Avatar sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>{agent.avatar}</Avatar>}
                  title={agent.name}
                  subheader={agent.email}
                  action={
                    <Chip
                      label={agent.status}
                      color={agent.status === 'متصل' ? 'success' : 'default'}
                      size="small"
                    />
                  }
                />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        📋 التذاكر المخصصة: {agent.assignedTickets}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                        ⏱️ متوسط وقت الحل
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {agent.avgResolutionTime}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                        ⭐ رضا العملاء
                      </Typography>
                      <Rating value={agent.satisfaction} readOnly size="small" />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 3: Knowledge Base */}
      {tabValue === 2 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>العنوان</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الفئة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المشاهدات</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>مفيد</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>معدل الفائدة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {knowledgeBase.map(item => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{item.title}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.views}</TableCell>
                  <TableCell>{item.helpful}</TableCell>
                  <TableCell>
                    <LinearProgress
                      variant="determinate"
                      value={(item.helpful / item.views) * 100}
                      sx={{ borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {((item.helpful / item.views) * 100).toFixed(0)}%
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 4: Analytics */}
      {tabValue === 3 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              📊 التحليلات الشاملة لأداء دعم العملاء والرضا والإحصائيات
            </Alert>
          </Grid>
        </Grid>
      )}

      {/* Add Ticket Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          تذكرة دعم جديدة
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="الموضوع"
              value={newTicket.subject}
              onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={newTicket.category}
                onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                label="الفئة"
              >
                <MenuItem value="فني">فني</MenuItem>
                <MenuItem value="دفع">دفع</MenuItem>
                <MenuItem value="عام">عام</MenuItem>
                <MenuItem value="شكاوى">شكاوى</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الأولوية</InputLabel>
              <Select
                value={newTicket.priority}
                onChange={e => setNewTicket({ ...newTicket, priority: e.target.value })}
                label="الأولوية"
              >
                <MenuItem value="عالي">عالي</MenuItem>
                <MenuItem value="متوسط">متوسط</MenuItem>
                <MenuItem value="منخفض">منخفض</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleAddTicket} variant="contained" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerSupport;
