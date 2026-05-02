import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, EyeOff, LayoutTemplate, CheckSquare, Settings, Sun, MonitorPlay } from 'lucide-react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),  // Click new note
      setTimeout(() => setPhase(2), 1400), // Note appears
      setTimeout(() => setPhase(3), 2200), // Typing starts
      setTimeout(() => setPhase(4), 3800), // Privacy beat shows up
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[var(--color-bg-light)] overflow-hidden flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 0.6 }}
    >
      {/* App Topbar */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center px-6 justify-between shadow-sm relative z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}brand/icon.svg`} alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-[var(--color-primary)] text-xl">مكتب المعلم</span>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <div className="px-4 py-1.5 rounded-md bg-white shadow-sm text-sm font-semibold flex items-center gap-2 text-[var(--color-primary)]">
              <LayoutTemplate size={16} />
              ملاحظات لاصقة
            </div>
            <div className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 flex items-center gap-2">
              <CheckSquare size={16} />
              المهام
            </div>
            <div className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 flex items-center gap-2">
              <Settings size={16} />
              الإعدادات
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
            <span className="text-sm font-bold text-gray-600">EN</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-bold text-[var(--color-primary)]">ع</span>
          </div>
          <div className="p-2 rounded-full bg-gray-100 text-gray-600">
            <Sun size={18} />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-600">
            <MonitorPlay size={16} />
            وضع المنصة: مغلق
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#F1F5F9] relative p-8">
        {/* New Note Button */}
        <motion.div 
          className="absolute top-8 right-8"
          animate={phase === 1 ? { scale: 0.9, backgroundColor: "#E2E8F0" } : { scale: 1, backgroundColor: "#FFFFFF" }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-[var(--color-primary)] font-semibold cursor-pointer">
            <Plus size={20} />
            <span>ملاحظة جديدة</span>
          </div>
        </motion.div>

        {/* The Sticky Note */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              className="absolute top-24 right-8 w-[22vw] h-[22vw] bg-[#FEF08A] rounded-lg shadow-md p-6 border border-[#FDE047] flex flex-col"
              initial={{ scale: 0, rotate: -5, opacity: 0 }}
              animate={{ scale: 1, rotate: -2, opacity: 1 }}
              transition={{ type: "spring", stiffness: 250, damping: 20 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#FCA5A5]" />
                  <div className="w-4 h-4 rounded-full bg-[#86EFAC]" />
                  <div className="w-4 h-4 rounded-full bg-[#93C5FD]" />
                </div>
                <div className="text-gray-500"><Settings size={16}/></div>
              </div>
              <div className="flex-1 text-[1.8vw] text-gray-800 leading-relaxed font-medium">
                {phase >= 3 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5 }}
                  >
                    مراجعة أسئلة امتحان الرياضيات للصف الثالث...
                  </motion.span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Privacy Beat Overlay */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.div
              className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-8 py-4 rounded-2xl shadow-xl border border-gray-200 flex items-center gap-6"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <div className="relative">
                <motion.div
                  initial={{ opacity: 1, scale: 1 }}
                  animate={{ opacity: 0, scale: 0.5 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <EyeOff size={40} className="text-gray-400" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.4, type: "spring" }}
                  className="flex items-center justify-center text-[var(--color-primary-light)]"
                >
                  <EyeOff size={40} />
                </motion.div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[var(--color-primary)] text-xl">ملاحظاتك خاصة بك</span>
                <span className="text-gray-600 text-lg">لا أحد يراها، حتى أثناء مشاركة الشاشة.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
