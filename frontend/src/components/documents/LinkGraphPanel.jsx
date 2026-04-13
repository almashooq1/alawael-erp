import { useState, useEffect, useCallback } from 'react';




import { linkingApi } from '../../services/documentProPhase4Service';
import logger from '../../utils/logger';

const LINK_COLORS = {
  reference: '#3b82f6',
  amendment: '#f59e0b',
  attachment: '#22c55e',
  supersedes: '#ef4444',
  related: '#8b5cf6',
  parent_child: '#06b6d4',
  dependency: '#ec4899',
  copy: '#64748b',
  translation: '#14b8a6',
};

/**
 * LinkGraphPanel — لوحة رسم علاقات المستندات
 * عرض بصري لشبكة الروابط بين المستندات
 */
export default function LinkGraphPanel({ documentId }) {
  const [graph, setGraph] = useState(null);
  const [links, setLinks] = useState([]);
  const [linkTypes, setLinkTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);

  const loadGraph = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    try {
      const [graphRes, linksRes, typesRes] = await Promise.all([
        linkingApi.getGraph(documentId, 2),
        linkingApi.getForDocument(documentId),
        linkingApi.getTypes(),
      ]);
      setGraph(graphRes.data?.graph ?? null);
      setLinks(linksRes.data?.links ?? []);
      setLinkTypes(typesRes.data?.types ?? []);
    } catch (err) {
      logger.error('Load graph error', err);
      setError('فشل تحميل شبكة العلاقات');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  if (!documentId) return <Alert severity="info">اختر مستنداً لعرض العلاقات</Alert>;

  return (
    <Box dir="rtl">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <GraphIcon color="primary" />
          <Typography variant="h6">شبكة علاقات المستند</Typography>
          {graph && (
            <Chip label={`${graph.nodes?.length ?? 0} عقدة • ${graph.edges?.length ?? 0} رابط`} size="small" color="primary" variant="outlined" />
          )}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => setZoom(Math.min(zoom + 0.2, 2))}><ZoomIn /></IconButton>
          <IconButton size="small" onClick={() => setZoom(Math.max(zoom - 0.2, 0.4))}><ZoomOut /></IconButton>
          <IconButton size="small" onClick={() => setZoom(1)}><CenterFocusStrong /></IconButton>
          <IconButton size="small" onClick={loadGraph}><RefreshIcon /></IconButton>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}

      {/* Graph Visualization */}
      {graph && graph.nodes && graph.nodes.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            minHeight: 300,
            bgcolor: '#fafafa',
            overflow: 'auto',
            transform: `scale(${zoom})`,
            transformOrigin: 'top right',
          }}
        >
          {/* SVG-based graph */}
          <svg width="100%" height={Math.max(300, graph.nodes.length * 80)} viewBox={`0 0 600 ${Math.max(300, graph.nodes.length * 80)}`}>
            {/* Edges */}
            {(graph.edges || []).map((edge, i) => {
              const srcIdx = graph.nodes.findIndex((n) => n.id === edge.source);
              const tgtIdx = graph.nodes.findIndex((n) => n.id === edge.target);
              if (srcIdx < 0 || tgtIdx < 0) return null;
              const x1 = 300 + Math.cos(srcIdx * 0.8) * 150;
              const y1 = 150 + Math.sin(srcIdx * 0.8) * 120;
              const x2 = 300 + Math.cos(tgtIdx * 0.8) * 150;
              const y2 = 150 + Math.sin(tgtIdx * 0.8) * 120;
              const color = LINK_COLORS[edge.type] || '#94a3b8';
              return (
                <g key={`edge-${i}`}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} strokeDasharray={edge.type === 'related' ? '5,5' : 'none'} />
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5} fill={color} fontSize={10} textAnchor="middle" fontFamily="Cairo">
                    {edge.typeInfo?.labelAr || edge.type}
                  </text>
                </g>
              );
            })}
            {/* Nodes */}
            {graph.nodes.map((node, i) => {
              const cx = 300 + Math.cos(i * 0.8) * 150;
              const cy = 150 + Math.sin(i * 0.8) * 120;
              const isRoot = node.isRoot;
              return (
                <g key={`node-${node.id}`}>
                  <circle cx={cx} cy={cy} r={isRoot ? 30 : 22} fill={isRoot ? '#3b82f6' : '#e2e8f0'} stroke={isRoot ? '#1e40af' : '#94a3b8'} strokeWidth={2} />
                  <text x={cx} y={cy + 4} fill={isRoot ? '#fff' : '#374151'} fontSize={isRoot ? 11 : 9} textAnchor="middle" fontFamily="Cairo">
                    {(node.title || 'مستند').substring(0, 8)}
                  </text>
                </g>
              );
            })}
          </svg>
        </Paper>
      )}

      {/* Link Type Legend */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>دليل أنواع الروابط:</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {linkTypes.map((type) => (
            <Chip
              key={type.key}
              label={`${type.icon || ''} ${type.labelAr}`}
              size="small"
              sx={{ bgcolor: (LINK_COLORS[type.key] || '#999') + '20', color: LINK_COLORS[type.key] || '#999' }}
            />
          ))}
        </Stack>
      </Paper>

      {/* Links List */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            الروابط المباشرة ({links.length})
          </Typography>
          {links.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={2}>
              لا توجد روابط — أضف روابط لربط المستندات ذات الصلة
            </Typography>
          ) : (
            <List dense>
              {links.map((link, i) => {
                const doc = link.relDirection === 'outbound' ? link.targetDocument : link.sourceDocument;
                return (
                  <React.Fragment key={link._id || i}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: (LINK_COLORS[link.linkType] || '#999') + '30', width: 36, height: 36 }}>
                          <LinkIcon sx={{ color: LINK_COLORS[link.linkType] || '#999', fontSize: 18 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={doc?.title || doc?.name || 'مستند'}
                        secondary={
                          <Stack direction="row" spacing={1} component="span" alignItems="center">
                            <Chip label={link.typeInfo?.labelAr || link.linkType} size="small"
                              sx={{ bgcolor: (LINK_COLORS[link.linkType] || '#999') + '20', height: 20 }} />
                            <span>{link.relDirection === 'outbound' ? '← يشير إلى' : '→ يُشار من'}</span>
                          </Stack>
                        }
                      />
                    </ListItem>
                    {i < links.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
