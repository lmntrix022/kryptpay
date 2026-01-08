'use client';

import { ReactNode } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-950 to-zinc-950" />
        
        {/* Animated orbs */}
        <div className="absolute top-0 -left-40 w-[500px] h-[500px] bg-violet-600/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px'
          }}
        />
        
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-10 flex justify-center">
            <div className="relative group">
              {/* Glow effect behind logo */}
              <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Image
                src="/KryptPayLogo.webp"
                alt="BoohPay"
                width={160}
                height={48}
                priority
                className="relative drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>

          {/* Card */}
          <div className="relative">
            {/* Card glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-violet-600/20 rounded-3xl blur-xl opacity-50" />
            
            {/* Card content */}
            <div className="relative backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/[0.08] to-transparent rotate-12 transform-gpu" />
              </div>
              
              <div className="relative z-10">
                {children}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-zinc-500 text-sm">
              Plateforme de paiement sécurisée
            </p>
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-zinc-600 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Système opérationnel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}