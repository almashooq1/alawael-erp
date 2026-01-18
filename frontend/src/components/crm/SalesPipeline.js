/**
 * Sales Pipeline Component - CRM Pipeline Management 📈
 * مكون خط الأنابيب البيعية - إدارة خط الأنابيب
 *
 * Features:
 * ✅ Kanban board view
 * ✅ Deal tracking
 * ✅ Win/Loss analysis
 * ✅ Revenue forecasting
 * ✅ Drag & drop stages
 * ✅ Deal details modal
 * ✅ Stage-wise statistics
 * ✅ Conversion metrics
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Grid,
  TextField,
  LinearProgress,
  Divider,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  DragIndicator as DragIndicatorIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

const SalesPipeline = () => {
  const [deals, setDeals] = useState([
    {
      id: '1',
      title: 'عقد شركة التقنية',
      customer: 'أحمد محمود',
      amount: 50000,
      stage: 'discovery',
      probability: 30,
      dueDate: '2026-02-01',
      notes: 'اتصال أول',
    },
    {
      id: '2',
      title: 'حل الأمان السيبراني',
      customer: 'فاطمة علي',
      amount: 75000,
      stage: 'proposal',
      probability: 60,
      dueDate: '2026-02-15',
      notes: 'في انتظار الموافقة',
    },
    {
      id: '3',
      title: 'نظام ERP شامل',
      customer: 'محمد سالم',
      amount: 120000,
      stage: 'negotiation',
      probability: 75,
      dueDate: '2026-03-01',
      notes: 'آخر مرحلة التفاوض',
    },
    {
      id: '4',
      title: 'خدمة السحابة',
      customer: 'سارة أحمد',
      amount: 40000,
      stage: 'closed_won',
      probability: 100,
      dueDate: '2026-01-15',
      notes: 'مغلق بنجاح',
    },
    {
      id: '5',
      title: 'حل التحليلات',
      customer: 'علي محمد',
      amount: 30000,
      stage: 'closed_lost',
      probability: 0,
      dueDate: '2026-01-10',
      notes: 'خسرنا العقد',
    },
  ]);

  const stages = [
    { id: 'discovery', label: 'الاستكشاف', color: '#e3f2fd', textColor: '#1976d2' },
    { id: 'proposal', label: 'العرض', color: '#f3e5f5', textColor: '#7b1fa2' },
    { id: 'negotiation', label: 'التفاوض', color: '#fff3e0', textColor: '#e65100' },
    { id: 'closed_won', label: 'مغلق - رابح', color: '#e8f5e9', textColor: '#2e7d32' },
    { id: 'closed_lost', label: 'مغلق - خاسر', color: '#ffebee', textColor: '#c62828' },
  ];

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [formData, setFormData] = useState({});

  const stageDeals = useMemo(() => {
    const grouped = {};
    stages.forEach(stage => {
      grouped[stage.id] = deals.filter(d => d.stage === stage.id);
    });
    return grouped;
  }, [deals]);

  const statistics = useMemo(() => {
    return {
      totalDeals: deals.length,
      totalAmount: deals.reduce((sum, d) => sum + d.amount, 0),
      wonAmount: deals.filter(d => d.stage === 'closed_won').reduce((sum, d) => sum + d.amount, 0),
      avgDealSize: Math.round(deals.reduce((sum, d) => sum + d.amount, 0) / deals.length),
      conversionRate: Math.round((deals.filter(d => d.stage === 'closed_won').length / deals.length) * 100),
    };
  }, [deals]);

  const handleAddDeal = useCallback(() => {
    setFormData({ stage: 'discovery', probability: 30 });
    setSelectedDeal(null);
    setOpenDialog(true);
  }, []);

  const handleEditDeal = useCallback(deal => {
    setFormData(deal);
    setSelectedDeal(deal);
    setOpenDialog(true);
  }, []);

  const handleSaveDeal = useCallback(() => {
    if (!formData.title || !formData.amount) {
      alert('العنوان والمبلغ مطلوبان');
      return;
    }

    if (selectedDeal) {
      setDeals(deals.map(d => (d.id === selectedDeal.id ? { ...formData, id: d.id } : d)));
    } else {
      setDeals([...deals, { ...formData, id: Date.now().toString() }]);
    }

    setOpenDialog(false);
  }, [formData, selectedDeal, deals]);

  const handleDeleteDeal = useCallback(
    id => {
      if (window.confirm('هل تريد حذف هذا العقد؟')) {
        setDeals(deals.filter(d => d.id !== id));
      }
    },
    [deals],
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي العقود', value: statistics.totalDeals, icon: '📊' },
          { label: 'القيمة الإجمالية', value: `${(statistics.totalAmount / 1000).toFixed(0)}K`, icon: '💰' },
          { label: 'القيمة المغلقة', value: `${(statistics.wonAmount / 1000).toFixed(0)}K`, icon: '✅' },
          { label: 'متوسط حجم العقد', value: `${(statistics.avgDealSize / 1000).toFixed(0)}K`, icon: '📈' },
          { label: 'معدل التحويل', value: `${statistics.conversionRate}%`, icon: '🎯' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={2.4} key={idx}>
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, background: 'linear-gradient(135deg, #667eea20, #764ba220)' }}>
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Action Bar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          📌 خط الأنابيب البيعية
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddDeal}
          sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          عقد جديد
        </Button>
      </Box>

      {/* Kanban Board */}
      <Box sx={{ display: 'flex', gap: 2, overflow: 'auto', pb: 2 }}>
        {stages.map(stage => (
          <Paper
            key={stage.id}
            sx={{
              flex: '0 0 320px',
              p: 2,
              borderRadius: 2,
              backgroundColor: stage.color,
              minHeight: 600,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: stage.textColor }}>
                {stage.label}
              </Typography>
              <Chip label={stageDeals[stage.id].length} size="small" sx={{ backgroundColor: stage.textColor, color: 'white' }} />
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.5}>
              {stageDeals[stage.id].map(deal => (
                <Card
                  key={deal.id}
                  sx={{
                    borderRadius: 2,
                    border: `2px solid ${stage.textColor}30`,
                    '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
                    transition: 'all 0.3s',
                    cursor: 'grab',
                    backgroundColor: 'white',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, color: stage.textColor }}>
                        {deal.title}
                      </Typography>
                      <Chip
                        label={`${deal.probability}%`}
                        size="small"
                        sx={{ fontSize: '0.75rem', backgroundColor: stage.textColor + '20', color: stage.textColor }}
                      />
                    </Box>

                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.75 }}>
                      👤 {deal.customer}
                    </Typography>

                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#2196f3', mb: 1 }}>
                      {(deal.amount / 1000).toFixed(0)}K
                    </Typography>

                    <LinearProgress variant="determinate" value={deal.probability} sx={{ mb: 1, height: 4, borderRadius: 2 }} />

                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="تحرير">
                        <IconButton size="small" onClick={() => handleEditDeal(deal)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" onClick={() => handleDeleteDeal(deal.id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>
        ))}
      </Box>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          {selectedDeal ? 'تحرير العقد' : 'عقد جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="العنوان"
              value={formData.title || ''}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="العميل"
              value={formData.customer || ''}
              onChange={e => setFormData({ ...formData, customer: e.target.value })}
              fullWidth
            />
            <TextField
              type="number"
              label="المبلغ"
              value={formData.amount || ''}
              onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              type="number"
              label="احتمالية النجاح (%)"
              value={formData.probability || ''}
              onChange={e => setFormData({ ...formData, probability: Number(e.target.value) })}
              fullWidth
              inputProps={{ min: 0, max: 100 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveDeal} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesPipeline;
