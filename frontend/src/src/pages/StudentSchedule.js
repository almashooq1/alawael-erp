/**
 * Student Schedule Component
 * مكون الجدول الدراسي للطالب
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
  Chip,
  Card,
  CardContent,
  Grid,
  Stack,
  Divider,
  Avatar,
  LinearProgress,
} from '@mui/material';
import { Schedule as ScheduleIcon, Person as PersonIcon, Room as RoomIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import studentPortalService from '../services/studentPortalService';

const StudentSchedule = () => {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const studentId = 'STU001';
      const data = await studentPortalService.getStudentSchedule(studentId);
      setScheduleData(data);

      // تحديد اليوم الحالي
      const today = new Date().getDay();
      const dayIndex = today === 0 ? 0 : today === 6 ? -1 : today - 1;
      if (dayIndex >= 0 && dayIndex < data.schedule.length) {
        setSelectedDay(data.schedule[dayIndex]);
      } else {
        setSelectedDay(data.schedule[0]);
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !scheduleData) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  const { schedule, subjects } = scheduleData;

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ScheduleIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              📅 الجدول الدراسي
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              جدول الحصص الأسبوعي الخاص بك
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Subjects Summary */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          📚 المواد الدراسية
        </Typography>
        <Grid container spacing={2}>
          {subjects.map((subject, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card
                sx={{
                  borderRadius: 2,
                  border: `2px solid ${subject.color}`,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: 3,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                    <Avatar sx={{ bgcolor: subject.color, width: 48, height: 48 }}>{subject.name.charAt(0)}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {subject.name}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="textSecondary">
                          {subject.teacher}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <RoomIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="textSecondary">
                          {subject.room}
                        </Typography>
                      </Stack>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Days Selector */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
          {schedule.map(daySchedule => (
            <Chip
              key={daySchedule.day}
              label={daySchedule.day}
              onClick={() => setSelectedDay(daySchedule)}
              color={selectedDay?.day === daySchedule.day ? 'primary' : 'default'}
              sx={{
                fontSize: '14px',
                fontWeight: 600,
                px: 2,
                py: 2.5,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'scale(1.05)',
                },
              }}
            />
          ))}
        </Stack>
      </Paper>

      {/* Schedule Table */}
      {selectedDay && (
        <TableContainer
          component={Paper}
          sx={{
            borderRadius: 2,
            boxShadow: 2,
          }}
        >
          <Table>
            <TableHead
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>الوقت</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>المادة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>المعلم</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>القاعة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedDay.classes.map((classItem, index) => (
                <TableRow
                  key={index}
                  sx={{
                    backgroundColor: classItem.subject.name === 'استراحة' ? '#f5f5f5' : 'white',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: classItem.subject.name === 'استراحة' ? '#e0e0e0' : '#f8f9ff',
                      transform: 'scale(1.01)',
                    },
                  }}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {classItem.time}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {classItem.subject.name !== 'استراحة' && (
                        <Box
                          sx={{
                            width: 8,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: classItem.subject.color,
                          }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: classItem.subject.name === 'استراحة' ? 500 : 600,
                          color: classItem.subject.name === 'استراحة' ? 'text.secondary' : 'text.primary',
                        }}
                      >
                        {classItem.subject.name === 'استراحة' ? '☕ ' : '📖 '}
                        {classItem.subject.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {classItem.subject.teacher || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={classItem.subject.room || '-'}
                      size="small"
                      sx={{
                        bgcolor: classItem.subject.name === 'استراحة' ? 'transparent' : classItem.subject.color + '20',
                        border: `1px solid ${classItem.subject.color || '#ccc'}`,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Footer Info */}
      <Paper sx={{ p: 2, mt: 3, borderRadius: 2, bgcolor: '#f8f9ff' }}>
        <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
              {subjects.length}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              إجمالي المواد
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
              7
            </Typography>
            <Typography variant="caption" color="textSecondary">
              حصص يومية
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
              5
            </Typography>
            <Typography variant="caption" color="textSecondary">
              أيام دراسية
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default StudentSchedule;
