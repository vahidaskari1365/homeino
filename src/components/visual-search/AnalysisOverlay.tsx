'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const AnalysisOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden rounded-2xl bg-black/20">
      {/* Scanning Line */}
      <motion.div
        initial={{ top: '0%' }}
        animate={{ top: '100%' }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(26,54,93,0.8)]"
      />
      
      {/* Pulse Overlay */}
      <motion.div
        initial={{ opacity: 0.3 }}
        animate={{ opacity: 0.6 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse"
        }}
        className="absolute inset-0 bg-primary/10"
      />

      {/* Analysis Text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-full bg-white/90 px-6 py-2 shadow-lg backdrop-blur-sm"
        >
          <span className="text-sm font-bold text-primary animate-pulse">در حال شناسایی اشیاء...</span>
        </motion.div>
      </div>
    </div>
  );
};
