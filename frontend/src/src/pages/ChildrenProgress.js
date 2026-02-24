import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  LinearProgress,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { TrendingUp as TrendingUpIcon, EmojiEvents as EmojiEventsIcon } from '@mui/icons-material';
import { parentService } from '../services/parentService';

const ChildrenProgress = () => {
  const [progressData, setProgressData] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const data = await parentService.getChildrenProgress('parent001');
      setProgressData(data);
      if (data?.children?.length > 0) {
        setSelectedChild(data.children[0]);
      }
    };
    fetchData();
  }, []);

  if (!progressData) return <Typography>جاري التحميل...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TrendingUpIcon sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              تتبع التقدم والمهارات
            </Typography>
            <Typography variant="body2">مراقبة تطور مهارات طفلك بالتفصيل</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {progressData.children?.map(child => (
            <Chip
              key={child.id}
              label={child.name}
              onClick={() => setSelectedChild(child)}
              variant={selectedChild?.id === child.id ? 'filled' : 'outlined'}
              sx={{
                backgroundColor: selectedChild?.id === child.id ? 'rgba(255,255,255,0.3)' : 'transparent',
                color: 'white',
              }}
            />
          ))}
        </Box>
      </Box>

      {selectedChild && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#43e97b', fontWeight: 'bold' }}>
                    {selectedChild.skillsImproved}
                  </Typography>
                  <Typography variant="caption">مهارات محسنة</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#38f9d7', fontWeight: 'bold' }}>
                    {selectedChild.averageProgress}%
                  </Typography>
                  <Typography variant="caption">متوسط التقدم</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ color: '#2196F3', fontWeight: 'bold' }}>
                    {selectedChild.milestonesReached}
                  </Typography>
                  <Typography variant="caption">علامات فارقة</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ mb: 3 }}>
            <Tab label="المهارات الرئيسية" />
            <Tab label="التطور الشهري" />
            <Tab label="الإنجازات" />
            <Tab label="النقاط المحسنة" />
          </Tabs>

          {/* Tab 0: Core Skills */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              {selectedChild.coreSkills?.map(skill => (
                <Grid item xs={12} md={6} key={skill.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {skill.name}
                          </Typography>
                          <Chip
                            label={`${skill.progress}%`}
                            color={skill.progress >= 80 ? 'success' : skill.progress >= 50 ? 'warning' : 'error'}
                            size="small"
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={skill.progress}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: '#f0f0f0',
                            '& .MuiLinearProgress-bar': {
                              background:
                                skill.progress >= 80
                                  ? 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)'
                                  : skill.progress >= 50
                                    ? 'linear-gradient(90deg, #fa709a 0%, #fee140 100%)'
                                    : 'linear-gradient(90deg, #f5576c 0%, #f093fb 100%)',
                            },
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" sx={{ color: '#999' }}>
                          الهدف: {skill.target}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#999' }}>
                          {skill.therapist}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', color: '#666', mt: 1 }}>
                        آخر تحديث: {skill.lastUpdate}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Tab 1: Monthly Progress */}
          {tabValue === 1 && (
            <Card>
              <CardHeader title="التطور الشهري" />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>الشهر</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>التقدم</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>عدد الجلسات</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الملاحظات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedChild.monthlyProgress?.map(month => (
                      <TableRow key={month.id} hover>
                        <TableCell>{month.month}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress variant="determinate" value={month.progress} sx={{ width: 100 }} />
                            <Typography variant="body2">{month.progress}%</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{month.sessions}</TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>{month.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* Tab 2: Achievements */}
          {tabValue === 2 && (
            <Grid container spacing={3}>
              {selectedChild.achievements?.map(achievement => (
                <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                  <Card
                    sx={{
                      textAlign: 'center',
                      height: '100%',
                      background: `linear-gradient(135deg, ${achievement.color1} 0%, ${achievement.color2} 100%)`,
                      color: 'white',
                    }}
                  >
                    <CardContent>
                      <EmojiEventsIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {achievement.title}
                      </Typography>
                      <Typography variant="caption">{achievement.date}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Tab 3: Improved Areas */}
          {tabValue === 3 && (
            <Grid container spacing={3}>
              {selectedChild.improvedAreas?.map(area => (
                <Grid item xs={12} key={area.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Avatar
                          sx={{
                            width: 50,
                            height: 50,
                            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                          }}
                        >
                          ✓
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {area.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                            {area.description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip label={`تحسن: +${area.improvement}%`} size="small" color="success" />
                            <Chip label={area.date} size="small" variant="outlined" />
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Container>
  );
};

export default ChildrenProgress;
