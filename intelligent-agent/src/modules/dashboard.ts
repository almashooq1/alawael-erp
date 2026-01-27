
import { Notification } from './notification-center';
// src/modules/dashboard.ts
// Interactive Dashboards Module (customizable, user-based)

export interface Dashboard {
  id: string;
  userId: string;
  title: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
}

export interface Widget {
  id: string;
  type: string;
  config: Record<string, any>;
  position: { x: number; y: number; w: number; h: number };
}

const dashboards: Dashboard[] = [];

function generateId() {
  return 'B' + Math.random().toString(36).slice(2, 10);
}

export class DashboardManager {
  // Local Asset type for dashboard analytics only
  private _AssetTypeCheck: any;
  public getAssetAnalyticsWidget(
    assets: Array<{ id: string; name: string; status: 'active' | 'maintenance' | 'retired' | 'lost'; aiScore?: number; [key: string]: any }>,
    notifications: { title: string }[]
  ): any {
    const total = assets.length;
    const active = assets.filter((a) => a.status === 'active').length;
    const maintenance = assets.filter((a) => a.status === 'maintenance').length;
    const retired = assets.filter((a) => a.status === 'retired').length;
    const lost = assets.filter((a) => a.status === 'lost').length;
    const avgScore = assets.length ? Math.round(assets.reduce((s, a) => s + (a.aiScore || 0), 0) / assets.length) : 0;
    const alerts = notifications.filter((n: { title: string }) => n.title && n.title.startsWith('Maintenance Alert')).length;

    // Trend: افتراضي (محاكاة) - زيادة/نقصان الأصول الحرجة آخر 6 أشهر
    const months = 6;
    const trend: number[] = [];
    let base = Math.max(1, Math.round(total * 0.2));
    for (let i = months - 1; i >= 0; i--) {
      // محاكاة: تذبذب بسيط للأصول الحرجة
      trend.push(base + Math.round(Math.sin(i) * 2 + Math.random() * 2));
    }

    // AI Forecast: توقع عدد الأصول التي ستحتاج صيانة الشهر القادم
    const forecast = Math.max(1, Math.round(maintenance * 1.1 + Math.random() * 2));

    // توصيات صيانة ذكية للأصول:
    const smartRecommendations = assets
      .filter(a => a.status === 'active' && (a.aiScore !== undefined && a.aiScore < 60))
      .sort((a, b) => (a.aiScore || 0) - (b.aiScore || 0))
      .slice(0, 3)
      .map(a => ({
        assetId: a.id,
        assetName: a.name,
        reason: `Low AI Score (${a.aiScore ?? 'N/A'}) - Recommended for preventive maintenance.`
      }));

    // استخراج تنبيهات الأصول الحرجة من الإشعارات
    const criticalAssetAlerts = notifications
      .filter(n => n.title && n.title.toLowerCase().includes('critical asset'))
      .map(n => n.title);

    return {
      type: 'asset-analytics',
      title: 'تحليلات الأصول الذكية | Smart Asset Analytics',
      description: 'لوحة احترافية تعرض ملخص حالة الأصول، الاتجاهات، التوصيات الذكية، والتنبيهات الحرجة بشكل تفاعلي.\nA professional widget for asset status, trends, smart recommendations, and critical alerts.',
      data: {
        summary: [
          { label: 'إجمالي الأصول', value: total },
          { label: 'النشطة', value: active },
          { label: 'تحت الصيانة', value: maintenance },
          { label: 'متوقفة', value: retired },
          { label: 'مفقودة', value: lost },
          { label: 'متوسط الذكاء الاصطناعي', value: avgScore },
          { label: 'عدد التنبيهات', value: alerts }
        ],
        trend: {
          label: 'اتجاه الأصول الحرجة (6 أشهر) | Critical Assets Trend (6 months)',
          data: trend,
          months: Array.from({ length: months }, (_, i) => `M-${months - i}`)
        },
        forecast: {
          label: 'توقع ذكي: أصول تحتاج صيانة الشهر القادم | AI Forecast: Assets Needing Maintenance (next month)',
          value: forecast
        },
        smartRecommendations,
        criticalAssetAlerts
      },
      chart: {
        type: 'pie',
        series: [active, maintenance, retired, lost],
        labels: ['Active', 'Maintenance', 'Retired', 'Lost']
      }
    };
  }
  listDashboards(userId?: string) {
    return userId ? dashboards.filter(d => d.userId === userId) : dashboards;
  }
  getDashboard(id: string) {
    return dashboards.find(d => d.id === id);
  }
  createDashboard(data: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>) {
    const dash: Dashboard = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    dashboards.push(dash);
    return dash;
  }
  updateDashboard(id: string, data: Partial<Omit<Dashboard, 'id' | 'createdAt'>>) {
    const d = dashboards.find(d => d.id === id);
    if (!d) return null;
    Object.assign(d, data);
    d.updatedAt = new Date().toISOString();
    return d;
  }
  deleteDashboard(id: string) {
    const idx = dashboards.findIndex(d => d.id === id);
    if (idx === -1) return false;
    dashboards.splice(idx, 1);
    return true;
  }
  // Widget management
  addWidget(dashboardId: string, widget: Omit<Widget, 'id'>) {
    const d = dashboards.find(d => d.id === dashboardId);
    if (!d) return null;
    const w: Widget = { id: generateId(), ...widget };
    d.widgets.push(w);
    d.updatedAt = new Date().toISOString();
    return w;
  }
  updateWidget(dashboardId: string, widgetId: string, data: Partial<Omit<Widget, 'id'>>) {
    const d = dashboards.find(d => d.id === dashboardId);
    if (!d) return null;
    const w = d.widgets.find(w => w.id === widgetId);
    if (!w) return null;
    Object.assign(w, data);
    d.updatedAt = new Date().toISOString();
    return w;
  }
  removeWidget(dashboardId: string, widgetId: string) {
    const d = dashboards.find(d => d.id === dashboardId);
    if (!d) return false;
    const idx = d.widgets.findIndex(w => w.id === widgetId);
    if (idx === -1) return false;
    d.widgets.splice(idx, 1);
    d.updatedAt = new Date().toISOString();
    return true;
  }
}
