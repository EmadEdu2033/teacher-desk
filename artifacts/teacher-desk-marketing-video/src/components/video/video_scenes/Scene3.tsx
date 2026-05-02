import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Plus, Eye, LayoutTemplate, CheckSquare, Settings, Sun, MonitorPlay } from 'lucide-react';

const NOTE_COLORS = ['#FEF08A', '#FCA5A5', '#86EFAC', '#93C5FD', '#F1F5F9'];

// Backdrop is opaque from frame 0 so the wrapper's bg-black is never visible
// through the incoming scene during the crossfade from Scene2. Inner content
// (note + privacy badge) carries its own staged animations for visual interest;
// the root only handles the exit fade-out that powers the crossfade.
const sceneVariants: Variants = {
  initial: { opacity: 1, scale: 1 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, y: -50, scale: 0.95, transition: { duration: 0.4 } },
};

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),  // Click "new note"
      setTimeout(() => setPhase(2), 1300), // Color picker appears
      setTimeout(() => setPhase(3), 2400), // Yellow chosen, picker fades, note flies in
      setTimeout(() => setPhase(4), 3300), // Typing starts
      setTimeout(() => setPhase(5), 5000), // Eye appears next to note
      setTimeout(() => setPhase(6), 5700), // Diagonal slash strikes through eye
      setTimeout(() => setPhase(7), 6400), // Privacy caption fades in below
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-[var(--color-bg-light)] overflow-hidden flex flex-col"
      variants={sceneVariants}
      initial="initial"
      animate="animate"
      exit="exit"
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
          animate={phase === 1 ? { scale: 0.92 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-[var(--color-primary)] font-semibold cursor-pointer">
            <Plus size={20} />
            <span>+ ملاحظة جديدة</span>
          </div>
        </motion.div>

        {/* Color picker popover (brief) */}
        <AnimatePresence>
          {phase === 2 && (
            <motion.div
              key="color-picker"
              className="absolute top-24 right-8 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 flex gap-2 z-30"
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            >
              {NOTE_COLORS.map((c, i) => (
                <motion.div
                  key={c}
                  className="w-10 h-10 rounded-md border-2"
                  style={{
                    backgroundColor: c,
                    borderColor: i === 0 ? 'var(--color-primary-light)' : 'transparent',
                  }}
                  animate={i === 0 ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ delay: 0.5, duration: 0.5 }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Sticky Note + adjacent privacy beat */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              key="note-group"
              className="absolute top-24 right-8 flex items-start gap-4"
              initial={{ scale: 0, opacity: 0, x: 80, y: -40 }}
              animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            >
              <motion.div
                className="w-[22vw] h-[22vw] bg-[#FEF08A] rounded-lg shadow-md p-6 border border-[#FDE047] flex flex-col"
                animate={{ rotate: -2 }}
                initial={{ rotate: -8 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#FCA5A5]" />
                    <div className="w-4 h-4 rounded-full bg-[#86EFAC]" />
                    <div className="w-4 h-4 rounded-full bg-[#93C5FD]" />
                  </div>
                  <div className="text-gray-500"><Settings size={16} /></div>
                </div>
                <div className="flex-1 text-[1.8vw] text-gray-800 leading-relaxed font-medium">
                  {phase >= 4 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1.2 }}
                    >
                      مراجعة أسئلة امتحان الرياضيات للصف الثالث...
                    </motion.span>
                  )}
                </div>
              </motion.div>

              {/* Privacy beat: eye + slash directly next to the note */}
              <AnimatePresence>
                {phase >= 5 && (
                  <motion.div
                    key="privacy-inline"
                    className="flex flex-col items-center gap-3 mt-2"
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    <div className="relative w-20 h-20 flex items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-200">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35, type: 'spring', stiffness: 240 }}
                        className="text-[var(--color-primary-light)]"
                      >
                        <Eye size={56} />
                      </motion.div>
                      {phase >= 6 && (
                        <svg
                          viewBox="0 0 80 80"
                          className="absolute inset-0 w-20 h-20 pointer-events-none"
                          aria-hidden="true"
                        >
                          <motion.line
                            x1="12"
                            y1="68"
                            x2="68"
                            y2="12"
                            stroke="#DC2626"
                            strokeWidth="7"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                          />
                        </svg>
                      )}
                    </div>
                    <AnimatePresence>
                      {phase >= 7 && (
                        <motion.div
                          key="privacy-caption"
                          className="bg-white rounded-xl shadow-md border border-gray-200 px-4 py-2 text-center"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <div className="font-bold text-[var(--color-primary)] text-base whitespace-nowrap">ملاحظاتك خاصة بك</div>
                          <div className="text-gray-600 text-sm whitespace-nowrap">لا أحد يراها أثناء مشاركة الشاشة</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
