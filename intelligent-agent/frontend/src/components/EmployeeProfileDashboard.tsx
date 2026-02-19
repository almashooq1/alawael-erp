import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import EmployeeClient from '../services/EmployeeClient';

const EmployeeProfileDashboard = () => {
  const { theme } = useTheme();
  const [logoDataUrl, setLogoDataUrl] = useState<string>('');
  const [logoName, setLogoName] = useState<string>('');
  const [logoLibrary, setLogoLibrary] = useState<Array<{ name: string; dataUrl: string }>>([]);
  const [logoSize, setLogoSize] = useState<number>(48);
  const [showLogo, setShowLogo] = useState(true);
  const [reportBrandName, setReportBrandName] = useState('نظام إدارة الموظفين المتكامل');
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [recentEmployeesLoading, setRecentEmployeesLoading] = useState(false);
  const [recentEmployeesError, setRecentEmployeesError] = useState('');
  const [tableEmployees, setTableEmployees] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [tableLimit, setTableLimit] = useState(10);
  const [tableTotal, setTableTotal] = useState(0);
  const [tableQuery, setTableQuery] = useState('');
  const [tableDepartmentFilter, setTableDepartmentFilter] = useState('all');
  const [tableStatusFilter, setTableStatusFilter] = useState('all');
  const [tableRiskFilter, setTableRiskFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [tableSortKey, setTableSortKey] = useState<
    | 'name'
    | 'employeeId'
    | 'email'
    | 'department'
    | 'position'
    | 'status'
    | 'hireDate'
    | 'retentionRisk'
  >('name');
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc');
  const [exportPreview, setExportPreview] = useState<{
    filename: string;
    count: number;
    filters: string[];
  } | null>(null);
  const [exportStats, setExportStats] = useState({
    totalExports: 0,
    totalRecords: 0,
    lastExportTime: null as Date | null,
  });
  const [autoExportEnabled, setAutoExportEnabled] = useState(false);
  const [autoExportInterval, setAutoExportInterval] = useState(30); // بالدقائق

  // حالات الحوارات والعمليات
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [branches, setBranches] = useState<string[]>([]);
  const [transferBranch, setTransferBranch] = useState('');
  const [transferDate, setTransferDate] = useState('');

  // الميزات الجديدة
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEmployeeForm, setNewEmployeeForm] = useState<any>({});
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showPerformanceDialog, setShowPerformanceDialog] = useState(false);
  const [performanceForm, setPerformanceForm] = useState<any>({});
  const [showLeaveRequestsDialog, setShowLeaveRequestsDialog] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [showAuditLogDialog, setShowAuditLogDialog] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [showAdvancedSearchDialog, setShowAdvancedSearchDialog] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState<any>({});
  const [showDashboardDialog, setShowDashboardDialog] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const safeEmployee = profile?.employee || {};
  const recentList = useMemo(() => recentIds.slice(0, 5), [recentIds]);

  const formatDate = (value?: string | Date) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('ar-SA');
  };

  const formatNumber = (value?: number, fallback = '--') =>
    typeof value === 'number' ? value.toLocaleString('ar-SA') : fallback;

  const formatRetentionRisk = (value?: number) => {
    if (typeof value !== 'number') return '--';
    const percent = value <= 1 ? value * 100 : value;
    return `${Math.round(percent * 10) / 10}%`;
  };

  const handleCopy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
      setTimeout(() => setNotice(''), 2000);
    } catch {
      setNotice('تعذر النسخ');
      setTimeout(() => setNotice(''), 2000);
    }
  };

  const resetReportSettings = () => {
    setReportBrandName('نظام إدارة الموظفين المتكامل');
    setLogoDataUrl('');
    setLogoName('');
    setLogoSize(48);
    setShowLogo(true);
    setNotice('تمت إعادة تعيين إعدادات التقرير');
    setTimeout(() => setNotice(''), 2000);
  };

  const clearLogoOnly = () => {
    setLogoDataUrl('');
    setLogoName('');
    setNotice('تمت إزالة الشعار');
    setTimeout(() => setNotice(''), 2000);
  };

  const buildExportFilename = (extension: 'csv' | 'pdf') => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const parts: string[] = [];
    const activeFilters: string[] = [];

    if (reportBrandName && reportBrandName !== 'نظام إدارة الموظفين المتكامل') {
      parts.push(reportBrandName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-'));
      activeFilters.push(`العلامة: ${reportBrandName}`);
    }

    parts.push('employees');

    if (tableDepartmentFilter !== 'all') {
      parts.push(`dept-${tableDepartmentFilter.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-')}`);
      activeFilters.push(`القسم: ${tableDepartmentFilter}`);
    }
    if (tableStatusFilter !== 'all') {
      parts.push(`status-${tableStatusFilter.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-')}`);
      activeFilters.push(`الحالة: ${tableStatusFilter}`);
    }
    if (tableRiskFilter !== 'all') {
      const riskLabels = { low: 'منخفضة', medium: 'متوسطة', high: 'مرتفعة' };
      parts.push(`risk-${tableRiskFilter}`);
      activeFilters.push(`المخاطر: ${riskLabels[tableRiskFilter]}`);
    }
    if (tableQuery.trim()) {
      parts.push('filtered');
      activeFilters.push(`بحث: ${tableQuery.trim()}`);
    }

    if (extension === 'pdf') {
      parts.push('report');
    }
    parts.push(stamp);

    return {
      filename: `${parts.join('-')}.${extension}`,
      activeFilters,
    };
  };

  const resetTableSettings = () => {
    setTableQuery('');
    setTableDepartmentFilter('all');
    setTableStatusFilter('all');
    setTableRiskFilter('all');
    setTableSortKey('name');
    setTableSortDirection('asc');
    setTableLimit(10);
    setTablePage(1);
    setNotice('تمت إعادة تعيين إعدادات الجدول');
    setTimeout(() => setNotice(''), 2000);
  };

  const saveLogoToLibrary = () => {
    if (!logoDataUrl) {
      setNotice('ارفع شعاراً أولاً');
      setTimeout(() => setNotice(''), 2000);
      return;
    }
    const name = logoName || `Logo ${logoLibrary.length + 1}`;
    const exists = logoLibrary.some(item => item.dataUrl === logoDataUrl);
    const updated = exists
      ? logoLibrary.map(item => (item.dataUrl === logoDataUrl ? { ...item, name } : item))
      : [{ name, dataUrl: logoDataUrl }, ...logoLibrary];
    setLogoLibrary(updated);
    setNotice('تم حفظ الشعار في القائمة');
    setTimeout(() => setNotice(''), 2000);
  };

  // دوال إدارة الموظفين الجديدة
  const openEditDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setEditForm({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      department: employee.department || '',
      position: employee.position || '',
      status: employee.status || '',
      branch: employee.branch || '',
    });
    setShowEditDialog(true);
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      setLoading(true);
      await EmployeeClient.updateEmployee(selectedEmployee.employeeId, editForm);
      setNotice(`✅ تم تحديث بيانات ${selectedEmployee.firstName} ${selectedEmployee.lastName}`);
      setTimeout(() => setNotice(''), 3000);
      setShowEditDialog(false);
      
      // إعادة تحميل البيانات
      if (profile && profile.employee?.employeeId === selectedEmployee.employeeId) {
        loadProfile(selectedEmployee.employeeId);
      }
      loadTableEmployees();
    } catch (err: any) {
      setError(err.message || 'فشل تحديث الموظف');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setShowDeleteDialog(true);
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      setLoading(true);
      await EmployeeClient.deleteEmployee(selectedEmployee.employeeId);
      setNotice(`✅ تم حذف ${selectedEmployee.firstName} ${selectedEmployee.lastName}`);
      setTimeout(() => setNotice(''), 3000);
      setShowDeleteDialog(false);
      
      // مسح الملف إذا كان مفتوحاً
      if (profile && profile.employee?.employeeId === selectedEmployee.employeeId) {
        setProfile(null);
        setEmployeeId('');
      }
      loadTableEmployees();
    } catch (err: any) {
      setError(err.message || 'فشل حذف الموظف');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openTransferDialog = async (employee: any) => {
    setSelectedEmployee(employee);
    setTransferBranch(employee.branch || '');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setShowTransferDialog(true);

    // تحميل قائمة الفروع
    try {
      const response = await EmployeeClient.getBranches();
      setBranches(response.data || []);
    } catch (err: any) {
      console.error('Failed to load branches:', err);
      setBranches(['الفرع الرئيسي', 'فرع الشرق', 'فرع الغرب', 'فرع الشمال', 'فرع الجنوب']);
    }
  };

  const handleTransferEmployee = async () => {
    if (!selectedEmployee || !transferBranch) {
      setError('يرجى اختيار الفرع الجديد');
      setTimeout(() => setError(''), 2000);
      return;
    }

    try {
      setLoading(true);
      await EmployeeClient.transferEmployeeBranch(
        selectedEmployee.employeeId,
        transferBranch,
        transferDate
      );
      setNotice(
        `✅ تم نقل ${selectedEmployee.firstName} ${selectedEmployee.lastName} إلى ${transferBranch}`
      );
      setTimeout(() => setNotice(''), 3000);
      setShowTransferDialog(false);
      
      // إعادة تحميل البيانات
      if (profile && profile.employee?.employeeId === selectedEmployee.employeeId) {
        loadProfile(selectedEmployee.employeeId);
      }
      loadTableEmployees();
    } catch (err: any) {
      setError(err.message || 'فشل نقل الموظف');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const loadTableEmployees = async () => {
    setTableLoading(true);
    setTableError('');
    try {
      const response: any = await EmployeeClient.listEmployees({
        limit: tableLimit,
        skip: (tablePage - 1) * tableLimit,
      });
      setTableEmployees(response.data || []);
      setTableTotal(response.total || 0);
    } catch (err: any) {
      setTableError(err.message || 'تعذر تحميل جدول الموظفين');
      setTableEmployees([]);
      setTableTotal(0);
    } finally {
      setTableLoading(false);
    }
  };

  const saveEmployeeFile = () => {
    if (!profile) {
      setNotice('لا يوجد ملف موظف لحفظه');
      setTimeout(() => setNotice(''), 2000);
      return;
    }

    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const empId = employeeId || safeEmployee.employeeId || 'employee';
    const empName = `${safeEmployee.firstName || ''}-${safeEmployee.lastName || ''}`.trim() || 'profile';
    link.download = `employee-${empId}-${empName}-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('✅ تم حفظ ملف الموظف');
    setTimeout(() => setNotice(''), 2000);
  };

  // دوال الميزات الجديدة

  const openAddDialog = () => {
    setNewEmployeeForm({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      position: '',
      status: 'نشط',
      branch: '',
      hireDate: new Date().toISOString().split('T')[0],
      phone: '',
      salary: '',
    });
    setShowAddDialog(true);
  };

  const handleAddEmployee = async () => {
    try {
      setLoading(true);
      await EmployeeClient.createEmployee(newEmployeeForm);
      setNotice(`✅ تم إضافة موظف جديد: ${newEmployeeForm.firstName} ${newEmployeeForm.lastName}`);
      setTimeout(() => setNotice(''), 3000);
      setShowAddDialog(false);
      loadTableEmployees();
    } catch (err: any) {
      setError(err.message || 'فشل إضافة الموظف');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openBulkImportDialog = () => {
    setImportFile(null);
    setShowBulkImportDialog(true);
  };

  const handleBulkImport = async () => {
    if (!importFile) {
      setError('يرجى اختيار ملف للاستيراد');
      setTimeout(() => setError(''), 2000);
      return;
    }

    try {
      setLoading(true);
      const response = await EmployeeClient.bulkImportEmployees(importFile);
      setNotice(`✅ تم استيراد ${response.data?.count || 0} موظف بنجاح`);
      setTimeout(() => setNotice(''), 3000);
      setShowBulkImportDialog(false);
      loadTableEmployees();
    } catch (err: any) {
      setError(err.message || 'فشل استيراد الموظفين');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const blob = await EmployeeClient.exportEmployeesExcel({
        department: tableDepartmentFilter !== 'all' ? tableDepartmentFilter : undefined,
        status: tableStatusFilter !== 'all' ? tableStatusFilter : undefined,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `employees-${stamp}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice('✅ تم تصدير ملف Excel');
      setTimeout(() => setNotice(''), 2000);
    } catch (err: any) {
      setError(err.message || 'فشل تصدير Excel');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openPerformanceDialog = (employee: any) => {
    setSelectedEmployee(employee);
    setPerformanceForm({
      rating: 5,
      period: new Date().toISOString().split('T')[0],
      goals: '',
      achievements: '',
      improvements: '',
      notes: '',
    });
    setShowPerformanceDialog(true);
  };

  const handleAddPerformanceReview = async () => {
    if (!selectedEmployee) return;

    try {
      setLoading(true);
      await EmployeeClient.addPerformanceReview(selectedEmployee.employeeId, performanceForm);
      setNotice(`✅ تم إضافة تقييم أداء لـ ${selectedEmployee.firstName}`);
      setTimeout(() => setNotice(''), 3000);
      setShowPerformanceDialog(false);
    } catch (err: any) {
      setError(err.message || 'فشل إضافة التقييم');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openLeaveRequestsDialog = async () => {
    try {
      setLoading(true);
      const response = await EmployeeClient.getLeaveRequests();
      setLeaveRequests(response.data || []);
      setShowLeaveRequestsDialog(true);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل طلبات الإجازة');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (requestId: string, approved: boolean) => {
    try {
      setLoading(true);
      await EmployeeClient.approveLeaveRequest(requestId, approved);
      setNotice(`✅ تم ${approved ? 'الموافقة على' : 'رفض'} طلب الإجازة`);
      setTimeout(() => setNotice(''), 2000);
      openLeaveRequestsDialog();
    } catch (err: any) {
      setError(err.message || 'فشل معالجة الطلب');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openAuditLogDialog = async (employee?: any) => {
    try {
      setLoading(true);
      const response = await EmployeeClient.getAuditLog(employee?.employeeId, 50);
      setAuditLog(response.data || []);
      setShowAuditLogDialog(true);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل سجل التعديلات');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openAdvancedSearchDialog = () => {
    setSearchCriteria({
      name: '',
      department: '',
      position: '',
      status: '',
      minSalary: '',
      maxSalary: '',
      hireFromDate: '',
      hireToDate: '',
    });
    setShowAdvancedSearchDialog(true);
  };

  const handleAdvancedSearch = async () => {
    try {
      setLoading(true);
      const response = await EmployeeClient.advancedSearch(searchCriteria);
      setTableEmployees(response.data || []);
      setTableTotal(response.data?.length || 0);
      setShowAdvancedSearchDialog(false);
      setNotice(`✅ تم العثور على ${response.data?.length || 0} موظف`);
      setTimeout(() => setNotice(''), 2000);
    } catch (err: any) {
      setError(err.message || 'فشل البحث المتقدم');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const openDashboardDialog = async () => {
    try {
      setLoading(true);
      const response = await EmployeeClient.getDashboardStats();
      setDashboardStats(response.data);
      setShowDashboardDialog(true);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الإحصائيات');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const userId = 'current-user'; // يجب الحصول عليه من السياق
      const response = await EmployeeClient.getNotifications(userId, true);
      setNotifications(response.data || []);
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await EmployeeClient.markNotificationRead(notificationId);
      loadNotifications();
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const removeLogoFromLibrary = (dataUrl: string) => {
      : [{ name, dataUrl: logoDataUrl }, ...logoLibrary];
    setLogoLibrary(updated);
    setNotice('تم حفظ الشعار في القائمة');
    setTimeout(() => setNotice(''), 2000);
  };

  const applyLogoFromLibrary = (item: { name: string; dataUrl: string }) => {
    setLogoDataUrl(item.dataUrl);
    setLogoName(item.name);
    setShowLogo(true);
  };

  const removeLogoFromLibrary = (dataUrl: string) => {
    setLogoLibrary(prev => prev.filter(item => item.dataUrl !== dataUrl));
    if (logoDataUrl === dataUrl) {
      setLogoDataUrl('');
      setLogoName('');
    }
  };

  const handleExport = () => {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `${employeeId || safeEmployee.employeeId || 'employee-profile'}-${stamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const quickExportSimple = () => {
    if (sortedTableEmployees.length === 0) {
      setNotice('لا توجد بيانات للتصدير');
      setTimeout(() => setNotice(''), 2000);
      return;
    }

    const { filename } = buildExportFilename('pdf');

    // تحديث الإحصائيات
    setExportStats(prev => ({
      totalExports: prev.totalExports + 1,
      totalRecords: prev.totalRecords + sortedTableEmployees.length,
      lastExportTime: new Date(),
    }));

    // تنسيق مبسط للطباعة السريعة
    const simpleRows = sortedTableEmployees
      .map(
        (emp, idx) =>
          `<tr><td>${idx + 1}</td><td>${emp.firstName || ''} ${emp.lastName || ''}</td><td>${
            emp.department || ''
          }</td><td>${emp.position || ''}</td><td>${emp.status || ''}</td></tr>`
      )
      .join('');

    const simpleHtml = `
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>${filename}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11pt; }
            .header { text-align: center; padding: 15px 0; border-bottom: 2px solid #333; margin-bottom: 15px; }
            h1 { font-size: 18pt; margin-bottom: 5px; }
            .meta { font-size: 9pt; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background: #fafafa; }
            .footer { margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 8pt; color: #666; text-align: center; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>قائمة الموظفين</h1>
            <div class="meta">${reportBrandName || 'نظام إدارة الموظفين'} | ${new Date().toLocaleDateString(
      'ar-SA'
    )}</div>
          </div>
          <table>
            <thead><tr><th>#</th><th>الاسم</th><th>القسم</th><th>المنصب</th><th>الحالة</th></tr></thead>
            <tbody>${simpleRows}</tbody>
          </table>
          <div class="footer">
            إجمالي: ${sortedTableEmployees.length} موظف | وقت الإنشاء: ${new Date().toLocaleString('ar-SA')}
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(simpleHtml);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const exportTableCsv = () => {
    if (sortedTableEmployees.length === 0) {
      setNotice('لا توجد بيانات للتصدير');
      setTimeout(() => setNotice(''), 2000);
      return;
    }

    const { filename, activeFilters } = buildExportFilename('csv');

    // إظهار معاينة التصدير
    setExportPreview({
      filename,
      count: sortedTableEmployees.length,
      filters: activeFilters,
    });
    setTimeout(() => setExportPreview(null), 5000);

    // تحديث إحصائيات التصدير
    setExportStats(prev => ({
      totalExports: prev.totalExports + 1,
      totalRecords: prev.totalRecords + sortedTableEmployees.length,
      lastExportTime: new Date(),
    }));

    const headers = ['الاسم', 'رقم الموظف', 'البريد', 'القسم', 'المنصب', 'الحالة', 'تاريخ التعيين'];
    const rows = sortedTableEmployees.map(employee => [
      `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
      employee.employeeId || '',
      employee.email || '',
      employee.department || '',
      employee.position || '',
      employee.status || '',
      formatDate(employee.hireDate),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportTablePdf = () => {
    if (sortedTableEmployees.length === 0) {
      setNotice('لا توجد بيانات للتصدير');
      setTimeout(() => setNotice(''), 2000);
      return;
    }

    const { filename, activeFilters } = buildExportFilename('pdf');

    // إظهار معاينة التصدير
    setExportPreview({
      filename,
      count: sortedTableEmployees.length,
      filters: activeFilters,
    });
    setTimeout(() => setExportPreview(null), 5000);

    // تحديث إحصائيات التصدير
    setExportStats(prev => ({
      totalExports: prev.totalExports + 1,
      totalRecords: prev.totalRecords + sortedTableEmployees.length,
      lastExportTime: new Date(),
    }));

    const sortLabels: Record<typeof tableSortKey, string> = {
      name: 'الاسم',
      employeeId: 'رقم الموظف',
      email: 'البريد',
      department: 'القسم',
      position: 'المنصب',
      status: 'الحالة',
      hireDate: 'تاريخ التعيين',
      retentionRisk: 'مخاطر الاحتفاظ',
    };

    const rowsHtml = sortedTableEmployees
      .map(employee => {
        const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
        return `
          <tr>
            <td>${name}</td>
            <td>${employee.employeeId || ''}</td>
            <td>${employee.email || ''}</td>
            <td>${employee.department || ''}</td>
            <td>${employee.position || ''}</td>
            <td>${employee.status || ''}</td>
            <td>${formatDate(employee.hireDate)}</td>
          </tr>
        `;
      })
      .join('');

    const reportStamp = new Date();
    const reportStampText = reportStamp.toLocaleString('ar-SA');
    const reportStampId = reportStamp.toISOString().replace(/[:.]/g, '-');

    const html = `
      <html lang="ar" dir="rtl">
        <head>
          <title>${filename}</title>
          <style>
            @page { size: A4 landscape; margin: 16mm; }
            body { font-family: Arial, sans-serif; color: #111; }
            h2 { margin: 0; font-size: 20px; }
            .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 12px; }
            .brand { font-weight: 700; font-size: 14px; color: #0f172a; }
            .logo { width: ${logoSize}px; height: ${logoSize}px; object-fit: contain; }
            .meta { margin-bottom: 12px; color: #555; font-size: 12px; display: grid; gap: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: right; }
            th { background: #f1f5f9; font-weight: 600; }
            tr:nth-child(even) td { background: #f8fafc; }
            .summary { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; margin-bottom: 12px; }
            .badge { background: #e2e8f0; padding: 4px 8px; border-radius: 999px; }
            .footer { margin-top: 12px; font-size: 11px; color: #6b7280; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>تقرير الموظفين</h2>
              <div class="brand">${reportBrandName || 'نظام إدارة الموظفين المتكامل'}</div>
            </div>
            ${showLogo && logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="${logoName || 'logo'}" />` : ''}
            <div class="meta">
              <span>تم الإنشاء في: ${reportStampText}</span>
              <span>التصفية: ${tableQuery.trim() || 'بدون'}</span>
              <span>الفرز: ${sortLabels[tableSortKey]} (${tableSortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'})</span>
            </div>
          </div>
          <div class="summary">
            <span class="badge">المصدر: جدول الموظفين</span>
            <span class="badge">عدد السجلات المصدرة: ${sortedTableEmployees.length}</span>
            <span class="badge">إجمالي الموظفين: ${tableTotal}</span>
            <span class="badge">رقم التقرير: ${reportStampId}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>رقم الموظف</th>
                <th>البريد</th>
                <th>القسم</th>
                <th>المنصب</th>
                <th>الحالة</th>
                <th>تاريخ التعيين</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">تم إنشاء التقرير تلقائياً لأغراض داخلية. رقم التقرير: ${reportStampId}</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1024,height=720');
    if (!printWindow) {
      setNotice('تعذر فتح نافذة الطباعة');
      setTimeout(() => setNotice(''), 2000);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  useEffect(() => {
    const loadRecentEmployees = async () => {
      setRecentEmployeesLoading(true);
      setRecentEmployeesError('');
      try {
        const result = await EmployeeClient.listEmployees({ limit: 6, skip: 0 });
        setRecentEmployees(result.data || []);
      } catch (err: any) {
        setRecentEmployeesError(err.message || 'تعذر تحميل قائمة الموظفين');
        setRecentEmployees([]);
      } finally {
        setRecentEmployeesLoading(false);
      }
    };

    loadRecentEmployees();
    loadNotifications();
  }, []);

  useEffect(() => {
    try {
      const storedBrand = localStorage.getItem('employeePdfBrandName');
      const storedLogo = localStorage.getItem('employeePdfLogoDataUrl');
      const storedLogoName = localStorage.getItem('employeePdfLogoName');
      const storedLogoSize = localStorage.getItem('employeePdfLogoSize');
      const storedShowLogo = localStorage.getItem('employeePdfShowLogo');
      const storedLogoLibrary = localStorage.getItem('employeePdfLogoLibrary');
      const storedRiskFilter = localStorage.getItem('employeeTableRiskFilter');
      const storedDepartmentFilter = localStorage.getItem('employeeTableDepartmentFilter');
      const storedStatusFilter = localStorage.getItem('employeeTableStatusFilter');
      const storedTableQuery = localStorage.getItem('employeeTableQuery');
      const storedSortKey = localStorage.getItem('employeeTableSortKey');
      const storedSortDirection = localStorage.getItem('employeeTableSortDirection');
      const storedTableLimit = localStorage.getItem('employeeTableLimit');

      if (storedBrand) setReportBrandName(storedBrand);
      if (storedLogo) setLogoDataUrl(storedLogo);
      if (storedLogoName) setLogoName(storedLogoName);
      if (storedLogoSize) setLogoSize(Number(storedLogoSize));
      if (storedShowLogo) setShowLogo(storedShowLogo === 'true');
      if (storedLogoLibrary) {
        const parsed = JSON.parse(storedLogoLibrary) as Array<{ name: string; dataUrl: string }>;
        setLogoLibrary(parsed);
      }
      if (storedRiskFilter) {
        setTableRiskFilter(storedRiskFilter as 'all' | 'low' | 'medium' | 'high');
      }
      if (storedDepartmentFilter) {
        setTableDepartmentFilter(storedDepartmentFilter);
      }
      if (storedStatusFilter) {
        setTableStatusFilter(storedStatusFilter);
      }
      if (storedTableQuery) {
        setTableQuery(storedTableQuery);
      }
      if (storedSortKey) {
        setTableSortKey(
          storedSortKey as
            | 'name'
            | 'employeeId'
            | 'email'
            | 'department'
            | 'position'
            | 'status'
            | 'hireDate'
            | 'retentionRisk'
        );
      }
      if (storedSortDirection) {
        setTableSortDirection(storedSortDirection as 'asc' | 'desc');
      }
      if (storedTableLimit) {
        setTableLimit(Number(storedTableLimit));
      }

      // استعادة إحصائيات التصدير
      const storedExportStats = localStorage.getItem('employeeExportStats');
      if (storedExportStats) {
        const parsed = JSON.parse(storedExportStats);
        setExportStats({
          totalExports: parsed.totalExports || 0,
          totalRecords: parsed.totalRecords || 0,
          lastExportTime: parsed.lastExportTime ? new Date(parsed.lastExportTime) : null,
        });
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    // حفظ إحصائيات التصدير عند تغييرها
    try {
      localStorage.setItem('employeeExportStats', JSON.stringify(exportStats));
    } catch {
      // ignore storage errors
    }
  }, [exportStats]);

  useEffect(() => {
    // تنفيذ التصدير التلقائي
    if (!autoExportEnabled || sortedTableEmployees.length === 0) return;

    const intervalId = setInterval(() => {
      exportTableCsv();
      setNotice('✅ تم التصدير التلقائي');
      setTimeout(() => setNotice(''), 3000);
    }, autoExportInterval * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [autoExportEnabled, autoExportInterval, sortedTableEmployees]);

  useEffect(() => {
    const loadEmployees = async () => {
      setTableLoading(true);
      setTableError('');
      try {
        const response: any = await EmployeeClient.listEmployees({
          limit: tableLimit,
          skip: (tablePage - 1) * tableLimit,
        });
        setTableEmployees(response.data || []);
        setTableTotal(response.total || 0);
      } catch (err: any) {
        setTableError(err.message || 'تعذر تحميل جدول الموظفين');
        setTableEmployees([]);
        setTableTotal(0);
      } finally {
        setTableLoading(false);
      }
    };

    loadEmployees();
  }, [tablePage, tableLimit]);

  useEffect(() => {
    try {
      localStorage.setItem('employeePdfBrandName', reportBrandName);
      localStorage.setItem('employeePdfLogoDataUrl', logoDataUrl);
      localStorage.setItem('employeePdfLogoName', logoName);
      localStorage.setItem('employeePdfLogoSize', String(logoSize));
      localStorage.setItem('employeePdfShowLogo', String(showLogo));
      localStorage.setItem('employeePdfLogoLibrary', JSON.stringify(logoLibrary));
      localStorage.setItem('employeeTableRiskFilter', tableRiskFilter);
      localStorage.setItem('employeeTableDepartmentFilter', tableDepartmentFilter);
      localStorage.setItem('employeeTableStatusFilter', tableStatusFilter);
      localStorage.setItem('employeeTableQuery', tableQuery);
      localStorage.setItem('employeeTableSortKey', tableSortKey);
      localStorage.setItem('employeeTableSortDirection', tableSortDirection);
      localStorage.setItem('employeeTableLimit', String(tableLimit));
    } catch {
      // ignore storage errors
    }
  }, [
    reportBrandName,
    logoDataUrl,
    logoName,
    logoSize,
    showLogo,
    logoLibrary,
    tableRiskFilter,
    tableDepartmentFilter,
    tableStatusFilter,
    tableQuery,
    tableSortKey,
    tableSortDirection,
    tableLimit,
  ]);

  const loadProfile = async (id: string) => {
    if (!id.trim()) {
      setError('يرجى إدخال رقم الموظف');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const trimmedId = id.trim();
      const result = await EmployeeClient.getEmployeeProfile(trimmedId);
      setProfile(result.data);
      setRecentIds(prev => [trimmedId, ...prev.filter(item => item !== trimmedId)].slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'فشل تحميل ملف الموظف');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    await loadProfile(employeeId);
  };

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query || query.length < 2) {
      setSearchError('يرجى إدخال حرفين على الأقل');
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    try {
      const result = await EmployeeClient.searchEmployees(query);
      setSearchResults(result.data || []);
    } catch (err: any) {
      setSearchError(err.message || 'فشل البحث');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const filteredTableEmployees = useMemo(() => {
    const query = tableQuery.trim().toLowerCase();
    return tableEmployees.filter((employee: any) => {
      const matchesDepartment =
        tableDepartmentFilter === 'all' || employee.department === tableDepartmentFilter;
      const matchesStatus = tableStatusFilter === 'all' || employee.status === tableStatusFilter;
      const riskValue = employee.aiInsights?.retentionRisk ?? -1;
      const matchesRisk =
        tableRiskFilter === 'all'
          ? true
          : tableRiskFilter === 'high'
            ? riskValue >= 0.7
            : tableRiskFilter === 'medium'
              ? riskValue >= 0.4 && riskValue < 0.7
              : riskValue >= 0 && riskValue < 0.4;
      const matchesQuery = !query
        ? true
        : [
            employee.employeeId,
            employee.firstName,
            employee.lastName,
            employee.email,
            employee.department,
            employee.position,
          ]
            .map(value => String(value || '').toLowerCase())
            .some(value => value.includes(query));

      return matchesDepartment && matchesStatus && matchesRisk && matchesQuery;
    });
  }, [tableEmployees, tableQuery, tableDepartmentFilter, tableStatusFilter, tableRiskFilter]);

  const tableDepartments = useMemo(() => {
    const items = new Set(
      tableEmployees.map((employee: any) => employee.department).filter(Boolean)
    );
    return Array.from(items).sort((a, b) => String(a).localeCompare(String(b), 'ar'));
  }, [tableEmployees]);

  const tableStatuses = useMemo(() => {
    const items = new Set(tableEmployees.map((employee: any) => employee.status).filter(Boolean));
    return Array.from(items).sort((a, b) => String(a).localeCompare(String(b), 'ar'));
  }, [tableEmployees]);

  const tableStatusCounts = useMemo(() => {
    return tableEmployees.reduce((acc: Record<string, number>, employee: any) => {
      const key = employee.status || 'غير محدد';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [tableEmployees]);

  const sortedTableEmployees = useMemo(() => {
    const sorted = [...filteredTableEmployees];
    const getValue = (employee: any) => {
      switch (tableSortKey) {
        case 'name':
          return `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
        case 'employeeId':
          return employee.employeeId || '';
        case 'email':
          return employee.email || '';
        case 'department':
          return employee.department || '';
        case 'position':
          return employee.position || '';
        case 'status':
          return employee.status || '';
        case 'hireDate':
          return employee.hireDate ? new Date(employee.hireDate).getTime() : 0;
        case 'retentionRisk':
          return employee.aiInsights?.retentionRisk ?? -1;
        default:
          return '';
      }
    };

    sorted.sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return tableSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return tableSortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue), 'ar')
        : String(bValue).localeCompare(String(aValue), 'ar');
    });

    return sorted;
  }, [filteredTableEmployees, tableSortDirection, tableSortKey]);

  const handleSort = (key: typeof tableSortKey) => {
    if (tableSortKey === key) {
      setTableSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSortKey(key);
      setTableSortDirection('asc');
    }
  };

  const totalPages = Math.max(1, Math.ceil(tableTotal / tableLimit));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">ملف الموظف الشامل</h2>
          <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
            استعرض الملخص الكامل للموظف، الأداء، الحضور، والإجازات
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                fetchProfile();
              }
            }}
            placeholder="رقم الموظف (مثال: EMP-1234)"
            className="px-4 py-2 rounded-lg border outline-none"
            style={{
              backgroundColor: theme.colors.background.paper,
              borderColor: theme.colors.border.main,
              color: theme.colors.text.primary,
            }}
          />
          <button
            onClick={fetchProfile}
            className="px-4 py-2 rounded-lg font-semibold"
            style={{
              backgroundColor: theme.colors.primary[600],
              color: theme.colors.text.inverse,
            }}
          >
            بحث
          </button>
          <button
            onClick={() => {
              setEmployeeId('');
              setProfile(null);
              setError('');
            }}
            className="px-4 py-2 rounded-lg font-semibold"
            style={{
              backgroundColor: theme.colors.surface.secondary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.main}`,
            }}
          >
            مسح
          </button>
          {profile && (
            <button
              onClick={saveEmployeeFile}
              className="px-4 py-2 rounded-lg font-semibold"
              style={{
                backgroundColor: theme.colors.success.main,
                color: theme.colors.text.inverse,
              }}
              title="حفظ ملف الموظف بصيغة JSON"
            >
              💾 حفظ الملف
            </button>
          )}
          <button
            onClick={openAddDialog}
            className="px-4 py-2 rounded-lg font-semibold"
            style={{
              backgroundColor: theme.colors.primary[600],
              color: theme.colors.text.inverse,
            }}
            title="إضافة موظف جديد"
          >
            ➕ إضافة موظف
          </button>
          <button
            onClick={openBulkImportDialog}
            className="px-4 py-2 rounded-lg font-semibold"
            style={{
              backgroundColor: theme.colors.info.main,
              color: theme.colors.text.inverse,
            }}
            title="استيراد موظفين من Excel/CSV"
          >
            📤 استيراد جماعي
          </button>
          <button
            onClick={openDashboardDialog}
            className="px-4 py-2 rounded-lg font-semibold"
            style={{
              backgroundColor: theme.colors.secondary[600],
              color: theme.colors.text.inverse,
            }}
            title="لوحة المعلومات والإحصائيات"
          >
            📊 لوحة المعلومات
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="px-4 py-2 rounded-lg font-semibold relative"
              style={{
                backgroundColor: theme.colors.warning.main,
                color: theme.colors.text.inverse,
              }}
              title="الإشعارات"
            >
              🔔 إشعارات
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div
                className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-lg shadow-2xl z-50"
                style={{
                  backgroundColor: theme.colors.background.paper,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                {notifications.length === 0 ? (
                  <div className="p-4 text-center" style={{ color: theme.colors.text.secondary }}>
                    لا توجد إشعارات
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkNotificationRead(notif.id)}
                      className="p-3 border-b cursor-pointer hover:bg-opacity-50"
                      style={{
                        backgroundColor: notif.read ? 'transparent' : theme.colors.primary[50],
                        borderColor: theme.colors.border.light,
                      }}
                    >
                      <div className="font-semibold">{notif.title}</div>
                      <div className="text-sm" style={{ color: theme.colors.text.secondary }}>
                        {notif.message}
                      </div>
                      <div className="text-xs mt-1" style={{ color: theme.colors.text.disabled }}>
                        {new Date(notif.createdAt).toLocaleString('ar-SA')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {recentList.length > 0 && (
        <div
          className="flex items-center gap-2 flex-wrap text-sm"
          style={{ color: theme.colors.text.secondary }}
        >
          <span>آخر عمليات بحث:</span>
          {recentList.map(item => (
            <button
              key={item}
              onClick={() => setEmployeeId(item)}
              className="px-3 py-1 rounded-full"
              style={{
                backgroundColor: theme.colors.surface.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.main}`,
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {notice && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ backgroundColor: theme.colors.info.light, color: theme.colors.info.contrast }}
        >
          {notice}
        </div>
      )}

      <div
        className="p-4 rounded-xl space-y-3"
        style={{ backgroundColor: theme.colors.surface.primary }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">أحدث الموظفين</h3>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              وصول سريع لأحدث الموظفين المسجلين
            </p>
          </div>
          <button
            onClick={async () => {
              setRecentEmployeesLoading(true);
              setRecentEmployeesError('');
              try {
                const result = await EmployeeClient.listEmployees({ limit: 6, skip: 0 });
                setRecentEmployees(result.data || []);
              } catch (err: any) {
                setRecentEmployeesError(err.message || 'تعذر تحميل قائمة الموظفين');
                setRecentEmployees([]);
              } finally {
                setRecentEmployeesLoading(false);
              }
            }}
            className="px-4 py-2 rounded-lg text-sm font-semibold"
            style={{
              backgroundColor: theme.colors.surface.secondary,
              color: theme.colors.text.primary,
              border: `1px solid ${theme.colors.border.main}`,
            }}
          >
            تحديث القائمة
          </button>
        </div>

        {recentEmployeesError && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              backgroundColor: theme.colors.error.light,
              color: theme.colors.error.contrast,
            }}
          >
            {recentEmployeesError}
          </div>
        )}

        {recentEmployeesLoading && (
          <div className="text-sm" style={{ color: theme.colors.text.secondary }}>
            جارٍ تحميل الموظفين...
          </div>
        )}

        {!recentEmployeesLoading && recentEmployees.length === 0 && !recentEmployeesError && (
          <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
            لا توجد بيانات موظفين حالياً
          </p>
        )}

        {!recentEmployeesLoading && recentEmployees.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recentEmployees.slice(0, 6).map(employee => (
              <div
                key={employee.employeeId}
                className="p-3 rounded-lg flex flex-col gap-2"
                style={{ backgroundColor: theme.colors.surface.secondary }}
              >
                <div>
                  <p className="font-semibold">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
                    {employee.employeeId} • {employee.department}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEmployeeId(employee.employeeId);
                    loadProfile(employee.employeeId);
                  }}
                  className="px-3 py-1 rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: theme.colors.primary[600],
                    color: theme.colors.text.inverse,
                  }}
                >
                  فتح الملف
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="p-4 rounded-xl space-y-3"
        style={{ backgroundColor: theme.colors.surface.primary }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">بحث سريع عن الموظفين</h3>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              ابحث بالاسم أو البريد أو رقم الموظف
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="ابحث عن موظف"
              className="px-4 py-2 rounded-lg border outline-none"
              style={{
                backgroundColor: theme.colors.background.paper,
                borderColor: theme.colors.border.main,
                color: theme.colors.text.primary,
              }}
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 rounded-lg font-semibold"
              style={{
                backgroundColor: theme.colors.primary[600],
                color: theme.colors.text.inverse,
              }}
            >
              بحث سريع
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setSearchError('');
              }}
              className="px-4 py-2 rounded-lg font-semibold"
              style={{
                backgroundColor: theme.colors.surface.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.main}`,
              }}
            >
              مسح
            </button>
          </div>
        </div>

        {searchError && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              backgroundColor: theme.colors.error.light,
              color: theme.colors.error.contrast,
            }}
          >
            {searchError}
          </div>
        )}

        {searchLoading && (
          <div className="text-sm" style={{ color: theme.colors.text.secondary }}>
            جارٍ البحث...
          </div>
        )}

        {!searchLoading && searchResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {searchResults.slice(0, 6).map(result => (
              <div
                key={result.employeeId}
                className="p-3 rounded-lg flex flex-col gap-2"
                style={{ backgroundColor: theme.colors.surface.secondary }}
              >
                <div>
                  <p className="font-semibold">
                    {result.firstName} {result.lastName}
                  </p>
                  <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
                    {result.employeeId} • {result.department}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEmployeeId(result.employeeId);
                    loadProfile(result.employeeId);
                  }}
                  className="px-3 py-1 rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: theme.colors.primary[600],
                    color: theme.colors.text.inverse,
                  }}
                >
                  فتح الملف
                </button>
              </div>
            ))}
          </div>
        )}

        {!searchLoading &&
          searchResults.length === 0 &&
          searchQuery.trim().length >= 2 &&
          !searchError && (
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              لا توجد نتائج مطابقة
            </p>
          )}
      </div>

      <div
        className="p-4 rounded-xl space-y-3"
        style={{ backgroundColor: theme.colors.surface.primary }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">جدول الموظفين</h3>
            <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
              عرض كامل مع تصفية وترقيم صفحات
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={tableQuery}
              onChange={e => setTableQuery(e.target.value)}
              placeholder="تصفية الجدول"
              className="px-4 py-2 rounded-lg border outline-none"
              style={{
                backgroundColor: theme.colors.background.paper,
                borderColor: theme.colors.border.main,
                color: theme.colors.text.primary,
              }}
            />
            <select
              value={tableDepartmentFilter}
              onChange={e => {
                setTableDepartmentFilter(e.target.value);
                setTablePage(1);
              }}
              className="px-3 py-2 rounded-lg border outline-none"
              style={{
                backgroundColor: theme.colors.background.paper,
                borderColor: theme.colors.border.main,
                color: theme.colors.text.primary,
              }}
            >
              <option value="all">كل الأقسام</option>
              {tableDepartments.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={tableStatusFilter}
              onChange={e => {
                setTableStatusFilter(e.target.value);
                setTablePage(1);
              }}
              className="px-3 py-2 rounded-lg border outline-none"
              style={{
                backgroundColor: theme.colors.background.paper,
                borderColor: theme.colors.border.main,
                color: theme.colors.text.primary,
              }}
            >
              <option value="all">كل الحالات</option>
              {tableStatuses.map(status => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={tableRiskFilter}
              onChange={e => {
                setTableRiskFilter(e.target.value as 'all' | 'low' | 'medium' | 'high');
                setTablePage(1);
              }}
              className="px-3 py-2 rounded-lg border outline-none"
              style={{
                backgroundColor: theme.colors.background.paper,
                borderColor: theme.colors.border.main,
                color: theme.colors.text.primary,
              }}
            >
              <option value="all">كل المخاطر</option>
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">مرتفعة</option>
            </select>
            <select
              value={tableLimit}
              onChange={e => {
                setTableLimit(Number(e.target.value));
                setTablePage(1);
              }}
              className="px-3 py-2 rounded-lg border outline-none"
              style={{
                backgroundColor: theme.colors.background.paper,
                borderColor: theme.colors.border.main,
                color: theme.colors.text.primary,
              }}
            >
              {[10, 20, 50].map(size => (
                <option key={size} value={size}>
                  {size} لكل صفحة
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setTablePage(1);
                setTableQuery('');
                setTableDepartmentFilter('all');
                setTableStatusFilter('all');
                setTableRiskFilter('all');
              }}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.surface.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.main}`,
              }}
            >
              مسح التصفية
            </button>
            <button
              onClick={resetTableSettings}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.surface.primary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.main}`,
              }}
            >
              إعادة تعيين الجدول
            </button>
            <button
              onClick={exportTableCsv}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.primary[600],
                color: theme.colors.text.inverse,
              }}
            >
              تصدير CSV
            </button>
            <button
              onClick={exportTablePdf}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.surface.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.main}`,
              }}
            >
              تنزيل PDF
            </button>
            <button
              onClick={exportTablePdf}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.primary[700] || theme.colors.primary[600],
                color: theme.colors.text.inverse,
              }}
            >
              تصدير التقرير الحالي
            </button>
            <button
              onClick={quickExportSimple}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.surface.secondary,
                color: theme.colors.text.primary,
                border: `2px solid ${theme.colors.primary[600]}`,
              }}
              title="تصدير سريع بتنسيق مبسط للطباعة"
            >
              ⚡ طباعة سريعة
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.success.main,
                color: theme.colors.text.inverse,
              }}
              title="تصدير إلى Excel"
            >
              📗 Excel
            </button>
            <button
              onClick={openAdvancedSearchDialog}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.secondary[600],
                color: theme.colors.text.inverse,
              }}
              title="بحث متقدم بمعايير متعددة"
            >
              🔍 بحث متقدم
            </button>
            <button
              onClick={openLeaveRequestsDialog}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.warning.main,
                color: theme.colors.text.inverse,
              }}
              title="عرض طلبات الإجازة"
            >
              📋 طلبات الإجازة
            </button>
            <button
              onClick={() => openAuditLogDialog()}
              className="px-3 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.info.main,
                color: theme.colors.text.inverse,
              }}
              title="سجل التعديلات"
            >
              📜 سجل التدقيق
            </button>
          </div>
        </div>

        {exportStats.totalExports > 0 && (
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: theme.colors.info.light, color: theme.colors.info.contrast }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-4">
                <span>
                  📊 <strong>إجمالي العمليات:</strong> {exportStats.totalExports}
                </span>
                <span>
                  📄 <strong>إجمالي السجلات:</strong> {exportStats.totalRecords.toLocaleString('ar-SA')}
                </span>
                {exportStats.lastExportTime && (
                  <span>
                    🕒 <strong>آخر تصدير:</strong>{' '}
                    {exportStats.lastExportTime.toLocaleString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  setExportStats({ totalExports: 0, totalRecords: 0, lastExportTime: null })
                }
                className="px-2 py-1 rounded text-xs font-semibold"
                style={{
                  backgroundColor: theme.colors.info.main,
                  color: theme.colors.text.inverse,
                }}
              >
                إعادة تعيين
              </button>
            </div>
          </div>
        )}

        {exportPreview && (
          <div
            className="p-4 rounded-lg border-2 animate-pulse"
            style={{
              backgroundColor: theme.colors.success.light,
              borderColor: theme.colors.success.main,
              color: theme.colors.success.contrast,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-bold mb-2">✅ جاري التصدير...</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <p className="flex-1">
                      <strong>اسم الملف:</strong> {exportPreview.filename}
                    </p>
                    <button
                      onClick={() => handleCopy(exportPreview.filename, 'تم نسخ اسم الملف')}
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: theme.colors.success.main,
                        color: theme.colors.text.inverse,
                      }}
                    >
                      نسخ
                    </button>
                  </div>
                  <p>
                    <strong>عدد السجلات:</strong> {exportPreview.count} موظف
                  </p>
                  {exportPreview.filters.length > 0 && (
                    <div>
                      <strong>الفلاتر النشطة:</strong>
                      <ul className="list-disc list-inside mr-4 mt-1">
                        {exportPreview.filters.map((filter, idx) => (
                          <li key={idx}>{filter}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setExportPreview(null)}
                className="px-2 py-1 rounded text-xs font-bold"
                style={{
                  backgroundColor: theme.colors.success.main,
                  color: theme.colors.text.inverse,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div
          className="flex flex-wrap gap-2 text-xs"
          style={{ color: theme.colors.text.secondary }}
        >
          {Object.entries(tableStatusCounts).map(([status, count]) => (
            <span
              key={status}
              className="px-3 py-1 rounded-full"
              style={{
                backgroundColor: theme.colors.surface.secondary,
                color: theme.colors.text.primary,
              }}
            >
              {status}: {count}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: theme.colors.surface.secondary }}
          >
            <h4 className="font-semibold mb-2">⚙️ إعدادات التصدير التلقائي</h4>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoExportEnabled}
                  onChange={e => setAutoExportEnabled(e.target.checked)}
                />
                <span>تفعيل التصدير التلقائي</span>
              </label>
              {autoExportEnabled && (
                <>
                  <label className="flex flex-col gap-1">
                    <span>الفترة الزمنية (دقيقة)</span>
                    <select
                      value={autoExportInterval}
                      onChange={e => setAutoExportInterval(Number(e.target.value))}
                      className="px-3 py-2 rounded-lg border outline-none"
                      style={{
                        backgroundColor: theme.colors.background.paper,
                        borderColor: theme.colors.border.main,
                        color: theme.colors.text.primary,
                      }}
                    >
                      <option value={5}>كل 5 دقائق</option>
                      <option value={15}>كل 15 دقيقة</option>
                      <option value={30}>كل 30 دقيقة</option>
                      <option value={60}>كل ساعة</option>
                      <option value={180}>كل 3 ساعات</option>
                      <option value={360}>كل 6 ساعات</option>
                    </select>
                  </label>
                  <div
                    className="p-2 rounded text-xs"
                    style={{
                      backgroundColor: theme.colors.warning.light,
                      color: theme.colors.warning.contrast,
                    }}
                  >
                    ⚠️ التصدير التلقائي نشط - سيتم التصدير تلقائياً كل {autoExportInterval} دقيقة
                  </div>
                </>
              )}
            </div>
          </div>
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: theme.colors.surface.secondary }}
          >
            <h4 className="font-semibold mb-2">إعدادات التقرير</h4>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex flex-col gap-1">
                اسم العلامة
                <input
                  value={reportBrandName}
                  onChange={e => setReportBrandName(e.target.value)}
                  placeholder="اسم الشركة"
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.background.paper,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={e => setShowLogo(e.target.checked)}
                />
                عرض الشعار في PDF
              </label>
              <label className="flex items-center gap-2">
                حجم الشعار
                <input
                  type="range"
                  min={32}
                  max={96}
                  value={logoSize}
                  onChange={e => setLogoSize(Number(e.target.value))}
                />
                <span>{logoSize}px</span>
              </label>
              <button
                onClick={resetReportSettings}
                className="px-3 py-2 rounded-lg text-sm font-semibold"
                style={{
                  backgroundColor: theme.colors.surface.primary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                إعادة تعيين الإعدادات
              </button>
              <button
                onClick={clearLogoOnly}
                className="px-3 py-2 rounded-lg text-sm font-semibold"
                style={{
                  backgroundColor: theme.colors.surface.primary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                مسح الشعار فقط
              </button>
            </div>
          </div>
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: theme.colors.surface.secondary }}
          >
            <h4 className="font-semibold mb-2">رفع الشعار</h4>
            <div className="flex flex-col gap-2 text-sm">
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setLogoDataUrl(String(reader.result || ''));
                    setLogoName(file.name);
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {logoDataUrl ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={saveLogoToLibrary}
                      className="px-3 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: theme.colors.primary[600],
                        color: theme.colors.text.inverse,
                      }}
                    >
                      حفظ في القائمة
                    </button>
                    <button
                      onClick={clearLogoOnly}
                      className="px-3 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: theme.colors.surface.primary,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border.main}`,
                      }}
                    >
                      مسح الشعار
                    </button>
                  </div>
                  <img
                    src={logoDataUrl}
                    alt={logoName || 'logo'}
                    style={{ width: 64, height: 64, objectFit: 'contain' }}
                  />
                  <div>
                    <p>{logoName}</p>
                    <button
                      onClick={() => {
                        setLogoDataUrl('');
                        setLogoName('');
                      }}
                      className="px-3 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: theme.colors.surface.primary,
                        color: theme.colors.text.primary,
                        border: `1px solid ${theme.colors.border.main}`,
                      }}
                    >
                      إزالة الشعار
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ color: theme.colors.text.secondary }}>لم يتم رفع شعار بعد</p>
              )}
              {logoLibrary.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
                    شعارات محفوظة
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {logoLibrary.map(item => (
                      <div
                        key={item.dataUrl}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg"
                        style={{ backgroundColor: theme.colors.surface.primary }}
                      >
                        <img
                          src={item.dataUrl}
                          alt={item.name}
                          style={{ width: 32, height: 32, objectFit: 'contain' }}
                        />
                        <button
                          onClick={() => applyLogoFromLibrary(item)}
                          className="text-xs font-semibold"
                          style={{ color: theme.colors.primary[600] }}
                        >
                          {item.name}
                        </button>
                        <button
                          onClick={() => removeLogoFromLibrary(item.dataUrl)}
                          className="text-xs"
                          style={{ color: theme.colors.error.main }}
                        >
                          إزالة
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {tableError && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              backgroundColor: theme.colors.error.light,
              color: theme.colors.error.contrast,
            }}
          >
            {tableError}
          </div>
        )}

        {tableLoading && (
          <div className="text-sm" style={{ color: theme.colors.text.secondary }}>
            جارٍ تحميل الجدول...
          </div>
        )}

        {!tableLoading && sortedTableEmployees.length === 0 && !tableError && (
          <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
            لا توجد بيانات للعرض
          </p>
        )}

        {!tableLoading && sortedTableEmployees.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ color: theme.colors.text.secondary }}>
                  <th className="text-right py-2">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1">
                      الاسم
                      {tableSortKey === 'name' && (tableSortDirection === 'asc' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="text-right py-2">
                    <button
                      onClick={() => handleSort('employeeId')}
                      className="flex items-center gap-1"
                    >
                      رقم الموظف
                      {tableSortKey === 'employeeId' && (tableSortDirection === 'asc' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="text-right py-2">
                    <button onClick={() => handleSort('email')} className="flex items-center gap-1">
                      البريد
                      {tableSortKey === 'email' && (tableSortDirection === 'asc' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="text-right py-2">
                    <button
                      onClick={() => handleSort('department')}
                      className="flex items-center gap-1"
                    >
                      القسم
                      {tableSortKey === 'department' && (tableSortDirection === 'asc' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="text-right py-2">
                    <button
                      onClick={() => handleSort('position')}
                      className="flex items-center gap-1"
                    >
                      المنصب
                      {tableSortKey === 'position' && (tableSortDirection === 'asc' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="text-right py-2">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1"
                    >
                      الحالة
                      {tableSortKey === 'status' && (tableSortDirection === 'asc' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="text-right py-2">
                    <button
                      onClick={() => handleSort('retentionRisk')}
                      className="flex items-center gap-1"
                    >
                      مخاطر الاستقالة
                      {tableSortKey === 'retentionRisk' &&
                        (tableSortDirection === 'asc' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="text-right py-2">
                    <button
                      onClick={() => handleSort('hireDate')}
                      className="flex items-center gap-1"
                    >
                      تاريخ التعيين
                      {tableSortKey === 'hireDate' && (tableSortDirection === 'asc' ? '▲' : '▼')}
                    </button>
                  </th>
                  <th className="text-right py-2">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {sortedTableEmployees.map(employee => (
                  <tr
                    key={employee.employeeId}
                    className="border-t"
                    style={{ borderColor: theme.colors.border.main }}
                  >
                    <td className="py-2">
                      {employee.firstName} {employee.lastName}
                    </td>
                    <td className="py-2">{employee.employeeId}</td>
                    <td className="py-2">{employee.email}</td>
                    <td className="py-2">{employee.department}</td>
                    <td className="py-2">{employee.position}</td>
                    <td className="py-2">{employee.status}</td>
                    <td className="py-2">
                      {employee.aiInsights?.retentionRisk !== undefined ? (
                        <span
                          className="px-2 py-1 rounded-full text-xs"
                          style={{
                            backgroundColor:
                              employee.aiInsights.retentionRisk >= 0.7
                                ? theme.colors.error.light
                                : employee.aiInsights.retentionRisk >= 0.4
                                  ? theme.colors.warning.light
                                  : theme.colors.success.light,
                            color:
                              employee.aiInsights.retentionRisk >= 0.7
                                ? theme.colors.error.contrast
                                : employee.aiInsights.retentionRisk >= 0.4
                                  ? theme.colors.warning.contrast
                                  : theme.colors.success.contrast,
                          }}
                        >
                          {formatRetentionRisk(employee.aiInsights.retentionRisk)}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="py-2">{formatDate(employee.hireDate)}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          onClick={() => {
                            setEmployeeId(employee.employeeId);
                            loadProfile(employee.employeeId);
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: theme.colors.primary[600],
                            color: theme.colors.text.inverse,
                          }}
                          title="فتح الملف"
                        >
                          📂
                        </button>
                        <button
                          onClick={() => openEditDialog(employee)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: theme.colors.info.main,
                            color: theme.colors.text.inverse,
                          }}
                          title="تعديل"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => openPerformanceDialog(employee)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: theme.colors.secondary[600],
                            color: theme.colors.text.inverse,
                          }}
                          title="تقييم الأداء"
                        >
                          ⭐
                        </button>
                        <button
                          onClick={() => openTransferDialog(employee)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: theme.colors.warning.main,
                            color: theme.colors.text.inverse,
                          }}
                          title="نقل بين الفروع"
                        >
                          🔄
                        </button>
                        <button
                          onClick={() => openDeleteDialog(employee)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: theme.colors.error.main,
                            color: theme.colors.text.inverse,
                          }}
                          title="حذف"
                        >
                          🗑️
                        </button>
                        <button
                          onClick={() => openAuditLogDialog(employee)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: theme.colors.info.dark,
                            color: theme.colors.text.inverse,
                          }}
                          title="سجل التعديلات"
                        >
                          📜
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
            صفحة {tablePage} من {totalPages} • إجمالي {formatNumber(tableTotal, '0')} موظف
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTablePage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: theme.colors.surface.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.main}`,
              }}
              disabled={tablePage <= 1}
            >
              السابق
            </button>
            <button
              onClick={() => setTablePage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1 rounded-lg text-xs font-semibold"
              style={{
                backgroundColor: theme.colors.surface.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.main}`,
              }}
              disabled={tablePage >= totalPages}
            >
              التالي
            </button>
          </div>
        </div>
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
          جارٍ تحميل بيانات الموظف...
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() =>
                handleCopy(
                  profile.summary?.fullName || safeEmployee.employeeId || '',
                  'تم نسخ الاسم بنجاح'
                )
              }
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.surface.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.main}`,
              }}
            >
              نسخ الاسم
            </button>
            <button
              onClick={() => handleCopy(safeEmployee.employeeId || '', 'تم نسخ رقم الموظف بنجاح')}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.surface.secondary,
                color: theme.colors.text.primary,
                border: `1px solid ${theme.colors.border.main}`,
              }}
            >
              نسخ رقم الموظف
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.colors.primary[600],
                color: theme.colors.text.inverse,
              }}
            >
              تصدير JSON
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                الاسم
              </p>
              <p className="text-lg font-bold">{profile.summary.fullName}</p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                القسم
              </p>
              <p className="text-lg font-bold">{profile.summary.department}</p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                المنصب
              </p>
              <p className="text-lg font-bold">{profile.summary.position}</p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                الحالة
              </p>
              <p className="text-lg font-bold">{profile.summary.status}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                رقم الموظف
              </p>
              <p className="text-lg font-bold">{safeEmployee.employeeId || '--'}</p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                العمر
              </p>
              <p className="text-lg font-bold">{formatNumber(profile.summary.age, '--')}</p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                مدة الخدمة
              </p>
              <p className="text-lg font-bold">
                {profile.summary.tenure?.years ?? 0} سنة • {profile.summary.tenure?.months ?? 0} شهر
              </p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                موقع العمل
              </p>
              <p className="text-lg font-bold">{profile.summary.workLocation || '--'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">الإجازات</h3>
              <p className="text-sm">المتبقي: {profile.leave.remainingDays} يوم</p>
              <p className="text-sm">المستخدم: {profile.leave.usedDays} يوم</p>
              <p className="text-sm">معدل الاستخدام: {profile.leave.utilizationRate}%</p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">الحضور (آخر 30 يوم)</h3>
              <p className="text-sm">حضور: {profile.attendance.last30Days.present}</p>
              <p className="text-sm">غياب: {profile.attendance.last30Days.absent}</p>
              <p className="text-sm">
                متوسط الساعات: {profile.attendance.last30Days.averageHoursWorked}
              </p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">الأداء</h3>
              <p className="text-sm">
                التقييم الحالي: {formatNumber(profile.performance.rating, '--')}
              </p>
              <p className="text-sm">
                آخر تقييم: {formatDate(profile.performance.lastEvaluationDate)}
              </p>
              <p className="text-sm">
                عدد التقييمات الأخيرة: {profile.performance.recentEvaluations.length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">مستندات تنتهي قريباً</h3>
              {profile.documents.expiringSoon.length === 0 ? (
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  لا توجد مستندات تنتهي خلال 30 يوم
                </p>
              ) : (
                <ul className="space-y-2">
                  {profile.documents.expiringSoon.slice(0, 5).map((doc: any, index: number) => (
                    <li key={`${doc.name}-${index}`} className="text-sm">
                      {doc.name} • متبقي {doc.daysRemaining} يوم
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">مؤشرات الذكاء الاصطناعي</h3>
              <p className="text-sm">
                مخاطر الاستقالة: {formatRetentionRisk(profile.aiInsights.retentionRisk)}
              </p>
              <p className="text-sm">
                توقع الأداء: {formatNumber(profile.aiInsights.performancePrediction, '--')}
              </p>
              <p className="text-sm">
                مجالات تطوير: {profile.aiInsights.developmentAreas?.length || 0}
              </p>
              <p className="text-sm">
                توصيات تدريب: {profile.aiInsights.recommendedTrainings?.length || 0}
              </p>
              <p className="text-sm">
                مسارات وظيفية: {profile.aiInsights.careerPathSuggestions?.length || 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">آخر سجل حضور</h3>
              {profile.attendance.lastRecord ? (
                <div className="space-y-1 text-sm">
                  <p>التاريخ: {formatDate(profile.attendance.lastRecord.date)}</p>
                  <p>الحالة: {profile.attendance.lastRecord.status}</p>
                  <p>
                    ساعات العمل: {formatNumber(profile.attendance.lastRecord.hoursWorked, '--')}
                  </p>
                </div>
              ) : (
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  لا توجد سجلات حضور مؤخراً
                </p>
              )}
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">آخر إجازة</h3>
              {profile.leave.lastLeave ? (
                <div className="space-y-1 text-sm">
                  <p>النوع: {profile.leave.lastLeave.leaveType}</p>
                  <p>
                    الفترة: {formatDate(profile.leave.lastLeave.startDate)} -{' '}
                    {formatDate(profile.leave.lastLeave.endDate)}
                  </p>
                  <p>الحالة: {profile.leave.lastLeave.status}</p>
                </div>
              ) : (
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  لا توجد إجازات مسجلة
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">مؤشرات الأداء (KPIs)</h3>
              {(profile.performance.kpis || []).length === 0 ? (
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  لا توجد مؤشرات أداء مسجلة
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {profile.performance.kpis.slice(0, 5).map((kpi: any, index: number) => (
                    <li key={`${kpi.metric}-${index}`}>
                      {kpi.metric} • الهدف {formatNumber(kpi.target, '--')} • الفعلي{' '}
                      {formatNumber(kpi.actual, '--')} • {kpi.quarter}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">تفاصيل الذكاء الاصطناعي</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="font-semibold">مجالات التطوير</p>
                  {(profile.aiInsights.developmentAreas || []).length === 0 ? (
                    <p style={{ color: theme.colors.text.secondary }}>لا توجد بيانات</p>
                  ) : (
                    <ul className="list-disc list-inside">
                      {profile.aiInsights.developmentAreas
                        .slice(0, 5)
                        .map((item: string, index: number) => (
                          <li key={`dev-${index}`}>{item}</li>
                        ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="font-semibold">توصيات التدريب</p>
                  {(profile.aiInsights.recommendedTrainings || []).length === 0 ? (
                    <p style={{ color: theme.colors.text.secondary }}>لا توجد بيانات</p>
                  ) : (
                    <ul className="list-disc list-inside">
                      {profile.aiInsights.recommendedTrainings
                        .slice(0, 5)
                        .map((item: string, index: number) => (
                          <li key={`train-${index}`}>{item}</li>
                        ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="font-semibold">مسارات وظيفية</p>
                  {(profile.aiInsights.careerPathSuggestions || []).length === 0 ? (
                    <p style={{ color: theme.colors.text.secondary }}>لا توجد بيانات</p>
                  ) : (
                    <ul className="list-disc list-inside">
                      {profile.aiInsights.careerPathSuggestions
                        .slice(0, 5)
                        .map((item: string, index: number) => (
                          <li key={`path-${index}`}>{item}</li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">بيانات التواصل</h3>
              <p className="text-sm">البريد الوظيفي: {safeEmployee.email || '--'}</p>
              <p className="text-sm">البريد الشخصي: {safeEmployee.personalEmail || '--'}</p>
              <p className="text-sm">الهاتف: {safeEmployee.phone || '--'}</p>
              <p className="text-sm">المدير المباشر: {safeEmployee.reportingManager || '--'}</p>
              <p className="text-sm">تاريخ التعيين: {formatDate(safeEmployee.hireDate)}</p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">العنوان والطوارئ</h3>
              <p className="text-sm">
                العنوان: {safeEmployee.address?.city || '--'} •{' '}
                {safeEmployee.address?.country || '--'}
              </p>
              <p className="text-sm">تفاصيل الشارع: {safeEmployee.address?.street || '--'}</p>
              <p className="text-sm">رمز بريدي: {safeEmployee.address?.postalCode || '--'}</p>
              <p className="text-sm">جهة الطوارئ: {safeEmployee.emergencyContact?.name || '--'}</p>
              <p className="text-sm">
                هاتف الطوارئ: {safeEmployee.emergencyContact?.phone || '--'}
              </p>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">التعويضات</h3>
              <p className="text-sm">
                الراتب: {formatNumber(safeEmployee.salary, '--')} {safeEmployee.currency || ''}
              </p>
              <p className="text-sm">الدورية: {safeEmployee.salaryFrequency || '--'}</p>
              <p className="text-sm">آخر مراجعة: {formatDate(safeEmployee.lastSalaryReview)}</p>
              <p className="text-sm">المكافأة: {formatNumber(safeEmployee.bonus, '--')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">المهارات واللغات</h3>
              <div className="flex flex-wrap gap-2">
                {(safeEmployee.skills || []).length === 0 && (
                  <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                    لا توجد مهارات مسجلة
                  </p>
                )}
                {(safeEmployee.skills || []).map((skill: string) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor: theme.colors.surface.secondary,
                      color: theme.colors.text.primary,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <div className="mt-3 space-y-1">
                {(safeEmployee.languages || []).length === 0 && (
                  <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                    لا توجد لغات مسجلة
                  </p>
                )}
                {(safeEmployee.languages || []).map((lang: any, index: number) => (
                  <p key={`${lang.language}-${index}`} className="text-sm">
                    {lang.language} • {lang.proficiency}
                  </p>
                ))}
              </div>
            </div>
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.surface.primary }}
            >
              <h3 className="font-semibold mb-2">التعليم والشهادات</h3>
              <div className="space-y-2">
                {(safeEmployee.education || []).length === 0 && (
                  <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                    لا توجد مؤهلات مسجلة
                  </p>
                )}
                {(safeEmployee.education || []).slice(0, 3).map((edu: any, index: number) => (
                  <div key={`${edu.degree}-${index}`} className="text-sm">
                    {edu.degree} • {edu.institution} ({edu.graduationYear})
                  </div>
                ))}
                {(safeEmployee.certifications || []).slice(0, 3).map((cert: any, index: number) => (
                  <div key={`${cert.name}-${index}`} className="text-sm">
                    {cert.name} • {formatDate(cert.issueDate)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* حوار التعديل */}
      {showEditDialog && selectedEmployee && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEditDialog(false)}
        >
          <div
            className="rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: theme.colors.background.paper }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">
              تعديل بيانات: {selectedEmployee.firstName} {selectedEmployee.lastName}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">الاسم الأول</span>
                  <input
                    value={editForm.firstName}
                    onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="px-3 py-2 rounded-lg border outline-none"
                    style={{
                      backgroundColor: theme.colors.surface.primary,
                      borderColor: theme.colors.border.main,
                      color: theme.colors.text.primary,
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">الاسم الأخير</span>
                  <input
                    value={editForm.lastName}
                    onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="px-3 py-2 rounded-lg border outline-none"
                    style={{
                      backgroundColor: theme.colors.surface.primary,
                      borderColor: theme.colors.border.main,
                      color: theme.colors.text.primary,
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">البريد الإلكتروني</span>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="px-3 py-2 rounded-lg border outline-none"
                    style={{
                      backgroundColor: theme.colors.surface.primary,
                      borderColor: theme.colors.border.main,
                      color: theme.colors.text.primary,
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">القسم</span>
                  <input
                    value={editForm.department}
                    onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                    className="px-3 py-2 rounded-lg border outline-none"
                    style={{
                      backgroundColor: theme.colors.surface.primary,
                      borderColor: theme.colors.border.main,
                      color: theme.colors.text.primary,
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">المنصب</span>
                  <input
                    value={editForm.position}
                    onChange={e => setEditForm({ ...editForm, position: e.target.value })}
                    className="px-3 py-2 rounded-lg border outline-none"
                    style={{
                      backgroundColor: theme.colors.surface.primary,
                      borderColor: theme.colors.border.main,
                      color: theme.colors.text.primary,
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">الحالة</span>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="px-3 py-2 rounded-lg border outline-none"
                    style={{
                      backgroundColor: theme.colors.surface.primary,
                      borderColor: theme.colors.border.main,
                      color: theme.colors.text.primary,
                    }}
                  >
                    <option value="نشط">نشط</option>
                    <option value="معلق">معلق</option>
                    <option value="إجازة">إجازة</option>
                    <option value="منتهي">منتهي</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">الفرع</span>
                  <input
                    value={editForm.branch}
                    onChange={e => setEditForm({ ...editForm, branch: e.target.value })}
                    className="px-3 py-2 rounded-lg border outline-none"
                    style={{
                      backgroundColor: theme.colors.surface.primary,
                      borderColor: theme.colors.border.main,
                      color: theme.colors.text.primary,
                    }}
                  />
                </label>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowEditDialog(false)}
                  className="px-4 py-2 rounded-lg font-semibold"
                  style={{
                    backgroundColor: theme.colors.surface.secondary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.main}`,
                  }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdateEmployee}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg font-semibold"
                  style={{
                    backgroundColor: theme.colors.primary[600],
                    color: theme.colors.text.inverse,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* حوار الحذف */}
      {showDeleteDialog && selectedEmployee && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDeleteDialog(false)}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full"
            style={{ backgroundColor: theme.colors.background.paper }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4 text-center">⚠️ تأكيد الحذف</h3>
            <p className="text-center mb-6" style={{ color: theme.colors.text.secondary }}>
              هل أنت متأكد من حذف الموظف:
              <br />
              <strong className="text-lg" style={{ color: theme.colors.text.primary }}>
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </strong>
              <br />
              <span className="text-sm" style={{ color: theme.colors.error.main }}>
                ({selectedEmployee.employeeId})
              </span>
              <br />
              <br />
              <span className="text-sm" style={{ color: theme.colors.error.main }}>
                هذا الإجراء لا يمكن التراجع عنه!
              </span>
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-6 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.surface.secondary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={loading}
                className="px-6 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.error.main,
                  color: theme.colors.text.inverse,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* حوار النقل بين الفروع */}
      {showTransferDialog && selectedEmployee && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowTransferDialog(false)}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full"
            style={{ backgroundColor: theme.colors.background.paper }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">🔄 نقل بين الفروع</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm mb-2" style={{ color: theme.colors.text.secondary }}>
                  الموظف: <strong>{selectedEmployee.firstName} {selectedEmployee.lastName}</strong>
                </p>
                <p className="text-sm mb-4" style={{ color: theme.colors.text.secondary }}>
                  الفرع الحالي:{' '}
                  <strong style={{ color: theme.colors.text.primary }}>
                    {selectedEmployee.branch || 'غير محدد'}
                  </strong>
                </p>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الفرع الجديد</span>
                <select
                  value={transferBranch}
                  onChange={e => setTransferBranch(e.target.value)}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                >
                  <option value="">-- اختر الفرع --</option>
                  {branches.map(branch => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">تاريخ النقل</span>
                <input
                  type="date"
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setShowTransferDialog(false)}
                  className="px-4 py-2 rounded-lg font-semibold"
                  style={{
                    backgroundColor: theme.colors.surface.secondary,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.main}`,
                  }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleTransferEmployee}
                  disabled={loading || !transferBranch}
                  className="px-4 py-2 rounded-lg font-semibold"
                  style={{
                    backgroundColor: theme.colors.warning.main,
                    color: theme.colors.text.inverse,
                    opacity: loading || !transferBranch ? 0.6 : 1,
                  }}
                >
                  {loading ? 'جاري النقل...' : 'تأكيد النقل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* حوار إضافة موظف جديد */}
      {showAddDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddDialog(false)}
        >
          <div
            className="rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: theme.colors.background.paper }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">➕ إضافة موظف جديد</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الاسم الأول *</span>
                <input
                  value={newEmployeeForm.firstName}
                  onChange={e =>
                    setNewEmployeeForm({ ...newEmployeeForm, firstName: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الاسم الأخير *</span>
                <input
                  value={newEmployeeForm.lastName}
                  onChange={e =>
                    setNewEmployeeForm({ ...newEmployeeForm, lastName: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">البريد الإلكتروني *</span>
                <input
                  type="email"
                  value={newEmployeeForm.email}
                  onChange={e => setNewEmployeeForm({ ...newEmployeeForm, email: e.target.value })}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">رقم الهاتف</span>
                <input
                  type="tel"
                  value={newEmployeeForm.phone}
                  onChange={e => setNewEmployeeForm({ ...newEmployeeForm, phone: e.target.value })}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">القسم *</span>
                <input
                  value={newEmployeeForm.department}
                  onChange={e =>
                    setNewEmployeeForm({ ...newEmployeeForm, department: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">المنصب *</span>
                <input
                  value={newEmployeeForm.position}
                  onChange={e =>
                    setNewEmployeeForm({ ...newEmployeeForm, position: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الراتب</span>
                <input
                  type="number"
                  value={newEmployeeForm.salary}
                  onChange={e => setNewEmployeeForm({ ...newEmployeeForm, salary: e.target.value })}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الفرع</span>
                <input
                  value={newEmployeeForm.branch}
                  onChange={e => setNewEmployeeForm({ ...newEmployeeForm, branch: e.target.value })}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">تاريخ التوظيف *</span>
                <input
                  type="date"
                  value={newEmployeeForm.hireDate}
                  onChange={e =>
                    setNewEmployeeForm({ ...newEmployeeForm, hireDate: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الحالة</span>
                <select
                  value={newEmployeeForm.status}
                  onChange={e => setNewEmployeeForm({ ...newEmployeeForm, status: e.target.value })}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                >
                  <option value="نشط">نشط</option>
                  <option value="معلق">معلق</option>
                  <option value="إجازة">إجازة</option>
                </select>
              </label>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.surface.secondary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleAddEmployee}
                disabled={loading}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.primary[600],
                  color: theme.colors.text.inverse,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'جاري الإضافة...' : 'إضافة موظف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* حوار الاستيراد الجماعي */}
      {showBulkImportDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowBulkImportDialog(false)}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full"
            style={{ backgroundColor: theme.colors.background.paper }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">📤 استيراد موظفين جماعي</h3>
            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-lg" style={{ backgroundColor: theme.colors.info.light }}>
                <p className="text-sm font-semibold mb-2">📋 تنسيق الملف المطلوب:</p>
                <ul
                  className="text-xs space-y-1"
                  style={{ color: theme.colors.text.secondary, listStyle: 'disc inside' }}
                >
                  <li>الصيغة المدعومة: CSV أو Excel (.xlsx)</li>
                  <li>الأعمدة المطلوبة: firstName, lastName, email, department, position</li>
                  <li>اختياري: phone, branch, salary, hireDate, status</li>
                </ul>
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold">اختر ملف للاستيراد</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              {importFile && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: theme.colors.success.light }}>
                  <p className="text-sm font-semibold">✅ الملف المحدد:</p>
                  <p className="text-xs" style={{ color: theme.colors.text.secondary }}>
                    {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowBulkImportDialog(false)}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.surface.secondary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleBulkImport}
                disabled={loading || !importFile}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.info.main,
                  color: theme.colors.text.inverse,
                  opacity: loading || !importFile ? 0.6 : 1,
                }}
              >
                {loading ? 'جاري الاستيراد...' : 'استيراد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* حوار تقييم الأداء */}
      {showPerformanceDialog && selectedEmployee && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPerformanceDialog(false)}
        >
          <div
            className="rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: theme.colors.background.paper }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">
              ⭐ تقييم أداء: {selectedEmployee.firstName} {selectedEmployee.lastName}
            </h3>
            <div className="space-y-4 mb-6">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">التقييم (1-10)</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={performanceForm.rating}
                  onChange={e =>
                    setPerformanceForm({ ...performanceForm, rating: Number(e.target.value) })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">فترة التقييم</span>
                <input
                  type="date"
                  value={performanceForm.period}
                  onChange={e => setPerformanceForm({ ...performanceForm, period: e.target.value })}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الأهداف المحددة</span>
                <textarea
                  value={performanceForm.goals}
                  onChange={e => setPerformanceForm({ ...performanceForm, goals: e.target.value })}
                  rows={3}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الإنجازات</span>
                <textarea
                  value={performanceForm.achievements}
                  onChange={e =>
                    setPerformanceForm({ ...performanceForm, achievements: e.target.value })
                  }
                  rows={3}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">مجالات التحسين</span>
                <textarea
                  value={performanceForm.improvements}
                  onChange={e =>
                    setPerformanceForm({ ...performanceForm, improvements: e.target.value })
                  }
                  rows={3}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">ملاحظات إضافية</span>
                <textarea
                  value={performanceForm.notes}
                  onChange={e => setPerformanceForm({ ...performanceForm, notes: e.target.value })}
                  rows={2}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowPerformanceDialog(false)}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.surface.secondary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleAddPerformanceReview}
                disabled={loading}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.secondary[600],
                  color: theme.colors.text.inverse,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'جاري الحفظ...' : 'حفظ التقييم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* حوار طلبات الإجازة */}
      {showLeaveRequestsDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLeaveRequestsDialog(false)}
        >
          <div
            className="rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: theme.colors.background.paper }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">📋 طلبات الإجازة</h3>
            {leaveRequests.length === 0 ? (
              <div
                className="text-center py-12"
                style={{ color: theme.colors.text.secondary }}
              >
                لا توجد طلبات إجازة
              </div>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: theme.colors.surface.primary,
                      borderColor: theme.colors.border.main,
                    }}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-semibold mb-1">
                          {request.employeeName} - {request.department}
                        </div>
                        <div className="text-sm" style={{ color: theme.colors.text.secondary }}>
                          <div>📅 من: {request.startDate} إلى: {request.endDate}</div>
                          <div>📝 السبب: {request.reason}</div>
                          <div>
                            الحالة:{' '}
                            <span
                              className="font-semibold"
                              style={{
                                color:
                                  request.status === 'معلق'
                                    ? theme.colors.warning.main
                                    : request.status === 'موافق عليه'
                                      ? theme.colors.success.main
                                      : theme.colors.error.main,
                              }}
                            >
                              {request.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      {request.status === 'معلق' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveLeave(request.id, true)}
                            disabled={loading}
                            className="px-3 py-2 rounded-lg text-sm font-semibold"
                            style={{
                              backgroundColor: theme.colors.success.main,
                              color: theme.colors.text.inverse,
                              opacity: loading ? 0.6 : 1,
                            }}
                          >
                            ✅ موافقة
                          </button>
                          <button
                            onClick={() => handleApproveLeave(request.id, false)}
                            disabled={loading}
                            className="px-3 py-2 rounded-lg text-sm font-semibold"
                            style={{
                              backgroundColor: theme.colors.error.main,
                              color: theme.colors.text.inverse,
                              opacity: loading ? 0.6 : 1,
                            }}
                          >
                            ❌ رفض
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowLeaveRequestsDialog(false)}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.surface.secondary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* حوار سجل التدقيق */}
      {showAuditLogDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAuditLogDialog(false)}
        >
          <div
            className="rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: theme.colors.background.paper }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">📜 سجل التعديلات</h3>
            {auditLog.length === 0 ? (
              <div
                className="text-center py-12"
                style={{ color: theme.colors.text.secondary }}
              >
                لا توجد سجلات تدقيق
              </div>
            ) : (
              <div className="space-y-2">
                {auditLog.map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border-l-4"
                    style={{
                      backgroundColor: theme.colors.surface.primary,
                      borderColor:
                        log.action === 'CREATE'
                          ? theme.colors.success.main
                          : log.action === 'UPDATE'
                            ? theme.colors.info.main
                            : theme.colors.error.main,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{log.action}</span>
                          <span className="text-sm" style={{ color: theme.colors.text.secondary }}>
                            {log.employeeName || `Emp-${log.employeeId}`}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: theme.colors.text.secondary }}>
                          <div>👤 بواسطة: {log.userName}</div>
                          <div>🕒 {new Date(log.timestamp).toLocaleString('ar-SA')}</div>
                          {log.changes && (
                            <div className="mt-1">
                              📝 التغييرات: <code className="text-xs">{log.changes}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowAuditLogDialog(false)}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.surface.secondary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* حوار البحث المتقدم */}
      {showAdvancedSearchDialog && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAdvancedSearchDialog(false)}
        >
          <div
            className="rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: theme.colors.background.paper }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">🔍 البحث المتقدم</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الاسم</span>
                <input
                  value={searchCriteria.name}
                  onChange={e => setSearchCriteria({ ...searchCriteria, name: e.target.value })}
                  placeholder="أدخل الاسم الأول أو الأخير"
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">القسم</span>
                <input
                  value={searchCriteria.department}
                  onChange={e =>
                    setSearchCriteria({ ...searchCriteria, department: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">المنصب</span>
                <input
                  value={searchCriteria.position}
                  onChange={e => setSearchCriteria({ ...searchCriteria, position: e.target.value })}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الحالة</span>
                <select
                  value={searchCriteria.status}
                  onChange={e => setSearchCriteria({ ...searchCriteria, status: e.target.value })}
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                >
                  <option value="">الكل</option>
                  <option value="نشط">نشط</option>
                  <option value="معلق">معلق</option>
                  <option value="إجازة">إجازة</option>
                  <option value="منتهي">منتهي</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الحد الأدنى للراتب</span>
                <input
                  type="number"
                  value={searchCriteria.minSalary}
                  onChange={e =>
                    setSearchCriteria({ ...searchCriteria, minSalary: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">الحد الأقصى للراتب</span>
                <input
                  type="number"
                  value={searchCriteria.maxSalary}
                  onChange={e =>
                    setSearchCriteria({ ...searchCriteria, maxSalary: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">تاريخ التوظيف من</span>
                <input
                  type="date"
                  value={searchCriteria.hireFromDate}
                  onChange={e =>
                    setSearchCriteria({ ...searchCriteria, hireFromDate: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold">تاريخ التوظيف إلى</span>
                <input
                  type="date"
                  value={searchCriteria.hireToDate}
                  onChange={e =>
                    setSearchCriteria({ ...searchCriteria, hireToDate: e.target.value })
                  }
                  className="px-3 py-2 rounded-lg border outline-none"
                  style={{
                    backgroundColor: theme.colors.surface.primary,
                    borderColor: theme.colors.border.main,
                    color: theme.colors.text.primary,
                  }}
                />
              </label>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setShowAdvancedSearchDialog(false)}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.surface.secondary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleAdvancedSearch}
                disabled={loading}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.secondary[600],
                  color: theme.colors.text.inverse,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'جاري البحث...' : 'بحث'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* حوار لوحة المعلومات */}
      {showDashboardDialog && dashboardStats && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDashboardDialog(false)}
        >
          <div
            className="rounded-xl p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: theme.colors.background.paper }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-6">📊 لوحة المعلومات والإحصائيات</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: theme.colors.primary[100] }}
              >
                <div className="text-3xl font-bold" style={{ color: theme.colors.primary[600] }}>
                  {dashboardStats.totalEmployees}
                </div>
                <div className="text-sm mt-1" style={{ color: theme.colors.text.secondary }}>
                  إجمالي الموظفين
                </div>
              </div>
              <div
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: theme.colors.success[100] }}
              >
                <div className="text-3xl font-bold" style={{ color: theme.colors.success.main }}>
                  {dashboardStats.activeEmployees}
                </div>
                <div className="text-sm mt-1" style={{ color: theme.colors.text.secondary }}>
                  موظفين نشطين
                </div>
              </div>
              <div
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: theme.colors.warning[100] }}
              >
                <div className="text-3xl font-bold" style={{ color: theme.colors.warning.main }}>
                  {dashboardStats.onLeave || 0}
                </div>
                <div className="text-sm mt-1" style={{ color: theme.colors.text.secondary }}>
                  في إجازة
                </div>
              </div>
              <div
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: theme.colors.info[100] }}
              >
                <div className="text-3xl font-bold" style={{ color: theme.colors.info.main }}>
                  {dashboardStats.departments || 0}
                </div>
                <div className="text-sm mt-1" style={{ color: theme.colors.text.secondary }}>
                  عدد الأقسام
                </div>
              </div>
            </div>
            {dashboardStats.departmentBreakdown && (
              <div className="mb-6">
                <h4 className="font-bold mb-3">توزيع الموظفين حسب القسم</h4>
                <div className="space-y-2">
                  {dashboardStats.departmentBreakdown.map((dept: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ backgroundColor: theme.colors.surface.primary }}
                    >
                      <span className="font-semibold">{dept.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${(dept.count / dashboardStats.totalEmployees) * 100}%`,
                              backgroundColor: theme.colors.primary[600],
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{dept.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setShowDashboardDialog(false)}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: theme.colors.surface.secondary,
                  color: theme.colors.text.primary,
                  border: `1px solid ${theme.colors.border.main}`,
                }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfileDashboard;
