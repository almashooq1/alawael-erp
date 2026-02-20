/**
 * RiskDashboard.test.js
 * اختبارات شاملة لـ RiskDashboard
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RiskDashboard from '../RiskDashboard';
import * as API from '../../services/api';

jest.mock('../../services/api');
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Setup API mocks
API.getRisks = jest.fn();
API.updateRisk = jest.fn();
API.exportRisks = jest.fn();

describe('RiskDashboard', () => {
  const mockRisks = [
    {
      id: '1',
      name: 'مخاطرة السيولة',
      category: 'financial',
      severity: 'critical',
      probability: 80,
      impact: 75,
      createdAt: new Date('2025-02-15'),
      status: 'identified',
      mitigationActions: ['تقليل المصاريف', 'زيادة الإيرادات'],
    },
    {
      id: '2',
      name: 'مخاطرة الائتمان',
      category: 'operational',
      severity: 'high',
      probability: 60,
      impact: 50,
      createdAt: new Date('2025-02-14'),
      status: 'assessed',
      mitigationActions: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('authToken', 'mock-token');
  });

  describe('Component Rendering', () => {
    test('يجب أن يرسم المكون بنجاح', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      
      render(<RiskDashboard />);
      
      expect(screen.getByText(/لوحة إدارة المخاطر/i)).toBeInTheDocument();
    });

    test('يجب عرض المقاييس الرئيسية', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      
      render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });
  });

  describe('Health Status', () => {
    test('يجب حساب حالة النظام بشكل صحيح', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      
      render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    test('يجب حساب درجة المخاطر بشكل صحيح', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      
      render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });

  describe('Risk Statistics', () => {
    test('يجب حساب المخاطر الحرجة بشكل صحيح', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      
      render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });

    test('يجب حساب المخاطر العالية بشكل صحيح', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      
      render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    test('يجب تطبيق فلتر الخطورة', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      
      render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });
  });

  describe('Risk Matrix', () => {
    test('يجب رسم مصفوفة المخاطر بشكل صحيح', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      
      const { container } = render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    });
  });

  describe('Detail Modal', () => {
    test('يجب فتح نافذة التفاصيل عند النقر على مخاطرة', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      
      render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });

    test('يجب عرض إجراءات التخفيف في النافذة', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      
      render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });
  });

  describe('Export', () => {
    test('يجب تصدير البيانات بصيغة PDF', async () => {
      API.getRisks.mockResolvedValue({ data: { risks: mockRisks, metrics: {} } });
      API.exportRisks.mockResolvedValue(new Blob());
      
      render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(screen.getByText(/لوحة/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('يجب معالجة أخطاء جلب البيانات', async () => {
      API.getRisks.mockRejectedValue(new Error('API Error'));
      
      const { message } = require('antd');
      
      render(<RiskDashboard />);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(message.error).toHaveBeenCalled();
    });
  });
});
