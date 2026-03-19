/**
 * EmployeeListPage.jsx - Employee List Management Page
 * صفحة قائمة الموظفين
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/EmployeeListPage.css';

const EmployeeListPage = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, [currentPage, searchTerm, filterDepartment, filterStatus]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/employees', {
        params: {
          page: currentPage,
          search: searchTerm,
          department: filterDepartment,
          status: filterStatus,
          limit: 20,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      setEmployees(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async employeeId => {
    if (window.confirm('هل تريد حذف هذا الموظف؟')) {
      try {
        await axios.delete(`/api/employees/${employeeId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        fetchEmployees();
      } catch (error) {
        alert('حدث خطأ في الحذف');
      }
    }
  };

  const handleExport = async format => {
    try {
      const response = await axios.post(
        '/api/employees/export',
        { format },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          responseType: format === 'pdf' ? 'blob' : 'json',
        }
      );

      if (format === 'pdf') {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'employees.pdf');
        document.body.appendChild(link);
        link.click();
      }
    } catch (error) {
      alert('فشل التصدير');
    }
  };

  return (
    <div className="employee-list-page">
      <header className="page-header">
        <h1>إدارة الموظفين</h1>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => navigate('/employees/new')}>
            ➕ إضافة موظف جديد
          </button>
          <button className="btn btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            🔍 الفلاتر
          </button>
          <div className="export-menu">
            <button className="btn btn-export" title="تصدير">
              📥
            </button>
            <div className="export-options">
              <button onClick={() => handleExport('csv')}>CSV</button>
              <button onClick={() => handleExport('excel')}>Excel</button>
              <button onClick={() => handleExport('pdf')}>PDF</button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters Section */}
      {showFilters && (
        <div className="filters-section">
          <div className="filter-group">
            <label>البحث</label>
            <input
              type="text"
              placeholder="البحث باسم أو رقم الموظف..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>القسم</label>
            <select
              value={filterDepartment}
              onChange={e => {
                setFilterDepartment(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="">جميع الأقسام</option>
              <option value="engineering">الهندسة</option>
              <option value="sales">المبيعات</option>
              <option value="operations">العمليات</option>
              <option value="admin">الإدارة</option>
            </select>
          </div>

          <div className="filter-group">
            <label>الحالة</label>
            <select
              value={filterStatus}
              onChange={e => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="filter-select"
            >
              <option value="">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="on_leave">في إجازة</option>
            </select>
          </div>

          <button
            className="btn btn-outline"
            onClick={() => {
              setSearchTerm('');
              setFilterDepartment('');
              setFilterStatus('');
              setCurrentPage(1);
            }}
          >
            مسح الفلاتر
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading">جاري التحميل...</div>
      ) : (
        <>
          {/* Table */}
          <div className="table-responsive">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد الإلكتروني</th>
                  <th>القسم</th>
                  <th>المنصب</th>
                  <th>الحالة</th>
                  <th>تاريخ الالتحاق</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">
                      لا توجد بيانات موظفين
                    </td>
                  </tr>
                ) : (
                  employees.map(employee => (
                    <tr key={employee.id}>
                      <td className="name-cell">
                        <span className="employee-avatar">{employee.name.charAt(0)}</span>
                        <span>{employee.name}</span>
                      </td>
                      <td>{employee.email}</td>
                      <td>{employee.department}</td>
                      <td>{employee.position}</td>
                      <td>
                        <span className={`status-badge status-${employee.status}`}>
                          {employee.statusLabel}
                        </span>
                      </td>
                      <td>{new Date(employee.joinDate).toLocaleDateString('ar-SA')}</td>
                      <td className="actions-cell">
                        <button
                          className="btn-action view"
                          onClick={() => navigate(`/employees/${employee.id}`)}
                          title="عرض"
                        >
                          👁️
                        </button>
                        <button
                          className="btn-action edit"
                          onClick={() => navigate(`/employees/${employee.id}/edit`)}
                          title="تعديل"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-action delete"
                          onClick={() => handleDelete(employee.id)}
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                السابق
              </button>

              <div className="pagination-info">
                صفحة {currentPage} من {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmployeeListPage;
