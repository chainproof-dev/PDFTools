import React from 'react';

export const Background = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-gradient-to-b from-[#E0F2FE] to-[#DBEAFE] dark:from-slate-900 dark:to-slate-950">

      {/* Floating Clouds */}
      <svg className="absolute top-[10%] left-[5%] w-32 h-20 opacity-30 dark:opacity-10 animate-float" viewBox="0 0 200 100">
        <ellipse cx="50" cy="60" rx="45" ry="30" fill="white" />
        <ellipse cx="90" cy="50" rx="50" ry="35" fill="white" />
        <ellipse cx="140" cy="60" rx="40" ry="28" fill="white" />
      </svg>

      <svg className="absolute top-[25%] right-[10%] w-40 h-24 opacity-20 dark:opacity-5 animate-float animation-delay-2000" viewBox="0 0 200 100">
        <ellipse cx="50" cy="60" rx="45" ry="30" fill="white" />
        <ellipse cx="90" cy="50" rx="50" ry="35" fill="white" />
        <ellipse cx="140" cy="60" rx="40" ry="28" fill="white" />
      </svg>

      <svg className="absolute bottom-[20%] left-[15%] w-36 h-22 opacity-25 dark:opacity-8 animate-float animation-delay-4000" viewBox="0 0 200 100">
        <ellipse cx="50" cy="60" rx="45" ry="30" fill="white" />
        <ellipse cx="90" cy="50" rx="50" ry="35" fill="white" />
        <ellipse cx="140" cy="60" rx="40" ry="28" fill="white" />
      </svg>

      <svg className="absolute top-[60%] right-[20%] w-28 h-18 opacity-20 dark:opacity-5 animate-float" viewBox="0 0 200 100">
        <ellipse cx="50" cy="60" rx="45" ry="30" fill="white" />
        <ellipse cx="90" cy="50" rx="50" ry="35" fill="white" />
        <ellipse cx="140" cy="60" rx="40" ry="28" fill="white" />
      </svg>

      {/* Subtle gradient blobs for depth */}
      <div className="absolute top-[-5%] right-[-5%] w-[40vw] h-[40vw] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-[120px] animate-blob" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[45vw] h-[45vw] bg-cyan-200/15 dark:bg-cyan-900/8 rounded-full blur-[120px] animate-blob animation-delay-2000" />

      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
      </div>
    </div>
  );
};
