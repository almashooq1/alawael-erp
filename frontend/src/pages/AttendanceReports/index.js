



import { gradients, surfaceColors } from 'theme/palette';
import useAttendanceReports from './useAttendanceReports';
import { attendanceColumns, getStatusChipColor } from './constants';

const AttendanceReports = () => {
  const {
    reportData,
    selectedAttendanceCols,
    updateCols,
    colSelectorOpen,
    setColSelectorOpen,
    aiDialogOpen,
    setAiDialogOpen,
    aiPrediction,
    aiLoading,
    aiError,
    openDialog,
    setOpenDialog,
    selectedMonth,
    setSelectedMonth,
    reportType,
    setReportType,
    handleExport,
    handleExportAIPrediction,
    handleAIPredictAbsence,
  } = useAttendanceReports();

  if (!reportData) return <Typography>جاري التحميل...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.accent, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EventNoteIcon sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              تقارير الحضور والسلوك
            </Typography>
            <Typography variant="body2">متابعة حضور الجلسات والسلوك خلال الجلسات</Typography>
          </Box>
        </Box>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {reportData.summaryStats?.map(stat => (
          <Grid item xs={12} sm={6} md={3} key={stat.id}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: stat.color, fontWeight: 'bold' }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters & Export */}
      <Card sx={{ mb: 4, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الشهر</InputLabel>
              <Select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                label="الشهر"
              >
                <MenuItem value="January">يناير</MenuItem>
                <MenuItem value="February">فبراير</MenuItem>
                <MenuItem value="March">مارس</MenuItem>
                <MenuItem value="April">إبريل</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع التقرير</InputLabel>
              <Select
                value={reportType}
                onChange={e => setReportType(e.target.value)}
                label="نوع التقرير"
              >
                <MenuItem value="attendance">الحضور</MenuItem>
                <MenuItem value="behavior">السلوك</MenuItem>
                <MenuItem value="performance">الأداء</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {reportType === 'attendance' && (
            <Grid item xs={12} sm={6} md={2}>
              <Button variant="outlined" color="secondary" onClick={() => setColSelectorOpen(true)}>
                تخصيص الأعمدة
              </Button>
            </Grid>
          )}
          {(reportType === 'attendance' ||
            reportType === 'behavior' ||
            reportType === 'performance') && (
            <Grid
              item
              xs={12}
              sm={12}
              md={reportType === 'attendance' ? 4 : 6}
              sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}
            >
              <Button
                variant="outlined"
                color="primary"
                startIcon={<TableViewIcon />}
                onClick={() => handleExport(reportType, 'excel')}
                sx={{ minWidth: 120 }}
              >
                تصدير Excel
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<FileDownloadIcon />}
                onClick={() => handleExport(reportType, 'csv')}
                sx={{ minWidth: 120 }}
              >
                تصدير CSV
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<PictureAsPdfIcon />}
                onClick={() => handleExport(reportType, 'pdf')}
                sx={{ minWidth: 120 }}
              >
                تصدير PDF
              </Button>
            </Grid>
          )}
        </Grid>
      </Card>

      {/* Column Selector Dialog */}
      <Dialog
        open={colSelectorOpen}
        onClose={() => setColSelectorOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>تخصيص أعمدة جدول الحضور</DialogTitle>
        <DialogContent>
          <CustomColumnSelector
            columns={attendanceColumns}
            selected={selectedAttendanceCols}
            onChange={updateCols}
            onClose={() => setColSelectorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Attendance Table */}
      {reportType === 'attendance' && (
        <Card sx={{ mb: 4 }}>
          <CardHeader title={`تقرير الحضور - ${selectedMonth}`} />
          <TableContainer>
            <Table id="attendance-table">
              <TableHead>
                <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                  {attendanceColumns
                    .filter(c => selectedAttendanceCols.includes(c.id))
                    .map(col => (
                      <TableCell key={col.id} sx={{ fontWeight: 'bold' }}>
                        {col.label}
                      </TableCell>
                    ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.attendanceRecords?.map(record => (
                  <TableRow key={record.id} hover>
                    {attendanceColumns
                      .filter(c => selectedAttendanceCols.includes(c.id))
                      .map(col => (
                        <TableCell key={col.id} sx={col.id === 'status' ? { minWidth: 90 } : {}}>
                          {col.id === 'status' ? (
                            <Chip
                              label={record.status}
                              color={getStatusChipColor(record.status)}
                              size="small"
                            />
                          ) : (
                            record[col.id]
                          )}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Behavior Report */}
      {reportType === 'behavior' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TableContainer>
              <Table id="behavior-table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المعالج</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>السلوكيات الإيجابية</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>نقاط تحتاج تحسين</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الملخص</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.behaviorReports?.map(report => (
                    <TableRow key={report.id} hover>
                      <TableCell>{report.date}</TableCell>
                      <TableCell>{report.therapist}</TableCell>
                      <TableCell>
                        {report.positiveTraits?.map(trait => (
                          <Chip
                            key={trait}
                            label={trait}
                            color="success"
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        {report.areasToImprove?.map(area => (
                          <Chip
                            key={area}
                            label={area}
                            color="error"
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>{report.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* Performance Table */}
      {reportType === 'performance' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TableContainer>
              <Table id="performance-table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>المؤشر</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الدرجة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.performanceMetrics?.map(metric => (
                    <TableRow key={metric.id} hover>
                      <TableCell>{metric.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 'bold', color: metric.color }}
                          >
                            {metric.score}/10
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={metric.score * 10}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: surfaceColors.softGray,
                              width: 80,
                              '& .MuiLinearProgress-bar': { backgroundColor: metric.color },
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{metric.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* Action Buttons */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<CheckCircleIcon />}
          onClick={() => setOpenDialog(true)}
        >
          مقابلة مع المعالج
        </Button>
        <Button variant="outlined" startIcon={<CancelIcon />}>
          تحميل التقرير PDF
        </Button>
        <Button
          variant="contained"
          color="secondary"
          sx={{ fontWeight: 'bold' }}
          onClick={handleAIPredictAbsence}
        >
          توقع الغياب بالذكاء الاصطناعي
        </Button>
      </Box>

      {/* AI Dialog */}
      <AIPredictionDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        aiLoading={aiLoading}
        aiError={aiError}
        aiPrediction={aiPrediction}
        onExport={handleExportAIPrediction}
      />

      {/* Hidden PDF export element */}
      <Box id="ai-prediction-export" sx={{ display: 'none' }}>
        {aiPrediction && (
          <div>
            <h2>تقرير توقع الغياب بالذكاء الاصطناعي</h2>
            <p>
              <b>نسبة احتمال الغياب:</b>{' '}
              {aiPrediction.absenceProbability
                ? `${(aiPrediction.absenceProbability * 100).toFixed(1)}%`
                : 'غير متوفر'}
            </p>
            {aiPrediction.reason && (
              <p>
                <b>ملاحظة:</b> {aiPrediction.reason}
              </p>
            )}
            <p>
              <b>تاريخ التوقع:</b> {new Date().toLocaleString()}
            </p>
          </div>
        )}
      </Box>

      {/* Meeting Dialog */}
      <MeetingDialog open={openDialog} onClose={() => setOpenDialog(false)} />
    </Container>
  );
};

export default AttendanceReports;
