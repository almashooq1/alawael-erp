import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FileUpload from './FileUpload';

function ProductForm({ onAdd, initialData, editMode, user, notify }) {
  const [form, setForm] = useState(
    initialData || {
      name: '',
      sku: '',
      description: '',
      supplier: '',
      price: '',
      unit: 'pcs',
      imagePath: '',
    }
  );
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    axios.get('/api/suppliers').then(res => setSuppliers(res.data));
  }, []);

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // لم يعد هناك حاجة لـ handleImageChange، سيتم استخدام FileUpload

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMode) {
        await onAdd(form);
      } else {
        // الصورة ترفع بشكل منفصل عبر FileUpload
        await axios.post('/api/products', form, {
          headers: { 'Content-Type': 'application/json' },
        });
        setForm({
          name: '',
          sku: '',
          description: '',
          supplier: '',
          price: '',
          unit: 'pcs',
          imagePath: '',
        });
        setImage(null);
        setImagePreview('');
        if (onAdd) onAdd();
        notify && notify('تم إضافة المنتج بنجاح', 'success');
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
        placeholder="اسم المنتج"
        value={form.name}
        onChange={handleChange}
        required
      />{' '}
      <input name="sku" placeholder="SKU" value={form.sku} onChange={handleChange} />{' '}
      <input
        name="description"
        placeholder="الوصف"
        value={form.description}
        onChange={handleChange}
      />{' '}
      <select name="supplier" value={form.supplier} onChange={handleChange} required>
        <option value="">اختر المورد</option>
        {suppliers.map(s => (
          <option key={s._id} value={s._id}>
            {s.name}
          </option>
        ))}
      </select>{' '}
      <input
        name="price"
        type="number"
        min="0"
        placeholder="السعر"
        value={form.price}
        onChange={handleChange}
        required
      />{' '}
      <input name="unit" placeholder="الوحدة" value={form.unit} onChange={handleChange} />{' '}
      <FileUpload
        url="/api/products/image-upload"
        multiple={false}
        accept="image/*"
        label="صورة المنتج"
        onSuccess={data => {
          setForm(f => ({ ...f, imagePath: data.filePath || data.imagePath || data.url || '' }));
          setImagePreview(data.filePath || data.imagePath || data.url || '');
        }}
        onError={err => notify && notify('فشل رفع الصورة', 'error')}
      />
      {imagePreview && (
        <div style={{ margin: '8px 0' }}>
          <img
            src={imagePreview}
            alt="صورة المنتج"
            style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8 }}
          />
        </div>
      )}
      <button type="submit" disabled={loading}>
        {loading
          ? editMode
            ? 'جاري التعديل...'
            : 'جاري الإضافة...'
          : editMode
            ? 'حفظ التعديلات'
            : 'إضافة منتج'}
      </button>
    </form>
  );
}

export default ProductForm;
