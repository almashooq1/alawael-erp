/**
 * StudentReportCharts — Trends, Subjects & Skills charts
 */

import React from 'react';
import { Card, CardContent, Typography, Grid, Stack, Chip } from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { brandColors } from 'theme/palette';

const StudentReportCharts = ({
  safeTrends, hasGpaTrend, hasAttendanceTrend, safeSubjects, safeSkills,
}) => (
  <>
    {/* Trends */}
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} md={7}>
        <Card sx={{ borderRadius: 3, height: '100%' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              📈 اتجاه الأداء الأكاديمي
            </Typography>
            {hasGpaTrend ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={safeTrends.gpaTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis domain={[3.5, 5]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke={brandColors.accentSky} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="textSecondary">
                لا توجد بيانات اتجاهات أكاديمية متاحة.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <Card sx={{ borderRadius: 3, height: '100%' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              ✅ اتجاه الحضور والانضباط
            </Typography>
            {hasAttendanceTrend ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={safeTrends.attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis domain={[80, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#43cea2" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="textSecondary">
                لا توجد بيانات اتجاهات للحضور والانضباط.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>

    {/* Subjects & Skills */}
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid item xs={12} md={7}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              📚 أداء المواد الأكاديمية
            </Typography>
            {safeSubjects.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={safeSubjects}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[60, 100]} />
                    <Tooltip />
                    <Bar dataKey="average" fill={brandColors.primaryStart} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
                  {safeSubjects.map(subject => (
                    <Chip key={subject.subject}
                      label={`${subject.subject} • ${subject.trendLabel}`}
                      color={subject.trend === 'up' ? 'success' : subject.trend === 'down' ? 'warning' : 'default'}
                      variant="outlined" />
                  ))}
                </Stack>
              </>
            ) : (
              <Typography variant="body2" color="textSecondary">
                لا توجد بيانات مواد متاحة للفترة المحددة.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <Card sx={{ borderRadius: 3, height: '100%' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              🧠 تحليل المهارات
            </Typography>
            {safeSkills.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={safeSkills}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="المستوى" dataKey="value"
                      stroke={brandColors.accentCoral} fill={brandColors.accentCoral}
                      fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
                <Typography variant="caption" color="textSecondary">
                  يعرض الرسم مهارات التعلم والاتساق والتركيز بشكل بصري.
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="textSecondary">
                لا توجد بيانات مهارات متاحة حتى الآن.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </>
);

export default StudentReportCharts;
