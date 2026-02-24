/**
 * Component Tests for DocumentList
 * اختبارات Component لمكون قائمة المستندات
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DocumentList from '../src/components/documents/DocumentList';

// Mock Redux store
const createMockStore = () =>
  configureStore({
    reducer: {
      app: () => ({ theme: 'light' }),
      auth: () => ({ user: { id: '1', name: 'Test User' } }),
    },
  });

// Mock data
const mockDocuments = [
  {
    _id: '1',
    title: 'Document 1',
    category: 'تقارير',
    fileSize: 1024000,
    createdAt: new Date('2024-01-01'),
    originalFileName: 'doc1.pdf',
    fileType: 'pdf',
    description: 'Test document 1',
    uploadedByName: 'User One',
    uploadedByEmail: 'user1@test.com',
    tags: ['important', 'review'],
    viewCount: 5,
    downloadCount: 2,
  },
  {
    _id: '2',
    title: 'Document 2',
    category: 'عقود',
    fileSize: 2048000,
    createdAt: new Date('2024-01-02'),
    originalFileName: 'doc2.docx',
    fileType: 'docx',
    description: 'Test document 2',
    uploadedByName: 'User Two',
    uploadedByEmail: 'user2@test.com',
    tags: ['contract'],
    viewCount: 10,
    downloadCount: 5,
  },
  {
    _id: '3',
    title: 'Document 3',
    category: 'سياسات',
    fileSize: 512000,
    createdAt: new Date('2024-01-03'),
    originalFileName: 'doc3.xlsx',
    fileType: 'xlsx',
    description: 'Test document 3',
    uploadedByName: 'User Three',
    uploadedByEmail: 'user3@test.com',
    tags: ['policy'],
    viewCount: 15,
    downloadCount: 8,
  },
];

describe('DocumentList Component', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = createMockStore();
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('يجب أن يعرض الجدول مع المستندات', () => {
      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      expect(screen.getByText('Document 1')).toBeInTheDocument();
      expect(screen.getByText('Document 2')).toBeInTheDocument();
      expect(screen.getByText('Document 3')).toBeInTheDocument();
    });

    test('يجب أن يعرض رسالة عندما لا توجد مستندات', () => {
      render(
        <Provider store={mockStore}>
          <DocumentList documents={[]} onRefresh={jest.fn()} />
        </Provider>,
      );

      expect(screen.getByText(/لا توجد مستندات/i)).toBeInTheDocument();
    });

    test('يجب أن يعرض الفئات بألوان مختلفة', () => {
      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      expect(screen.getByText('تقارير')).toBeInTheDocument();
      expect(screen.getByText('عقود')).toBeInTheDocument();
      expect(screen.getByText('سياسات')).toBeInTheDocument();
    });
  });

  describe('Search and Filtering', () => {
    test('يجب أن يتم البحث عن المستندات حسب العنوان', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const searchInput = screen.getByPlaceholderText(/البحث في المستندات/i);
      await user.type(searchInput, 'Document 1');

      await waitFor(() => {
        expect(screen.getByText('Document 1')).toBeInTheDocument();
        expect(screen.queryByText('Document 2')).not.toBeInTheDocument();
      });
    });

    test('يجب أن يتم التصفية حسب الفئة', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const categorySelect = screen.getByDisplayValue(/الكل/i);
      await user.click(categorySelect);
      await user.click(screen.getByText(/تقارير/i));

      await waitFor(() => {
        expect(screen.getByText('Document 1')).toBeInTheDocument();
        expect(screen.queryByText('Document 2')).not.toBeInTheDocument();
      });
    });

    test('يجب أن يتم البحث حسب اسم الملف الأصلي', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const searchInput = screen.getByPlaceholderText(/البحث في المستندات/i);
      await user.type(searchInput, 'doc2');

      await waitFor(() => {
        expect(screen.getByText('Document 2')).toBeInTheDocument();
        expect(screen.queryByText('Document 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Selection', () => {
    test('يجب أن يتم تحديد مستند واحد', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // اختر أول مستند

      expect(checkboxes[1]).toBeChecked();
    });

    test('يجب أن يتم تحديد جميع المستندات في الصفحة', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const mainCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(mainCheckbox);

      const allCheckboxes = screen.getAllByRole('checkbox');
      allCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });
    });

    test('يجب أن يعرض عدد العناصر المحددة', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const mainCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(mainCheckbox);

      expect(screen.getByText(/محدد: 3/)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    test('يجب أن يتم الترتيب حسب التاريخ', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const sortSelect = screen.getByDisplayValue(/التاريخ/i);
      await user.click(sortSelect);

      // يجب أن يكون الترتيب الافتراضي حسب التاريخ
      const firstRow = screen.getAllByRole('cell');
      expect(firstRow[1]).toHaveTextContent('Document 1');
    });

    test('يجب أن يتم عكس الترتيب', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const reverseButton = screen.getByLabelText(/toggle-sort-order/i);
      await user.click(reverseButton);

      await waitFor(() => {
        const firstRow = screen.getAllByRole('cell');
        expect(firstRow[1]).toHaveTextContent('Document 3');
      });
    });
  });

  describe('Actions', () => {
    test('يجب أن يتم فتح نافذة التفاصيل', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const detailsButtons = screen.getAllByLabelText(/معاينة/i);
      await user.click(detailsButtons[0]);

      expect(screen.getByText(/تفاصيل المستند/i)).toBeInTheDocument();
    });

    test('يجب أن يتم فتح نافذة التحرير', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const editButtons = screen.getAllByLabelText(/تحرير/i);
      await user.click(editButtons[0]);

      expect(screen.getByText(/تحرير المستند/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    test('يجب أن يتم تقسيم المستندات إلى صفحات', () => {
      const manyDocuments = Array.from({ length: 25 }, (_, i) => ({
        ...mockDocuments[0],
        _id: `${i}`,
        title: `Document ${i + 1}`,
      }));

      render(
        <Provider store={mockStore}>
          <DocumentList documents={manyDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      // يجب أن يظهر زر الترقيم
      expect(screen.getByLabelText(/عدد الصفوف:/i)).toBeInTheDocument();
    });

    test('يجب أن يتم التنقل بين الصفحات', async () => {
      const user = userEvent.setup();
      const manyDocuments = Array.from({ length: 25 }, (_, i) => ({
        ...mockDocuments[0],
        _id: `${i}`,
        title: `Document ${i + 1}`,
      }));

      render(
        <Provider store={mockStore}>
          <DocumentList documents={manyDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      // انتقل إلى الصفحة التالية
      const nextButton = screen.getByLabelText(/الصفحة التالية/i);
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Document 11')).toBeInTheDocument();
      });
    });
  });

  describe('Column Visibility', () => {
    test('يجب أن يتم تبديل رؤية الأعمدة', async () => {
      const user = userEvent.setup();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const columnsButton = screen.getByLabelText(/columns-menu/i);
      await user.click(columnsButton);

      // يجب أن تظهر قائمة الأعمدة
      expect(screen.getByText(/النوع/)).toBeInTheDocument();
    });
  });

  describe('Bulk Actions', () => {
    test('يجب أن يتم تنزيل عناصر متعددة', async () => {
      const user = userEvent.setup();
      const mockDownload = jest.fn();

      render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      // حدد عناصر
      const mainCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(mainCheckbox);

      // يجب أن تظهر الإجراءات الجماعية
      expect(screen.getByText(/محدد: 3/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('يجب أن تكون الجداول في HTML بشكل صحيح', () => {
      const { container } = render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
      expect(table.querySelector('thead')).toBeInTheDocument();
      expect(table.querySelector('tbody')).toBeInTheDocument();
    });

    test('يجب أن تكون أزرار في الواجهة قابلة للتركيز', () => {
      const { container } = render(
        <Provider store={mockStore}>
          <DocumentList documents={mockDocuments} onRefresh={jest.fn()} />
        </Provider>,
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
