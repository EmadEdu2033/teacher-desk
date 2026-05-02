import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MonitorPlay, LayoutTemplate, CheckSquare, Settings, Sun } from 'lucide-react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // Click Podium
      setTimeout(() => setPhase(2), 1500), // Split screen shows up
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-[#F1F5F9] overflow-hidden flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6 }}
    >
      {/* App Topbar - Recreated */}
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
          <motion.div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium"
            animate={phase >= 1 
              ? { backgroundColor: "var(--color-success)", color: "#FFFFFF", borderColor: "var(--color-success)" } 
              : { backgroundColor: "#FFFFFF", color: "#4B5563", borderColor: "#E5E7EB" }
            }
            style={{ border: "1px solid" }}
            transition={{ duration: 0.3 }}
          >
            <MonitorPlay size={16} />
            <span>{phase >= 1 ? "وضع المنصة: مفعّل" : "وضع المنصة: مغلق"}</span>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 relative flex p-8 gap-8">
        {/* Teacher's view */}
        <motion.div 
          className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 relative overflow-hidden"
          animate={phase >= 2 ? { width: "50%", flex: "none" } : { flex: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className="absolute top-0 inset-x-0 h-10 bg-gray-50 border-b border-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm">
            شاشة المعلم
          </div>
          <div className="p-8 mt-10 h-full relative">
            <div className="absolute top-8 right-8 w-64 h-64 bg-[#FEF08A] rounded-lg shadow-md p-4 border border-[#FDE047] rotate-[-2deg]">
              <div className="text-lg text-gray-800 font-medium">مراجعة أسئلة امتحان الرياضيات...</div>
            </div>
            <div className="absolute bottom-12 left-12 w-56 h-48 bg-[#BAE6FD] rounded-lg shadow-md p-4 border border-[#93C5FD] rotate-[3deg]">
              <div className="text-lg text-gray-800 font-medium">تجهيز ملف الحضور والغياب</div>
            </div>
          </div>
        </motion.div>

        {/* Student's View (Zoom/Meet) */}
        {phase >= 2 && (
          <motion.div 
            className="flex-1 rounded-xl shadow-xl border border-gray-300 relative overflow-hidden bg-black flex flex-col"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between">
              <span className="font-bold text-white text-sm font-latin">Zoom / Google Meet</span>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center relative">
              {/* Fake student video grid representation */}
              <div className="w-full h-full p-4 grid grid-cols-2 gap-4 opacity-50">
                <div className="bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
                  <div className="w-16 h-16 rounded-full bg-gray-600" />
                </div>
                <div className="bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
                  <div className="w-16 h-16 rounded-full bg-gray-600" />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="text-white text-2xl font-bold border-2 border-white/20 px-8 py-4 rounded-xl bg-black/50 flex flex-col items-center gap-2">
                  <MonitorPlay size={40} className="text-[var(--color-success)] mb-2" />
                  الطلاب لا يرون ملاحظاتك
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
