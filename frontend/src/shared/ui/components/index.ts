/**
 * Design System Components - Index
 * 
 * Componentes compostos e reutilizáveis da plataforma.
 */

// Layout Components
export { PageHeader, type PageHeaderProps, type BreadcrumbItem } from './PageHeader';

// Data Display
export { StatusBadge, type StatusBadgeProps, type StatusType } from './StatusBadge';
export { StatCard, type StatCardProps } from './StatCard';
export {
  DataTable,
  type DataTableProps,
  type DataTableColumn,
  type Column,
  type PaginationState,
  type SortState,
} from './DataTable';
export { EmptyState, type EmptyStateProps } from './EmptyState';

// Filters
export { FilterBar, type FilterBarProps } from './FilterBar';

// Feedback
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';
export { LoadingSpinner, LoadingOverlay, type LoadingSpinnerProps, type LoadingOverlayProps } from './LoadingSpinner';
