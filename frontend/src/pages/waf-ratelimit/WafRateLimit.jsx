/**
 * AL-AWAEL ERP — WAF & Rate Limit Dashboard
 * Phase 24 — لوحة تحكم WAF وحماية DDoS
 *
 * 6 Tabs: Dashboard | WAF Rules | IP Management | Rate Limits | Incidents | Logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Button, Chip, Table, TableHead,
  TableRow, TableCell, TableBody, TextField, IconButton, Switch, Dialog,
  DialogTitle, DialogContent, DialogActions, Card, CardContent, Grid,
  Alert, CircularProgress, MenuItem, Select, InputLabel, FormControl,
  Tooltip, LinearProgress,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Shield as ShieldIcon,
  Block as BlockIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  BugReport as BugIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import wafService from '../../services/wafRateLimitService';

/* ── helper ── */
const safe = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { console.error(e); return null; } };

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

const severity = { critical: 'error', high: 'warning', medium: 'info', low: 'success' };
const threatColor = { low: '#4caf50', medium: '#ff9800', high: '#f44336', critical: '#b71c1c' };

/* ══════════════════════════════════════════════════════════════════════════ */

export default function WafRateLimit() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ── Tab 0: Dashboard ── */
  const [dashboard, setDashboard] = useState(null);

  /* ── Tab 1: WAF Rules ── */
  const [rules, setRules] = useState([]);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', category: 'custom', severity: 'medium', pattern: '', description: '' });

  /* ── Tab 2: IP Management ── */
  const [blacklist, setBlacklist] = useState([]);
  const [whitelist, setWhitelist] = useState([]);
  const [greylist, setGreylist] = useState([]);
  const [ipDialog, setIpDialog] = useState(false);
  const [ipForm, setIpForm] = useState({ ip: '', reason: '', list: 'blacklist' });

  /* ── Tab 3: Rate Limits ── */
  const [tiers, setTiers] = useState([]);

  /* ── Tab 4: Incidents ── */
  const [incidents, setIncidents] = useState([]);

  /* ── Tab 5: Blocked Logs ── */
  const [blocked, setBlocked] = useState([]);

  /* ── Config ── */
  const [config, setConfig] = useState(null);

  /* ══════════════════════════════════════════════════════════════════════ */

  const loadDashboard = useCallback(safe(async () => {
    setLoading(true);
    const res = await wafService.getDashboard();
    setDashboard(res.data?.data || res.data);
    setLoading(false);
  }), []);

  const loadRules = useCallback(safe(async () => {
    const res = await wafService.listWafRules();
    setRules(res.data?.rules || []);
  }), []);

  const loadIPLists = useCallback(safe(async () => {
    const [bl, wl, gl] = await Promise.all([
      wafService.getBlacklist(),
      wafService.getWhitelist(),
      wafService.getGreylist(),
    ]);
    setBlacklist(bl.data?.entries || []);
    setWhitelist(wl.data?.entries || []);
    setGreylist(gl.data?.entries || []);
  }), []);

  const loadTiers = useCallback(safe(async () => {
    const res = await wafService.listTiers();
    setTiers(res.data?.tiers || []);
  }), []);

  const loadIncidents = useCallback(safe(async () => {
    const res = await wafService.listIncidents();
    setIncidents(res.data?.incidents || []);
  }), []);

  const loadBlocked = useCallback(safe(async () => {
    const res = await wafService.getBlockedRequests();
    setBlocked(res.data?.requests || []);
  }), []);

  const loadConfig = useCallback(safe(async () => {
    const res = await wafService.getConfig();
    setConfig(res.data?.data || res.data);
  }), []);

  useEffect(() => { loadDashboard(); loadConfig(); }, [loadDashboard, loadConfig]);

  useEffect(() => {
    if (tab === 0) loadDashboard();
    if (tab === 1) loadRules();
    if (tab === 2) loadIPLists();
    if (tab === 3) loadTiers();
    if (tab === 4) loadIncidents();
    if (tab === 5) loadBlocked();
  }, [tab, loadDashboard, loadRules, loadIPLists, loadTiers, loadIncidents, loadBlocked]);

  /* ── Actions ── */
  const handleAddRule = safe(async () => {
    await wafService.addWafRule(newRule);
    setRuleDialog(false);
    setNewRule({ name: '', category: 'custom', severity: 'medium', pattern: '', description: '' });
    loadRules();
  });

  const handleToggleRule = safe(async (id, enabled) => {
    await wafService.toggleWafRule(id, !enabled);
    loadRules();
  });

  const handleDeleteRule = safe(async (id) => {
    await wafService.deleteWafRule(id);
    loadRules();
  });

  const handleAddIP = safe(async () => {
    if (ipForm.list === 'blacklist') await wafService.addToBlacklist({ ip: ipForm.ip, reason: ipForm.reason });
    else await wafService.addToWhitelist({ ip: ipForm.ip, reason: ipForm.reason });
    setIpDialog(false);
    setIpForm({ ip: '', reason: '', list: 'blacklist' });
    loadIPLists();
  });

  const handleRemoveBlack = safe(async (ip) => { await wafService.removeFromBlack(ip); loadIPLists(); });
  const handleRemoveWhite = safe(async (ip) => { await wafService.removeFromWhite(ip); loadIPLists(); });

  const handleToggleTier = safe(async (id, enabled) => {
    await wafService.toggleTier(id, !enabled);
    loadTiers();
  });

  const handleResolveIncident = safe(async (id) => {
    await wafService.resolveIncident(id, 'Resolved via dashboard');
    loadIncidents();
  });

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════ */

  return (
    <Box dir="rtl" sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShieldIcon color="primary" fontSize="large" />
        جدار الحماية وتحديد المعدل (WAF)
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        حماية متقدمة ضد هجمات DDoS — Phase 24
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<SecurityIcon />} label="لوحة التحكم" />
          <Tab icon={<ShieldIcon />} label="قواعد WAF" />
          <Tab icon={<BlockIcon />} label="إدارة IP" />
          <Tab icon={<SpeedIcon />} label="تحديد المعدل" />
          <Tab icon={<WarningIcon />} label="الحوادث" />
          <Tab icon={<BugIcon />} label="السجلات" />
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ═══ TAB 0: DASHBOARD ═══ */}
      <TabPanel value={tab} index={0}>
        {dashboard ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: threatColor[dashboard.threatLevel] || '#4caf50', color: '#fff' }}>
                <CardContent>
                  <Typography variant="h6">مستوى التهديد</Typography>
                  <Typography variant="h3">{dashboard.threatLevel?.toUpperCase()}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card><CardContent>
                <Typography color="text.secondary">إجمالي الطلبات</Typography>
                <Typography variant="h4">{dashboard.analytics?.totalRequests || 0}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card><CardContent>
                <Typography color="text.secondary">الطلبات المحظورة</Typography>
                <Typography variant="h4" color="error">{dashboard.analytics?.blockedRequests || 0}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card><CardContent>
                <Typography color="text.secondary">الحوادث النشطة</Typography>
                <Typography variant="h4" color="warning.main">{dashboard.activeIncidents || 0}</Typography>
              </CardContent></Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card><CardContent>
                <Typography variant="h6" gutterBottom>حالة WAF</Typography>
                <Chip label={dashboard.wafEnabled ? 'مفعّل' : 'معطّل'} color={dashboard.wafEnabled ? 'success' : 'default'} />
                <Typography sx={{ mt: 1 }}>الوضع: {dashboard.wafMode}</Typography>
                <Typography>القواعد المفعّلة: {dashboard.enabledRules}/{dashboard.totalRules}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card><CardContent>
                <Typography variant="h6" gutterBottom>قوائم IP</Typography>
                <Typography>القائمة السوداء: {dashboard.blacklistSize}</Typography>
                <Typography>القائمة البيضاء: {dashboard.whitelistSize}</Typography>
                <Typography>القائمة الرمادية: {dashboard.greylistSize}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card><CardContent>
                <Typography variant="h6" gutterBottom>أبرز IPs المحظورة</Typography>
                {(dashboard.topBlockedIPs || []).slice(0, 5).map((t, i) => (
                  <Typography key={i} variant="body2">{t.ip} — {t.count} محاولة</Typography>
                ))}
                {(!dashboard.topBlockedIPs || dashboard.topBlockedIPs.length === 0) && (
                  <Typography variant="body2" color="text.secondary">لا توجد بيانات</Typography>
                )}
              </CardContent></Card>
            </Grid>
          </Grid>
        ) : (
          <Box textAlign="center" py={4}><CircularProgress /></Box>
        )}
      </TabPanel>

      {/* ═══ TAB 1: WAF RULES ═══ */}
      <TabPanel value={tab} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">قواعد جدار الحماية ({rules.length})</Typography>
          <Box>
            <Button startIcon={<RefreshIcon />} onClick={loadRules} sx={{ mr: 1 }}>تحديث</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRuleDialog(true)}>إضافة قاعدة</Button>
          </Box>
        </Box>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>القاعدة</TableCell><TableCell>التصنيف</TableCell><TableCell>الخطورة</TableCell>
            <TableCell>الوصف</TableCell><TableCell>الحالة</TableCell><TableCell>إجراءات</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {rules.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell><Chip label={r.category} size="small" /></TableCell>
                <TableCell><Chip label={r.severity} size="small" color={severity[r.severity] || 'default'} /></TableCell>
                <TableCell>{r.description}</TableCell>
                <TableCell><Switch checked={r.enabled} onChange={() => handleToggleRule(r.id, r.enabled)} size="small" /></TableCell>
                <TableCell>
                  <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDeleteRule(r.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Add Rule Dialog */}
        <Dialog open={ruleDialog} onClose={() => setRuleDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>إضافة قاعدة WAF جديدة</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="اسم القاعدة" value={newRule.name} onChange={e => setNewRule({ ...newRule, name: e.target.value })} sx={{ mt: 1, mb: 2 }} />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>التصنيف</InputLabel>
              <Select value={newRule.category} label="التصنيف" onChange={e => setNewRule({ ...newRule, category: e.target.value })}>
                <MenuItem value="sqli">SQL Injection</MenuItem>
                <MenuItem value="xss">XSS</MenuItem>
                <MenuItem value="traversal">Path Traversal</MenuItem>
                <MenuItem value="cmdi">Command Injection</MenuItem>
                <MenuItem value="bot">Bad Bot</MenuItem>
                <MenuItem value="custom">مخصص</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>الخطورة</InputLabel>
              <Select value={newRule.severity} label="الخطورة" onChange={e => setNewRule({ ...newRule, severity: e.target.value })}>
                <MenuItem value="critical">حرج</MenuItem>
                <MenuItem value="high">عالي</MenuItem>
                <MenuItem value="medium">متوسط</MenuItem>
                <MenuItem value="low">منخفض</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="نمط Regex" value={newRule.pattern} onChange={e => setNewRule({ ...newRule, pattern: e.target.value })} sx={{ mb: 2 }} />
            <TextField fullWidth label="الوصف" value={newRule.description} onChange={e => setNewRule({ ...newRule, description: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRuleDialog(false)}>إلغاء</Button>
            <Button variant="contained" onClick={handleAddRule}>إضافة</Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* ═══ TAB 2: IP MANAGEMENT ═══ */}
      <TabPanel value={tab} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">إدارة عناوين IP</Typography>
          <Box>
            <Button startIcon={<RefreshIcon />} onClick={loadIPLists} sx={{ mr: 1 }}>تحديث</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIpDialog(true)}>إضافة IP</Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* Blacklist */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" color="error" gutterBottom><BlockIcon /> القائمة السوداء ({blacklist.length})</Typography>
              {blacklist.map((e, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box><Typography variant="body2" fontWeight="bold">{e.ip}</Typography><Typography variant="caption">{e.reason}</Typography></Box>
                  <IconButton size="small" onClick={() => handleRemoveBlack(e.ip)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              ))}
              {blacklist.length === 0 && <Typography variant="body2" color="text.secondary">فارغة</Typography>}
            </Paper>
          </Grid>

          {/* Whitelist */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" color="success.main" gutterBottom><CheckIcon /> القائمة البيضاء ({whitelist.length})</Typography>
              {whitelist.map((e, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box><Typography variant="body2" fontWeight="bold">{e.ip}</Typography><Typography variant="caption">{e.reason}</Typography></Box>
                  <IconButton size="small" onClick={() => handleRemoveWhite(e.ip)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              ))}
              {whitelist.length === 0 && <Typography variant="body2" color="text.secondary">فارغة</Typography>}
            </Paper>
          </Grid>

          {/* Greylist */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" color="warning.main" gutterBottom><WarningIcon /> القائمة الرمادية ({greylist.length})</Typography>
              {greylist.map((e, i) => (
                <Box key={i} sx={{ mb: 1 }}>
                  <Typography variant="body2" fontWeight="bold">{e.ip}</Typography>
                  <Typography variant="caption">درجة الخطر: {e.score}/100</Typography>
                  <LinearProgress variant="determinate" value={e.score} color={e.score > 70 ? 'error' : 'warning'} sx={{ mt: 0.5 }} />
                </Box>
              ))}
              {greylist.length === 0 && <Typography variant="body2" color="text.secondary">فارغة</Typography>}
            </Paper>
          </Grid>
        </Grid>

        {/* Add IP Dialog */}
        <Dialog open={ipDialog} onClose={() => setIpDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>إضافة عنوان IP</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="عنوان IP" value={ipForm.ip} onChange={e => setIpForm({ ...ipForm, ip: e.target.value })} sx={{ mt: 1, mb: 2 }} />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>القائمة</InputLabel>
              <Select value={ipForm.list} label="القائمة" onChange={e => setIpForm({ ...ipForm, list: e.target.value })}>
                <MenuItem value="blacklist">القائمة السوداء</MenuItem>
                <MenuItem value="whitelist">القائمة البيضاء</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="السبب" value={ipForm.reason} onChange={e => setIpForm({ ...ipForm, reason: e.target.value })} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIpDialog(false)}>إلغاء</Button>
            <Button variant="contained" onClick={handleAddIP}>إضافة</Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* ═══ TAB 3: RATE LIMITS ═══ */}
      <TabPanel value={tab} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">مستويات تحديد المعدل ({tiers.length})</Typography>
          <Button startIcon={<RefreshIcon />} onClick={loadTiers}>تحديث</Button>
        </Box>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>المستوى</TableCell><TableCell>النطاق</TableCell>
            <TableCell>الحد</TableCell><TableCell>النافذة</TableCell><TableCell>الحالة</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {tiers.map(t => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell><Chip label={t.scope} size="small" /></TableCell>
                <TableCell>{t.limit} طلب</TableCell>
                <TableCell>{(t.windowMs / 1000).toFixed(0)} ثانية</TableCell>
                <TableCell><Switch checked={t.enabled} onChange={() => handleToggleTier(t.id, t.enabled)} size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabPanel>

      {/* ═══ TAB 4: INCIDENTS ═══ */}
      <TabPanel value={tab} index={4}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">الحوادث الأمنية ({incidents.length})</Typography>
          <Button startIcon={<RefreshIcon />} onClick={loadIncidents}>تحديث</Button>
        </Box>
        {incidents.length === 0 ? (
          <Alert severity="success" icon={<CheckIcon />}>لا توجد حوادث نشطة — النظام آمن</Alert>
        ) : (
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>النوع</TableCell><TableCell>الخطورة</TableCell><TableCell>الوصف</TableCell>
              <TableCell>الحالة</TableCell><TableCell>التاريخ</TableCell><TableCell>إجراءات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {incidents.map(inc => (
                <TableRow key={inc.id}>
                  <TableCell><Chip label={inc.type} size="small" /></TableCell>
                  <TableCell><Chip label={inc.severity} size="small" color={severity[inc.severity] || 'default'} /></TableCell>
                  <TableCell>{inc.description}</TableCell>
                  <TableCell><Chip label={inc.status === 'active' ? 'نشط' : 'تم الحل'} color={inc.status === 'active' ? 'error' : 'success'} size="small" /></TableCell>
                  <TableCell>{new Date(inc.createdAt).toLocaleString('ar-SA')}</TableCell>
                  <TableCell>
                    {inc.status === 'active' && (
                      <Button size="small" variant="outlined" onClick={() => handleResolveIncident(inc.id)}>حل</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabPanel>

      {/* ═══ TAB 5: BLOCKED LOGS ═══ */}
      <TabPanel value={tab} index={5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">سجل الطلبات المحظورة ({blocked.length})</Typography>
          <Button startIcon={<RefreshIcon />} onClick={loadBlocked}>تحديث</Button>
        </Box>
        {blocked.length === 0 ? (
          <Alert severity="info">لا توجد طلبات محظورة</Alert>
        ) : (
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>IP</TableCell><TableCell>الطريقة</TableCell><TableCell>المسار</TableCell>
              <TableCell>السبب</TableCell><TableCell>الوقت</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {blocked.map((b, i) => (
                <TableRow key={i}>
                  <TableCell>{b.ip}</TableCell>
                  <TableCell><Chip label={b.method} size="small" /></TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.path}</TableCell>
                  <TableCell>{b.reason}</TableCell>
                  <TableCell>{new Date(b.timestamp).toLocaleString('ar-SA')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabPanel>
    </Box>
  );
}
