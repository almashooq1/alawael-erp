import React from 'react';
import RouteErrorBoundary from './RouteErrorBoundary';

/**
 * SafeRouteWrapper
 * يلف أي عنصر React بـ RouteErrorBoundary لمنع تعطل التطبيق
 * عند حدوث خطأ في مسار واحد.
 */
export default function SafeRouteWrapper({ children }) {
  return <RouteErrorBoundary>{children}</RouteErrorBoundary>;
}
