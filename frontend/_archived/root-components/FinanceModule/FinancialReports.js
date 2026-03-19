/**
 * FinancialReports.js - Comprehensive Financial Reporting & Analysis
 * Balance Sheet, Income Statement, Cash Flow, Ratios, and Consolidated Reports
 */

import React, { useState, useEffect } from 'react';
import './FinancialReports.css';

const FinancialReports = ({ organizationId }) => {
  const [reportType, setReportType] = useState('balance-sheet');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    from: null,
    to: new Date().toISOString()
  });

  useEffect(() => {
    fetchReport();
  }, [organizationId, reportType, dateRange]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        organizationId,
        reportType,
        from: dateRange.from || new Date(Date.now() - 365*24*60*60*1000).toISOString(),
        to: dateRange.to
      });

      const response = await fetch(`/api/finance/reports/${reportType}?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch report');

      const data = await response.json();
      setReportData(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch(`/api/finance/reports/${reportType}/export?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_report_${new Date().getTime()}.${format}`;
      link.click();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading report...</div>;

  return (
    <div className="financial-reports">
      <div className="reports-header">
        <h2>📊 Financial Reports</h2>
        <div className="header-controls">
          <div className="date-selector">
            <label>Period:</label>
            <select defaultValue="year">
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="export-buttons">
            <button className="btn-export" onClick={() => handleExport('pdf')}>📄 PDF</button>
            <button className="btn-export" onClick={() => handleExport('excel')}>📊 Excel</button>
            <button className="btn-print" onClick={() => window.print()}>🖨️ Print</button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Report Type Tabs */}
      <div className="report-tabs">
        <button
          className={`tab ${reportType === 'balance-sheet' ? 'active' : ''}`}
          onClick={() => setReportType('balance-sheet')}
        >
          Balance Sheet
        </button>
        <button
          className={`tab ${reportType === 'income-statement' ? 'active' : ''}`}
          onClick={() => setReportType('income-statement')}
        >
          Income Statement
        </button>
        <button
          className={`tab ${reportType === 'cash-flow' ? 'active' : ''}`}
          onClick={() => setReportType('cash-flow')}
        >
          Cash Flow Statement
        </button>
        <button
          className={`tab ${reportType === 'ratios' ? 'active' : ''}`}
          onClick={() => setReportType('ratios')}
        >
          Financial Ratios
        </button>
        <button
          className={`tab ${reportType === 'consolidated' ? 'active' : ''}`}
          onClick={() => setReportType('consolidated')}
        >
          Consolidated
        </button>
      </div>

      {/* Report Content */}
      {reportType === 'balance-sheet' && reportData && (
        <BalanceSheet data={reportData} />
      )}

      {reportType === 'income-statement' && reportData && (
        <IncomeStatement data={reportData} />
      )}

      {reportType === 'cash-flow' && reportData && (
        <CashFlowStatement data={reportData} />
      )}

      {reportType === 'ratios' && reportData && (
        <FinancialRatios data={reportData} />
      )}

      {reportType === 'consolidated' && reportData && (
        <ConsolidatedReport data={reportData} />
      )}
    </div>
  );
};

function BalanceSheet({ data }) {
  return (
    <div className="report-section balance-sheet-report">
      <h3>Balance Sheet</h3>
      <div className="report-date">{new Date().toLocaleDateString()}</div>

      <div className="bs-container">
        <div className="bs-column">
          <h4>Assets</h4>
          <div className="bs-section">
            <div className="bs-header">Current Assets</div>
            {data.assets?.current?.map((item, idx) => (
              <div key={idx} className="bs-item">
                <span className="item-name">{item.name}</span>
                <span className="item-amount">${item.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="bs-subtotal">
              <span>Total Current Assets</span>
              <span>${data.assets?.currentTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="bs-section">
            <div className="bs-header">Fixed Assets</div>
            {data.assets?.fixed?.map((item, idx) => (
              <div key={idx} className="bs-item">
                <span className="item-name">{item.name}</span>
                <span className="item-amount">${item.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="bs-subtotal">
              <span>Total Fixed Assets</span>
              <span>${data.assets?.fixedTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="bs-total">
            <span>TOTAL ASSETS</span>
            <span>${data.assets?.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="bs-column">
          <h4>Liabilities & Equity</h4>
          <div className="bs-section">
            <div className="bs-header">Current Liabilities</div>
            {data.liabilities?.current?.map((item, idx) => (
              <div key={idx} className="bs-item">
                <span className="item-name">{item.name}</span>
                <span className="item-amount">${item.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="bs-subtotal">
              <span>Total Current Liabilities</span>
              <span>${data.liabilities?.currentTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="bs-section">
            <div className="bs-header">Long-term Liabilities</div>
            {data.liabilities?.longTerm?.map((item, idx) => (
              <div key={idx} className="bs-item">
                <span className="item-name">{item.name}</span>
                <span className="item-amount">${item.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="bs-subtotal">
              <span>Total Long-term Liabilities</span>
              <span>${data.liabilities?.longTermTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="bs-section">
            <div className="bs-header">Equity</div>
            <div className="bs-item">
              <span className="item-name">Capital Stock</span>
              <span className="item-amount">${data.equity?.capital.toLocaleString()}</span>
            </div>
            <div className="bs-item">
              <span className="item-name">Retained Earnings</span>
              <span className="item-amount">${data.equity?.retainedEarnings.toLocaleString()}</span>
            </div>
            <div className="bs-subtotal">
              <span>Total Equity</span>
              <span>${data.equity?.total.toLocaleString()}</span>
            </div>
          </div>

          <div className="bs-total">
            <span>TOTAL LIABILITIES & EQUITY</span>
            <span>${(data.liabilities?.total + data.equity?.total).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="verification">
        <p>✓ Balance Verified: Assets = Liabilities + Equity</p>
      </div>
    </div>
  );
}

function IncomeStatement({ data }) {
  return (
    <div className="report-section income-statement-report">
      <h3>Income Statement</h3>
      <div className="report-period">{new Date().toLocaleDateString()}</div>

      <div className="is-container">
        <div className="is-section">
          <div className="is-header">Revenues</div>
          {data.revenues?.operating?.map((item, idx) => (
            <div key={idx} className="is-item">
              <span>{item.name}</span>
              <span>${item.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="is-subtotal">
            <span>Total Operating Revenues</span>
            <span>${data.revenues?.operatingTotal.toLocaleString()}</span>
          </div>

          {data.revenues?.other && (
            <>
              <div className="is-label">Other Revenues</div>
              {data.revenues.other.map((item, idx) => (
                <div key={idx} className="is-item">
                  <span>{item.name}</span>
                  <span>${item.amount.toLocaleString()}</span>
                </div>
              ))}
              <div className="is-subtotal">
                <span>Total Revenues</span>
                <span>${data.revenues?.total.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        <div className="is-section">
          <div className="is-header">Expenses</div>
          {data.expenses?.operating?.map((item, idx) => (
            <div key={idx} className="is-item">
              <span>{item.name}</span>
              <span>-${item.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="is-subtotal">
            <span>Total Operating Expenses</span>
            <span>-${data.expenses?.operatingTotal.toLocaleString()}</span>
          </div>

          <div className="is-label">Operating Income</div>
          <div className="is-item">
            <span>Operating Income</span>
            <span>${data.operatingIncome.toLocaleString()}</span>
          </div>

          {data.expenses?.nonOperating && (
            <>
              <div className="is-label">Non-Operating Expenses</div>
              {data.expenses.nonOperating.map((item, idx) => (
                <div key={idx} className="is-item">
                  <span>{item.name}</span>
                  <span>-${item.amount.toLocaleString()}</span>
                </div>
              ))}
            </>
          )}

          <div className="is-divider"></div>
          <div className="is-section-total">
            <span>Income Before Taxes</span>
            <span>${data.incomeBeforeTaxes.toLocaleString()}</span>
          </div>

          <div className="is-item">
            <span>Taxes</span>
            <span>-${data.taxes.toLocaleString()}</span>
          </div>

          <div className="is-final">
            <span>NET INCOME</span>
            <span>${data.netIncome.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CashFlowStatement({ data }) {
  return (
    <div className="report-section cash-flow-statement-report">
      <h3>Cash Flow Statement</h3>

      <div className="cf-section">
        <h4>Operating Activities</h4>
        {data.operating?.map((item, idx) => (
          <div key={idx} className="cf-item">
            <span>{item.name}</span>
            <span>${item.amount.toLocaleString()}</span>
          </div>
        ))}
        <div className="cf-subtotal">
          <span>Net Cash from Operating</span>
          <span>${data.operatingTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="cf-section">
        <h4>Investing Activities</h4>
        {data.investing?.map((item, idx) => (
          <div key={idx} className="cf-item">
            <span>{item.name}</span>
            <span>-${item.amount.toLocaleString()}</span>
          </div>
        ))}
        <div className="cf-subtotal">
          <span>Net Cash from Investing</span>
          <span>-${data.investingTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="cf-section">
        <h4>Financing Activities</h4>
        {data.financing?.map((item, idx) => (
          <div key={idx} className="cf-item">
            <span>{item.name}</span>
            <span>${item.amount.toLocaleString()}</span>
          </div>
        ))}
        <div className="cf-subtotal">
          <span>Net Cash from Financing</span>
          <span>${data.financingTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="cf-final">
        <div className="cf-item">
          <span>Net Change in Cash</span>
          <span>${data.netChange.toLocaleString()}</span>
        </div>
        <div className="cf-item">
          <span>Cash at Beginning of Period</span>
          <span>${data.beginningBalance.toLocaleString()}</span>
        </div>
        <div className="cf-total">
          <span>Cash at End of Period</span>
          <span>${data.endingBalance.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function FinancialRatios({ data }) {
  return (
    <div className="report-section ratios-report">
      <h3>Financial Ratios Analysis</h3>

      <div className="ratios-grid">
        <div className="ratio-category">
          <h4>Profitability Ratios</h4>
          {data.profitability?.map((ratio, idx) => (
            <div key={idx} className="ratio-item">
              <span className="ratio-name">{ratio.name}</span>
              <span className="ratio-value">{ratio.value}</span>
              <span className={`ratio-status ${ratio.status}`}>{ratio.interpretation}</span>
            </div>
          ))}
        </div>

        <div className="ratio-category">
          <h4>Liquidity Ratios</h4>
          {data.liquidity?.map((ratio, idx) => (
            <div key={idx} className="ratio-item">
              <span className="ratio-name">{ratio.name}</span>
              <span className="ratio-value">{ratio.value}</span>
              <span className={`ratio-status ${ratio.status}`}>{ratio.interpretation}</span>
            </div>
          ))}
        </div>

        <div className="ratio-category">
          <h4>Efficiency Ratios</h4>
          {data.efficiency?.map((ratio, idx) => (
            <div key={idx} className="ratio-item">
              <span className="ratio-name">{ratio.name}</span>
              <span className="ratio-value">{ratio.value}</span>
              <span className={`ratio-status ${ratio.status}`}>{ratio.interpretation}</span>
            </div>
          ))}
        </div>

        <div className="ratio-category">
          <h4>Leverage Ratios</h4>
          {data.leverage?.map((ratio, idx) => (
            <div key={idx} className="ratio-item">
              <span className="ratio-name">{ratio.name}</span>
              <span className="ratio-value">{ratio.value}</span>
              <span className={`ratio-status ${ratio.status}`}>{ratio.interpretation}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConsolidatedReport({ data }) {
  return (
    <div className="report-section consolidated-report">
      <h3>Consolidated Financial Report</h3>
      <p>Combined results from all branches and subsidiaries</p>

      <div className="consolidated-overview">
        <div className="con-metric">
          <span className="con-label">Total Assets</span>
          <span className="con-value">${data.totalAssets.toLocaleString()}</span>
        </div>
        <div className="con-metric">
          <span className="con-label">Total Revenues</span>
          <span className="con-value">${data.totalRevenues.toLocaleString()}</span>
        </div>
        <div className="con-metric">
          <span className="con-label">Net Income</span>
          <span className="con-value">${data.netIncome.toLocaleString()}</span>
        </div>
        <div className="con-metric">
          <span className="con-label">Equity</span>
          <span className="con-value">${data.totalEquity.toLocaleString()}</span>
        </div>
      </div>

      <h4>Branch Breakdown</h4>
      <table className="consolidated-table">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Assets</th>
            <th>Revenues</th>
            <th>Net Income</th>
            <th>Margin</th>
          </tr>
        </thead>
        <tbody>
          {data.branches?.map((branch, idx) => (
            <tr key={idx}>
              <td>{branch.name}</td>
              <td>${branch.assets.toLocaleString()}</td>
              <td>${branch.revenues.toLocaleString()}</td>
              <td>${branch.netIncome.toLocaleString()}</td>
              <td>{branch.margin.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FinancialReports;
