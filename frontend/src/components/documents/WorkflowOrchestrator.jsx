/**
 * WorkflowOrchestrator — مصمم وعارض تدفقات سير العمل
 * إنشاء/تعديل تعريفات العمليات مع عقد وحواف
 */
import { useState, useEffect } from 'react';




const NODE_TYPES = [
  { type: 'start',            label: 'بداية',           icon: <StartIcon />,   color: '#4caf50' },
  { type: 'end',              label: 'نهاية',           icon: <EndIcon />,     color: '#f44336' },
  { type: 'user_task',        label: 'مهمة مستخدم',     icon: <UserIcon />,    color: '#1976d2' },
  { type: 'service_task',     label: 'مهمة خدمة',      icon: <ServiceIcon />, color: '#9c27b0' },
  { type: 'script_task',      label: 'مهمة برمجية',    icon: <ScriptIcon />,  color: '#795548' },
  { type: 'decision',         label: 'قرار',           icon: <DecisionIcon />, color: '#ff9800' },
  { type: 'parallel_gateway', label: 'بوابة متوازية',  icon: <ParallelIcon />, color: '#00bcd4' },
  { type: 'merge_gateway',    label: 'بوابة دمج',     icon: <MergeIcon />,    color: '#607d8b' },
  { type: 'timer',            label: 'مؤقت',           icon: <TimerIcon />,    color: '#ff5722' },
  { type: 'signal',           label: 'إشارة',          icon: <SignalIcon />,   color: '#e91e63' },
  { type: 'subprocess',       label: 'عملية فرعية',   icon: <SubIcon />,      color: '#3f51b5' },
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const PRIORITY_LABELS = { low: 'منخفض', medium: 'متوسط', high: 'عالي', urgent: 'عاجل' };

function NodeEditor({ node, index, totalNodes, allNodes, edges, onChange, onDelete, onMove, onClone, onAddEdge, onRemoveEdge }) {
  const update = (key, val) => onChange(index, { ...node, [key]: val });
  const updateConfig = (key, val) => onChange(index, { ...node, config: { ...node.config, [key]: val } });
  const typeInfo = NODE_TYPES.find(t => t.type === node.type) || NODE_TYPES[2];

  const outgoingEdges = edges.filter(e => e.sourceNodeId === node.nodeId);

  return (
    <Paper dir="rtl" sx={{ p: 2, mb: 1.5, borderRadius: 2, borderRight: `4px solid ${typeInfo.color}` }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <DragIcon sx={{ color: 'text.secondary', cursor: 'grab' }} />
        <Avatar sx={{ width: 32, height: 32, bgcolor: typeInfo.color }}>{typeInfo.icon}</Avatar>
        <Chip label={typeInfo.label} size="small" sx={{ bgcolor: `${typeInfo.color}15`, color: typeInfo.color }} />
        <Typography fontWeight="bold" flex={1}>{node.nameAr || node.name || node.nodeId}</Typography>
        <Tooltip title="أعلى"><span><IconButton size="small" disabled={index === 0} onClick={() => onMove(index, -1)}><UpIcon /></IconButton></span></Tooltip>
        <Tooltip title="أسفل"><span><IconButton size="small" disabled={index === totalNodes - 1} onClick={() => onMove(index, 1)}><DownIcon /></IconButton></span></Tooltip>
        <Tooltip title="نسخ"><IconButton size="small" onClick={() => onClone(index)}><CloneIcon /></IconButton></Tooltip>
        <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(index)}><DeleteIcon /></IconButton></Tooltip>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>النوع</InputLabel>
            <Select value={node.type} label="النوع" onChange={e => update('type', e.target.value)}>
              {NODE_TYPES.map(nt => <MenuItem key={nt.type} value={nt.type}>{nt.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth size="small" label="المعرف" value={node.nodeId} onChange={e => update('nodeId', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth size="small" label="الاسم (عربي)" value={node.nameAr || ''} onChange={e => update('nameAr', e.target.value)} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField fullWidth size="small" label="الاسم (English)" value={node.name || ''} onChange={e => update('name', e.target.value)} />
        </Grid>
      </Grid>

      {/* Config for tasks */}
      {['user_task', 'service_task', 'script_task', 'task'].includes(node.type) && (
        <Grid container spacing={1.5} mt={0.5}>
          <Grid item xs={6} md={3}>
            <TextField fullWidth size="small" label="المسند إليه" value={node.config?.assignee || ''} onChange={e => updateConfig('assignee', e.target.value)} />
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع المسند</InputLabel>
              <Select value={node.config?.assigneeType || 'user'} label="نوع المسند" onChange={e => updateConfig('assigneeType', e.target.value)}>
                <MenuItem value="user">مستخدم</MenuItem><MenuItem value="role">دور</MenuItem>
                <MenuItem value="department">قسم</MenuItem><MenuItem value="auto">تلقائي</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField fullWidth size="small" type="number" label="المهلة (ساعات)" value={node.config?.dueHours || ''} onChange={e => updateConfig('dueHours', parseInt(e.target.value))} />
          </Grid>
          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الأولوية</InputLabel>
              <Select value={node.config?.priority || 'medium'} label="الأولوية" onChange={e => updateConfig('priority', e.target.value)}>
                {PRIORITIES.map(p => <MenuItem key={p} value={p}>{PRIORITY_LABELS[p]}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      )}

      {node.type === 'timer' && (
        <TextField fullWidth size="small" label="المدة (ISO 8601)" value={node.config?.timerDuration || ''} onChange={e => updateConfig('timerDuration', e.target.value)} sx={{ mt: 1 }} placeholder="PT1H30M" />
      )}

      {node.type === 'signal' && (
        <TextField fullWidth size="small" label="اسم الإشارة" value={node.config?.signalName || ''} onChange={e => updateConfig('signalName', e.target.value)} sx={{ mt: 1 }} />
      )}

      {/* Connections */}
      <Box mt={1.5}>
        <Stack direction="row" spacing={2} alignItems="center" mb={0.5}>
          <LinkIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">الاتصالات الصادرة ({outgoingEdges.length})</Typography>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select displayEmpty value="" onChange={e => { if (e.target.value) onAddEdge(node.nodeId, e.target.value); }} renderValue={(v) => v || 'إضافة اتصال...'}>
              {allNodes.filter(n => n.nodeId !== node.nodeId && !outgoingEdges.some(oe => oe.targetNodeId === n.nodeId)).map(n => (
                <MenuItem key={n.nodeId} value={n.nodeId}>{n.nameAr || n.name || n.nodeId}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
          {outgoingEdges.map((e, i) => {
            const target = allNodes.find(n => n.nodeId === e.targetNodeId);
            return <Chip key={i} label={`→ ${target?.nameAr || target?.name || e.targetNodeId}`} size="small" onDelete={() => onRemoveEdge(e.edgeId)} variant="outlined" />;
          })}
        </Stack>
      </Box>
    </Paper>
  );
}

/* Read-only visualization */
function WorkflowPreview({ definition }) {
  if (!definition?.nodes?.length) return <Alert severity="info">لا توجد عقد</Alert>;

  const nodesByType = {};
  definition.nodes.forEach(n => { nodesByType[n.type] = (nodesByType[n.type] || 0) + 1; });

  return (
    <Box dir="rtl">
      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
        {Object.entries(nodesByType).map(([type, count]) => {
          const info = NODE_TYPES.find(t => t.type === type) || {};
          return <Chip key={type} icon={info.icon} label={`${info.label || type}: ${count}`} variant="outlined" />;
        })}
        <Chip label={`${definition.edges?.length || 0} اتصال`} icon={<LinkIcon />} variant="outlined" />
      </Stack>

      {definition.nodes.map((node, i) => {
        const info = NODE_TYPES.find(t => t.type === node.type) || {};
        const outEdges = (definition.edges || []).filter(e => e.sourceNodeId === node.nodeId);
        return (
          <Card key={i} variant="outlined" sx={{ mb: 1, borderRadius: 2, borderRight: `3px solid ${info.color || '#999'}` }}>
            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar sx={{ width: 28, height: 28, bgcolor: info.color || '#999' }}>{info.icon || <TaskIcon />}</Avatar>
                <Typography fontWeight="bold">{node.nameAr || node.name || node.nodeId}</Typography>
                <Chip label={info.label || node.type} size="small" variant="outlined" />
                {outEdges.length > 0 && (
                  <Stack direction="row" spacing={0.5}>
                    {outEdges.map((e, j) => {
                      const target = definition.nodes.find(n => n.nodeId === e.targetNodeId);
                      return <Chip key={j} label={`→ ${target?.nameAr || target?.name || e.targetNodeId}`} size="small" color="primary" variant="outlined" />;
                    })}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}

export default function WorkflowOrchestrator({ open, onClose, definition, onSave }) {
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('عام');
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [sla, setSla] = useState({ maxDurationHours: '', warningHours: '' });
  const [editMode, setEditMode] = useState(false);
  const [validation, setValidation] = useState(null);

  useEffect(() => {
    if (definition) {
      setName(definition.name || '');
      setNameAr(definition.nameAr || '');
      setDescription(definition.description || '');
      setCategory(definition.category || 'عام');
      setNodes(definition.nodes || []);
      setEdges(definition.edges || []);
      setSla(definition.sla || {});
      setEditMode(definition.status === 'draft' || !definition._id);
    } else {
      setName(''); setNameAr(''); setDescription(''); setCategory('عام');
      setNodes([
        { nodeId: 'start_1', type: 'start', nameAr: 'بداية', config: {} },
        { nodeId: 'end_1', type: 'end', nameAr: 'نهاية', config: {} },
      ]);
      setEdges([{ edgeId: 'e_1', sourceNodeId: 'start_1', targetNodeId: 'end_1' }]);
      setSla({}); setEditMode(true);
    }
    setValidation(null);
  }, [definition, open]);

  const addNode = (type) => {
    const id = `${type}_${Date.now().toString(36)}`;
    setNodes(prev => [...prev, { nodeId: id, type, nameAr: NODE_TYPES.find(t => t.type === type)?.label || '', name: '', config: {} }]);
  };

  const updateNode = (idx, data) => setNodes(prev => prev.map((n, i) => i === idx ? data : n));
  const deleteNode = (idx) => {
    const nodeId = nodes[idx].nodeId;
    setNodes(prev => prev.filter((_, i) => i !== idx));
    setEdges(prev => prev.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId));
  };
  const moveNode = (idx, dir) => {
    const arr = [...nodes]; const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]]; setNodes(arr);
  };
  const cloneNode = (idx) => {
    const src = nodes[idx];
    const newId = `${src.type}_${Date.now().toString(36)}`;
    setNodes(prev => [...prev.slice(0, idx + 1), { ...src, nodeId: newId, nameAr: `${src.nameAr} (نسخة)` }, ...prev.slice(idx + 1)]);
  };
  const addEdge = (source, target) => {
    const id = `e_${Date.now().toString(36)}`;
    setEdges(prev => [...prev, { edgeId: id, sourceNodeId: source, targetNodeId: target }]);
  };
  const removeEdge = (edgeId) => setEdges(prev => prev.filter(e => e.edgeId !== edgeId));

  const validate = () => {
    const issues = [];
    const starts = nodes.filter(n => n.type === 'start');
    const ends = nodes.filter(n => n.type === 'end');
    if (starts.length !== 1) issues.push({ severity: 'error', message: `يجب أن يحتوي على نقطة بداية واحدة (وُجد ${starts.length})` });
    if (ends.length < 1) issues.push({ severity: 'error', message: 'يجب أن يحتوي على نقطة نهاية واحدة على الأقل' });

    const nodeIds = new Set(nodes.map(n => n.nodeId));
    for (const e of edges) {
      if (!nodeIds.has(e.sourceNodeId)) issues.push({ severity: 'error', message: `الحافة ${e.edgeId}: المصدر ${e.sourceNodeId} غير موجود` });
      if (!nodeIds.has(e.targetNodeId)) issues.push({ severity: 'error', message: `الحافة ${e.edgeId}: الهدف ${e.targetNodeId} غير موجود` });
    }

    for (const n of nodes) {
      if (n.type === 'start') continue;
      if (!edges.some(e => e.targetNodeId === n.nodeId)) issues.push({ severity: 'warning', message: `العقدة "${n.nameAr || n.nodeId}" لا يوجد اتصال وارد` });
    }

    setValidation({ valid: !issues.some(i => i.severity === 'error'), issues });
  };

  const handleSave = () => onSave({ name, nameAr, description, category, nodes, edges, sla });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <TreeIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">{definition?._id ? 'تعريف سير العمل' : 'إنشاء تعريف جديد'}</Typography>
            {definition?.status && <Chip label={definition.status === 'active' ? 'نشط' : 'مسودة'} color={definition.status === 'active' ? 'success' : 'default'} size="small" />}
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={validate}>تحقق</Button>
            {definition?._id && <Button size="small" onClick={() => setEditMode(!editMode)}>{editMode ? 'عرض' : 'تعديل'}</Button>}
          </Stack>
        </Stack>
      </DialogTitle>
      <DialogContent dividers dir="rtl" sx={{ minHeight: 500 }}>
        {/* Info */}
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="الاسم بالعربية" value={nameAr} onChange={e => setNameAr(e.target.value)} disabled={!editMode} /></Grid>
          <Grid item xs={12} md={3}><TextField fullWidth size="small" label="الاسم (English)" value={name} onChange={e => setName(e.target.value)} disabled={!editMode} /></Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small" disabled={!editMode}>
              <InputLabel>التصنيف</InputLabel>
              <Select value={category} label="التصنيف" onChange={e => setCategory(e.target.value)}>
                {['عام', 'مشتريات', 'عقود', 'مالية', 'موارد بشرية', 'تقنية'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth size="small" type="number" label="مدة SLA (ساعات)" value={sla.maxDurationHours || ''} onChange={e => setSla(p => ({ ...p, maxDurationHours: e.target.value }))} disabled={!editMode} />
          </Grid>
          <Grid item xs={6} md={2}>
            <TextField fullWidth size="small" label="الوصف" value={description} onChange={e => setDescription(e.target.value)} disabled={!editMode} />
          </Grid>
        </Grid>

        {/* Validation */}
        {validation && (
          <Box mb={2}>
            <Alert severity={validation.valid ? 'success' : 'error'} icon={validation.valid ? <ValidIcon /> : <ErrorIcon />}>
              {validation.valid ? 'التعريف صالح' : `${validation.issues.length} مشكلة`}
            </Alert>
            {validation.issues.map((issue, i) => (
              <Alert key={i} severity={issue.severity === 'error' ? 'error' : 'warning'} sx={{ mt: 0.5 }}>{issue.message}</Alert>
            ))}
          </Box>
        )}

        {editMode ? (
          <>
            {/* Toolbox */}
            <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" gutterBottom>إضافة عقدة</Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {NODE_TYPES.map(nt => (
                  <Chip key={nt.type} label={nt.label} icon={nt.icon} onClick={() => addNode(nt.type)} variant="outlined" clickable size="small" sx={{ borderColor: nt.color, color: nt.color }} />
                ))}
              </Stack>
            </Paper>

            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>العقد ({nodes.length}) | الاتصالات ({edges.length})</Typography>

            {nodes.map((n, i) => (
              <NodeEditor key={i} node={n} index={i} totalNodes={nodes.length} allNodes={nodes} edges={edges}
                onChange={updateNode} onDelete={deleteNode} onMove={moveNode} onClone={cloneNode} onAddEdge={addEdge} onRemoveEdge={removeEdge} />
            ))}
          </>
        ) : (
          <WorkflowPreview definition={{ nodes, edges }} />
        )}
      </DialogContent>
      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, px: 2 }}>{nodes.length} عقدة | {edges.length} اتصال</Typography>
        <Button onClick={onClose}>إغلاق</Button>
        {editMode && <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!nameAr && !name}>حفظ</Button>}
      </DialogActions>
    </Dialog>
  );
}
