import React, { useState, useEffect } from 'react';
import axios from 'axios';

function OrderForm({ onAdd, initialData, editMode, user, notify }) {
  const [form, setForm] = useState(
    initialData || {
      supplier: '',
      products: [],
      status: 'pending',
      orderDate: '',
      deliveryDate: '',
      notes: '',
    }
  );
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedQty, setSelectedQty] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get('/api/suppliers').then(res => setSuppliers(res.data));
    axios.get('/api/products').then(res => setProducts(res.data));
  }, []);

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addProduct = () => {
    if (selectedProduct && selectedQty) {
      const prod = products.find(p => p._id === selectedProduct);
      setForm({
        ...form,
        products: [
          ...form.products,
          { product: selectedProduct, quantity: Number(selectedQty), price: prod ? prod.price : 0 },
        ],
      });
      setSelectedProduct('');
      setSelectedQty('');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMode) {
        await onAdd(form);
      } else {
        await axios.post('/api/orders', form);
        setForm({
          supplier: '',
          products: [],
          status: 'pending',
          orderDate: '',
          deliveryDate: '',
          notes: '',
        });
        if (onAdd) onAdd();
        notify && notify('تم إضافة الطلب بنجاح', 'success');
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
      <select name="supplier" value={form.supplier} onChange={handleChange} required>
        <option value="">اختر المورد</option>
        {suppliers.map(s => (
          <option key={s._id} value={s._id}>
            {s.name}
          </option>
        ))}
      </select>{' '}
      <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}>
        <option value="">اختر المنتج</option>
        {products.map(p => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
      </select>{' '}
      <input
        type="number"
        min="1"
        placeholder="الكمية"
        value={selectedQty}
        onChange={e => setSelectedQty(e.target.value)}
      />{' '}
      <button type="button" onClick={addProduct}>
        إضافة منتج
      </button>{' '}
      <ul>
        {form.products.map((p, idx) => {
          const prod = products.find(pr => pr._id === p.product);
          return (
            <li key={idx}>
              {prod ? prod.name : ''} × {p.quantity}
            </li>
          );
        })}
      </ul>
      <input name="orderDate" type="date" value={form.orderDate} onChange={handleChange} />{' '}
      <input name="deliveryDate" type="date" value={form.deliveryDate} onChange={handleChange} />{' '}
      <input name="notes" placeholder="ملاحظات" value={form.notes} onChange={handleChange} />{' '}
      <button type="submit" disabled={loading}>
        {loading
          ? editMode
            ? 'جاري التعديل...'
            : 'جاري الإضافة...'
          : editMode
            ? 'حفظ التعديلات'
            : 'إضافة طلب'}
      </button>
    </form>
  );
}

export default OrderForm;
