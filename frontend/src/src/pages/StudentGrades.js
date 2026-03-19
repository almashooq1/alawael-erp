/**
 * Student Grades Component
 * مكون درجات الطالب
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  EmojiEvents as TrophyIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import studentPortalService from '../services/studentPortalService';

const StudentGrades = () => {
  const [gradesData, setGradesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    try {
      setLoading(true);
      const studentId = 'STU001';
      const data = await studentPortalService.getStudentGrades(studentId);
      setGradesData(data);
    } catch (error) {
      console.error('Error loading grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccordionChange = panel => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const getGradeColor = percentage => {
    if (percentage >= 90) return '#4CAF50';
    if (percentage >= 80) return '#8BC34A';
    if (percentage >= 70) return '#FFC107';
    if (percentage >= 60) return '#FF9800';
    return '#F44336';
  };

  const getLetterGradeColor = grade => {
    if (grade === 'A' || grade === 'A+') return 'success';
    if (grade === 'B+' || grade === 'B') return 'info';
    if (grade === 'C+' || grade === 'C') return 'warning';
    return 'error';
  };

  if (loading || !gradesData) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  const { currentSemester, subjects, overallGPA, overallLetterGrade } = gradesData;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 3,
          mb: 3,
          borderRadius: 2,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                📊 الدرجات والتقييمات
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                {currentSemester}
              </Typography>
            </Box>
          </Box>
          <TrophyIcon sx={{ fontSize: 60, opacity: 0.3 }} />
        </Box>
      </Paper>

      {/* Overall Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <CardContent>
              <Box sx={{ textAlign: 'center' }}>
                <TrophyIcon sx={{ fontSize: 50, mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {overallGPA}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  المعدل العام
                </Typography>
                <Chip
                  label={overallLetterGrade}
                  sx={{
                    mt: 2,
                    bgcolor: 'white',
                    color: '#667eea',
                    fontWeight: 700,
                    fontSize: '16px',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <CardContent>
              <Box sx={{ textAlign: 'center' }}>
                <TrendingUpIcon sx={{ fontSize: 50, mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {subjects.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                  المواد الدراسية
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={100}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    '& .MuiLinearProgress-bar': { backgroundColor: 'white' },
                    height: 8,
                    borderRadius: 4,
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              borderRadius: 2,
              height: '100%',
            }}
          >
            <CardContent>
              <Box sx={{ textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 50, mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                  {subjects.reduce((acc, s) => acc + s.grades.length, 0)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                  إجمالي التقييمات
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  اختبارات، واجبات، مشاركات
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Subjects Performance */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          📈 الأداء حسب المادة
        </Typography>
        <Grid container spacing={2}>
          {subjects.map(subject => (
            <Grid item xs={12} sm={6} md={3} key={subject.id}>
              <Card
                sx={{
                  borderRadius: 2,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: getGradeColor(subject.average),
                        width: 40,
                        height: 40,
                        fontWeight: 700,
                      }}
                    >
                      {subject.letterGrade}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {subject.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {subject.teacher}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="textSecondary">
                        المعدل
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {subject.average}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={subject.average}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: getGradeColor(subject.average),
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {subject.grades.length} تقييم
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Detailed Grades */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          📋 التفاصيل الكاملة للدرجات
        </Typography>
        {subjects.map(subject => (
          <Accordion
            key={subject.id}
            expanded={expanded === `panel${subject.id}`}
            onChange={handleAccordionChange(`panel${subject.id}`)}
            sx={{
              mb: 2,
              borderRadius: 2,
              '&:before': { display: 'none' },
              boxShadow: 2,
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                backgroundColor: '#f8f9ff',
                borderRadius: 2,
                '&:hover': { backgroundColor: '#f0f2ff' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar
                  sx={{
                    bgcolor: getGradeColor(subject.average),
                    fontWeight: 700,
                  }}
                >
                  {subject.letterGrade}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {subject.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {subject.teacher}
                  </Typography>
                </Box>
                <Chip label={`${subject.average}%`} color={getLetterGradeColor(subject.letterGrade)} sx={{ fontWeight: 700 }} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 600 }}>نوع التقييم</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>التاريخ</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        الدرجة
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        النسبة
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subject.grades.map((grade, index) => (
                      <TableRow
                        key={index}
                        sx={{
                          '&:hover': { backgroundColor: '#f8f9ff' },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {grade.type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="textSecondary">
                              {grade.date}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {grade.score} / {grade.total}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${grade.percentage}%`}
                            size="small"
                            sx={{
                              bgcolor: getGradeColor(grade.percentage) + '20',
                              color: getGradeColor(grade.percentage),
                              fontWeight: 700,
                              border: `1px solid ${getGradeColor(grade.percentage)}`,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>
    </Box>
  );
};

export default StudentGrades;
