'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PremiumHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: { text: string; icon?: LucideIcon };
  stats?: Array<{ value: string | number; label: string }>;
  action?: ReactNode;
}

export function PremiumHeader({ 
  title, 
  subtitle, 
  icon: Icon, 
  badge,
  stats,
  action 
}: PremiumHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[32px]"
    >
      {/* Background with mesh gradient - Cyan theme */}
      <div className="absolute inset-0 bg-[#0a0a0a]">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 via-transparent to-cyan-600/20" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#08c2db]/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/20 rounded-full blur-[100px]" />
        
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }}
        />
      </div>

      <div className="relative z-10 px-10 py-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="max-w-xl">
            {/* Premium badge */}
            {badge && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 mb-6"
              >
                {badge.icon && <badge.icon className="w-3.5 h-3.5 text-cyan-400" />}
                <span className="text-xs font-semibold text-white/70 tracking-wide uppercase">
                  {badge.text}
                </span>
              </motion.div>
            )}
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.1] flex items-center gap-4"
            >
              {Icon && (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl blur-xl opacity-50" />
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>
              )}
              <span>
                {title.split(' ').map((word, i, arr) => 
                  i === arr.length - 1 ? (
                    <span key={i} className="block bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
                      {word}
                    </span>
                  ) : (
                    <span key={i}>{word} </span>
                  )
                )}
              </span>
            </motion.h1>
            
            {subtitle && (
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-white/50 mt-4 leading-relaxed"
              >
                {subtitle}
              </motion.p>
            )}
          </div>

          {/* Stats cards */}
          {stats && stats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-4"
            >
              {stats.map((stat, index) => (
                <div key={index} className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity" />
                  <div className="relative px-8 py-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                    <div className="text-5xl font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-sm text-white/40 mt-2 font-medium">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Action button */}
          {action && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              {action}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

