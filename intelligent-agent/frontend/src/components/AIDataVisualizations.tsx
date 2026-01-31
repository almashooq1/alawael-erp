import React, { useState, useEffect } from 'react';
import AIClient from '../services/AIClient';

interface DataPoint {
  timestamp: string;
  value: number;
  label: string;
}

interface Distribution {
  category: string;
  percentage: number;
  count: number;
  color: string;
}

const AIDataVisualizations: React.FC = () => {
  const [lineData, setLineData] = useState<DataPoint[]>([]);
  const [pieData, setPieData] = useState<Distribution[]>([]);
  const [radarData, setRadarData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // بيانات الخط البياني
        const lineChartData: DataPoint[] = [
          { timestamp: '00:00', value: 65, label: 'الليل' },
          { timestamp: '06:00', value: 72, label: 'الصباح المبكر' },
          { timestamp: '12:00', value: 88, label: 'منتصف النهار' },
          { timestamp: '18:00', value: 82, label: 'المساء' },
          { timestamp: '23:59', value: 75, label: 'آخر اليوم' }
        ];

        // بيانات الرسم البياني الدائري
        const pieChartData: Distribution[] = [
          { category: 'مكتملة', percentage: 35, count: 42, color: 'from-green-600 to-green-400' },
          { category: 'قيد التنفيذ', percentage: 45, count: 54, color: 'from-blue-600 to-blue-400' },
          { category: 'معرضة للخطر', percentage: 15, count: 18, color: 'from-yellow-600 to-yellow-400' },
          { category: 'متأخرة', percentage: 5, count: 6, color: 'from-red-600 to-red-400' }
        ];

        setLineData(lineChartData);
        setPieData(pieChartData);
        setRadarData({
          categories: ['الأداء', 'الكفاءة', 'الاستقرار', 'الأمان', 'التوفر'],
          values: [88, 85, 92, 94, 96]
        });
      } catch (error) {
        console.error('Error fetching visualization data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-white">جاري تحميل الرسوم البيانية...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">تصور البيانات والرسوم البيانية</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* الرسم البياني الخطي */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">أداء النظام بمرور الوقت</h2>
            <div className="flex items-end justify-between h-64 gap-1 px-2">
              {lineData.map((point, idx) => {
                const maxValue = Math.max(...lineData.map(d => d.value));
                const heightPercent = (point.value / maxValue) * 100;

                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group cursor-pointer">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all group-hover:from-blue-600 group-hover:to-blue-500"
                        style={{ height: `${heightPercent}%`, minHeight: '20px' }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 px-3 py-1 rounded text-xs text-white border border-slate-600">
                          {point.value}%
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-3">{point.timestamp}</div>
                    <div className="text-xs text-slate-500 mt-1">{point.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 p-4 bg-slate-900 rounded">
              <p className="text-slate-300 text-sm">
                <span className="font-semibold">ملخص:</span> الأداء يصل إلى ذروته في منتصف النهار (88%) ويكون منخفضاً في أوقات الليل (65%)
              </p>
            </div>
          </div>

          {/* الرسم البياني الدائري */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">توزيع حالات العمليات</h2>
            <div className="flex items-center justify-center h-64">
              <svg viewBox="0 0 200 200" width="200" height="200">
                {pieData.reduce((paths, item, idx) => {
                  const startAngle = pieData.slice(0, idx).reduce((sum, d) => sum + (d.percentage * 3.6), 0);
                  const endAngle = startAngle + (item.percentage * 3.6);

                  const startRad = (startAngle - 90) * Math.PI / 180;
                  const endRad = (endAngle - 90) * Math.PI / 180;

                  const x1 = 100 + 80 * Math.cos(startRad);
                  const y1 = 100 + 80 * Math.sin(startRad);
                  const x2 = 100 + 80 * Math.cos(endRad);
                  const y2 = 100 + 80 * Math.sin(endRad);

                  const largeArc = item.percentage > 50 ? 1 : 0;
                  const pathData = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;

                  const colors = {
                    'from-green-600 to-green-400': '#16a34a',
                    'from-blue-600 to-blue-400': '#2563eb',
                    'from-yellow-600 to-yellow-400': '#ca8a04',
                    'from-red-600 to-red-400': '#dc2626'
                  };

                  paths.push(
                    <path
                      key={idx}
                      d={pathData}
                      fill={(colors as any)[item.color] || '#666'}
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  );

                  return paths;
                }, [] as JSX.Element[])}
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${item.color}`}></div>
                  <span className="text-slate-300">{item.category} ({item.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* رسم بياني العنكبوت (Radar) */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">تقييم الأداء الشامل</h2>
          <div className="flex items-center justify-center h-80">
            <svg viewBox="0 0 300 300" width="300" height="300">
              {/* الشبكات الخلفية */}
              {[1, 2, 3, 4, 5].map((i) => (
                <circle
                  key={`grid-${i}`}
                  cx="150"
                  cy="150"
                  r={(i * 30)}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="1"
                />
              ))}

              {/* التسميات */}
              {radarData.categories?.map((cat: string, idx: number) => {
                const angle = (idx * 360 / radarData.categories.length - 90) * Math.PI / 180;
                const x = 150 + 130 * Math.cos(angle);
                const y = 150 + 130 * Math.sin(angle);
                return (
                  <text
                    key={`label-${idx}`}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-slate-400"
                  >
                    {cat}
                  </text>
                );
              })}

              {/* النقاط والخطوط */}
              <polyline
                points={radarData.values?.map((v: number, idx: number) => {
                  const angle = (idx * 360 / radarData.values.length - 90) * Math.PI / 180;
                  const x = 150 + (v * 1.2) * Math.cos(angle);
                  const y = 150 + (v * 1.2) * Math.sin(angle);
                  return `${x},${y}`;
                }).join(' ')}
                fill="rgba(59, 130, 246, 0.3)"
                stroke="#3b82f6"
                strokeWidth="2"
              />

              {/* النقاط */}
              {radarData.values?.map((v: number, idx: number) => {
                const angle = (idx * 360 / radarData.values.length - 90) * Math.PI / 180;
                const x = 150 + (v * 1.2) * Math.cos(angle);
                const y = 150 + (v * 1.2) * Math.sin(angle);
                return (
                  <circle
                    key={`point-${idx}`}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3b82f6"
                    stroke="#1e3a8a"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </div>
          <div className="text-center text-slate-300 text-sm mt-4">
            <p>متوسط الأداء الكلي: <span className="font-bold text-blue-400">91%</span></p>
          </div>
        </div>

        {/* الجداول التحليلية */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* جدول المقاييس الرئيسية */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 overflow-x-auto">
            <h2 className="text-xl font-bold text-white mb-4">المقاييس الرئيسية</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-right text-slate-300 pb-2">المقياس</th>
                  <th className="text-center text-slate-300 pb-2">القيمة</th>
                  <th className="text-center text-slate-300 pb-2">الاتجاه</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'معدل النجاح', value: '95%', trend: '↑' },
                  { name: 'الأداء العام', value: '88%', trend: '↑' },
                  { name: 'وقت الاستجابة', value: '2.3h', trend: '↓' },
                  { name: 'معدل الأتمتة', value: '76%', trend: '↑' },
                  { name: 'درجة المخاطر', value: '12/100', trend: '↓' }
                ].map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-700">
                    <td className="text-slate-300 py-3">{item.name}</td>
                    <td className="text-center text-white font-semibold">{item.value}</td>
                    <td className="text-center">
                      <span className={item.trend === '↑' ? 'text-green-400' : 'text-red-400'}>
                        {item.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* جدول المقارنة */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 overflow-x-auto">
            <h2 className="text-xl font-bold text-white mb-4">مقارنة الأداء</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-right text-slate-300 pb-2">الفترة</th>
                  <th className="text-center text-slate-300 pb-2">الأداء</th>
                  <th className="text-center text-slate-300 pb-2">التغير</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { period: 'هذا اليوم', performance: '88%', change: '+5%' },
                  { period: 'أمس', performance: '83%', change: '+2%' },
                  { period: 'هذا الأسبوع', performance: '86%', change: '+8%' },
                  { period: 'الأسبوع الماضي', performance: '78%', change: '-3%' },
                  { period: 'هذا الشهر', performance: '85%', change: '+12%' }
                ].map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-700">
                    <td className="text-slate-300 py-3">{item.period}</td>
                    <td className="text-center text-white font-semibold">{item.performance}</td>
                    <td className={`text-center font-semibold ${item.change.includes('+') ? 'text-green-400' : 'text-red-400'}`}>
                      {item.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDataVisualizations;
