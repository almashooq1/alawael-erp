/// <reference types="react" />
/// <reference types="react-dom" />
import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import SaudiClient from '../services/SaudiClient';

interface OverviewData {
  employees: {
    total: number;
    saudi: number;
    expat: number;
    saudizationRate: string;
  };
  compliance: {
    compliant: number;
    nonCompliant: number;
    complianceRate: string;
  };
  expirations: {
    iqamas: number;
    insurances: number;
  };
  gosi: {
    registered: number;
    notRegistered: number;
  };
}

interface ComplianceReport {
  date: string;
  totalEmployees: number;
  compliantEmployees: number;
  nonCompliantEmployees: number;
  complianceRate: number;
  criticalAlerts: Array<{ employeeName: string; message: string; actionRequired: string }>;
  warnings: Array<{ employeeName: string; message: string; actionRequired: string }>;
  upcomingExpirations: {
    iqamas: number;
    insurances: number;
    contracts: number;
  };
  nitaqatStatus: {
    color: string;
    saudizationRate: number;
    risk: string;
  };
}

interface ExpirationsData {
  iqamas: Array<{
    employeeCode: string;
    fullName: string;
    expiryDate: string;
    daysRemaining: number;
  }>;
  insurances: Array<{
    employeeCode: string;
    fullName: string;
    expiryDate: string;
    daysRemaining: number;
  }>;
  contracts: Array<{
    employeeCode: string;
    fullName: string;
    endDate: string;
    daysRemaining: number;
  }>;
}

interface NitaqatData {
  nitaqatColor: string;
  saudizationRate: number;
  totalEmployees: number;
  recommendation: string;
}

const SaudiComplianceDashboard = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null as OverviewData | null);
  const [expirations, setExpirations] = useState(null as ExpirationsData | null);
  const [report, setReport] = useState(null as ComplianceReport | null);
  const [nitaqat, setNitaqat] = useState(null as NitaqatData | null);
  const [lastUpdated, setLastUpdated] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, expirationsRes, reportRes, nitaqatRes] = await Promise.all([
        SaudiClient.getOverview(),
        SaudiClient.getExpirations(30),
        SaudiClient.getComplianceReport(),
        SaudiClient.getNitaqat(),
      ]);

      setOverview(overviewRes.data);
      setExpirations(expirationsRes.data);
      setReport(reportRes.data);
      setNitaqat(nitaqatRes.data);
      setLastUpdated(new Date().toLocaleString('ar-SA'));
    } catch (err: any) {
      setError(err.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const nitaqatBadge = useMemo(() => {
    const color = nitaqat?.nitaqatColor || 'unknown';
    const map: Record<string, string> = {
      platinum: theme.colors.info.main,
      green: theme.colors.success.main,
      yellow: theme.colors.warning.main,
      red: theme.colors.error.main,
      unknown: theme.colors.text.disabled,
    };
    return map[color] || theme.colors.text.disabled;
  }, [nitaqat, theme.colors]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">لوحة الامتثال السعودية</h2>
          <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
            آخر تحديث: {lastUpdated || '--'}
          </p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 rounded-lg font-semibold"
          style={{
            backgroundColor: theme.colors.primary[600],
            color: theme.colors.text.inverse,
          }}
        >
          تحديث البيانات
        </button>
      </div>

      {error && (
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: theme.colors.error.light, color: theme.colors.error.contrast }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="p-4 rounded-lg" style={{ color: theme.colors.text.secondary }}>
          جارٍ تحميل البيانات...
        </div>
      )}

      {!loading && overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl" style={{ backgroundColor: theme.colors.surface.primary }}>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              إجمالي الموظفين
            </p>
            <p className="text-2xl font-bold">{overview.employees.total}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: theme.colors.surface.primary }}>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              نسبة السعودة
            </p>
            <p className="text-2xl font-bold">{overview.employees.saudizationRate}%</p>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: theme.colors.surface.primary }}>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              نسبة الامتثال
            </p>
            <p className="text-2xl font-bold">{overview.compliance.complianceRate}%</p>
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: theme.colors.surface.primary }}>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              انتهاءات قريبة
            </p>
            <p className="text-2xl font-bold">
              {overview.expirations.iqamas + overview.expirations.insurances}
            </p>
          </div>
        </div>
      )}

      {!loading && nitaqat && (
        <div className="p-5 rounded-xl" style={{ backgroundColor: theme.colors.surface.primary }}>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: nitaqatBadge }} />
            <h3 className="text-lg font-semibold">نطاقات</h3>
          </div>
          <p className="mt-2" style={{ color: theme.colors.text.secondary }}>
            نسبة السعودة: {nitaqat.saudizationRate}% | إجمالي الموظفين: {nitaqat.totalEmployees}
          </p>
          <p className="mt-2 font-semibold">{nitaqat.recommendation}</p>
        </div>
      )}

      {!loading && report && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl" style={{ backgroundColor: theme.colors.surface.primary }}>
            <h3 className="font-semibold mb-3">تنبيهات حرجة</h3>
            {report.criticalAlerts.length === 0 ? (
              <p style={{ color: theme.colors.text.secondary }}>لا توجد تنبيهات حرجة</p>
            ) : (
              <ul className="space-y-2">
                {report.criticalAlerts.slice(0, 5).map((alert, index) => (
                  <li key={`critical-${index}`} className="text-sm">
                    <span className="font-semibold">{alert.employeeName}:</span> {alert.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: theme.colors.surface.primary }}>
            <h3 className="font-semibold mb-3">تحذيرات</h3>
            {report.warnings.length === 0 ? (
              <p style={{ color: theme.colors.text.secondary }}>لا توجد تحذيرات</p>
            ) : (
              <ul className="space-y-2">
                {report.warnings.slice(0, 5).map((alert, index) => (
                  <li key={`warning-${index}`} className="text-sm">
                    <span className="font-semibold">{alert.employeeName}:</span> {alert.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {!loading && expirations && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl" style={{ backgroundColor: theme.colors.surface.primary }}>
            <h3 className="font-semibold mb-3">الإقامات القريبة</h3>
            {expirations.iqamas.length === 0 ? (
              <p style={{ color: theme.colors.text.secondary }}>لا توجد انتهاءات خلال 30 يوم</p>
            ) : (
              <ul className="space-y-2">
                {expirations.iqamas.slice(0, 5).map(item => (
                  <li key={item.employeeCode} className="text-sm">
                    {item.fullName} • متبقي {item.daysRemaining} يوم
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: theme.colors.surface.primary }}>
            <h3 className="font-semibold mb-3">التأمين الطبي</h3>
            {expirations.insurances.length === 0 ? (
              <p style={{ color: theme.colors.text.secondary }}>لا توجد انتهاءات خلال 30 يوم</p>
            ) : (
              <ul className="space-y-2">
                {expirations.insurances.slice(0, 5).map(item => (
                  <li key={item.employeeCode} className="text-sm">
                    {item.fullName} • متبقي {item.daysRemaining} يوم
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="p-4 rounded-xl" style={{ backgroundColor: theme.colors.surface.primary }}>
            <h3 className="font-semibold mb-3">العقود</h3>
            {expirations.contracts.length === 0 ? (
              <p style={{ color: theme.colors.text.secondary }}>لا توجد عقود منتهية قريباً</p>
            ) : (
              <ul className="space-y-2">
                {expirations.contracts.slice(0, 5).map(item => (
                  <li key={item.employeeCode} className="text-sm">
                    {item.fullName} • متبقي {item.daysRemaining} يوم
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SaudiComplianceDashboard;
