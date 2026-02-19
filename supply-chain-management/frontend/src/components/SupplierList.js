import React, { useEffect, useState } from 'react';
import apiClient from '../utils/api';
import SupplierForm from './SupplierForm';
import Modal from './Modal';
import { exportToExcel } from '../utils/exportToExcel';
import { exportToPDF } from '../utils/exportToPDF';

function SupplierList({ user, notify }) {
  const [suppliers, setSuppliers] = useState([]);
  const [editSupplier, setEditSupplier] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSuppliers = () => {
    setLoading(true);
    setError('');
    apiClient
      .get('/api/suppliers')
      .then(res => setSuppliers(res.data.data || res.data.suppliers || res.data))
      .catch(() => setError('حدث خطأ أثناء تحميل الموردين'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleDelete = async id => {
    if (window.confirm('هل أنت متأكد من حذف هذا المورد؟')) {
      try {
        await apiClient.delete(`/api/suppliers/${id}`);
        fetchSuppliers();
        notify && notify('تم حذف المورد بنجاح', 'success');
      } catch (err) {
        notify && notify('حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleEdit = supplier => {
    setEditSupplier(supplier);
    setModalOpen(true);
  };

  const handleEditSave = async data => {
    try {
      await apiClient.put(`/api/suppliers/${editSupplier._id}`, data);
      setModalOpen(false);
      setEditSupplier(null);
      fetchSuppliers();
      notify && notify('تم تعديل بيانات المورد بنجاح', 'success');
    } catch (err) {
      notify && notify('حدث خطأ أثناء التعديل', 'error');
    }
  };

  // تصفية الموردين حسب البحث
  const filteredSuppliers = suppliers.filter(
    s =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.contact?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    exportToExcel(
      filteredSuppliers,
      [
        { label: 'الاسم', value: 'name' },
        { label: 'البريد', value: 'email' },
        { label: 'الهاتف', value: 'contact' },
        { label: 'العنوان', value: 'address' },
        { label: 'التقييم', value: 'rating' },
      ],
      'الموردون.xlsx'
    );
  };

  const handleExportPDF = () => {
    exportToPDF(
      filteredSuppliers,
      [
        { label: 'الاسم', value: 'name' },
        { label: 'البريد', value: 'email' },
        { label: 'الهاتف', value: 'contact' },
        { label: 'العنوان', value: 'address' },
        { label: 'التقييم', value: 'rating' },
      ],
      'الموردون.pdf'
    );
  };

  return (
    <div>
      <h2>الموردون</h2>
      <button onClick={handleExport} style={{ marginBottom: 8, marginInlineEnd: 8 }}>
        تصدير إلى Excel
      </button>
      <button onClick={handleExportPDF} style={{ marginBottom: 8 }}>
        تصدير إلى PDF
      </button>
      <br />
      <input
        type="text"
        placeholder="بحث بالاسم أو البريد أو الهاتف..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12, padding: 6, width: 260 }}
      />
      {(user.role === 'admin' || user.role === 'manager') && (
        <SupplierForm onAdd={fetchSuppliers} user={user} notify={notify} />
      )}
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>البريد</th>
            <th>الهاتف</th>
            <th>التقييم</th>
            <th>عدد المراجعات</th>
            <th>تقييم المورد</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {filteredSuppliers.map(s => (
            <tr key={s._id}>
              <td>{s.name}</td>
              <td>{s.email}</td>
              <td>{s.contact}</td>
              <td>{s.rating ? s.rating.toFixed(2) : '0.00'}</td>
              <td>{Array.isArray(s.reviews) ? s.reviews.length : 0}</td>
              <td>
                <SupplierReview
                  supplier={s}
                  user={user}
                  onReview={fetchSuppliers}
                  notify={notify}
                />
              </td>
              <td>
                {(user.role === 'admin' || user.role === 'manager') && (
                  <button style={{ marginInlineEnd: 8 }} onClick={() => handleEdit(s)}>
                    تعديل
                  </button>
                )}
                {user.role === 'admin' && (
                  <button onClick={() => handleDelete(s._id)} style={{ color: 'red' }}>
                    حذف
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        {editSupplier && <SupplierForm initialData={editSupplier} onSave={handleEditSave} />}
      </Modal>
    </div>
  );
}

// نموذج تقييم المورد
function SupplierReview({ supplier, user, onReview, notify }) {
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const alreadyReviewed =
    Array.isArray(supplier.reviews) && user && supplier.reviews.some(r => r.user === user._id);

  if (!user || alreadyReviewed)
    return <span style={{ color: '#888' }}>{alreadyReviewed ? 'تم التقييم' : '-'}</span>;

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`/api/suppliers/${supplier._id}/review`, { rating, comment });
      setShow(false);
      setRating(5);
      setComment('');
      onReview && onReview();
      notify && notify('تم إرسال التقييم بنجاح', 'success');
    } catch (err) {
      notify && notify('حدث خطأ أثناء إرسال التقييم', 'error');
    }
    setSubmitting(false);
  };

  return show ? (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <select value={rating} onChange={e => setRating(Number(e.target.value))} required>
        {[5, 4, 3, 2, 1].map(v => (
          <option key={v} value={v}>
            {v} نجوم
          </option>
        ))}
      </select>
      <input
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="تعليق (اختياري)"
      />
      <button type="submit" disabled={submitting}>
        {submitting ? 'جاري الإرسال...' : 'إرسال'}
      </button>
      <button type="button" onClick={() => setShow(false)} disabled={submitting}>
        إلغاء
      </button>
    </form>
  ) : (
    <button onClick={() => setShow(true)}>قيّم المورد</button>
  );
}

export default SupplierList;
