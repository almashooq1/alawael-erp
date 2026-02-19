import React, { useState, useEffect } from 'react';
import axios from 'axios';

function InventoryForm({ onAdd, initialData, editMode, user, notify }) {
  const [form, setForm] = useState(initialData || { product: '', quantity: '', location: '' });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/products').then(res => setProducts(res.data));
  }, []);

  useEffect(() => {
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
        await axios.post('/api/inventory', { ...form, quantity: Number(form.quantity) });
        setForm({ product: '', quantity: '', location: '' });
        if (onAdd) onAdd();
        notify && notify('تمت إضافة السطر للمخزون بنجاح', 'success');
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
      <select name="product" value={form.product} onChange={handleChange} required>
        <option value="">اختر المنتج</option>
        {products.map(p => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
      </select>{' '}
      <input
        name="quantity"
        type="number"
        min="0"
        placeholder="الكمية"
        value={form.quantity}
        onChange={handleChange}
        required
      />{' '}
      <input name="location" placeholder="الموقع" value={form.location} onChange={handleChange} />{' '}
      <button type="submit" disabled={loading}>
        {loading
          ? editMode
            ? 'جاري التعديل...'
            : 'جاري الإضافة...'
          : editMode
            ? 'حفظ التعديلات'
            : 'إضافة للمخزون'}
      </button>
    </form>
  );
}

export default InventoryForm;
