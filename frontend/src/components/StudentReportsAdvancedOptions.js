/**
 * Student Reports Advanced Options Component
 * مكون الخيارات المتقدمة للتقارير
 */

import { useState } from 'react';
import { triggerBlobDownload } from 'utils/downloadHelper';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  GetApp as GetAppIcon,
  Schedule as ScheduleIcon,
  Compare as CompareIcon,
  TrendingUp as TrendingUpIcon,
  Autorenew as AutorenewIcon,
} from '@mui/icons-material';
import { getToken } from 'utils/tokenStorage';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const StudentReportsAdvancedOptions = ({ studentId, onReportGenerated }) => {
  const showSnackbar = useSnackbar();
  const [activeTab, setActiveTab] = useState(0);
  const [exportDialog, setExportDialog] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [compareDialog, setCompareDialog] = useState(false);

  const [exportConfig, setExportConfig] = useState({
    format: 'pdf',
    reportType: 'comprehensive',
  });

  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'monthly',
    recipients: '',
    reportType: 'comprehensive',
    reportFormat: 'pdf',
  });

  const [compareConfig, setCompareConfig] = useState({
    period1From: '2025-09-01',
    period1To: '2025-12-15',
    period2From: '2025-12-16',
    period2To: '2026-01-31',
  });

  const handleExport = async () => {
    try {
      const payload = {
        report_data: {
          report_type: exportConfig.reportType || 'comprehensive',
          student_name: 'Student',
          student_id: studentId,
          generated_at: new Date().toISOString(),
        },
      };

      const response = await fetch(`/api/exports/${exportConfig.format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const blob = await response.blob();
        const ext = exportConfig.format === 'excel' ? 'xlsx' : exportConfig.format;
        triggerBlobDownload(blob, `student-report.${ext}`);
        setExportDialog(false);
      }
    } catch (error) {
      logger.error('Error exporting report:', error);
    }
  };

  const handleScheduleReport = async () => {
    try {
      const recipients = scheduleConfig.recipients.split(',').map(e => e.trim());
      const response = await fetch(`/api/student-reports/${studentId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          ...scheduleConfig,
          recipients,
        }),
      });

      if (response.ok) {
        showSnackbar('تم جدولة التقرير بنجاح', 'success');
        setScheduleDialog(false);
      }
    } catch (error) {
      logger.error('Error scheduling report:', error);
    }
  };

  const handleCompare = async () => {
    try {
      const response = await fetch(`/api/student-reports/${studentId}/comparison`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          period1: {
            from: compareConfig.period1From,
            to: compareConfig.period1To,
          },
          period2: {
            from: compareConfig.period2From,
            to: compareConfig.period2To,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onReportGenerated(data.data);
        setCompareDialog(false);
      }
    } catch (error) {
      logger.error('Error comparing reports:', error);
    }
  };

  return (
    <Box>
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
            🔧 الخيارات المتقدمة
          </Typography>

          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab label="📥 التصدير" />
            <Tab label="📅 الجدولة" />
            <Tab label="📊 المقارنة" />
            <Tab label="🤖 التنبؤات" />
            <Tab label="⚠️ تقييم المخاطر" />
          </Tabs>

          {/* Export Tab */}
          <TabPanel value={activeTab} index={0}>
            <Stack spacing={3}>
              <Alert severity="info">اختر صيغة التصدير المفضلة لديك والنوع المناسب للتقرير.</Alert>

              <TextField
                select
                fullWidth
                label="صيغة التصدير"
                value={exportConfig.format}
                onChange={e => setExportConfig({ ...exportConfig, format: e.target.value })}
              >
                <option value="pdf">PDF - وثيقة محمولة</option>
                <option value="excel">Excel - جدول بيانات</option>
                <option value="csv">CSV - نص مفصول بفواصل</option>
              </TextField>

              <TextField
                select
                fullWidth
                label="نوع التقرير"
                value={exportConfig.reportType}
                onChange={e => setExportConfig({ ...exportConfig, reportType: e.target.value })}
              >
                <option value="comprehensive">شامل</option>
                <option value="academic">أكاديمي</option>
                <option value="behavior">سلوكي</option>
                <option value="attendance">الحضور</option>
              </TextField>

              <Button
                variant="contained"
                startIcon={<GetAppIcon />}
                onClick={handleExport}
                fullWidth
                sx={{ py: 1.5 }}
              >
                تصدير التقرير
              </Button>
            </Stack>
          </TabPanel>

          {/* Schedule Tab */}
          <TabPanel value={activeTab} index={1}>
            <Stack spacing={3}>
              <Alert severity="info">جدول التقرير ليتم إرساله تلقائياً بشكل دوري.</Alert>

              <TextField
                select
                fullWidth
                label="تكرار الإرسال"
                value={scheduleConfig.frequency}
                onChange={e => setScheduleConfig({ ...scheduleConfig, frequency: e.target.value })}
              >
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
                <option value="quarterly">ربع سنوي</option>
              </TextField>

              <TextField
                fullWidth
                label="البريد الإلكتروني للمستقبلين"
                placeholder="email1@example.com, email2@example.com"
                value={scheduleConfig.recipients}
                onChange={e => setScheduleConfig({ ...scheduleConfig, recipients: e.target.value })}
                multiline
                rows={3}
              />

              <TextField
                select
                fullWidth
                label="نوع التقرير"
                value={scheduleConfig.reportType}
                onChange={e => setScheduleConfig({ ...scheduleConfig, reportType: e.target.value })}
              >
                <option value="comprehensive">شامل</option>
                <option value="academic">أكاديمي</option>
                <option value="behavior">سلوكي</option>
              </TextField>

              <TextField
                select
                fullWidth
                label="صيغة الإرسال"
                value={scheduleConfig.reportFormat}
                onChange={e =>
                  setScheduleConfig({ ...scheduleConfig, reportFormat: e.target.value })
                }
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </TextField>

              <Button
                variant="contained"
                startIcon={<ScheduleIcon />}
                onClick={handleScheduleReport}
                fullWidth
                sx={{ py: 1.5 }}
              >
                جدولة التقرير
              </Button>
            </Stack>
          </TabPanel>

          {/* Comparison Tab */}
          <TabPanel value={activeTab} index={2}>
            <Stack spacing={3}>
              <Alert severity="info">قارن أداء الطالب بين فترتين مختلفتين.</Alert>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  الفترة الأولى
                </Typography>
                <TextField
                  type="date"
                  label="من"
                  InputLabelProps={{ shrink: true }}
                  value={compareConfig.period1From}
                  onChange={e =>
                    setCompareConfig({ ...compareConfig, period1From: e.target.value })
                  }
                  fullWidth
                  sx={{ mb: 1 }}
                />
                <TextField
                  type="date"
                  label="إلى"
                  InputLabelProps={{ shrink: true }}
                  value={compareConfig.period1To}
                  onChange={e => setCompareConfig({ ...compareConfig, period1To: e.target.value })}
                  fullWidth
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  الفترة الثانية
                </Typography>
                <TextField
                  type="date"
                  label="من"
                  InputLabelProps={{ shrink: true }}
                  value={compareConfig.period2From}
                  onChange={e =>
                    setCompareConfig({ ...compareConfig, period2From: e.target.value })
                  }
                  fullWidth
                  sx={{ mb: 1 }}
                />
                <TextField
                  type="date"
                  label="إلى"
                  InputLabelProps={{ shrink: true }}
                  value={compareConfig.period2To}
                  onChange={e => setCompareConfig({ ...compareConfig, period2To: e.target.value })}
                  fullWidth
                />
              </Box>

              <Button
                variant="contained"
                startIcon={<CompareIcon />}
                onClick={handleCompare}
                fullWidth
                sx={{ py: 1.5 }}
              >
                مقارنة الفترات
              </Button>
            </Stack>
          </TabPanel>

          {/* Predictions Tab */}
          <TabPanel value={activeTab} index={3}>
            <Stack spacing={3}>
              <Alert severity="info">احصل على توقعات ذكية لأداء الطالب المستقبلي.</Alert>

              <TextField select fullWidth label="نطاق التنبؤ" defaultValue={8}>
                <option value={4}>4 أسابيع</option>
                <option value={8}>8 أسابيع</option>
                <option value={12}>12 أسبوع</option>
                <option value={16}>16 أسبوع</option>
              </TextField>

              <Button variant="contained" startIcon={<TrendingUpIcon />} fullWidth sx={{ py: 1.5 }}>
                توليد التنبؤات
              </Button>
            </Stack>
          </TabPanel>

          {/* Risk Assessment Tab */}
          <TabPanel value={activeTab} index={4}>
            <Stack spacing={3}>
              <Alert severity="warning">تقييم شامل للمخاطر والتحذيرات المبكرة.</Alert>

              <Typography variant="body2">
                سيتم تحليل البيانات الحالية والتاريخية لتحديد:
              </Typography>

              <Stack component="ul" spacing={1}>
                <li>مخاطر الأداء الأكاديمي</li>
                <li>مخاطر الحضور والالتزام</li>
                <li>مخاطر السلوك والانضباط</li>
                <li>مخاطر مستوى الالتزام والمشاركة</li>
                <li>التحذيرات المبكرة</li>
              </Stack>

              <Button
                variant="contained"
                color="error"
                startIcon={<AutorenewIcon />}
                fullWidth
                sx={{ py: 1.5 }}
              >
                تقييم المخاطر الآن
              </Button>
            </Stack>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog open={exportDialog} onClose={() => setExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تصدير التقرير</DialogTitle>
        <DialogContent>{/* Dialog content */}</DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>إلغاء</Button>
          <Button onClick={handleExport} variant="contained">
            تصدير
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog
        open={scheduleDialog}
        onClose={() => setScheduleDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>جدولة التقرير</DialogTitle>
        <DialogContent>{/* Dialog content */}</DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>إلغاء</Button>
          <Button onClick={handleScheduleReport} variant="contained">
            جدولة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog open={compareDialog} onClose={() => setCompareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>مقارنة الفترات</DialogTitle>
        <DialogContent>{/* Dialog content */}</DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialog(false)}>إلغاء</Button>
          <Button onClick={handleCompare} variant="contained">
            مقارنة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentReportsAdvancedOptions;
