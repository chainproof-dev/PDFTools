
import React from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { Zap } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl border-b border-white/20 dark:border-slate-800/50 bg-white/60 dark:bg-slate-950/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl text-white font-bold text-2xl group-hover:scale-105 transition-transform duration-200 shadow-lg shadow-orange-500/25">
            Z
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white group-hover:opacity-80 transition-opacity leading-none">
              ZenPDF
            </span>
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">
              100% Local
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
            <Zap size={14} className="text-orange-500 fill-orange-500" />
            <span>No Server Uploads</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
