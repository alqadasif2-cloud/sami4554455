import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Search,
  ShieldCheck,
  ShieldAlert,
  Save,
  MessageCircle,
  Clock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  UserCog,
  Eye,
  Lock,
  Unlock,
} from 'lucide-react';
import { UserAccount, CurrentUser } from '../data/auth';
import {
  GuestIdentity,
  GuestSupportConfig,
  DEFAULT_GUEST_SUPPORT_CONFIG,
  subscribeToGuestSupportConfig,
  saveGuestSupportConfig,
  subscribeToAllGuestIdentities,
  toggleBlockGuest,
} from '../services/guest';

interface GuestManagementTabProps {
  currentUser: CurrentUser;
  users: UserAccount[];
  onOpenGuestChat?: (guestNumericId: number) => void;
}

export const GuestManagementTab: React.FC<GuestManagementTabProps> = ({
  currentUser,
  users,
  onOpenGuestChat,
}) => {
  const [subSection, setSubSection] = useState<'support_config' | 'guests_list'>('support_config');
  const [supportConfig, setSupportConfig] = useState<GuestSupportConfig>(DEFAULT_GUEST_SUPPORT_CONFIG);

  const [guests, setGuests] = useState<GuestIdentity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Filter moderators and owner Sami
  const availableModerators = users.filter((u) => u.role === 'moderator' || u.id === 1);

  const showNotice = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    const unsubConfig = subscribeToGuestSupportConfig((cfg) => {
      setSupportConfig(cfg);
    });

    const unsubGuests = subscribeToAllGuestIdentities((list) => {
      setGuests(list);
    });

    return () => {
      unsubConfig();
      unsubGuests();
    };
  }, []);

  const handleToggleGuestSupport = (modId: number) => {
    const currentList = supportConfig.guestModeratorIds || supportConfig.enabledModeratorIds || [];
    let nextList: number[];
    if (currentList.includes(modId)) {
      nextList = currentList.filter((id) => id !== modId);
    } else {
      nextList = [...currentList, modId];
    }

    let nextDefault = supportConfig.defaultModeratorId;
    if (nextDefault === modId && !nextList.includes(modId)) {
      nextDefault = nextList[0] || null;
    }

    setSupportConfig({
      ...supportConfig,
      enabledModeratorIds: nextList,
      guestModeratorIds: nextList,
      defaultModeratorId: nextDefault,
    });
  };

  const handleTogglePackageSupport = (modId: number) => {
    const currentList = supportConfig.packageModeratorIds || [1];
    let nextList: number[];
    if (currentList.includes(modId)) {
      nextList = currentList.filter((id) => id !== modId);
    } else {
      nextList = [...currentList, modId];
    }

    let nextDefault = supportConfig.defaultPackageModeratorId;
    if (nextDefault === modId && !nextList.includes(modId)) {
      nextDefault = nextList[0] || null;
    }

    setSupportConfig({
      ...supportConfig,
      packageModeratorIds: nextList,
      defaultPackageModeratorId: nextDefault,
    });
  };

  const handleToggleActiveStatus = (modId: number) => {
    const inactiveList = supportConfig.inactiveModeratorIds || [];
    let nextInactive: number[];
    if (inactiveList.includes(modId)) {
      nextInactive = inactiveList.filter((id) => id !== modId);
    } else {
      nextInactive = [...inactiveList, modId];
    }
    setSupportConfig({
      ...supportConfig,
      inactiveModeratorIds: nextInactive,
    });
  };

  const handleSaveSupportConfig = async () => {
    setIsSaving(true);
    try {
      await saveGuestSupportConfig(supportConfig, {
        id: currentUser.id,
        displayName: currentUser.displayName,
      });
      showNotice('تم حفظ وتحديث إعدادات دعم الضيوف واستفسارات الباقات سحابياً بنجاح.');
    } catch {
      showNotice('تعذر حفظ إعدادات الدعم.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBlock = async (guestId: string, currentBlocked: boolean) => {
    try {
      await toggleBlockGuest(guestId, !currentBlocked, { id: currentUser.id });
      showNotice(!currentBlocked ? 'تم حظر الضيف من التواصل مع الدعم.' : 'تم رفع الحظر عن الضيف.');
    } catch {
      showNotice('تعذر تغيير حالة حظر الضيف.', true);
    }
  };

  // Filter guests based on search query (by guest number or name)
  const filteredGuests = guests.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      String(g.guestNumber).includes(q) ||
      g.displayName.toLowerCase().includes(q) ||
      g.guestId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 text-right select-none">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold transition-all shadow-lg ${
            feedback.isError
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
              : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 bg-[#0e1420] p-1.5 rounded-2xl border border-slate-800">
        <button
          type="button"
          onClick={() => setSubSection('support_config')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
            subSection === 'support_config'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCog className="w-4 h-4" />
          <span>⚙️ إدارة دعم الضيوف والباقات</span>
        </button>

        <button
          type="button"
          onClick={() => setSubSection('guests_list')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
            subSection === 'guests_list'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 إدارة الضيوف ({guests.length})</span>
        </button>
      </div>

      {/* SECTION 1: GUEST SUPPORT & PACKAGES MANAGEMENT */}
      {subSection === 'support_config' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#0c1424] to-amber-500/10 border border-amber-500/30 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
                <span>⚙️ إدارة صلاحيات المشرفين لدعم الضيوف واستفسارات الباقات</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                حدد لكل مشرف صلاحية استقبال رسائل الضيوف العامة، واستقبال استفسارات الباقات والاشتراكات، مع تحديد المشرف الافتراضي لكل قسم.
              </p>
            </div>
          </div>

          {/* Global Switches Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Global General Support Switch */}
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">تفعيل نظام دعم الضيوف العام</h4>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  استقبال الرسائل العامة من الصفحات المقفلة
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={supportConfig.isSupportEnabled}
                  onChange={(e) =>
                    setSupportConfig({ ...supportConfig, isSupportEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Global Package Support Switch */}
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">تفعيل استفسارات الباقات والاشتراكات</h4>
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  زر «المزيد من المعلومات 💬» واستفسار الباقات
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={supportConfig.isPackageSupportEnabled !== false}
                  onChange={(e) =>
                    setSupportConfig({
                      ...supportConfig,
                      isPackageSupportEnabled: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Default Moderators Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Default General Moderator */}
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-white">المشرف الافتراضي لدعم الضيوف العام:</h4>
              <select
                value={supportConfig.defaultModeratorId || ''}
                onChange={(e) =>
                  setSupportConfig({
                    ...supportConfig,
                    defaultModeratorId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full bg-[#0b101c] border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold outline-none"
              >
                <option value="">-- بدون مشرف افتراضي (يختار الضيف من القائمة) --</option>
                {availableModerators
                  .filter((m) =>
                    (supportConfig.guestModeratorIds || supportConfig.enabledModeratorIds).includes(
                      m.id
                    )
                  )
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} {m.id === 1 ? '(المالك Sami 👑)' : '(مشرف 🛡️)'}
                    </option>
                  ))}
              </select>
            </div>

            {/* Default Package Moderator */}
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-white">المشرف الافتراضي لاستفسارات الباقات:</h4>
              <select
                value={supportConfig.defaultPackageModeratorId || ''}
                onChange={(e) =>
                  setSupportConfig({
                    ...supportConfig,
                    defaultPackageModeratorId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full bg-[#0b101c] border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold outline-none"
              >
                <option value="">-- بدون مشرف افتراضي (يختار الضيف من القائمة) --</option>
                {availableModerators
                  .filter((m) => (supportConfig.packageModeratorIds || [1]).includes(m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} {m.id === 1 ? '(المالك Sami 👑)' : '(مشرف 🛡️)'}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* List of Real System Moderators with Dual Toggles */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-amber-400">
                قائمة المشرفين المسجلين في التطبيق ({availableModerators.length})
              </h4>
              <span className="text-[11px] text-slate-400">
                عام: {(supportConfig.guestModeratorIds || supportConfig.enabledModeratorIds).length} • باقات: {(supportConfig.packageModeratorIds || [1]).length}
              </span>
            </div>

            <div className="space-y-2.5">
              {availableModerators.map((mod) => {
                const isGuestEnabled = (
                  supportConfig.guestModeratorIds || supportConfig.enabledModeratorIds
                ).includes(mod.id);
                const isPackageEnabled = (
                  supportConfig.packageModeratorIds || [1]
                ).includes(mod.id);
                const isDefaultGuest = supportConfig.defaultModeratorId === mod.id;
                const isDefaultPackage = supportConfig.defaultPackageModeratorId === mod.id;
                const isInactive = (supportConfig.inactiveModeratorIds || []).includes(mod.id);

                return (
                  <div
                    key={mod.id}
                    className={`p-3.5 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isInactive
                        ? 'bg-[#0a0d16] border-slate-800 opacity-80'
                        : isGuestEnabled || isPackageEnabled
                        ? 'bg-[#0f182c] border-amber-500/35'
                        : 'bg-[#0a0f1d] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 shrink-0">
                        {mod.id === 1 ? '👑' : '🛡️'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-white">{mod.displayName}</span>
                          {mod.id === 1 ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold">
                              المالك
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              مشرف
                            </span>
                          )}
                          {isDefaultGuest && (
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                              افتراضي للضيوف 🌟
                            </span>
                          )}
                          {isDefaultPackage && (
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                              افتراضي للباقات 💎
                            </span>
                          )}
                          {isInactive ? (
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                              غير متاح حالياً ⏸️
                            </span>
                          ) : (
                            <span className="text-[9.5px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                              متاح للاستقبال ✓
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] text-slate-400">
                          اسم الحساب: @{mod.username} (ID: {mod.id}) • الحالة: {isInactive ? 'متوقف مؤقتاً' : 'نشط'}
                        </span>
                      </div>
                    </div>

                    {/* Dual Permission Controls & Active Status */}
                    <div className="flex items-center gap-3 sm:gap-4 self-end md:self-auto bg-[#090e1a] p-2 rounded-xl border border-slate-800 flex-wrap">
                      {/* Active Status Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className={`text-[11px] font-bold ${isInactive ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isInactive ? 'معطل' : 'نشط'}
                        </span>
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={!isInactive}
                            onChange={() => handleToggleActiveStatus(mod.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </div>
                      </label>

                      <div className="h-5 w-[1px] bg-slate-700" />

                      {/* Toggle 1: General Guest Support */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-[11px] font-bold text-slate-300">
                          دعم عام
                        </span>
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={isGuestEnabled}
                            onChange={() => handleToggleGuestSupport(mod.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </div>
                      </label>

                      <div className="h-5 w-[1px] bg-slate-700" />

                      {/* Toggle 2: Package Inquiries */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className="text-[11px] font-bold text-slate-300">
                          باقات
                        </span>
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={isPackageEnabled}
                            onChange={() => handleTogglePackageSupport(mod.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveSupportConfig}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'جاري الحفظ...' : 'حفظ إعدادات دعم الضيوف واستفسارات الباقات'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: GUESTS LIST MANAGEMENT */}
      {subSection === 'guests_list' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#0c1424] to-amber-500/10 border border-amber-500/30">
            <h3 className="text-sm font-black text-amber-300">
              👥 قائمة الضيوف المسجلين وهوياتهم الثابتة
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              سجل كامل لجميع هويات الضيوف مع رقم الضيف الفريد، تاريخ الإنشاء، وآخر ظهور. تظهر أرقام الضيوف للمشرفين والمالك فقط.
            </p>
          </div>

          {/* Search by guest number */}
          <div className="relative">
            <div className="flex items-center justify-between bg-[#0c1322] border border-slate-700/80 focus-within:border-amber-400 rounded-2xl px-4 py-2.5 transition shadow-inner">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم الضيف (مثال: 1001)..."
                className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 outline-none font-medium text-right"
              />
              <div className="flex items-center gap-1.5 mr-2">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-amber-400"
                  >
                    ×
                  </button>
                )}
                <Search className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Guests List */}
          {filteredGuests.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#090f1d] border border-slate-800 text-center text-slate-400 text-xs">
              {searchQuery.trim()
                ? 'لا يوجد ضيف مطابق لرقم البحث.'
                : 'لم يتم تسجيل أي ضيوف في النظام حتى الآن.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.guestId}
                  className="p-3.5 rounded-2xl bg-[#0e1628] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group hover:border-amber-500/40 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-amber-400 font-mono">
                        ضيف رقم {guest.guestNumber}
                      </span>
                      {guest.isBlocked ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          محظور من الدعم
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          نشط
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span className="font-mono text-slate-500">ID: {guest.guestId}</span>
                      <span>•</span>
                      <span>تاريخ الإنشاء: {new Date(guest.createdAt).toLocaleDateString('ar-SA')}</span>
                      <span>•</span>
                      <span>آخر نشاط: {new Date(guest.lastActiveAt).toLocaleString('ar-SA')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {onOpenGuestChat && (
                      <button
                        type="button"
                        onClick={() => onOpenGuestChat(9000000 + guest.guestNumber)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="فتح المحادثة الخاصة مع هذا الضيف"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>فتح المحادثة</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleBlock(guest.guestId, guest.isBlocked)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        guest.isBlocked
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                      }`}
                    >
                      {guest.isBlocked ? 'رفع الحظر' : 'حظر الضيف'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
