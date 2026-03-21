/**
 * CompensationStructureManagement — StructureCard (expandable)
 */




import { statusColors, neutralColors } from '../../theme/palette';
import { SCOPE_LABELS } from './constants';

const StructureCard = ({
  structure, expanded, onToggle,
  onEdit, onDuplicate, onDelete,
}) => {
  const totalAllowances = structure.fixedAllowances?.reduce((s, a) => s + a.amount, 0) || 0;

  return (
    <Card sx={{
      borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      borderRight: `4px solid ${structure.isActive ? statusColors.success : neutralColors.borderInactive}`,
      transition: 'all 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
    }}>
      <CardContent>
        {/* Card Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{structure.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {structure.description}
            </Typography>
          </Box>
          <Chip label={structure.isActive ? 'نشط' : 'غير نشط'}
            color={structure.isActive ? 'success' : 'default'} size="small"
            icon={structure.isActive ? <ICONS.ActiveIcon /> : <ICONS.InactiveIcon />} />
        </Box>

        {/* Quick Info */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={4}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">المزايا</Typography>
              <Typography variant="body2" fontWeight={700} color="primary">
                {totalAllowances.toLocaleString('ar-SA')} ر.س
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">GOSI</Typography>
              <Typography variant="body2" fontWeight={700} color="error">
                {structure.mandatoryDeductions?.GOSI?.percentage || 0}%
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={4}>
            <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">الإجازات</Typography>
              <Typography variant="body2" fontWeight={700} color="info.main">
                {structure.paidLeave?.annualDays || 0} يوم
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Scope & Date */}
        <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
          <Chip size="small" label={`النطاق: ${SCOPE_LABELS[structure.applicableTo?.scope] || 'الكل'}`} variant="outlined" />
          <Chip size="small" label={`تاريخ البدء: ${structure.effectiveDate}`} variant="outlined" />
        </Box>

        {/* Expandable Details */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 2 }} />

          {/* Allowances */}
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            <ICONS.AllowanceIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> المزايا الثابتة
          </Typography>
          <Box sx={{ mb: 2 }}>
            {structure.fixedAllowances?.map((al, idx) => (
              <Box key={idx} display="flex" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                <Typography variant="body2">{al.name}</Typography>
                <Chip label={`${al.amount.toLocaleString('ar-SA')} ر.س`} size="small" color="primary" variant="outlined" />
              </Box>
            ))}
          </Box>

          {/* Deductions */}
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            <DeductionIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> الخصومات الإلزامية
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" sx={{ py: 0.5 }}>
              <Typography variant="body2">الضمان الاجتماعي</Typography>
              <Typography variant="body2" fontWeight={600}>{structure.mandatoryDeductions?.socialSecurity?.percentage}%</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" sx={{ py: 0.5 }}>
              <Typography variant="body2">التأمين الصحي</Typography>
              <Typography variant="body2" fontWeight={600}>{structure.mandatoryDeductions?.healthInsurance?.percentage}%</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between" sx={{ py: 0.5 }}>
              <Typography variant="body2">GOSI</Typography>
              <Typography variant="body2" fontWeight={600}>{structure.mandatoryDeductions?.GOSI?.percentage}%</Typography>
            </Box>
          </Box>

          {/* Incentives */}
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            <ICONS.MoneyIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> هيكل الحوافز
          </Typography>
          <Box sx={{ mb: 1 }}>
            {Object.entries(structure.incentiveStructure || {}).map(([key, val]) => (
              <Box key={key} display="flex" justifyContent="space-between" sx={{ py: 0.3 }}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {key === 'performance' ? 'الأداء' : key === 'attendance' ? 'الحضور' : key === 'safety' ? 'السلامة'
                    : key === 'loyalty' ? 'الولاء' : key === 'project' ? 'المشروع' : 'موسمي'}
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {val.percentage ? `${val.percentage}%` : `${val.amount?.toLocaleString('ar-SA')} ر.س`}
                </Typography>
              </Box>
            ))}
          </Box>
        </Collapse>

        {/* Actions */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Button size="small" onClick={onToggle}
            endIcon={expanded ? <CollapseIcon /> : <ExpandIcon />}>
            {expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </Button>
          <Box display="flex" gap={0.5}>
            <Tooltip title="نسخ"><IconButton size="small" onClick={() => onDuplicate(structure)}><CopyIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="تحرير"><IconButton size="small" color="primary" onClick={() => onEdit(structure)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => onDelete(structure._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StructureCard;
