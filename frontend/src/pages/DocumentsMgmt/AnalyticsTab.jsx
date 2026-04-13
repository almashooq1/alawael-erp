/**
 * @deprecated This file is part of an older split implementation.
 * The active version is the monolithic ../DocumentsMgmt.js which takes
 * priority in webpack module resolution over this directory index.
 * Do NOT use or maintain this file — all changes go to ../DocumentsMgmt.js.
 */

/**
 * AnalyticsTab — Overview cards, Pie chart & top downloads table
 * تبويب التحليلات: بطاقات عامة، رسم بياني دائري وأكثر المستندات تحميلاً
 */

import {
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { chartColors } from '../../theme/palette';
import { tooltipStyle, ARABIC_LEGEND_PROPS } from '../../utils/chartHelpers';

export const TemplatesTab = () => (
  <Grid container spacing={3}>
    <Grid item xs={12}>
      <Typography variant="h6" gutterBottom>
        القوالب الجاهزة
      </Typography>
    </Grid>
    <Grid item xs={12}>
      <Alert severity="info">القوالب الجاهزة ستكون متاحة قريباً</Alert>
    </Grid>
  </Grid>
);

const AnalyticsTab = ({ analyticsData }) => {
  if (!analyticsData) return <LinearProgress />;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          التحليلات والإحصائيات
        </Typography>
      </Grid>

      {/* Overview Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="text.secondary">إجمالي المستندات</Typography>
            <Typography variant="h4">{analyticsData.overview?.totalDocuments ?? 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="text.secondary">إجمالي التحميلات</Typography>
            <Typography variant="h4">{analyticsData.overview?.totalDownloads ?? 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="text.secondary">إجمالي المشاهدات</Typography>
            <Typography variant="h4">{analyticsData.overview?.totalViews ?? 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="text.secondary">التخزين المستخدم</Typography>
            <Typography variant="h4">{analyticsData.overview?.storageUsage ?? '0 MB'}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Charts */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              المستندات حسب التصنيف
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={(analyticsData.documentsByCategory || []).map((c, i) => ({
                    name: c.category,
                    value: c.count,
                    fill: (chartColors.main || chartColors)[i % 6],
                  }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(analyticsData.documentsByCategory || []).map((_, i) => (
                    <Cell key={i} fill={(chartColors.main || chartColors)[i % 6]} />
                  ))}
                </Pie>
                <RechartsTooltip {...tooltipStyle()} />
                <Legend {...ARABIC_LEGEND_PROPS} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              الأكثر تحميلاً
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المستند</TableCell>
                    <TableCell align="right">التحميلات</TableCell>
                    <TableCell align="right">المشاهدات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(analyticsData.mostDownloaded || []).map((doc, index) => (
                    <TableRow key={index}>
                      <TableCell>{doc.title}</TableCell>
                      <TableCell align="right">{doc.downloads}</TableCell>
                      <TableCell align="right">{doc.views}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AnalyticsTab;
