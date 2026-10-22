import React, { useState, useEffect } from 'react';
import {
  Shield,
  Coins,
  Edit,
  Edit3,
  FileText,
  CreditCard,
  Save,
  RotateCcw,
  Eye,
  Send,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  AlertTriangle,
  Clock,
  Users,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Copy,
  History,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  SubscriptionPlan,
  SubscriptionAuditLog,
  TermsItem,
  PaymentMethodItem,
} from '../types/subscription';
import {
  subscribeToSubscriptionPlans,
  saveSubscriptionPlan,
  publishSubscriptionPlan,
  subscribeToSubscriptionAuditLogs,
} from '../services/subscriptions';
import { CurrentUser } from '../data/auth';
import { SubscriptionDetailModal } from './SubscriptionDetailModal';

interface SubscriptionManagerTabProps {
  currentUser: CurrentUser;
}

export const SubscriptionManagerTab: React.FC<SubscriptionManagerTabProps> = ({
  currentUser,
}) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<
    'basic' | 'descriptions' | 'payment' | 'terms' | 'audit'
  >('basic');

  // Working draft for the selected plan
  const [draftPlan, setDraftPlan] = useState<SubscriptionPlan | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals & UI States
  const [previewPlan, setPreviewPlan] = useState<SubscriptionPlan | null>(null);
  const [auditLogs, setAuditLogs] = useState<SubscriptionAuditLog[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sensitive Confirmation Modal
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'save_price' | 'delete_term' | 'publish_terms' | 'toggle_status';
    onConfirm: () => void;
  } | null>(null);

  // Terms item inline edit / add state
  const [newTermTitle, setNewTermTitle] = useState('');
  const [newTermContent, setNewTermContent] = useState('');
  const [isAddingNewTerm, setIsAddingNewTerm] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);

  // Payment method add/edit state
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const [newPaymentName, setNewPaymentName] = useState('');
  const [newPaymentNetwork, setNewPaymentNetwork] = useState('');
  const [newPaymentAddress, setNewPaymentAddress] = useState('');
  const [newPaymentLink, setNewPaymentLink] = useState('');
  const [newPaymentInstructions, setNewPaymentInstructions] = useState('');

  const showNotice = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Subscribe to real-time plans and audit logs
  useEffect(() => {
    const unsubPlans = subscribeToSubscriptionPlans((updatedPlans) => {
      setPlans(updatedPlans);
    });

    const unsubAudit = subscribeToSubscriptionAuditLogs((logs) => {
      setAuditLogs(logs);
    });

    return () => {
      unsubPlans();
      unsubAudit();
    };
  }, []);

  // Sync draft when selected plan changes or when initial load completes
  const handleSelectPlan = (plan: SubscriptionPlan, initialTab?: typeof activeEditorTab) => {
    if (hasUnsavedChanges && selectedPlanId && selectedPlanId !== plan.id) {
      if (!confirm('لديك تعديلات غير محفوظة على هذا الاشتراك. هل تريد تجاهلها والانتقال لاشتراك آخر؟')) {
        return;
      }
    }
    setSelectedPlanId(plan.id);
    setDraftPlan(JSON.parse(JSON.stringify(plan)));
    setHasUnsavedChanges(false);
    if (initialTab) {
      setActiveEditorTab(initialTab);
    }
  };

  const updateDraft = (updates: Partial<SubscriptionPlan>) => {
    if (!draftPlan) return;
    setDraftPlan({
      ...draftPlan,
      ...updates,
    });
    setHasUnsavedChanges(true);
  };

  const handleCancelChanges = () => {
    if (!selectedPlanId) return;
    const original = plans.find((p) => p.id === selectedPlanId);
    if (original) {
      setDraftPlan(JSON.parse(JSON.stringify(original)));
      setHasUnsavedChanges(false);
      showNotice('تم إلغاء التعديلات غير المحفوظة واستعادة البيانات السابقة.');
    }
  };

  // --- SAVE & PUBLISH HANDLERS ---
  const handleSavePlan = async (changeType?: SubscriptionAuditLog['changeType']) => {
    if (!draftPlan) return;

    // Check if price changed from original to show confirmation
    const original = plans.find((p) => p.id === draftPlan.id);
    if (original && original.price !== draftPlan.price && !confirmModalData) {
      setConfirmModalData({
        isOpen: true,
        title: 'تأكيد تغيير سعر الاشتراك',
        message: `أنت على وشك تغيير سعر ${draftPlan.name} من ${original.price} ${original.currency} إلى ${draftPlan.price} ${draftPlan.currency}. هل تريد تأكيد الحفظ ونشر السعر الجديد للمستخدمين؟`,
        actionType: 'save_price',
        onConfirm: () => {
          setConfirmModalData(null);
          executeSave(changeType || 'price_update');
        },
      });
      return;
    }

    executeSave(changeType || 'details_update');
  };

  const executeSave = async (changeType: SubscriptionAuditLog['changeType']) => {
    if (!draftPlan) return;
    setIsSaving(true);
    try {
      await saveSubscriptionPlan(
        draftPlan,
        { id: currentUser.id, displayName: currentUser.displayName },
        changeType,
        `تحديث بيانات الاشتراك "${draftPlan.name}"`
      );
      setHasUnsavedChanges(false);
      showNotice(`تم حفظ تعديلات "${draftPlan.name}" بنجاح في قاعدة البيانات.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر حفظ بيانات الاشتراك.';
      showNotice(msg, true);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishPlan = async (incrementTerms = false) => {
    if (!draftPlan) return;

    if (incrementTerms) {
      setConfirmModalData({
        isOpen: true,
        title: 'نشر إصدار جديد من الشروط والأحكام',
        message: `سيتم اعتماد ونشر النسخة رقم (v${(draftPlan.termsVersion || 1) + 1}) من شروط "${draftPlan.name}". سيطلب التطبيق من المشتركين مراجعة النسخة الجديدة والموافقة عليها مع الاحتفاظ بسجلات موافقاتهم السابقة. هل تريد المتابعة؟`,
        actionType: 'publish_terms',
        onConfirm: async () => {
          setConfirmModalData(null);
          setIsSaving(true);
          try {
            const published = await publishSubscriptionPlan(
              draftPlan,
              { id: currentUser.id, displayName: currentUser.displayName },
              true
            );
            setDraftPlan(published);
            setHasUnsavedChanges(false);
            showNotice(`تم نشر النسخة الجديدة من شروط ${published.name} (v${published.termsVersion}) بنجاح!`);
          } catch (err) {
            showNotice('تعذر نشر الشروط الجديدة.', true);
          } finally {
            setIsSaving(false);
          }
        },
      });
      return;
    }

    setIsSaving(true);
    try {
      const published = await publishSubscriptionPlan(
        draftPlan,
        { id: currentUser.id, displayName: currentUser.displayName },
        false
      );
      setDraftPlan(published);
      setHasUnsavedChanges(false);
      showNotice(`تم نشر وتفعيل جميع بيانات "${published.name}" للمستخدمين بنجاح.`);
    } catch (err) {
      showNotice('تعذر نشر بيانات الاشتراك.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // --- TERMS EDITOR HANDLERS ---
  const handleAddTerm = () => {
    if (!draftPlan || !newTermTitle.trim() || !newTermContent.trim()) {
      showNotice('يرجى إدخال عنوان ونص البند الجديد.', true);
      return;
    }

    const currentTerms = draftPlan.termsItems || [];
    const newTerm: TermsItem = {
      id: `term_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order: currentTerms.length + 1,
      title: newTermTitle.trim(),
      content: newTermContent.trim(),
      isEnabled: true,
    };

    updateDraft({
      termsItems: [...currentTerms, newTerm],
    });
    setNewTermTitle('');
    setNewTermContent('');
    setIsAddingNewTerm(false);
    showNotice(`تمت إضافة البند "${newTerm.title}" إلى القائمة.`);
  };

  const handleUpdateTerm = (termId: string, updates: Partial<TermsItem>) => {
    if (!draftPlan) return;
    const currentTerms = draftPlan.termsItems || [];
    const nextTerms = currentTerms.map((t) => (t.id === termId ? { ...t, ...updates } : t));
    updateDraft({ termsItems: nextTerms });
  };

  const handleDeleteTerm = (termId: string, termTitle: string) => {
    if (!draftPlan) return;
    setConfirmModalData({
      isOpen: true,
      title: 'تأكيد حذف بند من الشروط',
      message: `هل أنت متأكد من حذف البند "${termTitle}"؟ لن يظهر هذا البند للمستخدمين بعد حفظ التعديلات.`,
      actionType: 'delete_term',
      onConfirm: () => {
        setConfirmModalData(null);
        const currentTerms = draftPlan.termsItems || [];
        const nextTerms = currentTerms
          .filter((t) => t.id !== termId)
          .map((t, idx) => ({ ...t, order: idx + 1 }));
        updateDraft({ termsItems: nextTerms });
        showNotice(`تم حذف البند "${termTitle}".`);
      },
    });
  };

  const handleMoveTerm = (index: number, direction: 'up' | 'down') => {
    if (!draftPlan) return;
    const terms = [...(draftPlan.termsItems || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= terms.length) return;

    const temp = terms[index];
    terms[index] = terms[targetIndex];
    terms[targetIndex] = temp;

    // reassign orders
    const reordered = terms.map((t, idx) => ({ ...t, order: idx + 1 }));
    updateDraft({ termsItems: reordered });
  };

  // --- PAYMENT METHOD HANDLERS ---
  const handleAddPaymentMethod = () => {
    if (!draftPlan || !newPaymentName.trim()) {
      showNotice('يرجى إدخال اسم طريقة الدفع.', true);
      return;
    }

    const currentMethods = draftPlan.paymentMethods || [];
    const newMethod: PaymentMethodItem = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newPaymentName.trim(),
      type: 'crypto',
      network: newPaymentNetwork.trim() || undefined,
      addressOrDetails: newPaymentAddress.trim() || undefined,
      linkUrl: newPaymentLink.trim() || undefined,
      instructions: newPaymentInstructions.trim() || undefined,
      isEnabled: true,
    };

    updateDraft({
      paymentMethods: [...currentMethods, newMethod],
    });

    setNewPaymentName('');
    setNewPaymentNetwork('');
    setNewPaymentAddress('');
    setNewPaymentLink('');
    setNewPaymentInstructions('');
    setIsAddingPaymentMethod(false);
    showNotice(`تمت إضافة طريقة الدفع "${newMethod.name}".`);
  };

  const handleDeletePaymentMethod = (id: string, name: string) => {
    if (!draftPlan) return;
    if (!confirm(`هل أنت متأكد من حذف طريقة الدفع "${name}"؟`)) return;

    const nextMethods = (draftPlan.paymentMethods || []).filter((m) => m.id !== id);
    updateDraft({ paymentMethods: nextMethods });
    showNotice(`تم حذف طريقة الدفع "${name}".`);
  };

  const handleTogglePaymentMethod = (id: string) => {
    if (!draftPlan) return;
    const nextMethods = (draftPlan.paymentMethods || []).map((m) =>
      m.id === id ? { ...m, isEnabled: !m.isEnabled } : m
    );
    updateDraft({ paymentMethods: nextMethods });
  };

  return (
    <div className="space-y-6 text-right select-none">
      {/* Toast Feedback Notification */}
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
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Main Section Header */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#0e172a] to-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>⚙️ إدارة الاشتراكات والقنوات الخاصة</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                صلاحية المالك SAMI 👑
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              تحكم كامل وتعديل لحظي لأسعار الاشتراكات الخمسة، أوصافها، طرق الدفع، وشروط وأحكام Sami VIP دون الحاجة لإعادة بناء التطبيق أو إصدار APK جديد.
            </p>
          </div>
        </div>

        {/* Audit Log Quick Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-[11px] font-mono text-slate-400">
            {plans.length} باقات معتمدة
          </span>
        </div>
      </div>

      {/* Grid of the 5 Subscriptions Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            <span>قائمة الاشتراكات الخمسة المعروضة في التطبيق:</span>
          </h3>
          <span className="text-[11px] text-slate-400">اضغط على أي اشتراك لإدارته وتعديله بشكل مستقل</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isVip = plan.id === 'sami_vip';
            const isClosed = !plan.isActive || plan.status === 'closed';

            return (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan(plan)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#131f38] to-[#0c1322] border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/40'
                    : 'bg-[#0a1120] border-slate-800 hover:border-amber-500/50 hover:bg-[#0d1628]'
                }`}
              >
                {/* Glowing top accent line */}
                <div
                  className={`absolute top-0 right-0 left-0 h-1 ${
                    isVip
                      ? 'bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500'
                      : 'bg-gradient-to-r from-slate-700 via-amber-500 to-slate-700'
                  }`}
                />

                <div>
                  {/* Card Header: Name + Badges */}
                  <div className="flex items-start justify-between gap-2 mb-2 pt-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition">
                          {plan.name}
                        </h4>
                        {isVip && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
                            VIP
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        معرف ثابت: {plan.id}
                      </span>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-lg font-black text-amber-400 font-mono">
                        {plan.price} {plan.currency}
                      </span>
                    </div>
                  </div>

                  {/* Status & Capacity Row */}
                  <div className="flex flex-wrap items-center gap-2 my-2.5">
                    {isClosed ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        مغلق مؤقتاً
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Unlock className="w-3 h-3" />
                        متاح ونشط
                      </span>
                    )}

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {plan.durationDays > 0 ? `${plan.durationDays} يوم` : 'مستمر'}
                    </span>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
                      <Users className="w-3 h-3 text-amber-400" />
                      حد المشتركين: {plan.maxSubscribers}
                    </span>

                    {plan.termsItems && plan.termsItems.length > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                        {plan.termsItems.length} بنود (v{plan.termsVersion})
                      </span>
                    )}
                  </div>

                  {/* Short Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {plan.shortDescription}
                  </p>
                </div>

                {/* Card Quick Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlan(plan, 'basic');
                      }}
                      className="text-[10.5px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center gap-1 transition"
                      title="تعديل التفاصيل والسعر"
                    >
                      <Coins className="w-3 h-3" />
                      <span>السعر</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlan(plan, 'terms');
                      }}
                      className="text-[10.5px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center gap-1 transition"
                      title="إدارة الشروط والأحكام"
                    >
                      <FileText className="w-3 h-3" />
                      <span>الشروط</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPlan(plan, 'payment');
                      }}
                      className="text-[10.5px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center gap-1 transition"
                      title="تعديل طرق الدفع"
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>الدفع</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewPlan(plan);
                    }}
                    className="text-[10.5px] px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black flex items-center gap-1 transition"
                    title="معاينة شكل الاشتراك للمستخدم"
                  >
                    <Eye className="w-3 h-3" />
                    <span>معاينة</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dedicated Subscription Editor (Opened upon selecting a plan) */}
      {draftPlan && (
        <div className="mt-8 p-5 sm:p-6 rounded-3xl bg-[#090f1e] border-2 border-amber-400/60 shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.15)] space-y-6">
          {/* Editor Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>تعديل بيانات: {draftPlan.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300">
                    ID: {draftPlan.id}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  جميع التغييرات تُحفظ في قاعدة البيانات السحابية وتظهر فوراً للمستخدمين دون الحاجة لتحديث الكود.
                </p>
              </div>
            </div>

            {/* Quick Actions (Save / Preview / Publish / Cancel) */}
            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setPreviewPlan(draftPlan)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>📋 معاينة العرض</span>
              </button>

              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleCancelChanges}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>↩️ إلغاء</span>
                </button>
              )}

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSavePlan()}
                className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-lg ${
                  hasUnsavedChanges
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-amber-500/20 animate-pulse'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'جاري الحفظ...' : '💾 حفظ التعديلات'}</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handlePublishPlan(draftPlan.id === 'sami_vip')}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-black hover:brightness-110 flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>🚀 نشر التعديلات للمستخدمين</span>
              </button>
            </div>
          </div>

          {/* Sub-Editor Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveEditorTab('basic')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeEditorTab === 'basic'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>💰 السعر والبيانات الأساسية</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEditorTab('descriptions')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeEditorTab === 'descriptions'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit className="w-4 h-4" />
              <span>📝 الأوصاف والرسائل</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEditorTab('payment')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeEditorTab === 'payment'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>💳 طرق الدفع والتقسيط</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEditorTab('terms')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeEditorTab === 'terms'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>
                {draftPlan.id === 'sami_vip'
                  ? '📜 شروط وأحكام Sami VIP (16 بند)'
                  : '📜 شروط القناة'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveEditorTab('audit')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeEditorTab === 'audit'
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>🕒 سجل التعديلات</span>
            </button>
          </div>

          {/* TAB 1: BASIC & PRICING */}
          {activeEditorTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Subscription Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    اسم الاشتراك / القناة (ثابت المعرف)
                  </label>
                  <input
                    type="text"
                    value={draftPlan.name}
                    onChange={(e) => updateDraft({ name: e.target.value })}
                    className="w-full bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    يتم الحفاظ على المعرف الثابت <code className="text-amber-300">{draftPlan.id}</code> لضمان عدم انكسار الروابط.
                  </p>
                </div>

                {/* Package Image or Logo URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    رابط صورة أو شعار الباقة (اختياري)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="https://... أو مسار الشعار"
                      value={draftPlan.imageUrl || ''}
                      onChange={(e) => updateDraft({ imageUrl: e.target.value })}
                      className="flex-1 bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 outline-none font-mono dir-ltr text-right"
                    />
                    {draftPlan.imageUrl && (
                      <img
                        src={draftPlan.imageUrl}
                        alt="شعار"
                        className="w-9 h-9 rounded-xl object-cover border border-amber-400 shrink-0"
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    يظهر الشعار في بطاقات الباقات وأعلى نافذة التفاصيل.
                  </p>
                </div>

                {/* Price & Currency */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      السعر الحالي
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={draftPlan.price}
                      onChange={(e) => updateDraft({ price: Number(e.target.value) })}
                      className="w-full bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono font-bold focus:border-amber-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      العملة
                    </label>
                    <input
                      type="text"
                      value={draftPlan.currency}
                      onChange={(e) => updateDraft({ currency: e.target.value })}
                      className="w-full bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                {/* Duration Days */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    مدة الاشتراك الأساسية (بالأيام)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={draftPlan.durationDays}
                    onChange={(e) => updateDraft({ durationDays: Number(e.target.value) })}
                    className="w-full bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {draftPlan.id === 'sami_vip'
                      ? 'مدة Sami VIP الأساسية الحالية هي 7 أيام (أسبوع كامل).'
                      : 'المدة بالأيام المعروضة في بطاقة الاشتراك ورسائل الاستفسار.'}
                  </p>
                </div>

                {/* Max Subscribers Capacity */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    الحد الأقصى للمشتركين (سعة المقاعد)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={draftPlan.maxSubscribers}
                    onChange={(e) => updateDraft({ maxSubscribers: Number(e.target.value) })}
                    className="w-full bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {draftPlan.id === 'sami_vip'
                      ? 'الحد الأقصى الحالي لقناة Sami VIP هو 10 مشتركين أسبوعياً.'
                      : 'سعة المشتركين المحددة للاشتراك.'}
                  </p>
                </div>
              </div>

              {/* Status & Availability Toggle */}
              <div className="p-4 rounded-2xl bg-[#0e172a] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>حالة استقبال الاشتراكات</span>
                      {draftPlan.isActive && draftPlan.status === 'active' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          متاح ونشط
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          مغلق مؤقتاً
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      تحديد ما إذا كان الاشتراك متاحاً للمستخدمين أو مغلقاً مؤقتاً لاكتمال المقاعد.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftPlan.isActive && draftPlan.status === 'active'}
                      onChange={(e) => {
                        const active = e.target.checked;
                        updateDraft({
                          isActive: active,
                          status: active ? 'active' : 'closed',
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Closure Message if closed */}
                {(!draftPlan.isActive || draftPlan.status === 'closed') && (
                  <div>
                    <label className="block text-xs font-bold text-rose-300 mb-1">
                      رسالة توضيح سبب الإغلاق أو موعد العودة (تظهر للمستخدمين بوضوح):
                    </label>
                    <input
                      type="text"
                      value={draftPlan.closedMessage || ''}
                      onChange={(e) => updateDraft({ closedMessage: e.target.value })}
                      placeholder="مثال: اكتملت مقاعد هذا الأسبوع (10/10). يرجى التواصل مع Sami للحجز في الدفعة القادمة."
                      className="w-full bg-[#0a101d] border border-rose-500/40 rounded-xl px-3 py-2 text-xs text-rose-200 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DESCRIPTIONS, FEATURES & NOTES */}
          {activeEditorTab === 'descriptions' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الوصف المختصر (يظهر في بطاقة الاشتراك الرئيسية)
                </label>
                <textarea
                  rows={2}
                  value={draftPlan.shortDescription}
                  onChange={(e) => updateDraft({ shortDescription: e.target.value })}
                  className="w-full bg-[#0e1627] border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-amber-400 outline-none leading-relaxed"
                  placeholder="وصف جذاب وموجز يوضح فكرة الاشتراك..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الوصف التفصيلي (يظهر داخل نافذة تفاصيل الاشتراك)
                </label>
                <textarea
                  rows={3}
                  value={draftPlan.fullDescription}
                  onChange={(e) => updateDraft({ fullDescription: e.target.value })}
                  className="w-full bg-[#0e1627] border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-amber-400 outline-none leading-relaxed"
                  placeholder="شرح كامل ومفصل لميزات القناة والاستراتيجيات المتبعة..."
                />
              </div>

              {/* Package Features List Editor */}
              <div className="p-4 rounded-2xl bg-[#0e172a] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>قائمة مزايا ومحتويات الباقة (Checklist)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      بنود مميزة تظهر بجانب علامات صح ذهبية داخل نافذة تفاصيل الباقة.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(draftPlan.features || []), ''];
                      updateDraft({ features: updated });
                    }}
                    className="text-xs px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold transition cursor-pointer"
                  >
                    + إضافة ميزة
                  </button>
                </div>

                <div className="space-y-2">
                  {(draftPlan.features && draftPlan.features.length > 0
                    ? draftPlan.features
                    : []
                  ).map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {fIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => {
                          const updated = [...(draftPlan.features || [])];
                          updated[fIdx] = e.target.value;
                          updateDraft({ features: updated });
                        }}
                        placeholder="أدخل ميزة من مزايا الباقة..."
                        className="flex-1 bg-[#0a101d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (draftPlan.features || []).filter((_, i) => i !== fIdx);
                          updateDraft({ features: updated });
                        }}
                        className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 transition cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                  {(!draftPlan.features || draftPlan.features.length === 0) && (
                    <p className="text-xs text-slate-500 italic">لا توجد مزايا مخصصة حالياً. اضغط على «+ إضافة ميزة» لإضافة نقاط قوة الباقة.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  توجيهات وملاحظات القائد Sami للمشتركين (تظهر في صندوق ذهبي مميز داخل التفاصيل)
                </label>
                <textarea
                  rows={2}
                  value={draftPlan.ownerNotes || ''}
                  onChange={(e) => updateDraft({ ownerNotes: e.target.value })}
                  className="w-full bg-[#0e1627] border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:border-amber-400 outline-none leading-relaxed"
                  placeholder="مثال: رحلة مدروسة ومحسوبة بهدف مضاعفة رأس المال تدريجياً والانضباط التام في الصفقات..."
                />
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT METHODS & INSTALLMENTS */}
          {activeEditorTab === 'payment' && (
            <div className="space-y-5">
              {/* Primary Wallet & Transfer Configuration for the Plan */}
              <div className="p-4 rounded-2xl bg-[#0c1424] border border-amber-500/30 space-y-3">
                <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>بيانات المحفظة وشبكة التحويل الرئيسية للباقة</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  هذه البيانات تظهر بشكل مباشر وبارز في نافذة تفاصيل الباقة للمستخدمين بجانب طرق الدفع المخصصة.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      شبكة التحويل / الإيداع المعتمدة
                    </label>
                    <input
                      type="text"
                      value={draftPlan.depositNetwork || ''}
                      onChange={(e) => updateDraft({ depositNetwork: e.target.value })}
                      placeholder="مثال: Tron (USDT TRC20) أو BEP20"
                      className="w-full bg-[#090f1e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      عنوان المحفظة أو الحساب الرئيسي
                    </label>
                    <input
                      type="text"
                      value={draftPlan.walletAddress || ''}
                      onChange={(e) => updateDraft({ walletAddress: e.target.value })}
                      placeholder="عنوان المحفظة (USDT / Binance Pay ID...)"
                      className="w-full bg-[#090f1e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono outline-none focus:border-amber-400 dir-ltr text-right"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      رابط المحفظة أو الدفع المباشر (اختياري)
                    </label>
                    <input
                      type="text"
                      value={draftPlan.walletLink || ''}
                      onChange={(e) => updateDraft({ walletLink: e.target.value })}
                      placeholder="https://... رابط مستكشف البلوكتشين أو رابط بوابة الدفع"
                      className="w-full bg-[#090f1e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-400 dir-ltr text-right"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      تعليمات الدفع والتحويل العامة
                    </label>
                    <textarea
                      rows={2}
                      value={draftPlan.paymentInstructions || ''}
                      onChange={(e) => updateDraft({ paymentInstructions: e.target.value })}
                      placeholder="تعليمات وإرشادات واضحة للتحويل، مثل التأكد من الشبكة وإرسال لقطة الشاشة..."
                      className="w-full bg-[#090f1e] border border-slate-700 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-amber-400 leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Installments Option */}
              <div className="p-4 rounded-2xl bg-[#0e172a] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">نظام الدفعات (التقسيط)</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      تحديد ما إذا كان الاشتراك يدعم الدفع الكامل فقط أو يتيح خيار الدفع على دفعات.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draftPlan.allowsInstallments}
                      onChange={(e) => updateDraft({ allowsInstallments: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {draftPlan.allowsInstallments && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <label className="block text-xs font-bold text-amber-300 mb-1">
                      الحد الأدنى للدفعة الأولى (مثلاً 100$ للقنوات التي تعتمد هذا النظام):
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={draftPlan.installmentMinimum}
                      onChange={(e) => updateDraft({ installmentMinimum: Number(e.target.value) })}
                      className="w-48 bg-[#0a101d] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono font-bold outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Payment Methods List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-amber-400">
                    طرق الدفع المعتمدة لهذا الاشتراك ({draftPlan.paymentMethods.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingPaymentMethod(true)}
                    className="text-xs px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة طريقة دفع</span>
                  </button>
                </div>

                {/* Add Payment Method Form */}
                {isAddingPaymentMethod && (
                  <div className="p-4 rounded-2xl bg-[#0a1222] border border-amber-500/40 space-y-3">
                    <h5 className="text-xs font-black text-white">إضافة طريقة دفع جديدة للاشتراك</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="اسم طريقة الدفع (مثال: USDT TRC20)"
                        value={newPaymentName}
                        onChange={(e) => setNewPaymentName(e.target.value)}
                        className="bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      />
                      <input
                        type="text"
                        placeholder="الشبكة أو النوع (مثال: Tron TRC20)"
                        value={newPaymentNetwork}
                        onChange={(e) => setNewPaymentNetwork(e.target.value)}
                        className="bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="عنوان المحفظة أو المعرف (address / Pay ID)"
                      value={newPaymentAddress}
                      onChange={(e) => setNewPaymentAddress(e.target.value)}
                      className="w-full bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono outline-none dir-ltr text-right"
                    />
                    <input
                      type="text"
                      placeholder="رابط المحفظة المباشر أو صفحة الدفع (اختياري)"
                      value={newPaymentLink}
                      onChange={(e) => setNewPaymentLink(e.target.value)}
                      className="w-full bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono outline-none dir-ltr text-right"
                    />
                    <input
                      type="text"
                      placeholder="تعليمات الدفع للمشترك (اختياري)"
                      value={newPaymentInstructions}
                      onChange={(e) => setNewPaymentInstructions(e.target.value)}
                      className="w-full bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 outline-none"
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsAddingPaymentMethod(false)}
                        className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPaymentMethod}
                        className="px-4 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-black"
                      >
                        إضافة الطريقة
                      </button>
                    </div>
                  </div>
                )}

                {/* List of existing methods */}
                <div className="space-y-2">
                  {draftPlan.paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="p-3 rounded-2xl bg-[#0e172a] border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={method.isEnabled}
                          onChange={() => handleTogglePaymentMethod(method.id)}
                          className="w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{method.name}</span>
                            {method.network && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                {method.network}
                              </span>
                            )}
                          </div>
                          {method.addressOrDetails && (
                            <p className="text-[11px] text-amber-300/80 font-mono truncate dir-ltr text-right">
                              {method.addressOrDetails}
                            </p>
                          )}
                          {method.linkUrl && (
                            <p className="text-[10px] text-slate-400 font-mono truncate dir-ltr text-right">
                              {method.linkUrl}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePaymentMethod(method.id, method.name)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 transition cursor-pointer"
                        title="حذف طريقة الدفع"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMPLETE 16-CLAUSE TERMS & CONDITIONS EDITOR */}
          {activeEditorTab === 'terms' && (
            <div className="space-y-5">
              {/* Terms Section Header with Publish Version Controls */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#0c1424] to-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
                    <span>
                      {draftPlan.id === 'sami_vip'
                        ? '📜 إدارة شروط وأحكام Sami VIP بالكامل (16 بنداً مخصصاً)'
                        : `📜 إدارة شروط وأحكام: ${draftPlan.name}`}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300">
                      الإصدار المنشور: v{draftPlan.termsVersion || 1}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    إمكانية تعديل بنود الشروط كاملة، إضافة بنود جديدة، تغيير الترتيب، وحذف البنود. عند نشر نسخة جديدة، يتم رفع رقم الإصدار تلقائياً ويطلب التطبيق موافقة المشتركين مع الاحتفاظ بسجلات موافقاتهم السابقة.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewTerm(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer hover:bg-amber-300 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة بند جديد</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePublishPlan(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>نشر كإصدار جديد (v{(draftPlan.termsVersion || 1) + 1})</span>
                  </button>
                </div>
              </div>

              {/* Terms Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  عنوان وثيقة الشروط
                </label>
                <input
                  type="text"
                  value={draftPlan.termsTitle || ''}
                  onChange={(e) => updateDraft({ termsTitle: e.target.value })}
                  placeholder="مثال: شروط وأحكام الانضمام لقناة Sami VIP"
                  className="w-full bg-[#0e1627] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 outline-none"
                />
              </div>

              {/* New Term Input Form */}
              {isAddingNewTerm && (
                <div className="p-4 rounded-2xl bg-[#0d1627] border border-amber-500/40 space-y-3">
                  <h5 className="text-xs font-black text-white">إضافة بند جديد إلى الشروط</h5>
                  <input
                    type="text"
                    placeholder="عنوان البند (مثال: شروط وقف الخسارة)"
                    value={newTermTitle}
                    onChange={(e) => setNewTermTitle(e.target.value)}
                    className="w-full bg-[#080d17] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                  />
                  <textarea
                    rows={3}
                    placeholder="نص البند الكامل والملزم بالتفصيل..."
                    value={newTermContent}
                    onChange={(e) => setNewTermContent(e.target.value)}
                    className="w-full bg-[#080d17] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNewTerm(false)}
                      className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleAddTerm}
                      className="px-4 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-black"
                    >
                      حفظ البند في القائمة
                    </button>
                  </div>
                </div>
              )}

              {/* Clauses List */}
              <div className="space-y-3">
                {draftPlan.termsItems && draftPlan.termsItems.length > 0 ? (
                  draftPlan.termsItems.map((term, idx) => {
                    const isEditing = editingTermId === term.id;
                    return (
                      <div
                        key={term.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isEditing
                            ? 'bg-[#0f192d] border-amber-400 shadow-md'
                            : 'bg-[#0b1220] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-400">
                                تعديل البند رقم {term.order || idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingTermId(null)}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                إغلاق التعديل
                              </button>
                            </div>
                            <input
                              type="text"
                              value={term.title}
                              onChange={(e) =>
                                handleUpdateTerm(term.id, { title: e.target.value })
                              }
                              className="w-full bg-[#080d17] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                            />
                            <textarea
                              rows={3}
                              value={term.content}
                              onChange={(e) =>
                                handleUpdateTerm(term.id, { content: e.target.value })
                              }
                              className="w-full bg-[#080d17] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none leading-relaxed"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingTermId(null)}
                              className="px-4 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-black"
                            >
                              تم التعديل
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center font-mono">
                                  {term.order || idx + 1}
                                </span>
                                <h5 className="text-xs font-black text-white">{term.title}</h5>
                                {!term.isEnabled && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                    معطل
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveTerm(idx, 'up')}
                                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-300 disabled:opacity-30 disabled:hover:text-slate-400"
                                  title="تحريك لأعلى"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === draftPlan.termsItems.length - 1}
                                  onClick={() => handleMoveTerm(idx, 'down')}
                                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-300 disabled:opacity-30 disabled:hover:text-slate-400"
                                  title="تحريك لأسفل"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTermId(term.id)}
                                  className="p-1 rounded-lg hover:bg-slate-800 text-amber-300"
                                  title="تعديل البند"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTerm(term.id, term.title)}
                                  className="p-1 rounded-lg hover:bg-slate-800 text-rose-400"
                                  title="حذف البند"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed pr-8">
                              {term.content}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 rounded-2xl bg-[#0b1220] border border-slate-800 text-center text-slate-400 text-xs">
                    لا توجد شروط مخصصة لهذه القناة حالياً. يمكنك إضافة شروط خاصة بها باستخدام زر «إضافة بند جديد».
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeEditorTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-amber-400">
                سجل التعديلات المحفوظة لاشتراك {draftPlan.name}
              </h4>

              {auditLogs.filter((l) => l.subscriptionId === draftPlan.id).length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#0b1220] border border-slate-800 text-center text-xs text-slate-400">
                  لا توجد سجلات تعديل تاريخية سابقة لهذا الاشتراك بعد.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {auditLogs
                    .filter((l) => l.subscriptionId === draftPlan.id)
                    .map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-2xl bg-[#0b1220] border border-slate-800 text-right space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-300">{log.summary}</span>
                          <span className="text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleString('ar-SA')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>المنفذ: {log.changedByName} (ID: {log.changedBy})</span>
                          <span>•</span>
                          <span className="font-mono">نوع التعديل: {log.changeType}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sensitive Action Confirmation Modal */}
      {confirmModalData?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0a1120] border-2 border-amber-400/80 rounded-3xl p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white">{confirmModalData.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmModalData.message}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={confirmModalData.onConfirm}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-xs font-black transition hover:brightness-110 shadow-lg"
              >
                تأكيد المتابعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User-Facing Preview Modal */}
      {previewPlan && (
        <SubscriptionDetailModal
          key={previewPlan.id}
          plan={previewPlan}
          currentUser={currentUser}
          onClose={() => setPreviewPlan(null)}
          onStartInquiry={(msg) => {
            showNotice('تمت محاكاة رسالة الاستفسار بنجاح: ' + msg.substring(0, 40) + '...');
          }}
        />
      )}
    </div>
  );
};
