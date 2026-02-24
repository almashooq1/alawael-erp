/**
 * واجهة إدارة الهياكل التعويضية
 * Compensation Structure Management Component
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CompensationStructureManagement.css';

const CompensationStructureManagement = () => {
  const [structures, setStructures] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    isActive: true,
    applicableTo: {
      scope: 'all',
      departments: [],
      roles: [],
      salaryRange: { min: 0, max: 999999 }
    },
    fixedAllowances: [
      { name: 'السكن', amount: 600 },
      { name: 'النقل', amount: 200 },
      { name: 'الوجبات', amount: 150 }
    ],
    incentiveStructure: {
      performance: { percentage: 10, minScore: 80 },
      attendance: { amount: 50, baselinePercentage: 100 },
      safety: { amount: 75 },
      loyalty: { percentage: 5, yearsRequired: 5 },
      project: { amount: 100 },
      seasonal: { amount: 200, months: [12] }
    },
    mandatoryDeductions: {
      incomeTax: { brackets: [] },
      socialSecurity: { percentage: 6, maxAmount: 1000 },
      healthInsurance: { percentage: 2, amount: 50 },
      GOSI: { percentage: 3, maxAmount: 2000, minAmount: 100 }
    },
    paidLeave: {
      annualDays: 30,
      accruedPerMonth: 2.5
    }
  });

  // تحميل الهياكل
  useEffect(() => {
    loadStructures();
  }, []);

  const loadStructures = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        '/api/payroll/compensation/structures',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStructures(response.data || []);
      setError(null);
    } catch (err) {
      setError('خطأ في تحميل الهياكل: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (editingId) {
        await axios.put(
          `/api/payroll/compensation/structures/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('تم تحديث الهيكل بنجاح');
      } else {
        await axios.post(
          '/api/payroll/compensation/structures',
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('تم إنشاء الهيكل بنجاح');
      }

      resetForm();
      loadStructures();
    } catch (err) {
      setError('خطأ في الحفظ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (structure) => {
    setFormData(structure);
    setEditingId(structure._id);
    setShowForm(true);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل تريد حذف هذا الهيكل؟')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(
          `/api/payroll/compensation/structures/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('تم حذف الهيكل بنجاح');
        loadStructures();
      } catch (err) {
        setError('خطأ في الحذف: ' + err.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      isActive: true,
      applicableTo: { scope: 'all', departments: [], roles: [], salaryRange: { min: 0, max: 999999 } },
      fixedAllowances: [
        { name: 'السكن', amount: 600 },
        { name: 'النقل', amount: 200 },
        { name: 'الوجبات', amount: 150 }
      ],
      incentiveStructure: {
        performance: { percentage: 10, minScore: 80 },
        attendance: { amount: 50, baselinePercentage: 100 },
        safety: { amount: 75 },
        loyalty: { percentage: 5, yearsRequired: 5 },
        project: { amount: 100 },
        seasonal: { amount: 200, months: [12] }
      },
      mandatoryDeductions: {
        incomeTax: { brackets: [] },
        socialSecurity: { percentage: 6, maxAmount: 1000 },
        healthInsurance: { percentage: 2, amount: 50 },
        GOSI: { percentage: 3, maxAmount: 2000, minAmount: 100 }
      },
      paidLeave: { annualDays: 30, accruedPerMonth: 2.5 }
    });
    setEditingId(null);
    setShowForm(false);
  };

  const updateAllowance = (index, field, value) => {
    const newAllowances = [...formData.fixedAllowances];
    newAllowances[index][field] = field === 'amount' ? parseFloat(value) : value;
    setFormData({ ...formData, fixedAllowances: newAllowances });
  };

  const addAllowance = () => {
    setFormData({
      ...formData,
      fixedAllowances: [...formData.fixedAllowances, { name: '', amount: 0 }]
    });
  };

  const removeAllowance = (index) => {
    const newAllowances = formData.fixedAllowances.filter((_, i) => i !== index);
    setFormData({ ...formData, fixedAllowances: newAllowances });
  };

  if (loading && !showForm) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="compensation-management">
      {error && (
        <div className="error-alert">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="page-header">
        <h2>إدارة الهياكل التعويضية</h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'إلغاء' : '+ إضافة هيكل جديد'}
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <h3>{editingId ? 'تحرير الهيكل' : 'إضافة هيكل جديد'}</h3>

          <form onSubmit={handleSubmit}>
            {/* المعلومات الأساسية */}
            <div className="form-section">
              <h4>المعلومات الأساسية</h4>

              <div className="form-group">
                <label>اسم الهيكل *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>تاريخ البدء الفعلي</label>
                  <input
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    نشط
                  </label>
                </div>
              </div>
            </div>

            {/* التطبيق على */}
            <div className="form-section">
              <h4>التطبيق على</h4>

              <div className="form-group">
                <label>النطاق</label>
                <select
                  value={formData.applicableTo.scope}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      applicableTo: { ...formData.applicableTo, scope: e.target.value }
                    })
                  }
                >
                  <option value="all">الكل</option>
                  <option value="department">القسم</option>
                  <option value="role">الدور/المنصب</option>
                  <option value="position">الوظيفة</option>
                  <option value="custom">مخصص</option>
                </select>
              </div>

              {formData.applicableTo.scope === 'department' && (
                <div className="form-group">
                  <label>الأقسام (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: IT, HR, Finance"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        applicableTo: {
                          ...formData.applicableTo,
                          departments: e.target.value.split(',').map(d => d.trim())
                        }
                      })
                    }
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>الراتب الأدنى</label>
                  <input
                    type="number"
                    value={formData.applicableTo.salaryRange.min}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        applicableTo: {
                          ...formData.applicableTo,
                          salaryRange: {
                            ...formData.applicableTo.salaryRange,
                            min: parseFloat(e.target.value)
                          }
                        }
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>الراتب الأقصى</label>
                  <input
                    type="number"
                    value={formData.applicableTo.salaryRange.max}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        applicableTo: {
                          ...formData.applicableTo,
                          salaryRange: {
                            ...formData.applicableTo.salaryRange,
                            max: parseFloat(e.target.value)
                          }
                        }
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* المزايا الثابتة */}
            <div className="form-section">
              <h4>المزايا الثابتة</h4>

              {formData.fixedAllowances.map((allowance, index) => (
                <div key={index} className="allowance-row">
                  <input
                    type="text"
                    placeholder="اسم المزية"
                    value={allowance.name}
                    onChange={(e) => updateAllowance(index, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="المبلغ"
                    value={allowance.amount}
                    onChange={(e) => updateAllowance(index, 'amount', e.target.value)}
                  />
                  {formData.fixedAllowances.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeAllowance(index)}
                    >
                      حذف
                    </button>
                  )}
                </div>
              ))}

              <button type="button" className="btn-add-allowance" onClick={addAllowance}>
                + إضافة مزية
              </button>
            </div>

            {/* الخصومات الإلزامية */}
            <div className="form-section">
              <h4>الخصومات الإلزامية</h4>

              <div className="form-row">
                <div className="form-group">
                  <label>الضمان الاجتماعي (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.mandatoryDeductions.socialSecurity.percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mandatoryDeductions: {
                          ...formData.mandatoryDeductions,
                          socialSecurity: {
                            ...formData.mandatoryDeductions.socialSecurity,
                            percentage: parseFloat(e.target.value)
                          }
                        }
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>التأمين الصحي (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.mandatoryDeductions.healthInsurance.percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mandatoryDeductions: {
                          ...formData.mandatoryDeductions,
                          healthInsurance: {
                            ...formData.mandatoryDeductions.healthInsurance,
                            percentage: parseFloat(e.target.value)
                          }
                        }
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>GOSI (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.mandatoryDeductions.GOSI.percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mandatoryDeductions: {
                          ...formData.mandatoryDeductions,
                          GOSI: {
                            ...formData.mandatoryDeductions.GOSI,
                            percentage: parseFloat(e.target.value)
                          }
                        }
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* الإجازات */}
            <div className="form-section">
              <h4>الإجازات المأجورة</h4>

              <div className="form-row">
                <div className="form-group">
                  <label>أيام الإجازة السنوية</label>
                  <input
                    type="number"
                    value={formData.paidLeave.annualDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paidLeave: {
                          ...formData.paidLeave,
                          annualDays: parseFloat(e.target.value)
                        }
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>الاستحقاق الشهري</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.paidLeave.accruedPerMonth}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paidLeave: {
                          ...formData.paidLeave,
                          accruedPerMonth: parseFloat(e.target.value)
                        }
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-success" disabled={loading}>
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button type="button" className="btn-cancel" onClick={resetForm}>
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* قائمة الهياكل */}
      <div className="structures-grid">
        {structures.length === 0 ? (
          <div className="no-data">لا توجد هياكل تعويضية</div>
        ) : (
          structures.map((structure) => (
            <div key={structure._id} className="structure-card">
              <div className="card-header">
                <h4>{structure.name}</h4>
                <span className={`status ${structure.isActive ? 'active' : 'inactive'}`}>
                  {structure.isActive ? 'نشط' : 'غير نشط'}
                </span>
              </div>

              <div className="card-body">
                <p className="description">{structure.description}</p>

                <div className="info-section">
                  <h5>المزايا الثابتة</h5>
                  <ul>
                    {structure.fixedAllowances?.map((allowance, idx) => (
                      <li key={idx}>
                        {allowance.name}: {allowance.amount} SAR
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="info-section">
                  <h5>الخصومات</h5>
                  <ul>
                    <li>ضمان اجتماعي: {structure.mandatoryDeductions?.socialSecurity?.percentage}%</li>
                    <li>تأمين صحي: {structure.mandatoryDeductions?.healthInsurance?.percentage}%</li>
                    <li>GOSI: {structure.mandatoryDeductions?.GOSI?.percentage}%</li>
                  </ul>
                </div>

                <div className="info-section">
                  <strong>الإجازات السنوية: {structure.paidLeave?.annualDays} يوم</strong>
                </div>
              </div>

              <div className="card-actions">
                <button className="btn-edit" onClick={() => handleEdit(structure)}>
                  تحرير
                </button>
                <button className="btn-delete" onClick={() => handleDelete(structure._id)}>
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CompensationStructureManagement;
