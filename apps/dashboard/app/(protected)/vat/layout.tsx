'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, FileText, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const vatNavItems = [
  { href: '/vat/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vat/settings', label: 'Paramètres', icon: Settings },
  { href: '/vat/reports', label: 'Rapports', icon: FileText },
  { href: '/vat/subscriptions', label: 'Abonnements', icon: CreditCard },
];

export default function VatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex space-x-1" aria-label="VAT Navigation">
          {vatNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2',
                  isActive
                    ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/20'
                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <Icon className={cn(
                  'w-4 h-4 transition-colors',
                  isActive 
                    ? 'text-violet-600 dark:text-violet-400' 
                    : 'text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                )} />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="vatNavIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}

