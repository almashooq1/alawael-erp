/**
 * Shared Components Library — مكتبة المكونات المشتركة
 *
 * Reusable components used across all modules in the AlAwael ERP system.
 */

// Page structure
export { default as PageHeader } from './PageHeader';
export { default as PrintLayout } from './PrintLayout';

// Data display
export { default as StatsGrid } from './StatsGrid';
export { default as ChartCard } from './ChartCard';
export { default as InfoCard } from './InfoCard';
export { default as TimelineList } from './TimelineList';
export { default as StatusChip, STATUS_CONFIGS } from './StatusChip';
export { default as DataPlaceholder } from './DataPlaceholder';

// Forms & Filters
export { default as FilterBar } from './FilterBar';
export { default as SearchInput } from './SearchInput';
export { default as FormDialog } from './FormDialog';
export { default as ExportMenu } from './ExportMenu';

// Tabs
export { default as TabPanel, a11yProps } from './TabPanel';

// Error handling
export { default as RouteErrorBoundary } from './RouteErrorBoundary';
