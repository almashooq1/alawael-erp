/**
 * PerformanceHeader.jsx — Gradient header + toolbar
 * Extracted from PerformanceEvaluation.js
 */


import { gradients } from '../../theme/palette';

const PerformanceHeader = ({ handleExportCSV, loadData }) => (
  <>
    {/* Gradient Header */}
    <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AssessmentIcon sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            تقييم الأداء
          </Typography>
          <Typography variant="body2">إدارة ومتابعة تقييمات أداء الموظفين</Typography>
        </Box>
      </Box>
    </Box>

    {/* Toolbar */}
    <Paper
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #1565c0ee, #42a5f599)',
        color: 'white',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <AssessmentIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              الأداء والتخطيط
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              تقييم الأداء • تخطيط التعاقب • الملفات الطبية • الجدولة الذكية
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': { borderColor: 'white' },
            }}
          >
            تصدير
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': { borderColor: 'white' },
            }}
          >
            طباعة
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': { borderColor: 'white' },
            }}
          >
            تحديث
          </Button>
        </Box>
      </Box>
    </Paper>
  </>
);

export default PerformanceHeader;
