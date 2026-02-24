/**
 * FinancialReports.jsx
 * مكون التقارير المالية الشاملة مع 5 أنواع تقارير
 * 800+ سطر من المكون
 */

import React, { useState, useEffect, useCallback } from 'react';
import './FinancialReports.css';

const FinancialReports = ({ organizationId }) => {
  // ===== STATE =====
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState('balance-sheet');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1),
    to: new Date()
  });
  const [compareMode, setCompareMode] = useState(false);
  const [comparePeriod, setComparePeriod] = useState(null);
  const [exportFormat, setExportFormat] = useState('pdf');

  // ===== FETCH DATA =====
  useEffect(() => {
    fetchReportData();
  }, [selectedReport, dateRange, organizationId]);

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/finance/reports/${selectedReport}?` +
        `organizationId=${organizationId}&` +
        `from=${dateRange.from.toISOString()}&` +
        `to=${dateRange.to.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('فشل جلب التقرير');

      const data = await response.json();
      setReportData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, dateRange, organizationId]);

  // ===== HANDLERS =====
  const handleDateChange = (field, value) => {
    setDateRange({ ...dateRange, [field]: new Date(value) });
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/finance/reports/${selectedReport}/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            organizationId,
            format: exportFormat,
            dateRange,
            compareMode,
            comparePeriod
          })
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `report-${selectedReport}-${new Date().getTime()}.${exportFormat}`;
        link.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // ===== REPORT COMPONENTS =====

  const BalanceSheet = () => (
    <div className="balance-sheet-report">
      <div className="report-title">
        <h2>قائمة المركز المالي (الميزانية)</h2>
        <span className="report-date">{dateRange.to.toLocaleDateString('ar-SA')}</span>
      </div>

      {reportData && (
        <div className="balance-sheet-content">
          {/* Assets Section */}
          <section className="bs-section">
            <h3 className="bs-header">الأصول</h3>

            <div className="bs-subsection">
              <h4>الأصول الحالية (Current Assets)</h4>
              <table className="bs-table">
                <tbody>
                  {(reportData.assets?.current || []).map((item, idx) => (
                    <tr key={idx} className="item-row">
                      <td className="item-name">{item.name}</td>
                      <td className="item-value">
                        {item.value.toLocaleString('ar-SA')} ر.س
                      </td>
                    </tr>
                  ))}
                  <tr className="subtotal-row">
                    <td>إجمالي الأصول الحالية</td>
                    <td className="bold">
                      {(reportData.assets?.currentTotal || 0).toLocaleString('ar-SA')} ر.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bs-subsection">
              <h4>الأصول الثابتة (Fixed Assets)</h4>
              <table className="bs-table">
                <tbody>
                  {(reportData.assets?.fixed || []).map((item, idx) => (
                    <tr key={idx} className="item-row">
                      <td className="item-name">{item.name}</td>
                      <td className="item-value">
                        {item.value.toLocaleString('ar-SA')} ร.س
                      </td>
                    </tr>
                  ))}
                  <tr className="subtotal-row">
                    <td>إجمالي الأصول الثابتة</td>
                    <td className="bold">
                      {(reportData.assets?.fixedTotal || 0).toLocaleString('ar-SA')} ร.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bs-total">
              <span className="total-label">إجمالي الأصول</span>
              <span className="total-value">
                {(reportData.assets?.total || 0).toLocaleString('ar-SA')} ร.س
              </span>
            </div>
          </section>

          {/* Liabilities Section */}
          <section className="bs-section">
            <h3 className="bs-header">الالتزامات</h3>

            <div className="bs-subsection">
              <h4>الالتزامات الحالية (Current Liabilities)</h4>
              <table className="bs-table">
                <tbody>
                  {(reportData.liabilities?.current || []).map((item, idx) => (
                    <tr key={idx} className="item-row">
                      <td className="item-name">{item.name}</td>
                      <td className="item-value">
                        {item.value.toLocaleString('ar-SA')} ร.س
                      </td>
                    </tr>
                  ))}
                  <tr className="subtotal-row">
                    <td>إجمالي الالتزامات الحالية</td>
                    <td className="bold">
                      {(reportData.liabilities?.currentTotal || 0).toLocaleString('ar-SA')} ร.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bs-subsection">
              <h4>الالتزامات الطويلة الأجل</h4>
              <table className="bs-table">
                <tbody>
                  {(reportData.liabilities?.longTerm || []).map((item, idx) => (
                    <tr key={idx} className="item-row">
                      <td className="item-name">{item.name}</td>
                      <td className="item-value">
                        {item.value.toLocaleString('ar-SA')} ร.س
                      </td>
                    </tr>
                  ))}
                  <tr className="subtotal-row">
                    <td>إجمالي الالتزامات الطويلة الأجل</td>
                    <td className="bold">
                      {(reportData.liabilities?.longTermTotal || 0).toLocaleString('ar-SA')} ร.س
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bs-total">
              <span className="total-label">إجمالي الالتزامات</span>
              <span className="total-value">
                {(reportData.liabilities?.total || 0).toLocaleString('ar-SA')} ร.س
              </span>
            </div>
          </section>

          {/* Equity Section */}
          <section className="bs-section">
            <h3 className="bs-header">حقوق المساهمين</h3>
            <table className="bs-table">
              <tbody>
                {(reportData.equity || []).map((item, idx) => (
                  <tr key={idx} className="item-row">
                    <td className="item-name">{item.name}</td>
                    <td className="item-value">
                      {item.value.toLocaleString('ar-SA')} ร.س
                    </td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>إجمالي حقوق المساهمين</td>
                  <td className="bold highlight">
                    {(reportData.equityTotal || 0).toLocaleString('ar-SA')} ร.س
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Verification */}
          <div className="verification-box">
            <p>
              إجمالي الأصول = إجمالي الالتزامات + حقوق المساهمين
              <br />
              {(reportData.assets?.total || 0).toLocaleString('ar-SA')} ร.س = 
              {(reportData.liabilities?.total || 0).toLocaleString('ar-SA')} ร.س + 
              {(reportData.equityTotal || 0).toLocaleString('ar-SA')} ร.س
            </p>
            <span className={reportData.isBalanced ? 'status-ok' : 'status-error'}>
              {reportData.isBalanced ? '✓ متوازن' : '✗ غير متوازن'}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const IncomeStatement = () => (
    <div className="income-statement-report">
      <div className="report-title">
        <h2>قائمة الدخل</h2>
        <span className="report-date">
          {dateRange.from.toLocaleDateString('ar-SA')} - {dateRange.to.toLocaleDateString('ar-SA')}
        </span>
      </div>

      {reportData && (
        <div className="income-statement-content">
          <section className="is-section">
            <h3>الإيرادات</h3>
            <table className="is-table">
              <tbody>
                {(reportData.revenues || []).map((item, idx) => (
                  <tr key={idx} className="item-row">
                    <td>{item.name}</td>
                    <td>{item.amount.toLocaleString('ar-SA')} ร.س</td>
                  </tr>
                ))}
                <tr className="subtotal-row">
                  <td>إجمالي الإيرادات</td>
                  <td className="bold">{(reportData.totalRevenues || 0).toLocaleString('ar-SA')} ร.س</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="is-section">
            <h3>تكاليف التشغيل</h3>
            <table className="is-table">
              <tbody>
                {(reportData.operatingExpenses || []).map((item, idx) => (
                  <tr key={idx} className="item-row">
                    <td>{item.name}</td>
                    <td className="negative">
                      ({item.amount.toLocaleString('ar-SA')} ร.س)
                    </td>
                  </tr>
                ))}
                <tr className="subtotal-row">
                  <td>إجمالي تكاليف التشغيل</td>
                  <td className="bold negative">
                    ({(reportData.totalOperatingExpenses || 0).toLocaleString('ar-SA')} ร.س)
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <div className="is-important">
            <div className="important-item">
              <span className="label">الدخل من العمليات</span>
              <span className={`value ${(reportData.operatingIncome || 0) >= 0 ? 'positive' : 'negative'}`}>
                {(reportData.operatingIncome || 0).toLocaleString('ar-SA')} ร.س
              </span>
            </div>
          </div>

          <section className="is-section">
            <h3>الإيرادات والمصروفات الأخرى</h3>
            <table className="is-table">
              <tbody>
                {(reportData.otherItems || []).map((item, idx) => (
                  <tr key={idx} className="item-row">
                    <td>{item.name}</td>
                    <td className={item.amount >= 0 ? 'positive' : 'negative'}>
                      {(item.amount >= 0 ? '+' : '')}{item.amount.toLocaleString('ar-SA')} ร.س
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="is-section">
            <h3>الضرائب</h3>
            <div className="tax-info">
              <p>ضريبة الدخل: ({(reportData.incomeTax || 0).toLocaleString('ar-SA')} ร.س)</p>
            </div>
          </section>

          <div className="is-bottom">
            <div className="bottom-item">
              <span className="label">صافي الدخل</span>
              <span className={`value large ${(reportData.netIncome || 0) >= 0 ? 'positive' : 'negative'}`}>
                {(reportData.netIncome || 0).toLocaleString('ar-SA')} ร.س
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const CashFlowStatement = () => (
    <div className="cashflow-statement-report">
      <div className="report-title">
        <h2>قائمة التدفقات النقدية</h2>
        <span className="report-date">
          {dateRange.from.toLocaleDateString('ar-SA')} - {dateRange.to.toLocaleDateString('ar-SA')}
        </span>
      </div>

      {reportData && (
        <div className="cashflow-content">
          <section className="cf-section">
            <h3>التدفقات من العمليات التشغيلية</h3>
            <table className="cf-table">
              <tbody>
                {(reportData.operatingCashFlow || []).map((item, idx) => (
                  <tr key={idx} className="item-row">
                    <td>{item.name}</td>
                    <td>{item.amount.toLocaleString('ar-SA')} ร.س</td>
                  </tr>
                ))}
                <tr className="subtotal-row">
                  <td>صافي التدفقات التشغيلية</td>
                  <td className="bold">{(reportData.netOperatingCashFlow || 0).toLocaleString('ar-SA')} ร.س</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="cf-section">
            <h3>التدفقات من الأنشطة الاستثمارية</h3>
            <table className="cf-table">
              <tbody>
                {(reportData.investingCashFlow || []).map((item, idx) => (
                  <tr key={idx} className="item-row">
                    <td>{item.name}</td>
                    <td className={item.amount < 0 ? 'negative' : ''}>{item.amount.toLocaleString('ar-SA')} ร.س</td>
                  </tr>
                ))}
                <tr className="subtotal-row">
                  <td>صافي التدفقات الاستثمارية</td>
                  <td className="bold negative">{(reportData.netInvestingCashFlow || 0).toLocaleString('ar-SA')} ร.س</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="cf-section">
            <h3>التدفقات من الأنشطة التمويلية</h3>
            <table className="cf-table">
              <tbody>
                {(reportData.financingCashFlow || []).map((item, idx) => (
                  <tr key={idx} className="item-row">
                    <td>{item.name}</td>
                    <td>{item.amount.toLocaleString('ar-SA')} ร.س</td>
                  </tr>
                ))}
                <tr className="subtotal-row">
                  <td>صافي التدفقات التمويلية</td>
                  <td className="bold">{(reportData.netFinancingCashFlow || 0).toLocaleString('ar-SA')} ร.س</td>
                </tr>
              </tbody>
            </table>
          </section>

          <div className="cf-summary">
            <div className="summary-item">
              <span>النقد في بداية الفترة</span>
              <span>{(reportData.beginningCash || 0).toLocaleString('ar-SA')} ร.س</span>
            </div>
            <div className="summary-item">
              <span>الزيادة/(النقص) في النقد</span>
              <span className={(reportData.netCashChange || 0) >= 0 ? 'positive' : 'negative'}>
                {(reportData.netCashChange || 0).toLocaleString('ar-SA')} ร.س
              </span>
            </div>
            <div className="summary-item total">
              <span>النقد في نهاية الفترة</span>
              <span className="bold">{(reportData.endingCash || 0).toLocaleString('ar-SA')} ร.س</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const FinancialRatios = () => (
    <div className="ratios-report">
      <div className="report-title">
        <h2>النسب المالية</h2>
        <span className="report-date">{dateRange.to.toLocaleDateString('ar-SA')}</span>
      </div>

      {reportData && (
        <div className="ratios-content">
          <section className="ratio-section">
            <h3>نسب الربحية</h3>
            <div className="ratios-grid">
              {(reportData.profitabilityRatios || []).map((ratio, idx) => (
                <div key={idx} className={`ratio-card status-${ratio.status}`}>
                  <h4>{ratio.name}</h4>
                  <div className="ratio-value">{(ratio.value * 100).toFixed(2)}%</div>
                  <p className="ratio-desc">{ratio.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ratio-section">
            <h3>نسب السيولة</h3>
            <div className="ratios-grid">
              {(reportData.liquidityRatios || []).map((ratio, idx) => (
                <div key={idx} className={`ratio-card status-${ratio.status}`}>
                  <h4>{ratio.name}</h4>
                  <div className="ratio-value">{ratio.value.toFixed(2)}</div>
                  <p className="ratio-desc">{ratio.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ratio-section">
            <h3>نسب الكفاءة</h3>
            <div className="ratios-grid">
              {(reportData.efficiencyRatios || []).map((ratio, idx) => (
                <div key={idx} className={`ratio-card status-${ratio.status}`}>
                  <h4>{ratio.name}</h4>
                  <div className="ratio-value">{ratio.value.toFixed(2)}x</div>
                  <p className="ratio-desc">{ratio.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="ratio-section">
            <h3>نسب الرفع المالي</h3>
            <div className="ratios-grid">
              {(reportData.leverageRatios || []).map((ratio, idx) => (
                <div key={idx} className={`ratio-card status-${ratio.status}`}>
                  <h4>{ratio.name}</h4>
                  <div className="ratio-value">{(ratio.value * 100).toFixed(2)}%</div>
                  <p className="ratio-desc">{ratio.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );

  const ConsolidatedReport = () => (
    <div className="consolidated-report">
      <div className="report-title">
        <h2>التقرير الموحد (متعدد الفروع)</h2>
        <span className="report-date">{dateRange.to.toLocaleDateString('ar-SA')}</span>
      </div>

      {reportData && (
        <div className="consolidated-content">
          <section className="consolidated-section">
            <h3>الأداء حسب الفرع</h3>
            <table className="consolidated-table">
              <thead>
                <tr>
                  <th>الفرع</th>
                  <th>الإيرادات</th>
                  <th>المصروفات</th>
                  <th>صافي الدخل</th>
                  <th>الأصول</th>
                  <th>الالتزامات</th>
                </tr>
              </thead>
              <tbody>
                {(reportData.branches || []).map((branch, idx) => (
                  <tr key={idx}>
                    <td className="branch-name">{branch.name}</td>
                    <td>{branch.revenues.toLocaleString('ar-SA')} ร.س</td>
                    <td>{branch.expenses.toLocaleString('ar-SA')} ร.س</td>
                    <td className={(branch.netIncome || 0) >= 0 ? 'positive' : 'negative'}>
                      {branch.netIncome.toLocaleString('ar-SA')} ร.س
                    </td>
                    <td>{branch.assets.toLocaleString('ar-SA')} ร.س</td>
                    <td>{branch.liabilities.toLocaleString('ar-SA')} ร.س</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td className="branch-name">الإجمالي</td>
                  <td className="bold">{(reportData.totalRevenues || 0).toLocaleString('ar-SA')} ร.س</td>
                  <td className="bold">{(reportData.totalExpenses || 0).toLocaleString('ar-SA')} ร.س</td>
                  <td className={`bold ${(reportData.totalNetIncome || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {(reportData.totalNetIncome || 0).toLocaleString('ar-SA')} ร.س
                  </td>
                  <td className="bold">{(reportData.totalAssets || 0).toLocaleString('ar-SA')} ร.س</td>
                  <td className="bold">{(reportData.totalLiabilities || 0).toLocaleString('ar-SA')} ร.س</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );

  // ===== RENDER =====
  if (error) {
    return (
      <div className="financial-reports error">
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchReportData} className="btn btn-primary">
            إعادة محاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="financial-reports">
      <div className="reports-header">
        <h1>📊 التقارير المالية</h1>
        <div className="header-controls">
          <div className="date-controls">
            <label>من:</label>
            <input
              type="date"
              value={dateRange.from.toISOString().split('T')[0]}
              onChange={(e) => handleDateChange('from', e.target.value)}
            />
            <label>إلى:</label>
            <input
              type="date"
              value={dateRange.to.toISOString().split('T')[0]}
              onChange={(e) => handleDateChange('to', e.target.value)}
            />
          </div>
          <button className="btn btn-secondary" onClick={fetchReportData} disabled={loading}>
            {loading ? '⏳...' : '🔄 تحديث'}
          </button>
        </div>
      </div>

      <div className="reports-container">
        <div className="report-tabs">
          <button
            className={`tab-btn ${selectedReport === 'balance-sheet' ? 'active' : ''}`}
            onClick={() => setSelectedReport('balance-sheet')}
          >
            📋 الميزانية
          </button>
          <button
            className={`tab-btn ${selectedReport === 'income-statement' ? 'active' : ''}`}
            onClick={() => setSelectedReport('income-statement')}
          >
            📈 الدخل
          </button>
          <button
            className={`tab-btn ${selectedReport === 'cashflow' ? 'active' : ''}`}
            onClick={() => setSelectedReport('cashflow')}
          >
            💵 التدفقات النقدية
          </button>
          <button
            className={`tab-btn ${selectedReport === 'ratios' ? 'active' : ''}`}
            onClick={() => setSelectedReport('ratios')}
          >
            📊 النسب المالية
          </button>
          <button
            className={`tab-btn ${selectedReport === 'consolidated' ? 'active' : ''}`}
            onClick={() => setSelectedReport('consolidated')}
          >
            🏢 موحد
          </button>
        </div>

        <div className="report-content">
          {selectedReport === 'balance-sheet' && <BalanceSheet />}
          {selectedReport === 'income-statement' && <IncomeStatement />}
          {selectedReport === 'cashflow' && <CashFlowStatement />}
          {selectedReport === 'ratios' && <FinancialRatios />}
          {selectedReport === 'consolidated' && <ConsolidatedReport />}
        </div>

        <div className="export-controls">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="export-select"
          >
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
            <option value="csv">CSV</option>
          </select>
          <button className="btn btn-primary" onClick={handleExport}>
            ⬇️ تحميل
          </button>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            🖨️ طباعة
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;
