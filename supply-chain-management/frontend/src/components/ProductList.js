import React, { useEffect, useState } from 'react';
import apiClient from '../utils/api';
import ProductForm from './ProductForm';
import Modal from './Modal';
import { exportToExcel } from '../utils/exportToExcel';
import { exportToPDF } from '../utils/exportToPDF';

function ProductList({ user, notify }) {
  const [products, setProducts] = useState([]);
  const [editProduct, setEditProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = () => {
    setLoading(true);
    setError('');
    apiClient
      .get('/api/products')
      .then(res =>
        setProducts(res.data.data || res.data.products || (Array.isArray(res.data) ? res.data : []))
      )
      .catch(() => setError('حدث خطأ أثناء تحميل المنتجات'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async id => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      try {
        await apiClient.delete(`/api/products/${id}`);
        fetchProducts();
        notify && notify('تم حذف المنتج بنجاح', 'success');
      } catch (err) {
        notify && notify('حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleEdit = product => {
    setEditProduct(product);
    setModalOpen(true);
  };

  const handleEditSave = async data => {
    try {
      await apiClient.put(`/api/products/${editProduct._id}`, data);
      setModalOpen(false);
      setEditProduct(null);
      fetchProducts();
      notify && notify('تم تعديل بيانات المنتج بنجاح', 'success');
    } catch (err) {
      notify && notify('حدث خطأ أثناء التعديل', 'error');
    }
  };

  // تصفية المنتجات حسب البحث
  const filteredProducts = Array.isArray(products)
    ? products.filter(
        p =>
          p.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.unit?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const handleExport = () => {
    exportToExcel(
      filteredProducts || [],
      [
        { label: 'الاسم', value: 'name' },
        { label: 'المورد', value: row => row.supplier?.name || '' },
        { label: 'السعر', value: 'price' },
        { label: 'الوحدة', value: 'unit' },
      ],
      'المنتجات.xlsx'
    );
  };
  const handleExportPDF = () => {
    exportToPDF(
      filteredProducts || [],
      [
        { label: 'الاسم', value: 'name' },
        { label: 'المورد', value: row => row.supplier?.name || '' },
        { label: 'السعر', value: 'price' },
        { label: 'الوحدة', value: 'unit' },
      ],
      'المنتجات.pdf'
    );
  };

  return (
    <div>
      <h2>المنتجات</h2>
      <button onClick={handleExport} style={{ marginBottom: 8, marginInlineEnd: 8 }}>
        تصدير إلى Excel
      </button>
      <button onClick={handleExportPDF} style={{ marginBottom: 8 }}>
        تصدير إلى PDF
      </button>
      <br />
      <input
        type="text"
        placeholder="بحث بالاسم أو المورد أو الوحدة..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12, padding: 6, width: 260 }}
      />
      {(user.role === 'admin' || user.role === 'manager') && (
        <ProductForm onAdd={fetchProducts} user={user} notify={notify} />
      )}
      {error && (
        <div style={{ textAlign: 'center', margin: 16, color: '#d32f2f', fontWeight: 'bold' }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: 'center', margin: 16 }}>جاري التحميل...</div>
      ) : !error && filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', margin: 16, color: '#888' }}>لا يوجد منتجات لعرضها</div>
      ) : (
        !error && (
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>الصورة</th>
                <th>الاسم</th>
                <th>المورد</th>
                <th>السعر</th>
                <th>الوحدة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p._id}>
                  <td>
                    {p.imagePath ? (
                      <img
                        src={p.imagePath}
                        alt={p.name}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
                      />
                    ) : (
                      <span style={{ color: '#bbb' }}>بدون صورة</span>
                    )}
                  </td>
                  <td>{p.name}</td>
                  <td>{p.supplier?.name || ''}</td>
                  <td>{p.price}</td>
                  <td>{p.unit}</td>
                  <td>
                    {(user.role === 'admin' || user.role === 'manager') && (
                      <button style={{ marginInlineEnd: 8 }} onClick={() => handleEdit(p)}>
                        تعديل
                      </button>
                    )}
                    {user.role === 'admin' && (
                      <button onClick={() => handleDelete(p._id)} style={{ color: 'red' }}>
                        حذف
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        {editProduct && (
          <ProductForm
            initialData={editProduct}
            onAdd={handleEditSave}
            editMode
            user={user}
            notify={notify}
          />
        )}
      </Modal>
    </div>
  );
}

export default ProductList;
