import React from 'react';
import { Lock, MessageCircle, LogIn, Sparkles } from 'lucide-react';

interface GuestLockedOverlayProps {
  title?: string;
  description?: string;
  onContactSupport: () => void;
  onGoToLogin?: () => void;
  onBrowsePackages?: () => void;
}

export const GuestLockedOverlay: React.FC<GuestLockedOverlayProps> = ({
  title = '🔒 هذه الصفحة متاحة للمستخدمين المسجلين فقط',
  description = 'سجّل الدخول للاستفادة من جميع ميزات التطبيق، أو تواصل مع الدعم للاستفسار عن الاشتراكات والقنوات الخاصة.',
  onContactSupport,
  onGoToLogin,
  onBrowsePackages,
}) => {
  return (
    <div
      dir="rtl"
      className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-[#050811]/80 backdrop-blur-md select-none pointer-events-auto min-h-full w-full"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0f172a]/95 via-[#0c1322]/98 to-[#070b14]/98 border-2 border-amber-500/50 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.25)] text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Golden Lock Icon Halo */}
        <div className="relative mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 p-[2px] shadow-[0_0_30px_rgba(245,158,11,0.5)]">
          <div className="w-full h-full rounded-full bg-[#090f1d] flex items-center justify-center text-amber-400">
            <Lock className="w-9 h-9 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)] animate-pulse" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-black text-white leading-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onContactSupport}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/35 flex items-center justify-center gap-2 cursor-pointer transition active:scale-[0.98] pointer-events-auto"
          >
            <MessageCircle className="w-4 h-4 text-slate-950" />
            <span>💬 التواصل مع الدعم للاستفسار</span>
          </button>

          {onBrowsePackages && (
            <button
              type="button"
              onClick={onBrowsePackages}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 hover:text-amber-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition pointer-events-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>💎 استعراض باقات واشتراكات القنوات</span>
            </button>
          )}

          {onGoToLogin && (
            <button
              type="button"
              onClick={onGoToLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition pointer-events-auto"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>تسجيل الدخول بحساب مسجل</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
