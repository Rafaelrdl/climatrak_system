/**
 * UI Components
 *
 * Componentes base do design system ClimaTrak.
 * Inspirados no shadcn/ui do frontend web.
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

// Input
export { Input } from './Input';
export type { InputProps } from './Input';

// Badge
export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';

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
