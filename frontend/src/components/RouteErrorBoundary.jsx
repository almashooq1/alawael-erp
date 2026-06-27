import React from 'react';
import ErrorBoundary from './ErrorBoundary';

/**
 * RouteErrorBoundary
 * حدود أخطاء لكل مسار — تمنع تعطل التطبيق بالكامل عند
 * حدوث خطأ في صفحة واحدة.
 */

export default function RouteErrorBoundary({ children }) {
  return (
    <ErrorBoundary
      fallback={(
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">عذراً، حدث خطأ</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              تعذر تحميل هذه الصفحة. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
            >
              العودة للرئيسية
            </a>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
