/**
 * UI Components - Platform Design System
 *
 * Componentes base do design system ClimaTrak.
 * Inspirados no shadcn/ui do frontend web + melhorias mobile.
 * 
 * @see docs/design/DESIGN_SYSTEM.md
 */

// Button
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
export type { CardVariant } from './Card';

// Input
export { Input } from './Input';
export type { InputProps } from './Input';

// Badge
export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';

// StatusBadge - Status operacional semântico
export { StatusBadge } from './StatusBadge';
export type { 
  OperationalStatus, 
  WorkOrderStatus, 
  Priority, 
  StatusBadgeSize 
} from './StatusBadge';

// StatCard - KPIs e métricas
export { StatCard, StatRow } from './StatCard';
export type { StatTrend, StatVariant } from './StatCard';

// Skeleton
export { Skeleton, SkeletonText, SkeletonCard } from './Skeleton';
export type { SkeletonProps, SkeletonTextProps, SkeletonCardProps } from './Skeleton';

// ScreenContainer
export { ScreenContainer } from './ScreenContainer';
export type { ScreenContainerProps } from './ScreenContainer';

// Modal
export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
} from './Modal';
export type { ModalProps, ModalHeaderProps, ModalFooterProps } from './Modal';
