import { motion, type Variants } from 'framer-motion';
import { LayoutTemplate, CheckSquare, Settings, Sun, MonitorPlay, CircleDashed, CheckCircle2 } from 'lucide-react';

export function Scene5() {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.4 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="absolute inset-0 bg-[#F8FAFC] overflow-hidden flex flex-col"
      // Backdrop snaps in opaque so the wrapper's bg-black is never visible
      // through the incoming scene during the crossfade from Scene4. Inner
      // task list still uses the staggered itemVariants below for visual
      // interest; only the exit fade-out powers the crossfade to Scene6.
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* App Topbar - Tasks active */}
      <div className="h-16 border-b border-gray-200 bg-white flex items-center px-6 justify-between shadow-sm relative z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}brand/icon.svg`} alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-[var(--color-primary)] text-xl">مكتب المعلم</span>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <div className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 flex items-center gap-2">
              <LayoutTemplate size={16} />
              ملاحظات لاصقة
            </div>
            <div className="px-4 py-1.5 rounded-md bg-white shadow-sm text-sm font-semibold flex items-center gap-2 text-[var(--color-primary)]">
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-200 text-sm font-medium text-gray-600 bg-white">
            <MonitorPlay size={16} />
            وضع المنصة: مغلق
          </div>
        </div>
      </div>

      <div className="flex-1 p-12 max-w-4xl mx-auto w-full">
        <motion.h2 
          className="text-3xl font-bold text-[var(--color-primary)] mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          مهام اليوم
        </motion.h2>

        <motion.div 
          className="flex flex-col gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CircleDashed size={24} className="text-gray-400" />
              <span className="text-xl font-medium text-gray-800">تصحيح أوراق اختبار منتصف الفصل</span>
            </div>
            <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">أولوية عالية</div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CheckCircle2 size={24} className="text-green-500" />
              <span className="text-xl font-medium text-gray-400 line-through">إرسال تقرير الحضور للإدارة</span>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CircleDashed size={24} className="text-gray-400" />
              <span className="text-xl font-medium text-gray-800">تحضير درس الغد (الوحدة الثالثة)</span>
            </div>
            <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">عادي</div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
