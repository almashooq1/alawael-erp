import React, { useEffect, useState } from 'react';
import apiClient from '../utils/api';
import InventoryForm from './InventoryForm';
import Modal from './Modal';
import { exportToExcel } from '../utils/exportToExcel';
import { exportToPDF } from '../utils/exportToPDF';

function InventoryList({ user, notify }) {
  const [inventory, setInventory] = useState([]);
  const [editInventory, setEditInventory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInventory = () => {
    setLoading(true);
    setError('');
    apiClient
      .get('/api/inventory')
      .then(res => setInventory(res.data.data || res.data || []))
      .catch(() => setError('حدث خطأ أثناء تحميل المخزون'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleDelete = async id => {
    if (window.confirm('هل أنت متأكد من حذف هذا السطر من المخزون؟')) {
      try {
        await apiClient.delete(`/api/inventory/${id}`);
        fetchInventory();
        notify && notify('تم حذف السطر من المخزون بنجاح', 'success');
      } catch (err) {
        notify && notify('حدث خطأ أثناء الحذف', 'error');
      }
    }
  };

  const handleEdit = item => {
    setEditInventory(item);
    setModalOpen(true);
  };

  const handleEditSave = async data => {
    try {
      await apiClient.put(`/api/inventory/${editInventory._id}`, data);
      setModalOpen(false);
      setEditInventory(null);
      fetchInventory();
      notify && notify('تم تعديل بيانات المخزون بنجاح', 'success');
    } catch (err) {
      notify && notify('حدث خطأ أثناء التعديل', 'error');
    }
  };

  // تصفية المخزون حسب البحث
  const filteredInventory = inventory.filter(
    i =>
      i.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.location?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    exportToExcel(
      filteredInventory,
      [
        { label: 'المنتج', value: row => row.product?.name || '' },
        { label: 'الكمية', value: 'quantity' },
        { label: 'الموقع', value: 'location' },
        { label: 'آخر تحديث', value: row => new Date(row.lastUpdated).toLocaleString() },
      ],
      'المخزون.xlsx'
    );
  };
  const handleExportPDF = () => {
    exportToPDF(
      filteredInventory,
      [
        { label: 'المنتج', value: row => row.product?.name || '' },
        { label: 'الكمية', value: 'quantity' },
        { label: 'الموقع', value: 'location' },
        { label: 'آخر تحديث', value: row => new Date(row.lastUpdated).toLocaleString() },
      ],
      'المخزون.pdf'
    );
  };

  return (
    <div>
      return (
      <div style={{ marginBottom: 32 }}>
        <h2>المخزون</h2>
        <input
          type="text"
          placeholder="بحث..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 8 }}
        />
        <button onClick={handleExport}>تصدير Excel</button>{' '}
        <button onClick={() => exportToPDF(filteredInventory, 'المخزون')}>تصدير PDF</button>
        <button onClick={() => setModalOpen(true)} style={{ float: 'left' }}>
          إضافة للمخزون
        </button>
        <Modal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditInventory(null);
          }}
        >
          <InventoryForm
            editMode={!!editInventory}
            initialData={editInventory}
            onAdd={editInventory ? handleEditSave : fetchInventory}
            user={user}
            notify={notify}
          />
        </Modal>
        {error && (
          <div style={{ textAlign: 'center', margin: 16, color: '#d32f2f', fontWeight: 'bold' }}>
            {error}
          </div>
        )}
        {loading ? (
          <div style={{ textAlign: 'center', margin: 16 }}>جاري التحميل...</div>
        ) : !error && filteredInventory.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 16, color: '#888' }}>
            لا يوجد بيانات مخزون لعرضها
          </div>
        ) : (
          !error && (
            <table border="1" cellPadding="6" style={{ width: '100%', marginTop: 12 }}>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>الموقع</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(i => (
                  <tr key={i._id}>
                    <td>{i.product?.name}</td>
                    <td>{i.quantity}</td>
                    <td>{i.location}</td>
                    <td>
                      <button onClick={() => handleEdit(i)}>تعديل</button>{' '}
                      <button onClick={() => handleDelete(i._id)}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        {editInventory && (
          <InventoryForm
            initialData={editInventory}
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

export default InventoryList;
