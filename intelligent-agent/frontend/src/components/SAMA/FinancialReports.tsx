import React, { useState, useEffect } from 'react';
import { Download, Printer, Share2, FileText } from 'lucide-react';
import { SAMAService } from '../../services/SAMAService';

interface Report {
  id: string;
  title: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'compliance';
  period: string;
  date: string;
  status: 'available' | 'generating' | 'pending';
  size: string;
  summary: string;
}

const FinancialReports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const mockReports: Report[] = [
          {
            id: '1',
            title: 'التقرير الشهري - فبراير 2026',
            type: 'monthly',
            period: 'فبراير 2026',
            date: '2026-02-17',
            status: 'available',
            size: '2.3 MB',
            summary: 'إجمالي المعاملات: 45 | الإنفاق: 18,500 SAR | الادخار: 6,200 SAR',
          },
          {
            id: '2',
            title: 'التقرير الشهري - يناير 2026',
            type: 'monthly',
            period: 'يناير 2026',
            date: '2026-01-31',
            status: 'available',
            size: '2.1 MB',
            summary: 'إجمالي المعاملات: 42 | الإنفاق: 17,800 SAR | الادخار: 5,900 SAR',
          },
          {
            id: '3',
            title: 'التقرير ربع السنوي - Q4 2025',
            type: 'quarterly',
            period: 'Q4 2025',
            date: '2025-12-31',
            status: 'available',
            size: '5.8 MB',
            summary: 'إجمالي المعاملات: 128 | الإنفاق: 52,300 SAR | الادخار: 18,100 SAR',
          },
          {
            id: '4',
            title: 'التقرير السنوي - 2025',
            type: 'annual',
            period: '2025',
            date: '2025-12-31',
            status: 'available',
            size: '12.4 MB',
            summary: 'إجمالي المعاملات: 512 | الإنفاق: 209,200 SAR | الادخار: 72,400 SAR',
          },
          {
            id: '5',
            title: 'تقرير الامتثال - فبراير 2026',
            type: 'compliance',
            period: 'فبراير 2026',
            date: '2026-02-17',
            status: 'available',
            size: '3.5 MB',
            summary: 'حالة الامتثال: متوافق | لا توجد انتهاكات | الفحص الأخير: 2026-02-17',
          },
        ];

        setReports(mockReports);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching reports:', error);
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleDownload = (reportId: string) => {
    // Simulate download
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      alert(`جاري تحميل: ${report.title}`);
      // In real app, would trigger actual download
    }
  };

  const handlePrint = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      alert(`جاري طباعة: ${report.title}`);
    }
  };

  const handleShare = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      alert(`جاري مشاركة: ${report.title}`);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'monthly':
        return 'bg-blue-500/20 text-blue-300';
      case 'quarterly':
        return 'bg-purple-500/20 text-purple-300';
      case 'annual':
        return 'bg-green-500/20 text-green-300';
      case 'compliance':
        return 'bg-orange-500/20 text-orange-300';
      default:
        return '';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'monthly':
        return 'شهري';
      case 'quarterly':
        return 'ربع سنوي';
      case 'annual':
        return 'سنوي';
      case 'compliance':
        return 'امتثال';
      default:
        return '';
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري تحميل التقارير...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Generate New Report */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">إنشاء تقرير جديد</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { type: 'monthly', label: 'تقرير شهري', icon: '📊' },
            { type: 'quarterly', label: 'تقرير ربع سنوي', icon: '📈' },
            { type: 'annual', label: 'تقرير سنوي', icon: '📋' },
            { type: 'compliance', label: 'تقرير امتثال', icon: '✅' },
          ].map((option) => (
            <button
              key={option.type}
              className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-center transition"
            >
              <p className="text-3xl mb-2">{option.icon}</p>
              <p className="font-semibold text-sm">{option.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">التقارير السابقة</h3>
        <div className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-slate-400 text-center py-8">لا توجد تقارير متاحة</p>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg cursor-pointer transition"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-grow">
                    <FileText className="text-blue-400 mt-1 flex-shrink-0" size={24} />
                    <div className="flex-grow">
                      <p className="font-semibold text-lg">{report.title}</p>
                      <p className="text-sm text-slate-400">{report.summary}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(report.type)}`}>
                          {getTypeLabel(report.type)}
                        </span>
                        <span className="text-xs text-slate-400">{report.date}</span>
                        <span className="text-xs text-slate-400">{report.size}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(report.id);
                      }}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded transition"
                      title="تحميل"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrint(report.id);
                      }}
                      className="p-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded transition"
                      title="طباعة"
                    >
                      <Printer size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(report.id);
                      }}
                      className="p-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded transition"
                      title="مشاركة"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Report Preview */}
      {selectedReport && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">{selectedReport.title}</h3>
              <p className="text-sm text-slate-400">معاينة التقرير</p>
            </div>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Sample Report Content */}
          <div className="space-y-4 bg-slate-700/30 p-6 rounded-lg">
            <div>
              <h4 className="font-semibold mb-2">الملخص المالي</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">إجمالي الدخل</p>
                  <p className="text-2xl font-bold text-green-400">78,600 SAR</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">إجمالي الإنفاق</p>
                  <p className="text-2xl font-bold text-red-400">18,500 SAR</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">صافي الادخار</p>
                  <p className="text-2xl font-bold text-blue-400">6,200 SAR</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">معدل الادخار</p>
                  <p className="text-2xl font-bold text-purple-400">35%</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">أعلى الفئات الإنفاق</h4>
              <div className="space-y-2">
                {[
                  { category: 'الغذاء والمطاعم', amount: 5200 },
                  { category: 'النقل والمواصلات', amount: 3100 },
                  { category: 'الترفيه والتسوق', amount: 2800 },
                  { category: '  الخدمات', amount: 2100 },
                  { category: 'الصحة والرياضة', amount: 1500 },
                ].map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{item.category}</span>
                    <div className="flex items-center gap-2 flex-grow mx-3">
                      <div className="h-2 bg-slate-600 rounded-full flex-grow">
                        <div
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${(item.amount / 5200) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{item.amount} SAR</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button className="flex-1 bg-blue-500 hover:bg-blue-600 py-2 px-4 rounded font-semibold flex items-center justify-center gap-2 transition">
                <Download size={18} />
                تحميل PDF
              </button>
              <button className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 px-4 rounded font-semibold flex items-center justify-center gap-2 transition">
                <Printer size={18} />
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialReports;
