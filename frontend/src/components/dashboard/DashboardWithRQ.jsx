/**
 * React Query Demo — DashboardWithRQ
 * مثال على استخدام React Query hooks بدلاً من useEffect + useState
 *
 * BEFORE (الطريقة القديمة):
 *   const [data, setData] = useState(null);
 *   const [loading, setLoading] = useState(true);
 *   useEffect(() => {
 *     api.get('/dashboard/summary').then(res => {
 *       setData(res.data);
 *       setLoading(false);
 *     });
 *   }, []);
 *
 * AFTER (React Query):
 *   const { data, isLoading, error } = useDashboardSummary();
 */

import React from 'react';
import {
  useDashboardSummary,
  useDashboardServices,
  useTopKPIs,
  useDashboardPrefetch,
} from '../hooks/useDashboard';

export default function DashboardWithRQ() {
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary();
  const { data: services, isLoading: servicesLoading } = useDashboardServices();
  const { data: kpis, isLoading: kpisLoading } = useTopKPIs(4);
  const { prefetch } = useDashboardPrefetch();

  // Prefetch on hover for instant navigation
  const handleMouseEnter = () => prefetch();

  if (summaryLoading) return <div>جاري التحميل...</div>;
  if (summaryError) return <div>خطأ: {summaryError.message}</div>;

  return (
    <div onMouseEnter={handleMouseEnter}>
      <h1>لوحة التحكم (React Query)</h1>

      <section>
        <h2>الملخص</h2>
        {summary && <pre>{JSON.stringify(summary, null, 2)}</pre>}
      </section>

      <section>
        <h2>الخدمات</h2>
        {servicesLoading ? (
          <div>جاري تحميل الخدمات...</div>
        ) : (
          <ul>
            {services?.map((svc) => (
              <li key={svc.id}>{svc.name}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>أهم المؤشرات</h2>
        {kpisLoading ? (
          <div>جاري تحميل KPIs...</div>
        ) : (
          <div>
            {kpis?.map((kpi) => (
              <div key={kpi.id}>
                {kpi.name}: {kpi.value}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
