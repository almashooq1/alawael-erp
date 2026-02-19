import React, { useState } from 'react';
import { Send, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { SAMAService } from '../../services/SAMAService';

interface Payment {
  id: string;
  recipient: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
}

interface ScheduledPayment {
  id: string;
  recipient: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  nextDate: string;
  active: boolean;
}

const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    recipientIBAN: '',
    recipientName: '',
    amount: '',
    description: '',
    isScheduled: false,
    frequency: 'monthly' as const,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || '' : value,
    }));
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Not authenticated');

      if (formData.isScheduled) {
        const result = await SAMAService.schedulePayment(token, {
          recipientIBAN: formData.recipientIBAN,
          amount: Number(formData.amount),
          frequency: formData.frequency,
          description: formData.description,
        });
        setScheduledPayments([...scheduledPayments, result as ScheduledPayment]);
      } else {
        const result = await SAMAService.processPayment(token, {
          recipientIBAN: formData.recipientIBAN,
          amount: Number(formData.amount),
          description: formData.description,
        });
        setPayments([...payments, result as Payment]);
      }

      setFormData({
        recipientIBAN: '',
        recipientName: '',
        amount: '',
        description: '',
        isScheduled: false,
        frequency: 'monthly',
      });
      setShowNewPayment(false);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('فشلت المعاملة. يرجى المحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'pending':
        return <Clock className="text-yellow-400" size={20} />;
      case 'failed':
        return <AlertCircle className="text-red-400" size={20} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-200';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-200';
      case 'failed':
        return 'bg-red-500/10 text-red-200';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* New Payment Button */}
      <button
        onClick={() => setShowNewPayment(!showNewPayment)}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 p-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
      >
        <Plus size={20} />
        إنشاء معاملة جديدة
      </button>

      {/* New Payment Form */}
      {showNewPayment && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
          <h3 className="text-lg font-semibold">معلومات الدفع</h3>
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">IBAN المستقبل</label>
                <input
                  type="text"
                  name="recipientIBAN"
                  placeholder="SA00 0000 0000 0000 0000 0000"
                  value={formData.recipientIBAN}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">اسم المستقبل</label>
                <input
                  type="text"
                  name="recipientName"
                  placeholder="محمد أحمد"
                  value={formData.recipientName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">المبلغ (SAR)</label>
                <input
                  type="number"
                  name="amount"
                  placeholder="1000"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">نوع المعاملة</label>
                <select
                  name="isScheduled"
                  value={formData.isScheduled ? 'scheduled' : 'immediate'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isScheduled: e.target.value === 'scheduled',
                    }))
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="immediate">فوري</option>
                  <option value="scheduled">مجدولة</option>
                </select>
              </div>

              {formData.isScheduled && (
                <div>
                  <label className="block text-sm font-medium mb-2">التكرار</label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="daily">يومي</option>
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                    <option value="quarterly">ربع سنوي</option>
                    <option value="annual">سنوي</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">الوصف (اختياري)</label>
              <textarea
                name="description"
                placeholder="أضف وصفاً للمعاملة..."
                value={formData.description}
                onChange={handleInputChange}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-600 p-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition"
            >
              <Send size={20} />
              {loading ? 'جاري المعالجة...' : 'تأكيد المعاملة'}
            </button>
          </form>
        </div>
      )}

      {/* Payments List */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">آخر المعاملات</h3>
        <div className="space-y-3">
          {payments.length === 0 ? (
            <p className="text-slate-400 text-center py-8">لا توجد معاملات بعد</p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className={`p-4 rounded-lg border border-slate-600 flex justify-between items-center ${getStatusColor(payment.status)}`}>
                <div>
                  <p className="font-semibold">{payment.recipient}</p>
                  <p className="text-sm opacity-75">{payment.description}</p>
                  <p className="text-xs opacity-50">{payment.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-lg">{payment.amount.toLocaleString()} SAR</p>
                  {getStatusIcon(payment.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Scheduled Payments */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">معاملات مجدولة</h3>
        <div className="space-y-3">
          {scheduledPayments.length === 0 ? (
            <p className="text-slate-400 text-center py-8">لا توجد معاملات مجدولة</p>
          ) : (
            scheduledPayments.map((payment) => (
              <div
                key={payment.id}
                className={`p-4 rounded-lg border border-slate-600 flex justify-between items-center ${
                  payment.active ? 'bg-blue-500/10 text-blue-200' : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                <div>
                  <p className="font-semibold">{payment.recipient}</p>
                  <p className="text-sm opacity-75">التالي: {payment.nextDate}</p>
                  <p className="text-xs opacity-50">كل {payment.frequency}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-lg">{payment.amount.toLocaleString()} SAR</p>
                  {payment.active ? '✅' : '⏸️'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentManagement;
