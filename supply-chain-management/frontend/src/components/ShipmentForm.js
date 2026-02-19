import React, { useState } from 'react';
import axios from 'axios';
import FileUpload from './FileUpload';

export default function ShipmentForm({ onAdd, initialData, editMode, user, notify }) {
  const [shipment, setShipment] = useState(
    initialData || {
      order: '',
      shippedDate: '',
      deliveredDate: '',
      status: '',
      trackingNumber: '',
      notes: '',
    }
  );
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState([]);

  React.useEffect(() => {
    axios.get('/api/orders').then(res => setOrders(res.data));
  }, []);

  React.useEffect(() => {
    if (initialData) setShipment(initialData);
  }, [initialData]);

  const handleChange = e => {
    setShipment({ ...shipment, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editMode) {
        await onAdd(shipment);
      } else {
        await axios.post('/api/shipments', shipment, {
          headers: { 'Content-Type': 'application/json' },
        });
        setShipment({
          order: '',
          shippedDate: '',
          deliveredDate: '',
          status: '',
          trackingNumber: '',
          notes: '',
        });
        setAttachments([]);
        setAttachmentPreviews([]);
        if (onAdd) onAdd();
        notify && notify('تمت إضافة الشحنة بنجاح', 'success');
      }
    } catch (error) {
      console.error('Error submitting shipment:', error);
      notify && notify('فشل في حفظ الشحنة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentsChange = e => {
    setAttachments(Array.from(e.target.files));
  };

  // RBAC: فقط admin/manager يمكنهم الإضافة أو التعديل
  if (user && !(user.role === 'admin' || user.role === 'manager')) return null;

  return (
    <form
      onSubmit={handleSubmit}
      style={{ marginBottom: 24, border: '1px solid #ccc', padding: 16, borderRadius: 8 }}
    >
      <h3>إضافة شحنة جديدة</h3>
      <div>
        <label>
          الطلب:
          <select name="order" value={shipment.order} onChange={handleChange} required>
            <option value="">اختر الطلب</option>
            {orders.map(o => (
              <option key={o._id} value={o._id}>
                {o._id} - {o.supplier?.name || ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label>
          تاريخ الشحن:
          <input
            type="date"
            name="shippedDate"
            value={shipment.shippedDate}
            onChange={handleChange}
            required
          />
        </label>
      </div>
      <div>
        <label>
          تاريخ التسليم:
          <input
            type="date"
            name="deliveredDate"
            value={shipment.deliveredDate}
            onChange={handleChange}
          />
        </label>
      </div>
      <div>
        <label>
          الحالة:
          <input
            name="status"
            value={shipment.status}
            onChange={handleChange}
            placeholder="مثال: تم الشحن، تم التسليم"
            required
          />
        </label>
      </div>
      <div>
        <label>
          رقم التتبع:
          <input name="trackingNumber" value={shipment.trackingNumber} onChange={handleChange} />
        </label>
      </div>
      <div>
        <label>
          ملاحظات:
          <input name="notes" value={shipment.notes} onChange={handleChange} />
        </label>
      </div>
      <div>
        <label>
          مرفقات:
          <input type="file" multiple onChange={handleAttachmentsChange} />
        </label>
      </div>
      <button type="submit" disabled={loading}>
        {loading
          ? editMode
            ? 'جاري التعديل...'
            : 'جاري الإضافة...'
          : editMode
            ? 'تعديل الشحنة'
            : 'إضافة شحنة جديدة'}
      </button>
      <div>
        <label>مرفقات الشحنة:</label>
        <FileUpload
          url="/api/shipments/attachment-upload"
          multiple={true}
          accept="*"
          label="مرفقات الشحنة"
          onSuccess={data => {
            const files = Array.isArray(data) ? data : [data];
            setShipment(f => ({
              ...f,
              attachments: files.map(fx => fx.filePath || fx.url || fx.attachmentPath || ''),
            }));
            setAttachmentPreviews(
              files.map(fx => fx.filePath || fx.url || fx.attachmentPath || '')
            );
          }}
          onError={err => notify && notify('فشل رفع المرفقات', 'error')}
        />
        {attachmentPreviews.length > 0 && (
          <div style={{ margin: '8px 0' }}>
            {attachmentPreviews.map((url, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  مرفق {idx + 1}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}
