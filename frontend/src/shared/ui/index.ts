/**
 * TrakSense Platform - Design System
 * 
 * Sistema de design unificado para todos os módulos da plataforma.
 * Inclui tokens de tema, componentes shadcn/ui e componentes compostos.
 * 
 * @example
 * ```tsx
 * import { Button, Card, PageHeader, StatusBadge, theme } from '@/shared/ui';
 * ```
 */

// ============================================================================
// TEMA E TOKENS
// ============================================================================
export { theme, colors, typography, spacing, borderRadius, boxShadow, animation, breakpoints, zIndex } from './theme';
export type { Theme } from './theme';

// ============================================================================
// COMPONENTES SHADCN/UI (Base)
// ============================================================================

// Layout & Container
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// Forms
export { Button, buttonVariants } from '@/components/ui/button';
export { Input } from '@/components/ui/input';
export { Label } from '@/components/ui/label';
export { Textarea } from '@/components/ui/textarea';
export { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue,
  SelectSeparator
} from '@/components/ui/select';
export { Checkbox } from '@/components/ui/checkbox';
export { Switch } from '@/components/ui/switch';
export { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
export { Slider } from '@/components/ui/slider';

// Data Display
export { Badge, badgeVariants } from '@/components/ui/badge';
export { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
export { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableFooter, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
export { Progress } from '@/components/ui/progress';
export { Separator } from '@/components/ui/separator';
export { Skeleton } from '@/components/ui/skeleton';

// Navigation
export { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
export { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';

// Overlay
export { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
export { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuShortcut,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
export { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
export { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

// Feedback
export { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
export { Toaster } from '@/components/ui/sonner';
export { toast } from 'sonner';

// Other
export { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
export { Calendar } from '@/components/ui/calendar';
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ============================================================================
// COMPONENTES COMPOSTOS (Design System)
// ============================================================================
export {
  // Layout
  PageHeader,
  type PageHeaderProps,
  type BreadcrumbItem as PageBreadcrumbItem,
  
  // Data Display
  StatusBadge,
  type StatusBadgeProps,
  type StatusType,
  StatCard,
  type StatCardProps,
  DataTable,
  type DataTableProps,
  type DataTableColumn,
  EmptyState,
  type EmptyStateProps,
  
  // Feedback
  ConfirmDialog,
  type ConfirmDialogProps,
  LoadingSpinner,
  LoadingOverlay,
  type LoadingSpinnerProps,
  type LoadingOverlayProps,
} from './components';

