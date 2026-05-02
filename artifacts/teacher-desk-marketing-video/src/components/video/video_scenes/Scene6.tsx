import { motion } from 'framer-motion';

export function Scene6() {
  return (
    <motion.div 
      className="absolute inset-0 bg-[var(--color-bg-dark)] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex flex-col items-center relative z-10">
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          className="w-48 h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl mb-8"
        >
          <img src={`${import.meta.env.BASE_URL}brand/coach-emad.jpg`} alt="Coach Emad" className="w-full h-full object-cover" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <h2 className="text-[5vw] font-bold text-white font-latin tracking-tight mb-4">Coach Emad</h2>
          <p className="text-[1.5vw] text-white/60 font-latin uppercase tracking-widest">Presented and created by Coach Emad</p>
        </motion.div>
      </div>

      <motion.div 
        className="absolute bottom-8 right-8 opacity-20"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.2, scale: 1 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <img src={`${import.meta.env.BASE_URL}brand/icon.svg`} alt="Mark" className="w-16 h-16 grayscale invert" />
      </motion.div>

      {/* Decorative ambient light */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-primary-light)] rounded-full blur-[100px] opacity-20 pointer-events-none z-0"
        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
