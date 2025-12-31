import { cn } from '@/lib/utils'

interface ScreenMockupProps {
  title: string
  children: React.ReactNode
  className?: string
  variant?: 'light' | 'dark'
}

export function ScreenMockup({ title, children, className, variant = 'light' }: ScreenMockupProps) {
  return (
    <div className={cn(
      "rounded-xl overflow-hidden shadow-2xl border",
      variant === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200',
      className
    )}>
      {/* Window Chrome */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-3 border-b",
        variant === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
      )}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className={cn(
          "flex-1 text-center text-sm font-medium",
          variant === 'dark' ? 'text-gray-400' : 'text-gray-600'
        )}>
          {title}
        </div>
        <div className="w-16" /> {/* Spacer for balance */}
      </div>
      
      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  )
}

interface ScreenTabsProps {
  tabs: { name: string; active?: boolean }[]
  variant?: 'light' | 'dark'
  accentColor?: string
}

export function ScreenTabs({ tabs, variant = 'light', accentColor = 'teal' }: ScreenTabsProps) {
  return (
    <div className={cn(
      "flex gap-1 px-4 py-2 border-b overflow-x-auto",
      variant === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50/50 border-gray-100'
    )}>
      {tabs.map((tab) => (
        <div
          key={tab.name}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
            tab.active 
              ? `bg-${accentColor}-500 text-white`
              : variant === 'dark' 
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          {tab.name}
        </div>
      ))}
    </div>
  )
}

interface ScreenSidebarProps {
  items: { icon: React.ReactNode; name: string; active?: boolean }[]
  variant?: 'light' | 'dark'
  accentColor?: string
}

export function ScreenSidebar({ items, variant = 'light', accentColor = 'teal' }: ScreenSidebarProps) {
  return (
    <div className={cn(
      "w-48 border-r p-2 space-y-1",
      variant === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50/50 border-gray-100'
    )}>
      {items.map((item) => (
        <div
          key={item.name}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors",
            item.active 
              ? `bg-${accentColor}-500/10 text-${accentColor}-600`
              : variant === 'dark'
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          )}
        >
          {item.icon}
          <span>{item.name}</span>
        </div>
      ))}
    </div>
  )
}

interface KPICardMockupProps {
  label: string
  value: string
  trend?: string
  trendUp?: boolean
  icon: React.ReactNode
  color: string
}

export function KPICardMockup({ label, value, trend, trendUp, icon, color }: KPICardMockupProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-lg font-bold text-gray-900">{value}</span>
        {trend && (
          <span className={cn(
            "text-xs font-medium",
            trendUp ? 'text-green-600' : 'text-red-600'
          )}>
            {trend}
          </span>
        )}
      </div>
    </div>
  )
}

interface TableRowMockupProps {
  cells: React.ReactNode[]
  variant?: 'light' | 'dark'
}

export function TableRowMockup({ cells, variant = 'light' }: TableRowMockupProps) {
  return (
    <div className={cn(
      "grid gap-4 px-4 py-3 border-b text-xs",
      variant === 'dark' ? 'border-gray-700' : 'border-gray-100'
    )} style={{ gridTemplateColumns: `repeat(${cells.length}, 1fr)` }}>
      {cells.map((cell, index) => (
        <div key={index}>{cell}</div>
      ))}
    </div>
  )
}

interface StatusBadgeMockupProps {
  status: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  text: string
}

export function StatusBadgeMockup({ status, text }: StatusBadgeMockupProps) {
  const colors = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    neutral: 'bg-gray-100 text-gray-700',
  }
  
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", colors[status])}>
      {text}
    </span>
  )
}

interface ChartMockupProps {
  type: 'bar' | 'line' | 'donut'
  height?: number
  color?: string
}

export function ChartMockup({ type, height = 120, color = 'teal' }: ChartMockupProps) {
  if (type === 'bar') {
    return (
      <div className="flex items-end gap-2 justify-around" style={{ height }}>
        {[65, 80, 45, 90, 70, 85, 55].map((h, i) => (
          <div
            key={i}
            className={`w-8 bg-${color}-500 rounded-t opacity-${60 + (i * 5)}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    )
  }
  
  if (type === 'line') {
    return (
      <div className="relative" style={{ height }}>
        <svg viewBox="0 0 200 80" className="w-full h-full">
          <path
            d="M 0 60 Q 30 40 50 50 T 100 30 T 150 40 T 200 20"
            fill="none"
            stroke={`var(--color-${color}-500, #14b8a6)`}
            strokeWidth="2"
          />
          <path
            d="M 0 60 Q 30 40 50 50 T 100 30 T 150 40 T 200 20 L 200 80 L 0 80 Z"
            fill={`var(--color-${color}-500, #14b8a6)`}
            opacity="0.1"
          />
        </svg>
      </div>
    )
  }
  
  if (type === 'donut') {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <svg viewBox="0 0 100 100" className="w-24 h-24">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={`var(--color-${color}-500, #14b8a6)`}
            strokeWidth="12"
            strokeDasharray="188 63"
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="55" textAnchor="middle" className="text-lg font-bold fill-gray-900">75%</text>
        </svg>
      </div>
    )
  }
  
  return null
}
