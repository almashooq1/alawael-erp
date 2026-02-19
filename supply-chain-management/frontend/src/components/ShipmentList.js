import React, { useEffect, useState } from 'react';
import apiClient from '../utils/api';
import ShipmentForm from './ShipmentForm';
import Modal from './Modal';
import { exportToExcel } from '../utils/exportToExcel';
import { exportToPDF } from '../utils/exportToPDF';

function ShipmentList({ user, notify }) {
  const [shipments, setShipments] = useState([]);
  const [editShipment, setEditShipment] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchShipments = () => {
    setLoading(true);
    setError('');
    apiClient
      .get('/api/shipments')
      .then(res =>
        setShipments(
          res.data.data || res.data.shipments || (Array.isArray(res.data) ? res.data : [])
        )
      )
      .catch(() => setError('حدث خطأ أثناء تحميل الشحنات'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleDelete = async id => {
    if (window.confirm('هل أنت متأكد من حذف هذه الشحنة؟')) {
      try {
        await apiClient.delete(`/api/shipments/${id}`);
        fetchShipments();
        notify && notify('تم حذف الشحنة بنجاح', 'success');
      } catch (err) {
        notify && notify('حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleEdit = shipment => {
    setEditShipment(shipment);
    setModalOpen(true);
  };

  const handleEditSave = async data => {
    try {
      await apiClient.put(`/api/shipments/${editShipment._id}`, data);
      setModalOpen(false);
      setEditShipment(null);
      fetchShipments();
      notify && notify('تم تعديل بيانات الشحنة بنجاح', 'success');
    } catch (err) {
      notify && notify('حدث خطأ أثناء التعديل', 'error');
    }
  };

  // تصفية الشحنات حسب البحث
  const filteredShipments = Array.isArray(shipments)
    ? shipments.filter(
        s =>
          s.trackingNumber?.toLowerCase().includes(search.toLowerCase()) ||
          s.status?.toLowerCase().includes(search.toLowerCase()) ||
          s.order?.supplier?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const handleExport = () => {
    exportToExcel(
      filteredShipments || [],
      [
        { label: 'رقم التتبع', value: 'trackingNumber' },
        { label: 'الطلب', value: row => row.order?._id || '' },
        { label: 'الناقل', value: 'carrier' },
        { label: 'الحالة', value: 'status' },
        {
          label: 'تاريخ الشحن',
          value: row => (row.shippedDate ? new Date(row.shippedDate).toLocaleDateString() : ''),
        },
        {
          label: 'تاريخ التسليم',
          value: row => (row.deliveredDate ? new Date(row.deliveredDate).toLocaleDateString() : ''),
        },
      ],
      'الشحنات.xlsx'
    );
  };
  const handleExportPDF = () => {
    exportToPDF(
      filteredShipments || [],
      [
        { label: 'رقم التتبع', value: 'trackingNumber' },
        { label: 'الطلب', value: row => row.order?._id || '' },
        { label: 'الناقل', value: 'carrier' },
        { label: 'الحالة', value: 'status' },
        {
          label: 'تاريخ الشحن',
          value: row => (row.shippedDate ? new Date(row.shippedDate).toLocaleDateString() : ''),
        },
        {
          label: 'تاريخ التسليم',
          value: row => (row.deliveredDate ? new Date(row.deliveredDate).toLocaleDateString() : ''),
        },
      ],
      'الشحنات.pdf'
    );
  };

  return (
    <div>
      <h2>الشحنات</h2>
      <button onClick={handleExport} style={{ marginBottom: 8, marginInlineEnd: 8 }}>
        تصدير إلى Excel
      </button>
      <button onClick={handleExportPDF} style={{ marginBottom: 8 }}>
        تصدير إلى PDF
      </button>
      <br />
      <input
        type="text"
        placeholder="بحث برقم التتبع أو الحالة أو اسم المورد..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 12, padding: 6, width: 260 }}
      />
      {(user.role === 'admin' || user.role === 'manager') && (
        <ShipmentForm onAdd={fetchShipments} user={user} notify={notify} />
      )}
      {error && (
        <div style={{ textAlign: 'center', margin: 16, color: '#d32f2f', fontWeight: 'bold' }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: 'center', margin: 16 }}>جاري التحميل...</div>
      ) : !error && filteredShipments.length === 0 ? (
        <div style={{ textAlign: 'center', margin: 16, color: '#888' }}>لا يوجد شحنات لعرضها</div>
      ) : (
        !error && (
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>رقم التتبع</th>
                <th>الطلب</th>
                <th>الناقل</th>
                <th>الحالة</th>
                <th>تاريخ الشحن</th>
                <th>تاريخ التسليم</th>
                <th>المرفقات</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map(s => (
                <tr key={s._id}>
                  <td>{s.trackingNumber}</td>
                  <td>{s.order?._id || ''}</td>
                  <td>{s.carrier}</td>
                  <td>{s.status}</td>
                  <td>{s.shippedDate ? new Date(s.shippedDate).toLocaleDateString() : ''}</td>
                  <td>{s.deliveredDate ? new Date(s.deliveredDate).toLocaleDateString() : ''}</td>
                  <td>
                    {Array.isArray(s.attachments) && s.attachments.length > 0 ? (
                      s.attachments.map((file, idx) => (
                        <a
                          key={idx}
                          href={file}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'block', marginBottom: 2 }}
                        >
                          تحميل #{idx + 1}
                        </a>
                      ))
                    ) : (
                      <span style={{ color: '#bbb' }}>لا يوجد</span>
                    )}
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
        )
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        {editShipment && (
          <ShipmentForm
            initialData={editShipment}
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

export default ShipmentList;
