/**
 * @deprecated This file is part of an older split implementation.
 * The active version is the monolithic ../DocumentsMgmt.js which takes
 * priority in webpack module resolution over this directory index.
 * Do NOT use or maintain this file — all changes go to ../DocumentsMgmt.js.
 */

/**
 * Documents — Main page orchestrator (formerly DocumentsPage.js 676L → 6 files)
 * صفحة إدارة المستندات — المنسق الرئيسي
 */

import { Box, Container, Typography, Button, Paper, Tab, Tabs } from '@mui/material';
import { CloudUpload as UploadIcon, Description as DocumentIcon } from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { gradients } from '../../theme/palette';
import useDocumentsPage from './useDocumentsPage';
import DashboardTab from './DashboardTab';
import DocumentsListTab from './DocumentsListTab';
import AnalyticsTab, { TemplatesTab } from './AnalyticsTab';
import { UploadDialog, DetailsDialog } from './DocumentDialogs';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend
);

function DocumentsPage() {
  const {
    activeTab,
    setActiveTab,
    documents,
    categories,
    stats,
    loading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    uploadDialogOpen,
    setUploadDialogOpen,
    detailsDialogOpen,
    setDetailsDialogOpen,
    selectedDocument,
    setSelectedDocument,
    analyticsData,
    fetchDocuments,
    handleUploadDocument,
  } = useDocumentsPage();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Gradient Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DocumentIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إدارة المستندات
            </Typography>
            <Typography variant="body2">تنظيم وأرشفة المستندات والملفات</Typography>
          </Box>
        </Box>
      </Box>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          📄 إدارة المستندات
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadDialogOpen(true)}
          size="large"
        >
          رفع مستند
        </Button>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="لوحة التحكم" />
          <Tab label="المستندات" />
          <Tab label="القوالب" />
          <Tab label="الأرشيف" />
          <Tab label="التحليلات" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <DashboardTab
          stats={stats}
          categories={categories}
          setSelectedCategory={setSelectedCategory}
          setActiveTab={setActiveTab}
        />
      )}
      {activeTab === 1 && (
        <DocumentsListTab
          documents={documents}
          categories={categories}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          fetchDocuments={fetchDocuments}
          setSelectedDocument={setSelectedDocument}
          setDetailsDialogOpen={setDetailsDialogOpen}
        />
      )}
      {activeTab === 2 && <TemplatesTab />}
      {activeTab === 4 && <AnalyticsTab analyticsData={analyticsData} />}

      {/* Dialogs */}
      <UploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        categories={categories}
        onSubmit={handleUploadDocument}
      />
      <DetailsDialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        document={selectedDocument}
      />
    </Container>
  );
}

export default DocumentsPage;
