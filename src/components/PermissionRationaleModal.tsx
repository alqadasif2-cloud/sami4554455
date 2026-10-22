import React from 'react';
import { Bell, Camera, FolderOpen, ShieldCheck, X } from 'lucide-react';

export type PermissionType = 'notifications' | 'camera' | 'files';

interface PermissionRationaleModalProps {
  type: PermissionType;
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const PermissionRationaleModal: React.FC<PermissionRationaleModalProps> = ({
  type,
  isOpen,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const config = {
    notifications: {
      title: 'تفعيل إشعارات الرسائل والتنبيهات',
      icon: Bell,
      color: 'amber',
      accent: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
      reason:
        'نحتاج إذن الإشعارات لتنبيهك بوصول رسائل خاصة من القائد Sami، وإعلانات القنوات المشترك بها، وتحديثات صفقاتك حتى عندما يكون التطبيق مغلقاً أو في الخلفية.',
      notes: [
        'لن نرسل أي إعلانات مزعجة.',
        'يمكنك إيقاف التنبيهات في أي وقت من الإعدادات.',
        'رفض الإذن لن يمنعك من استخدام التطبيق ومتابعة الصفقات.',
      ],
    },
    camera: {
      title: 'السماح باستخدام الكاميرا',
      icon: Camera,
      color: 'sky',
      accent: 'text-sky-400 bg-sky-500/20 border-sky-500/40',
      reason:
        'يُستخدم إذن الكاميرا فقط لالتقاط صورة مباشرة لشارت التداول أو إرسال لقطة حية في المحادثات وقنوات النقاش.',
      notes: [
        'الكاميرا لا تعمل إلا بطلبك الصريح عند الضغط على زر التصوير.',
        'لا يتم حفظ أي لقطات تلقائياً بدون موافقتك على الإرسال.',
        'يمكنك اختيار الصور الجاهزة من المعرض كبديل دون الحاجة للكاميرا.',
      ],
    },
    files: {
      title: 'إرفاق المستندات والملفات',
      icon: FolderOpen,
      color: 'emerald',
      accent: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
      reason:
        'نستخدم منتقي ملفات النظام الآمن (Storage Access Framework) لاختيار المستند الذي تحدده فقط (PDF، جداول Excel، ملفات مضغوطة ZIP) لمشاركته مع الفريق.',
      notes: [
        'لا نطلب الوصول الشامل لجميع ملفات هاتفك.',
        'يتم قراءة الملف الذي اخترته أنت شخصياً فقط.',
        'جميع الملفات المرفوعة مشفرة ومحمية بقواعد أمان صارمة.',
      ],
    },
  }[type];

  const IconComponent = config.icon;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#121824] border border-amber-500/40 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl relative space-y-4 text-right font-['Cairo']">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg ${config.accent}`}
          >
            <IconComponent className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">{config.title}</h3>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>خصوصية وأمان البيانات محمي بالكامل</span>
            </span>
          </div>
        </div>

        {/* Rationale Body */}
        <div className="bg-[#0b101a] border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 leading-relaxed">
          {config.reason}
        </div>

        {/* Bullet points */}
        <div className="space-y-1.5">
          {config.notes.map((note, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-400">
              <span className="text-amber-400 mt-0.5">•</span>
              <span>{note}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
          >
            موافق وتفعيل الإذن
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
};
