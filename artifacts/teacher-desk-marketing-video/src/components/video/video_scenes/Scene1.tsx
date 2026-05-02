import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-dark)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0, opacity: 1 } : { scale: 0, rotate: -180, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-48 h-48 mb-8"
        >
          <img src={`${import.meta.env.BASE_URL}brand/icon.svg`} alt="Teacher Desk Icon" className="w-full h-full object-contain drop-shadow-2xl" />
        </motion.div>
        
        <motion.h1 
          className="text-white text-[6vw] font-bold tracking-tight text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          للمعلم
        </motion.h1>
      </div>

      <motion.div 
        className="absolute inset-0 z-0 pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle at 50% 50%, var(--color-primary-light) 0%, transparent 60%)'
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
