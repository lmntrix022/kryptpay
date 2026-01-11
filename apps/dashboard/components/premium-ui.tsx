'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

// ============================================
// PREMIUM HERO COMPONENT
// ============================================
interface PremiumHeroProps {
  title: string;
  highlight?: string;
  description: string;
  icon?: ReactNode;
  badge?: string;
  badgeIcon?: ReactNode;
  actions?: ReactNode;
  stats?: { value: number | string; label: string }[];
}

export function PremiumHero({ title, highlight, description, icon, badge, badgeIcon, actions, stats }: PremiumHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-violet-500 to-violet-600 p-8 text-white shadow-2xl shadow-violet-500/25">
      {/* Background Effects */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl" />
      
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          {icon && (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              {icon}
      </div>
          )}
          <div>
            {badge && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                {badgeIcon || <Sparkles className="h-3 w-3" />}
                  {badge}
                </span>
            )}
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {title}
              {highlight && <span className="text-violet-200"> {highlight}</span>}
            </h1>
            <p className="mt-1 text-violet-100">{description}</p>

            {stats && stats.length > 0 && (
              <div className="mt-4 flex gap-6">
                {stats.map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-violet-200">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {actions && <div className="flex gap-3">{actions}</div>}
      </div>
    </div>
  );
}

// ============================================
// PREMIUM CARD COMPONENT
// ============================================
interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  hoverable?: boolean;
  gradient?: boolean;
}

export function PremiumCard({ children, className, hover = true, hoverable, gradient = false }: PremiumCardProps) {
  const shouldHover = hoverable !== undefined ? hoverable : hover;
  
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900',
        shouldHover && 'transition-all hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1',
        gradient && 'bg-gradient-to-br from-white to-violet-50/50 dark:from-zinc-900 dark:to-violet-950/20',
        className
      )}
    >
          {children}
        </div>
  );
}

// ============================================
// PREMIUM STAT CARD COMPONENT
// ============================================
interface PremiumStatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    positive: boolean;
  };
  gradient?: string;
}

export function PremiumStatCard({ title, value, description, icon, trend, gradient }: PremiumStatCardProps) {
  return (
    <PremiumCard className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">{value}</p>
          {description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
          )}
          {trend && (
            <div className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              trend.positive 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            gradient || 'bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25'
          )}>
            {icon}
          </div>
        )}
      </div>
      {/* Decorative gradient */}
      <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/10 to-violet-600/10 blur-2xl" />
    </PremiumCard>
  );
}

// ============================================
// PREMIUM BUTTON COMPONENT
// ============================================
interface PremiumButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function PremiumButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className,
  onClick,
  disabled,
  type = 'button'
}: PremiumButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02]',
    secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-700',
    ghost: 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon}
      {children}
    </button>
  );
}

// ============================================
// PREMIUM TABLE CONTAINER
// ============================================
interface PremiumTableContainerProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function PremiumTableContainer({ children, title, description, actions }: PremiumTableContainerProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div>
            {title && <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>}
            {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

// ============================================
// PREMIUM LOADER
// ============================================
interface PremiumLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PremiumLoader({ message = 'Chargement...', size = 'md' }: PremiumLoaderProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className={cn('relative', sizes[size])}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/20 to-violet-600/20 animate-pulse" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 border-r-violet-500/50 animate-spin" />
        <div className="absolute inset-2 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-[#8b5cf6]" />
        </div>
      </div>
      {message && (
        <p className="text-sm font-medium text-zinc-500">{message}</p>
      )}
    </div>
  );
}

// ============================================
// PREMIUM BADGE
// ============================================
interface PremiumBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'violet';
}

export function PremiumBadge({ children, variant = 'default' }: PremiumBadgeProps) {
  const variants = {
    default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
      variants[variant]
    )}>
      {children}
    </span>
  );
}

// ============================================
// PREMIUM EMPTY STATE
// ============================================
interface PremiumEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function PremiumEmptyState({ icon, title, description, action }: PremiumEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-600/10 text-[#8b5cf6]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ============================================
// PREMIUM SECTION HEADER
// ============================================
interface PremiumSectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PremiumSectionHeader({ title, description, actions }: PremiumSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

// ============================================
// PREMIUM TAB
// ============================================
interface PremiumTabsProps {
  tabs: { id: string; label: string; icon?: ReactNode }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function PremiumTabs({ tabs, activeTab, onTabChange }: PremiumTabsProps) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            activeTab === tab.id
              ? 'bg-white dark:bg-zinc-800 text-violet-600 dark:text-violet-400 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// PREMIUM INPUT
// ============================================
interface PremiumInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  icon?: ReactNode;
  error?: string;
  className?: string;
}

export function PremiumInput({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = 'text',
  icon,
  error,
  className 
}: PremiumInputProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            'w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400',
            'focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20',
            'dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder:text-zinc-500',
            'transition-all duration-200',
            icon && 'pl-10',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          )}
        />
      </div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
