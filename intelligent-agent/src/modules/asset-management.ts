
// src/modules/asset-management.ts
// Professional Asset Management System Module
import { Request, Response } from 'express';

export interface Asset {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'maintenance' | 'retired' | 'lost';
  location?: string;
  owner?: string;
  purchaseDate?: string;
  value?: number;
  depreciationRate?: number;
  tags?: string[];
  customFields?: Record<string, any>;
  lastMaintenanceDate?: string;
  nextMaintenanceDue?: string;
  aiScore?: number; // AI health/priority score
  aiRecommendation?: string;
  createdAt: string;
  updatedAt: string;
}

const assets: Asset[] = [];

function generateId() {
  return 'A' + Math.random().toString(36).slice(2, 10);
}

export class AssetManagement {
  // تصدير بيانات الأصول إلى CSV
  public exportAssetsAsCSV(): string {
    // استخدام require لحل مشكلة الاستيراد مع TypeScript
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Parser } = require('json2csv');
    const fields = [
      'id', 'name', 'type', 'status', 'location', 'owner', 'purchaseDate', 'value', 'depreciationRate',
      'tags', 'lastMaintenanceDate', 'nextMaintenanceDue', 'aiScore', 'aiRecommendation', 'createdAt', 'updatedAt'
    ];
    const opts = { fields, withBOM: true };
    const parser = new Parser(opts);
    // تحويل tags إلى نص مفصول بفواصل
    const data = this.listAssets().map((a: Asset) => ({ ...a, tags: a.tags ? a.tags.join(',') : '' }));
    return parser.parse(data);
  }
  listAssets(filter: Partial<Asset> = {}) {
    return assets.filter(a => Object.entries(filter).every(([k, v]) => a[k as keyof Asset] === v));
  }
  getAsset(id: string) {
    return assets.find(a => a.id === id);
  }
  createAsset(data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) {
    const asset: Asset = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    // AI: تقييم أولي للأصل
    asset.aiScore = this.calculateAIScore(asset);
    asset.aiRecommendation = this.generateAIRecommendation(asset);
    // تنبيه صيانة أولي
    asset.nextMaintenanceDue = this.predictNextMaintenance(asset);
    assets.push(asset);
    return asset;
  }
  updateAsset(id: string, data: Partial<Asset>) {
    const idx = assets.findIndex(a => a.id === id);
    if (idx === -1) return null;
    assets[idx] = {
      ...assets[idx],
      ...data,
      updatedAt: new Date().toISOString(),
      aiScore: this.calculateAIScore({ ...assets[idx], ...data }),
      aiRecommendation: this.generateAIRecommendation({ ...assets[idx], ...data }),
      nextMaintenanceDue: this.predictNextMaintenance({ ...assets[idx], ...data }),
    };
    return assets[idx];
  }
    // AI: تقييم صحة الأصل
    calculateAIScore(asset: Asset): number {
      let score = 100;
      if (asset.status === 'maintenance') score -= 20;
      if (asset.status === 'retired' || asset.status === 'lost') score -= 50;
      if (asset.value && asset.depreciationRate) {
        const years = this.getAssetAge(asset);
        score -= Math.min(40, years * asset.depreciationRate * 100);
      }
      if (asset.lastMaintenanceDate && asset.nextMaintenanceDue) {
        const now = Date.now();
        const due = new Date(asset.nextMaintenanceDue).getTime();
        if (now > due) score -= 30;
      }
      return Math.max(0, Math.round(score));
    }

    // AI: توصية ذكية
    generateAIRecommendation(asset: Asset): string {
      if (asset.status === 'retired' || asset.status === 'lost') return 'Asset should be archived or written off.';
      if (asset.aiScore !== undefined && asset.aiScore < 50) return 'Schedule urgent maintenance or consider replacement.';
      if (asset.nextMaintenanceDue && new Date(asset.nextMaintenanceDue).getTime() < Date.now()) return 'Maintenance overdue! Immediate action required.';
      if (asset.value && asset.depreciationRate && this.getAssetAge(asset) > 5) return 'Consider asset replacement due to age.';
      return 'Asset is in good condition.';
    }

    // تتبع ذكي: حساب عمر الأصل
    getAssetAge(asset: Asset): number {
      if (!asset.purchaseDate) return 0;
      const years = (Date.now() - new Date(asset.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
      return Math.floor(years);
    }

    // تنبؤ صيانة: متى يحتاج الأصل صيانة قادمة
    predictNextMaintenance(asset: Asset): string | undefined {
      if (!asset.lastMaintenanceDate) return undefined;
      // افتراض: الصيانة كل 6 أشهر
      const next = new Date(asset.lastMaintenanceDate);
      next.setMonth(next.getMonth() + 6);
      return next.toISOString();
    }

    // تنبيهات صيانة: قائمة الأصول التي تحتاج صيانة قريبًا
    getMaintenanceAlerts(daysAhead: number = 30) {
      const now = Date.now();
      const threshold = now + daysAhead * 24 * 60 * 60 * 1000;
      return assets.filter(a => a.nextMaintenanceDue && new Date(a.nextMaintenanceDue).getTime() < threshold);
    }
  deleteAsset(id: string) {
    const idx = assets.findIndex(a => a.id === id);
    if (idx === -1) return false;
    assets.splice(idx, 1);
    return true;
  }
  // Advanced: Asset depreciation calculation
  calculateDepreciation(id: string, years: number) {
    const asset = this.getAsset(id);
    if (!asset || !asset.value || !asset.depreciationRate) return null;
    const depreciation = asset.value * Math.pow(1 - asset.depreciationRate, years);
    return { id, originalValue: asset.value, years, depreciation, currentValue: asset.value - depreciation };
  }
  // Advanced: Asset assignment
  assignAsset(id: string, owner: string) {
    return this.updateAsset(id, { owner });
  }
  // Advanced: Asset tagging
  addTag(id: string, tag: string) {
    const asset = this.getAsset(id);
    if (!asset) return null;
    asset.tags = Array.from(new Set([...(asset.tags || []), tag]));
    asset.updatedAt = new Date().toISOString();
    return asset;
  }
}
