import React, { useEffect, useState } from 'react';
import apiClient from '../utils/api';
import OrderForm from './OrderForm';
import Modal from './Modal';
import { exportToExcel } from '../utils/exportToExcel';
import { exportToPDF } from '../utils/exportToPDF';

function OrderList({ user, notify }) {
  const [orders, setOrders] = useState([]);
  const [editOrder, setEditOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = () => {
    setLoading(true);
    setError('');
    apiClient
      .get('/api/orders')
      .then(res =>
        setOrders(res.data.data || res.data.orders || (Array.isArray(res.data) ? res.data : []))
      )
      .catch(() => setError('حدث خطأ أثناء تحميل الطلبات'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDelete = async id => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      try {
        await apiClient.delete(`/api/orders/${id}`);
        fetchOrders();
        notify && notify('تم حذف الطلب بنجاح', 'success');
      } catch (err) {
        notify && notify('حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleEdit = order => {
    setEditOrder(order);
    setModalOpen(true);
  };

  const handleEditSave = async data => {
    try {
      await apiClient.put(`/api/orders/${editOrder._id}`, data);
      setModalOpen(false);
      setEditOrder(null);
      fetchOrders();
      notify && notify('تم تعديل بيانات الطلب بنجاح', 'success');
    } catch (err) {
      notify && notify('حدث خطأ أثناء التعديل', 'error');
    }
  };

  // تصفية الطلبات حسب البحث
  const filteredOrders = Array.isArray(orders)
    ? orders.filter(
        o =>
          o.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
          o.status?.toLowerCase().includes(search.toLowerCase()) ||
          o.products?.some(p => p.product?.name?.toLowerCase().includes(search.toLowerCase()))
      )
    : [];

  const handleExport = () => {
    exportToExcel(
      filteredOrders || [],
      [
        { label: 'المورد', value: row => row.supplier?.name || '' },
        { label: 'الحالة', value: 'status' },
        {
          label: 'تاريخ الطلب',
          value: row => (row.orderDate ? new Date(row.orderDate).toLocaleDateString() : ''),
        },
        {
          label: 'تاريخ التسليم',
          value: row => (row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString() : ''),
        },
        {
          label: 'المنتجات',
          value: row =>
            (row.products || []).map(p => (p.product?.name || '') + ' × ' + p.quantity).join(', '),
        },
      ],
      'الطلبات.xlsx'
    );
  };
  const handleExportPDF = () => {
    exportToPDF(
      filteredOrders || [],
      [
        { label: 'المورد', value: row => row.supplier?.name || '' },
        { label: 'الحالة', value: 'status' },
        {
          label: 'تاريخ الطلب',
          value: row => (row.orderDate ? new Date(row.orderDate).toLocaleDateString() : ''),
        },
        {
          label: 'تاريخ التسليم',
          value: row => (row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString() : ''),
        },
        {
          label: 'المنتجات',
          value: row =>
            (row.products || []).map(p => (p.product?.name || '') + ' × ' + p.quantity).join(', '),
        },
      ],
      'الطلبات.pdf'
    );
  };

  return (
    <div>
      <h2>الطلبات</h2>
      <button onClick={handleExport} style={{ marginBottom: 8, marginInlineEnd: 8 }}>
        تصدير إلى Excel
      </button>
      <button onClick={handleExportPDF} style={{ marginBottom: 8 }}>
        تصدير إلى PDF
      </button>
      <br />
      <input
        type="text"
        placeholder="بحث باسم المورد أو الحالة أو المنتج..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12, padding: 6, width: 260 }}
      />
      {(user.role === 'admin' || user.role === 'manager') && (
        <OrderForm onAdd={fetchOrders} user={user} notify={notify} />
      )}
      {error && (
        <div style={{ textAlign: 'center', margin: 16, color: '#d32f2f', fontWeight: 'bold' }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: 'center', margin: 16 }}>جاري التحميل...</div>
      ) : !error && filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', margin: 16, color: '#888' }}>لا يوجد طلبات لعرضها</div>
      ) : (
        !error && (
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>المورد</th>
                <th>الحالة</th>
                <th>تاريخ الطلب</th>
                <th>تاريخ التسليم</th>
                <th>المنتجات</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr key={o._id}>
                  <td>{o.supplier?.name || ''}</td>
                  <td>{o.status}</td>
                  <td>{o.orderDate ? new Date(o.orderDate).toLocaleDateString() : ''}</td>
                  <td>{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : ''}</td>
                  <td>
                    <ul>
                      {(o.products || []).map((p, idx) => (
                        <li key={idx}>
                          {p.product?.name || ''} × {p.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    {(user.role === 'admin' || user.role === 'manager') && (
                      <button style={{ marginInlineEnd: 8 }} onClick={() => handleEdit(o)}>
                        تعديل
                      </button>
                    )}
                    {user.role === 'admin' && (
                      <button onClick={() => handleDelete(o._id)} style={{ color: 'red' }}>
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
        {editOrder && (
          <OrderForm
            initialData={editOrder}
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

export default OrderList;
