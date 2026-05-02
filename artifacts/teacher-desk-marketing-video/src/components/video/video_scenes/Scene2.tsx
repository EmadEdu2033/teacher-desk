import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Scene2() {
  const words = ['ملاحظات', 'مهام', 'منصة', 'تركيز'];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-cream)]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1, zIndex: 1 }}
      exit={{ opacity: 0, scale: 1.05, zIndex: 10 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="text-[4.5vw] font-bold text-[var(--color-primary)] flex items-center gap-4"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span>مكتب المعلم —</span>
        <div className="relative h-[6vw] overflow-hidden min-w-[20vw]">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={wordIndex}
              className="absolute text-[var(--color-primary-light)] whitespace-nowrap"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {words[wordIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>
      
      {/* Decorative background shapes */}
      <motion.div 
        className="absolute top-10 right-10 w-64 h-64 rounded-full bg-[var(--color-secondary-light)] opacity-20 blur-3xl pointer-events-none"
        animate={{ y: [0, 30, 0], x: [0, -30, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-10 left-10 w-80 h-80 rounded-full bg-[var(--color-primary-light)] opacity-10 blur-3xl pointer-events-none"
        animate={{ y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </motion.div>
  );
}
