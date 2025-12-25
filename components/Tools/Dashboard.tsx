
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileStack, Scissors, Image as ImageIcon, RotateCw, Shield,
  FileText, Layers, Lock, FileSearch, ArrowRight, Search,
  FileImage, PenTool, Eraser, Move, Unlock, Maximize, GitCompare, ScanText, FileSignature, Github, HelpCircle, Sparkles, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToolRoute } from '../../types';

const tools: ToolRoute[] = [
  { path: '/compress', label: 'Compress PDF', description: 'Reduce file size while maintaining quality.', icon: Layers, color: 'text-orange-500', category: 'core', tier: 1, keywords: ['shrink', 'reduce', 'optimize', 'size'] },
  { path: '/merge', label: 'Merge PDF', description: 'Combine multiple PDFs into one file.', icon: FileStack, color: 'text-blue-500', category: 'core', tier: 1, keywords: ['combine', 'join', 'binder'] },
  { path: '/split', label: 'Split PDF', description: 'Extract pages or split into separate files.', icon: Scissors, color: 'text-rose-500', category: 'core', tier: 1, keywords: ['cut', 'extract', 'separate'] },
  { path: '/edit', label: 'Edit PDF', description: 'Add text, shapes, and annotations.', icon: PenTool, color: 'text-pink-500', category: 'core', tier: 1, keywords: ['modify', 'change', 'text'] },
  { path: '/pdf-to-jpg', label: 'PDF to JPG', description: 'Convert PDF pages to images.', icon: FileImage, color: 'text-amber-500', category: 'convert', tier: 1, keywords: ['image', 'convert', 'png', 'jpeg'] },
  { path: '/image-to-pdf', label: 'JPG to PDF', description: 'Turn your images into a PDF document.', icon: ImageIcon, color: 'text-purple-500', category: 'convert', tier: 1, keywords: ['photo', 'convert', 'create'] },
  { path: '/sign', label: 'Sign PDF', description: 'Sign documents digitally.', icon: FileSignature, color: 'text-teal-500', category: 'security', tier: 1, keywords: ['signature', 'contract', 'form'] },
  { path: '/delete-pages', label: 'Delete Pages', description: 'Remove unwanted pages.', icon: Eraser, color: 'text-red-500', category: 'pages', tier: 2, keywords: ['remove', 'cut'] },
  { path: '/reorder', label: 'Reorder Pages', description: 'Rearrange page order.', icon: Move, color: 'text-orange-500', category: 'pages', tier: 2, keywords: ['sort', 'arrange'] },
  { path: '/rotate', label: 'Rotate Pages', description: 'Fix page orientation.', icon: RotateCw, color: 'text-cyan-500', category: 'pages', tier: 2, keywords: ['turn', 'orientation'] },
  { path: '/protect', label: 'Protect PDF', description: 'Encrypt with password.', icon: Lock, color: 'text-emerald-500', category: 'security', tier: 2, keywords: ['lock', 'password', 'encrypt'] },
  { path: '/unlock', label: 'Unlock PDF', description: 'Remove PDF passwords.', icon: Unlock, color: 'text-lime-500', category: 'security', tier: 2, keywords: ['decrypt', 'open'] },
  { path: '/extract', label: 'Extract Pages', description: 'Get specific pages.', icon: FileText, color: 'text-violet-500', category: 'pages', tier: 2, keywords: ['pull', 'take'] },
  { path: '/metadata', label: 'Metadata', description: 'Edit file info.', icon: FileSearch, color: 'text-sky-500', category: 'core', tier: 2, keywords: ['info', 'author', 'title'] },
  { path: '/flatten', label: 'Flatten PDF', description: 'Merge layers and forms.', icon: Maximize, color: 'text-slate-500', category: 'core', tier: 3, keywords: ['merge layers', 'form'] },
  { path: '/compare', label: 'Compare PDFs', description: 'Find differences.', icon: GitCompare, color: 'text-slate-500', category: 'core', tier: 3, keywords: ['diff', 'changes'] },
  { path: '/ocr', label: 'OCR PDF', description: 'Make text searchable.', icon: ScanText, color: 'text-slate-500', category: 'core', tier: 3, experimental: true, keywords: ['text recognition', 'scan'] },
];

const HeroCard: React.FC<{ tool: ToolRoute }> = ({ tool }) => (
  <Link
    to={tool.path}
    className="group relative flex flex-col p-8 bg-white dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-3xl hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-2xl hover:shadow-orange-500/10 dark:hover:shadow-orange-900/20 hover:-translate-y-2 transition-all duration-300 overflow-hidden"
  >
    <div className={`absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity ${tool.color} -rotate-12 transform scale-150 origin-top-right`}>
      <tool.icon size={100} strokeWidth={1.5} />
    </div>

    <div className="flex items-start justify-between mb-6">
      <div className={`p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 ${tool.color} ring-2 ring-orange-100 dark:ring-orange-900/30 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
        <tool.icon size={28} strokeWidth={2} />
      </div>
      <ArrowRight size={22} className="text-slate-200 dark:text-slate-800 group-hover:text-orange-500 transition-colors -translate-x-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 duration-300" />
    </div>

    <h3 className="font-extrabold text-slate-900 dark:text-white text-xl mb-3">{tool.label}</h3>
    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{tool.description}</p>
  </Link>
);

const QuickCard: React.FC<{ tool: ToolRoute }> = ({ tool }) => (
  <Link
    to={tool.path}
    className="group flex items-center gap-4 p-5 bg-white dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:border-orange-200 dark:hover:border-orange-800 hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-white dark:hover:from-orange-900/10 dark:hover:to-slate-900/50 transition-all duration-200 shadow-sm hover:shadow-md"
    title={tool.description}
  >
    <div className={`p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800 ${tool.color} group-hover:scale-105 transition-transform`}>
      <tool.icon size={20} strokeWidth={2} />
    </div>
    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{tool.label}</span>
  </Link>
);

export const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredTools = useMemo(() => {
    if (!searchQuery) return tools;
    const lowerQuery = searchQuery.toLowerCase();
    return tools.filter(t =>
      t.label.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
    );
  }, [searchQuery]);

  const hasSearch = searchQuery.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20">

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-4xl mx-auto mb-16"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 leading-tight">
          PDF tools that are
          <br />
          <span className="text-orange-500 relative inline-block">
            more
            <svg className="absolute -bottom-2 left-0 w-full" height="12" viewBox="0 0 200 12" fill="none">
              <path d="M2 10C50 5 150 5 198 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>{' '}
          than a promise
        </h1>

        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 font-medium max-w-2xl mx-auto leading-relaxed">
          Process PDFs <span className="font-bold text-orange-600 dark:text-orange-400">100% locally</span> in your browser.
          No servers. No tracking. <span className="font-bold">No compromises</span>.
        </p>

        <div className="relative group max-w-2xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-orange-600/20 dark:from-orange-500/10 dark:to-orange-700/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all" />
          <div className="relative flex items-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-3 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-400/20 transition-all duration-300">
            <Search className="ml-4 text-slate-400" size={24} />
            <input
              type="text"
              placeholder="What do you want to do with your PDF?"
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-slate-900 dark:text-white placeholder-slate-400 px-4 py-4 text-lg font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </motion.div>

      {/* Comparison Section */}
      {!hasSearch && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
              Other PDF tools know <span className="text-orange-500">more about you</span> than they should
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">We made one that <span className="font-bold text-orange-600 dark:text-orange-400">doesn't</span></p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Bad - Other Tools */}
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-8 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-slate-300 dark:bg-slate-700 flex items-center justify-center">
                  <Shield size={24} className="text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg">Traditional PDF Tools</h3>
                  <p className="text-xs text-slate-500">Server-side processing</p>
                </div>
              </div>
              <div className="space-y-3 bg-white/50 dark:bg-black/20 p-5 rounded-2xl border border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="font-mono text-slate-700 dark:text-slate-300">user_email: john@company.com</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="font-mono text-slate-700 dark:text-slate-300">file_name: confidential_report.pdf</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="font-mono text-slate-700 dark:text-slate-300">ip_address: 192.168.1.1</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="font-mono text-slate-700 dark:text-slate-300">uploaded_to_server: true</span>
                </div>
              </div>
            </div>

            {/* Good - ZenPDF */}
            <div className="bg-gradient-to-br from-white to-orange-50 dark:from-slate-900 dark:to-orange-950/20 p-8 rounded-3xl border-2 border-orange-200 dark:border-orange-900 shadow-2xl shadow-orange-500/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-orange-900 dark:text-orange-100 text-lg">ZenPDF</h3>
                  <p className="text-xs text-orange-700 dark:text-orange-400">100% Local Processing</p>
                </div>
              </div>
              <div className="space-y-3 bg-white/70 dark:bg-black/20 p-5 rounded-2xl border border-orange-200 dark:border-orange-900">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="font-mono text-slate-700 dark:text-slate-300">user_data: <span className="text-green-600 font-bold">encrypted</span></span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="font-mono text-slate-700 dark:text-slate-300">file_upload: <span className="text-green-600 font-bold">never</span></span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="font-mono text-slate-700 dark:text-slate-300">tracking: <span className="text-green-600 font-bold">disabled</span></span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="font-mono text-slate-700 dark:text-slate-300">processing: <span className="text-green-600 font-bold">local_only</span></span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tools Grid */}
      <AnimatePresence mode="wait">
        {hasSearch ? (
          <motion.div
            key="search-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredTools.length > 0 ? (
              filteredTools.map(tool => <HeroCard key={tool.path} tool={tool} />)
            ) : (
              <div className="col-span-full text-center py-16 text-slate-500">
                No tools found for "{searchQuery}". Try "merge", "compress", or "image".
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="tiers"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-16"
          >
            {/* TIER 1: HERO TOOLS */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full"></div>
                Most Popular Tools
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.filter(t => t.tier === 1).map(tool => (
                  <HeroCard key={tool.path} tool={tool} />
                ))}
              </div>
            </section>

            {/* TIER 2: QUICK TOOLS */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tools.filter(t => t.tier === 2).map(tool => (
                  <QuickCard key={tool.path} tool={tool} />
                ))}
              </div>
            </section>

            {/* TIER 3: ADVANCED TOOLS */}
            <section className="border-t-2 border-slate-200 dark:border-slate-800 pt-12">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-3 text-lg font-bold text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors mb-6 group"
              >
                <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Tools</span>
                <ArrowRight size={18} className={`transition-transform duration-300 group-hover:translate-x-1 ${showAdvanced ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6">
                      {tools.filter(t => t.tier === 3).map(tool => (
                        <Link
                          key={tool.path}
                          to={tool.path}
                          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                        >
                          <tool.icon size={18} className={tool.color} />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{tool.label}</span>
                          {tool.experimental && (
                            <span className="text-[9px] font-bold uppercase tracking-wide bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">Beta</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy First Section */}
      <div className="mt-24 pt-16 border-t-2 border-slate-200 dark:border-slate-800">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
            We can't leak what we <span className="text-orange-500">don't have</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText size={32} className="text-white" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">Logs?</h3>
            <p className="text-orange-600 dark:text-orange-400 font-bold text-lg mb-2">Not possible.</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">No server means no activity logs. Your PDF operations stay on your device.</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield size={32} className="text-white" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">Tracking?</h3>
            <p className="text-orange-600 dark:text-orange-400 font-bold text-lg mb-2">Not necessary.</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">We don't need your data to provide excellent PDF tools.</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-lg text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles size={32} className="text-white" />
            </div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3">Cloud Storage?</h3>
            <p className="text-orange-600 dark:text-orange-400 font-bold text-lg mb-2">Not required.</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Files are processed instantly in your browser memory only.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-8 rounded-3xl border-2 border-green-200 dark:border-green-900">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-green-600 dark:text-green-400" size={28} />
              <h3 className="font-bold text-green-900 dark:text-green-100 text-xl">Privacy First</h3>
            </div>
            <p className="text-green-800 dark:text-green-200 leading-relaxed">
              ZenPDF runs <strong>100% locally</strong> in your browser using WebAssembly.
              Your files never leave your device and are never uploaded to any server.
              You can even turn off your internet and use it offline.
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/20 dark:to-sky-950/20 p-8 rounded-3xl border-2 border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="text-blue-600 dark:text-blue-400" size={28} />
              <h3 className="font-bold text-blue-900 dark:text-blue-100 text-xl">Open Source</h3>
            </div>
            <p className="text-blue-800 dark:text-blue-200 leading-relaxed mb-4">
              This project is <strong>experimental</strong> and built in the open.
              Features are active but may receive frequent updates.
            </p>
            <a href="https://twitter.com/dhananjay_Tech" target="_blank" rel="noopener noreferrer" className="text-orange-600 dark:text-orange-400 hover:text-orange-700 font-bold transition-colors">
              Feedback welcome →
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-6 pt-8">
           <a
             href="https://github.com/DhananjayBhosale/PDFTools"
             target="_blank"
             rel="noopener noreferrer"
             className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-700 transition-all text-lg font-bold text-slate-800 dark:text-slate-200 shadow-lg hover:shadow-xl hover:-translate-y-1"
           >
             <Github size={24}/> View Source on GitHub
           </a>

           <p className="text-sm text-slate-500 dark:text-slate-600">
              MIT License • Built with React & PDF-Lib • Made with care
           </p>
        </div>
      </div>

    </div>
  );
};
