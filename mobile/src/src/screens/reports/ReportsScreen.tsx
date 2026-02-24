/**
 * Reports Screen - View and generate reports
 */

import React, { useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchReports, generateReport } from '../../store/slices/reportsSlice';

export default function ReportsScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { items: reports, isGenerating, isLoading } = useAppSelector((state) => state.reports);
  const { templates } = useAppSelector((state) => state.reports);

  useEffect(() => {
    dispatch(fetchReports({ limit: 20 }));
  }, [dispatch]);

  const handleGenerateReport = (template: string) => {
    dispatch(generateReport({
      type: 'standard',
      template: template.toLowerCase(),
      format: 'pdf',
      filters: {}
    }));
  };

  return (
    <ScrollView style={styles.container}>
      {/* Templates Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generate Report</Text>
        <View style={styles.templatesGrid}>
          {templates.map((template) => (
            <TouchableOpacity
              key={template}
              style={styles.templateCard}
              onPress={() => handleGenerateReport(template)}
              disabled={isGenerating}
            >
              <MaterialCommunityIcons name="file-document" size={32} color="#1673e6" />
              <Text style={styles.templateName}>{template}</Text>
              {isGenerating && <ActivityIndicator size="small" color="#1673e6" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Reports Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Reports</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color="#1673e6" />
        ) : (
          <View>
            {reports.slice(0, 10).map((report) => (
              <ReportItem key={report.id} report={report} />
            ))}
            {reports.length === 0 && <Text style={styles.emptyText}>No reports yet</Text>}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ReportItem({ report }: { report: any }) {
  return (
    <TouchableOpacity style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <View>
          <Text style={styles.reportName}>{report.name}</Text>
          <Text style={styles.reportType}>{report.type} • {report.format.toUpperCase()}</Text>
        </View>
        <Text style={styles.reportStatus}>{report.status}</Text>
      </View>
      <Text style={styles.reportDate}>{new Date(report.createdAt).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  templateCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  templateName: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    color: '#333',
    textAlign: 'center',
  },
  reportItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  reportType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  reportStatus: {
    fontSize: 12,
    color: '#1673e6',
    fontWeight: '600',
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
  },
});
