'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Wallet,
  Plug,
  Gamepad2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  RotateCcw,
  Webhook,
  BarChart3,
  Repeat,
  FlaskConical,
  X,
  Sparkles,
  TrendingUp,
  Shield,
  DollarSign,
  Receipt,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { auth, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!auth) {
        router.replace('/login');
        return;
      }

      if (pathname.startsWith('/admin') && auth.user.role !== 'ADMIN') {
        router.replace('/merchant');
      }
    }
  }, [auth, isLoading, pathname, router]);

  if (isLoading || !auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-500 border-r-cyan-500/50 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#08c2db]" />
            </div>
          </div>
          <p className="text-sm font-medium text-zinc-500">Chargement...</p>
        </div>
      </div>
    );
  }

  const isAdmin = auth.user.role === 'ADMIN';
  
  // Debug: Log pour diagnostiquer les problèmes de navigation
  if (process.env.NODE_ENV === 'development') {
    console.log('[Navigation Debug]', {
      userEmail: auth.user.email,
      userRole: auth.user.role,
      merchantId: auth.user.merchantId,
      isAdmin,
      currentPath: pathname,
    });
  }
  
  // Pour les marchands (MERCHANT) ou tout autre rôle non-admin, afficher le menu marchand avec TVA
  const navItems = isAdmin
    ? [
        { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
        { href: '/admin/revenue', label: 'Revenus', icon: DollarSign },
        { href: '/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/merchant', label: 'Marchands', icon: Building2 },
        { href: '/subscriptions', label: 'Abonnements', icon: Repeat },
        { href: '/payouts', label: 'Paiements sortants', icon: Wallet },
        { href: '/refunds', label: 'Remboursements', icon: RotateCcw },
        { href: '/admin/reconciliation', label: 'Réconciliation', icon: Shield },
        { href: '/webhooks', label: 'Webhooks', icon: Webhook },
        { href: '/sandbox', label: 'Sandbox', icon: FlaskConical },
        { href: '/integrations', label: 'Intégrations', icon: Plug },
        { href: '/demo', label: 'Démo', icon: Gamepad2 },
        { href: '/settings', label: 'Paramètres', icon: Settings },
      ]
    : [
        // Menu pour les marchands - inclut toujours la page TVA
        { href: '/merchant', label: 'Tableau de bord', icon: LayoutDashboard },
        { href: '/seller', label: 'Mes ventes', icon: TrendingUp },
        { href: '/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/vat/dashboard', label: 'TVA', icon: Receipt },
        { href: '/subscriptions', label: 'Abonnements', icon: Repeat },
        { href: '/payouts', label: 'Paiements sortants', icon: Wallet },
        { href: '/refunds', label: 'Remboursements', icon: RotateCcw },
        { href: '/webhooks', label: 'Webhooks', icon: Webhook },
        { href: '/sandbox', label: 'Sandbox', icon: FlaskConical },
        { href: '/integrations', label: 'Intégrations', icon: Plug },
        { href: '/demo', label: 'Démo', icon: Gamepad2 },
        { href: '/settings', label: 'Paramètres', icon: Settings },
      ];

  const currentPage = navItems.find((item) => item.href === pathname);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-20',
        'max-lg:hidden'
      )}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
          <Link href={isAdmin ? '/admin' : '/merchant'} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/25">
              K
          </div>
            {sidebarOpen && (
              <span className="text-lg font-bold bg-gradient-to-r from-[#08c2db] to-cyan-600 bg-clip-text text-transparent animate-in fade-in slide-in-from-left-2 duration-300">
                KryptPay
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Pour les pages TVA, considérer toutes les routes /vat/* comme actives
            const isActive = item.href.startsWith('/vat') 
              ? pathname.startsWith('/vat')
              : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110',
                  isActive && 'text-white'
                )} />
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className={cn(
            'flex items-center gap-3 mb-3',
            !sidebarOpen && 'justify-center'
          )}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-semibold text-sm border border-cyan-500/20">
              {auth.user.email.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {auth.user.email}
                </div>
                <div className="text-xs text-zinc-500 capitalize">
                  {auth.user.role.toLowerCase()}
                </div>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-950 dark:hover:border-red-800 transition-all',
              sidebarOpen ? 'w-full' : 'w-10 h-10 p-0'
            )}
            onClick={logout}
          >
              <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="ml-2">Déconnexion</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-zinc-900 z-50 flex flex-col lg:hidden shadow-2xl animate-in slide-in-from-left duration-300">
            {/* Mobile Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
              <Link href={isAdmin ? '/admin' : '/merchant'} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-500/25">
                  B
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-[#08c2db] to-cyan-600 bg-clip-text text-transparent">
                KryptPay
                </span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Mobile Nav */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                      isActive 
                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20">
                  {auth.user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {auth.user.email}
                  </div>
                  <div className="text-xs text-zinc-500 capitalize">
                    {auth.user.role.toLowerCase()}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className={cn(
        'flex-1 flex flex-col min-h-screen transition-all duration-300',
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Menu className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <Link 
                href={isAdmin ? '/admin' : '/merchant'}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              {currentPage && pathname !== '/admin' && pathname !== '/merchant' && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-700">/</span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {currentPage.label}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-medium text-zinc-900 dark:text-white">
                {auth.user.email}
              </div>
              <div className="text-xs text-zinc-500 capitalize">
                {auth.user.role.toLowerCase()}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-cyan-500/25">
              {auth.user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
