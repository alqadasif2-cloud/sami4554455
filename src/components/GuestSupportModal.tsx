import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Lock,
  Sparkles,
  ChevronLeft,
  Users,
} from 'lucide-react';
import { CurrentUser, UserAccount, subscribeToCommunityUsers, getCachedUsers } from '../data/auth';
import {
  GuestSupportConfig,
  DEFAULT_GUEST_SUPPORT_CONFIG,
  subscribeToGuestSupportConfig,
  getGuestOpeningMessage,
} from '../services/guest';

interface GuestSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'general' | 'package';
  sourceContext?: 'dashboard' | 'history' | 'roadmap' | 'settings' | 'subscriptions' | 'channels';
  packageInfo?: { id: string; name: string };
  currentUser: CurrentUser;
  onSelectModerator: (moderator: UserAccount, prefilledMessage: string) => void;
}

export const GuestSupportModal: React.FC<GuestSupportModalProps> = ({
  isOpen,
  onClose,
  mode,
  sourceContext = 'dashboard',
  packageInfo,
  currentUser,
  onSelectModerator,
}) => {
  const [supportConfig, setSupportConfig] = useState<GuestSupportConfig>(DEFAULT_GUEST_SUPPORT_CONFIG);
  const [users, setUsers] = useState<UserAccount[]>(() => getCachedUsers());

  useEffect(() => {
    if (!isOpen) return;
    const unsubConfig = subscribeToGuestSupportConfig(setSupportConfig);
    const unsubUsers = subscribeToCommunityUsers(setUsers);
    return () => {
      unsubConfig();
      unsubUsers();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter real system moderators and Owner Sami
  const systemModerators = users.filter((u) => u.role === 'moderator' || u.id === 1);

  const isGeneralMode = mode === 'general';

  // Check feature enablement
  const isFeatureEnabled = isGeneralMode
    ? supportConfig.isSupportEnabled
    : supportConfig.isPackageSupportEnabled !== false;

  // Allowed IDs according to Sami's cloud configuration
  const allowedIds = isGeneralMode
    ? supportConfig.guestModeratorIds || supportConfig.enabledModeratorIds || [1]
    : supportConfig.packageModeratorIds || [1];

  const inactiveIds = supportConfig.inactiveModeratorIds || [];

  const defaultModId = isGeneralMode
    ? supportConfig.defaultModeratorId
    : supportConfig.defaultPackageModeratorId;

  // Eligible moderators: active accounts whose IDs are approved by Sami and not marked inactive
  const eligibleModerators = systemModerators.filter(
    (m) => allowedIds.includes(m.id) && !inactiveIds.includes(m.id) && m.isActive !== false
  );

  const defaultModerator = eligibleModerators.find((m) => m.id === defaultModId) || null;

  const handleChooseModerator = (mod: UserAccount) => {
    const guestNum = currentUser.guestNumber || 1001;
    const prefilledMessage = getGuestOpeningMessage(
      !isGeneralMode ? 'subscriptions' : sourceContext,
      guestNum,
      packageInfo?.name
    );

    onSelectModerator(mod, prefilledMessage);
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[#090f1d] border border-amber-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/15 via-[#0c1424] to-amber-500/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/30">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isGeneralMode
                  ? 'التواصل مع المشرفين المعتمدين'
                  : `استفسار عن ${packageInfo?.name || 'الباقة'}`}
              </h3>
              <p className="text-xs text-amber-300/90 font-medium mt-0.5">
                محادثة خاصة برقم الضيف #{currentUser.guestNumber || 1001}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-right flex-1">
          {!isFeatureEnabled ? (
            <div className="p-6 rounded-2xl bg-[#0e172a] border border-rose-500/40 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-sm font-bold text-slate-200">
                {isGeneralMode
                  ? 'نظام دعم الضيوف غير متاح حاليًا. يرجى المحاولة لاحقًا.'
                  : 'استقبال استفسارات الباقات متوقف حالياً. يرجى المحاولة لاحقًا.'}
              </p>
              <p className="text-xs text-slate-400">
                تم تعطيل استقبال هذا النوع من الاستفسارات مؤقتاً بقرار من الإدارة.
              </p>
            </div>
          ) : eligibleModerators.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#0e172a] border border-amber-500/30 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm font-bold text-slate-200">
                {isGeneralMode
                  ? 'لا يوجد مشرف متاح لاستقبال رسائل الضيوف حاليًا. يرجى المحاولة لاحقًا.'
                  : 'لا يوجد مشرف متاح لاستقبال استفسارات الباقات حاليًا. يرجى المحاولة لاحقًا.'}
              </p>
              <p className="text-xs text-slate-400">
                لم يتم تفويض أي مشرف لاستقبال هذا النوع من المحادثات حالياً.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Optional Prompt Info */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 leading-relaxed">
                اختر المشرف الذي ترغب في محادثته. سيتم فتح المحادثة الخاصة وتجهيز رسالتك في مربع الكتابة لتراجعها وترسلها متى شئت.
              </div>

              {/* Default Moderator Highlight Card (if assigned) */}
              {defaultModerator && (
                <div
                  onClick={() => handleChooseModerator(defaultModerator)}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#0d1627] to-amber-500/10 border-2 border-amber-400/60 shadow-lg shadow-amber-500/15 flex items-center justify-between cursor-pointer hover:border-amber-300 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                      {defaultModerator.id === 1 ? '👑' : '🌟'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white group-hover:text-amber-300 transition">
                          {defaultModerator.displayName}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                          المشرف الافتراضي
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {defaultModerator.id === 1 ? 'القائد والمالك العام' : 'مشرف معتمد للدعم'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow group-hover:scale-105 transition shrink-0"
                  >
                    <span>محادثة فورية</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* List of Other / All Eligible Moderators */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400 block px-1">
                  المشرفون المؤهلون ({eligibleModerators.length}):
                </span>

                {eligibleModerators.map((mod) => {
                  const isDefault = mod.id === defaultModId;
                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleChooseModerator(mod)}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer group ${
                        isDefault
                          ? 'bg-[#0f172a] border-amber-500/40'
                          : 'bg-[#0b1220] border-slate-800 hover:border-amber-500/40 hover:bg-[#0e1628]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 shrink-0">
                          {mod.id === 1 ? '👑' : '🛡️'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white group-hover:text-amber-300 transition">
                              {mod.displayName}
                            </span>
                            {mod.id === 1 ? (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold">
                                المالك
                              </span>
                            ) : (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                مشرف
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-slate-400">
                            @{mod.username}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-[-2px] transition">
                        <span>بدء المحادثة</span>
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-[#070c17] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
