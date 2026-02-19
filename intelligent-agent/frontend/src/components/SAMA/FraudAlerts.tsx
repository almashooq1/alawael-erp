import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, CheckCircle, Clock, X } from 'lucide-react';
import { SAMAService } from '../../services/SAMAService';

interface FraudAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  date: string;
  status: 'active' | 'resolved' | 'false-positive';
  details: string;
}

const FraudAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [fraudScore, setFraudScore] = useState(0);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Fetch fraud alerts (mocked data for demo)
        const mockAlerts: FraudAlert[] = [
          {
            id: '1',
            type: 'معاملة غير عادية',
            severity: 'high',
            message: 'تحويل بمبلغ كبير من الحساب',
            date: '2026-02-17',
            status: 'resolved',
            details: 'تم التحقق من المعاملة من قبل المستخدم - موثوقة',
          },
          {
            id: '2',
            type: 'محاولة دخول',
            severity: 'medium',
            message: 'محاولة دخول من موقع جديد',
            date: '2026-02-16',
            status: 'active',
            details: 'الرجاء تأكيد هويتك إذا كانت هذه محاولة دخول منك',
          },
          {
            id: '3',
            type: 'تغيير بيانات',
            severity: 'low',
            message: 'تم تغيير عنوان البريد الإلكتروني',
            date: '2026-02-15',
            status: 'resolved',
            details: 'تم تأكيد التغيير من قبل المستخدم',
          },
        ];

        setAlerts(mockAlerts);
        setFraudScore(15); // Low fraud score

        setLoading(false);
      } catch (error) {
        console.error('Error fetching alerts:', error);
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const handleDismiss = (alertId: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== alertId));
  };

  const handleResolve = (alertId: string) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === alertId ? { ...alert, status: 'resolved' as const } : alert
      )
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 border-red-500 text-red-200';
      case 'high':
        return 'bg-orange-500/10 border-orange-500 text-orange-200';
      case 'medium':
        return 'bg-yellow-500/10 border-yellow-500 text-yellow-200';
      case 'low':
        return 'bg-blue-500/10 border-blue-500 text-blue-200';
      default:
        return '';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="text-red-400" size={24} />;
      case 'medium':
        return <AlertTriangle className="text-yellow-400" size={24} />;
      case 'low':
        return <Shield className="text-blue-400" size={24} />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-center py-8">جاري تحميل نتائج الفحص...</div>;
  }

  const activeAlerts = alerts.filter((a) => a.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Security Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-100 text-sm mb-2">درجة الأمان</p>
              <p className="text-4xl font-bold">{100 - fraudScore}</p>
              <p className="text-sm text-green-200 mt-2">آمن جداً</p>
            </div>
            <Shield size={40} className="text-green-200 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm mb-2">التنبيهات النشطة</p>
              <p className="text-4xl font-bold">{activeAlerts}</p>
              <p className="text-sm text-blue-200 mt-2">تحتاج إجراء</p>
            </div>
            <AlertTriangle size={40} className="text-blue-200 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-sm mb-2">عمليات محمية</p>
              <p className="text-4xl font-bold">100%</p>
              <p className="text-sm text-purple-200 mt-2">حسابك محمي</p>
            </div>
            <CheckCircle size={40} className="text-purple-200 opacity-50" />
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">التنبيهات الأمنية</h3>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="text-green-400 mx-auto mb-3" size={40} />
            <p className="text-slate-400">لا توجد تنبيهات أمنية - حسابك آمن</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 border ${getSeverityColor(alert.severity)} flex items-start gap-4`}
              >
                <div className="flex-shrink-0 pt-1">{getSeverityIcon(alert.severity)}</div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">{alert.type}</p>
                      <p className="text-sm opacity-75 mt-1">{alert.message}</p>
                      <p className="text-xs opacity-50 mt-2">{alert.date}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        alert.severity === 'critical'
                          ? 'bg-red-500/20 text-red-300'
                          : alert.severity === 'high'
                          ? 'bg-orange-500/20 text-orange-300'
                          : alert.severity === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {alert.severity === 'critical'
                        ? 'حرج'
                        : alert.severity === 'high'
                        ? 'عالي'
                        : alert.severity === 'medium'
                        ? 'متوسط'
                        : 'منخفض'}
                    </span>
                  </div>
                  <div className="bg-slate-900/30 p-3 rounded mt-3">
                    <p className="text-sm">{alert.details}</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {alert.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 py-2 px-4 rounded font-semibold flex items-center justify-center gap-2 transition"
                        >
                          <CheckCircle size={16} />
                          تأكيد
                        </button>
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="bg-slate-700 hover:bg-slate-600 py-2 px-4 rounded transition"
                        >
                          <X size={16} />
                        </button>
                      </>
                    )}
                    {alert.status === 'resolved' && (
                      <div className="flex items-center gap-2 text-green-300">
                        <CheckCircle size={16} />
                        <span>تم الحل</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Recommendations */}
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">نصائح أمنية</h3>
        <div className="space-y-3">
          {[
            { icon: '🔐', title: 'كلمة المرور القوية', desc: 'استخدم كلمة مرور طويلة تحتوي على أحرف وأرقام ورموز' },
            { icon: '📱', title: 'المصادقة الثنائية', desc: 'فعّل المصادقة الثنائية لحماية إضافية' },
            { icon: '🔔', title: 'الإشعارات الفورية', desc: 'تابع التنبيهات الأمنية على الفور' },
            { icon: '🖥️', title: 'الأجهزة الموثوقة', desc: 'استخدم أجهزة معروفة وموثوقة فقط' },
          ].map((tip, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
              <span className="text-2xl">{tip.icon}</span>
              <div>
                <p className="font-semibold">{tip.title}</p>
                <p className="text-sm text-slate-400">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FraudAlerts;
