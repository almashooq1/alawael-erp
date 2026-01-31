// process.analytics.ts
// تحليلات متقدمة ومقاييس ذكية للعمليات

import { Process } from './process.model';

export interface ProcessMetrics {
  totalProcesses: number;
  completedProcesses: number;
  activeProcesses: number;
  averageCompletionTime: number;
  successRate: number;
  bottlenecks: string[];
  riskScore: number;
  efficiency: number;
}

// حساب المقاييس الشاملة للعمليات
export function calculateProcessMetrics(processes: Process[]): ProcessMetrics {
  const completed = processes.filter(p => p.status === 'completed').length;
  const active = processes.filter(p => p.status === 'active').length;

  // حساب متوسط وقت الإنجاز
  let totalTime = 0;
  for (const p of completed > 0 ? processes.filter(p => p.status === 'completed') : processes) {
    const start = new Date(p.createdAt).getTime();
    const end = new Date(p.updatedAt).getTime();
    totalTime += (end - start) / (1000 * 60 * 60); // بالساعات
  }
  const avgTime = completed > 0 ? totalTime / completed : 0;

  // معدل النجاح
  const successRate = processes.length > 0 ? (completed / processes.length) * 100 : 0;

  // تحديد الاختناقات
  const stepCounts: { [key: string]: number } = {};
  for (const p of processes) {
    for (const step of p.steps) {
      if (step.status !== 'done') {
        stepCounts[step.name] = (stepCounts[step.name] || 0) + 1;
      }
    }
  }
  const bottlenecks = Object.entries(stepCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  // حساب درجة المخاطر
  const riskScore = Math.min(100, active * 10 + (100 - successRate));

  // كفاءة النظام (معكوسة مع درجة المخاطر)
  const efficiency = Math.max(0, 100 - riskScore);

  return {
    totalProcesses: processes.length,
    completedProcesses: completed,
    activeProcesses: active,
    averageCompletionTime: Math.round(avgTime),
    successRate: Math.round(successRate),
    bottlenecks,
    riskScore: Math.round(riskScore),
    efficiency: Math.round(efficiency)
  };
}

// تحليل الاتجاهات الزمنية
export function analyzeTrends(processes: Process[]): {
  trend: 'تحسن' | 'تراجع' | 'مستقر';
  weeklyAverage: number;
  monthlyAverage: number;
} {
  const week = processes.filter(p => {
    const age = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return age <= 7;
  }).length;

  const month = processes.filter(p => {
    const age = (Date.now() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return age <= 30;
  }).length;

  let trend: 'تحسن' | 'تراجع' | 'مستقر' = 'مستقر';
  if (week > (month / 4.3)) trend = 'تحسن';
  if (week < (month / 4.3) * 0.7) trend = 'تراجع';

  return {
    trend,
    weeklyAverage: Math.round(week / 7),
    monthlyAverage: Math.round(month / 30)
  };
}

// التنبؤ بالأداء المستقبلي
export function forecastPerformance(processes: Process[], daysAhead: number = 30): {
  estimatedCompletion: number;
  confidenceLevel: number;
  recommendation: string;
} {
  const metrics = calculateProcessMetrics(processes);

  if (processes.length === 0) {
    return {
      estimatedCompletion: 0,
      confidenceLevel: 0,
      recommendation: 'بيانات غير كافية للتنبؤ'
    };
  }

  // التنبؤ بناءً على معدل النجاح والوقت المتوسط
  const dailyRate = metrics.completedProcesses / Math.max(1, (Date.now() - new Date(processes[0].createdAt).getTime()) / (1000 * 60 * 60 * 24));
  const estimatedCompletion = Math.round(dailyRate * daysAhead);

  // مستوى الثقة يعتمد على كمية البيانات
  const confidenceLevel = Math.min(95, processes.length * 5);

  let recommendation = 'الأداء طبيعي';
  if (metrics.riskScore > 70) recommendation = 'تحذير: نسبة مخاطر عالية';
  if (metrics.successRate < 50) recommendation = 'تنبيه: معدل النجاح منخفض جداً';
  if (metrics.efficiency > 80) recommendation = 'ممتاز: النظام يعمل بكفاءة عالية';

  return {
    estimatedCompletion,
    confidenceLevel: Math.round(confidenceLevel),
    recommendation
  };
}

// تقرير شامل للأداء
export function generateComprehensiveReport(processes: Process[]): {
  metrics: ProcessMetrics;
  trends: ReturnType<typeof analyzeTrends>;
  forecast: ReturnType<typeof forecastPerformance>;
  timestamp: string;
  healthStatus: 'جيد' | 'تحذير' | 'حرج';
} {
  const metrics = calculateProcessMetrics(processes);
  const trends = analyzeTrends(processes);
  const forecast = forecastPerformance(processes);

  let healthStatus: 'جيد' | 'تحذير' | 'حرج' = 'جيد';
  if (metrics.riskScore > 70) healthStatus = 'تحذير';
  if (metrics.riskScore > 85) healthStatus = 'حرج';

  return {
    metrics,
    trends,
    forecast,
    timestamp: new Date().toISOString(),
    healthStatus
  };
}
