import React, { useState } from 'react';
import axios from 'axios';

function SupplierForm({ onAdd, initialData, editMode, user, notify }) {
  const [form, setForm] = useState(
    initialData || { name: '', email: '', contact: '', address: '', rating: 0 }
  );
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMode) {
        await onAdd(form);
      } else {
        await axios.post('/api/suppliers', form);
        setForm({ name: '', email: '', contact: '', address: '', rating: 0 });
        if (onAdd) onAdd();
        notify && notify('تم إضافة المورد بنجاح', 'success');
      }
    } catch (err) {
      notify && notify('حدث خطأ أثناء العملية', 'error');
    }
    setLoading(false);
  };

  // RBAC: فقط admin/manager يمكنهم الإضافة أو التعديل
  if (user && !(user.role === 'admin' || user.role === 'manager')) return null;

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      <input
        name="name"
        placeholder="اسم المورد"
        value={form.name}
        onChange={handleChange}
        required
      />{' '}
      <input
        name="email"
        placeholder="البريد الإلكتروني"
        value={form.email}
        onChange={handleChange}
      />{' '}
      <input name="contact" placeholder="الهاتف" value={form.contact} onChange={handleChange} />{' '}
      <input name="address" placeholder="العنوان" value={form.address} onChange={handleChange} />{' '}
      <input
        name="rating"
        type="number"
        min="0"
        max="5"
        placeholder="تقييم"
        value={form.rating}
        onChange={handleChange}
      />{' '}
      <button type="submit" disabled={loading}>
        {loading
          ? editMode
            ? 'جاري التعديل...'
            : 'جاري الإضافة...'
          : editMode
            ? 'حفظ التعديلات'
            : 'إضافة مورد'}
      </button>
    </form>
  );
}

export default SupplierForm;
