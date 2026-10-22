import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Shield,
  CheckCircle2,
  Clock,
  Users,
  Copy,
  Check,
  Send,
  AlertCircle,
  FileText,
  Lock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wallet,
  Sparkles,
  HelpCircle,
  Crown,
  Layers,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { SubscriptionPlan } from '../types/subscription';
import {
  recordUserConsent,
  getUserConsent,
  getCachedUserConsent,
  generateInquiryMessage,
  getEffectiveWalletInfo,
  formatAllPaymentDetails,
} from '../services/subscriptions';
import { CurrentUser } from '../data/auth';

interface SubscriptionDetailModalProps {
  plan: SubscriptionPlan;
  currentUser: CurrentUser | null;
  onClose: () => void;
  onStartInquiry?: (message: string) => void;
  onRequestPackageSupport?: (plan: SubscriptionPlan) => void;
}

export const SubscriptionDetailModal: React.FC<SubscriptionDetailModalProps> = ({
  plan,
  currentUser,
  onClose,
  onStartInquiry,
  onRequestPackageSupport,
}) => {
  const isGuest = Boolean(currentUser?.isGuest || currentUser?.role === 'guest');

  // Instant synchronous consent evaluation from local cache (0ms latency, zero delay)
  const initialCachedConsent = useMemo(() => {
    if (currentUser?.id && !isGuest) {
      return getCachedUserConsent(currentUser.id, plan.id);
    }
    return null;
  }, [currentUser?.id, plan.id, isGuest]);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState<boolean>(() => {
    return Boolean(
      initialCachedConsent && initialCachedConsent.termsVersion === plan.termsVersion
    );
  });
  const [userPreviousConsentVersion, setUserPreviousConsentVersion] = useState<number | null>(
    () => initialCachedConsent?.termsVersion ?? null
  );
  const [isSubmittingConsent, setIsSubmittingConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // Determine initial payment method: prioritize plan's primary wallet if configured
  const hasPrimaryWallet = Boolean(plan.walletAddress && plan.walletAddress.trim().length > 0);
  const activeMethods = useMemo(() => {
    return (plan.paymentMethods || []).filter((m) => m.isEnabled);
  }, [plan.paymentMethods]);

  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>(() => {
    if (hasPrimaryWallet) return 'primary';
    return activeMethods[0]?.id || 'primary';
  });

  const [useInstallment, setUseInstallment] = useState(false);
  const [showFullTermsAccordion, setShowFullTermsAccordion] = useState(true);
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  const [termsSearchQuery, setTermsSearchQuery] = useState('');

  // Reset local state cleanly whenever plan.id changes to prevent any state leakage from previous plans
  useEffect(() => {
    const consent = currentUser?.id && !isGuest ? getCachedUserConsent(currentUser.id, plan.id) : null;
    setUserPreviousConsentVersion(consent?.termsVersion ?? null);
    setHasAgreedToTerms(Boolean(consent && consent.termsVersion === plan.termsVersion));
    setSelectedPaymentMethodId(hasPrimaryWallet ? 'primary' : (activeMethods[0]?.id || 'primary'));
    setUseInstallment(false);
    setExpandedTermId(null);
    setTermsSearchQuery('');
    setCopiedKey(null);
    setCopyToast(null);
    setConsentError(null);
  }, [plan.id, plan.termsVersion, currentUser?.id, isGuest, hasPrimaryWallet, activeMethods]);

  // Background refresh of consent in background without blocking initial UI render
  useEffect(() => {
    if (currentUser?.id && !isGuest) {
      getUserConsent(currentUser.id, plan.id).then((consent) => {
        if (consent) {
          setUserPreviousConsentVersion(consent.termsVersion);
          if (consent.termsVersion === plan.termsVersion) {
            setHasAgreedToTerms(true);
          }
        }
      });
    }
  }, [currentUser?.id, plan.id, plan.termsVersion, isGuest]);

  // Copy helper with animated feedback, exact string copying, and error recovery
  const copyToClipboard = async (text: string, key: string, label = 'تم النسخ بنجاح!') => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cleanText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = cleanText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedKey(key);
      setCopyToast(label);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
        setCopyToast((prev) => (prev === label ? null : prev));
      }, 2500);
    } catch (e) {
      console.warn('Copy error:', e);
      setCopyToast('تعذر النسخ التلقائي، يرجى التحديد والنسخ يدوياً');
      setTimeout(() => setCopyToast(null), 3000);
    }
  };

  // Resolve active terms
  const activeTerms = useMemo(() => {
    return (plan.termsItems || []).filter((t) => t.isEnabled);
  }, [plan.termsItems]);

  const filteredTerms = useMemo(() => {
    if (!termsSearchQuery.trim()) return activeTerms;
    const q = termsSearchQuery.trim().toLowerCase();
    return activeTerms.filter(
      (t) => t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)
    );
  }, [activeTerms, termsSearchQuery]);

  const isVip = plan.id === 'sami_vip';
  const requiresConsent = !isGuest && activeTerms.length > 0 && isVip;
  const isPlanClosed = !plan.isActive || plan.status === 'closed';

  // Dynamic effective wallet and payment info based on active selection
  const effectiveWalletInfo = useMemo(() => {
    return getEffectiveWalletInfo(plan, selectedPaymentMethodId);
  }, [plan, selectedPaymentMethodId]);

  // Handle Inquiry / Subscribe Action
  const handleInquiryClick = async () => {
    if (isPlanClosed) return;

    if (isGuest) {
      if (onRequestPackageSupport) {
        onRequestPackageSupport(plan);
      } else {
        const guestNum = currentUser?.guestNumber || 1001;
        onStartInquiry?.(`مرحبًا، أنا ضيف رقم ${guestNum}، وأود الاستفسار والاشتراك في باقة ${plan.name}.`);
      }
      onClose();
      return;
    }

    if (requiresConsent && !hasAgreedToTerms && currentUser) {
      setConsentError('يرجى وضع علامة الموافقة على شروط وأحكام الانضمام الرسمية أدناه للمتابعة.');
      return;
    }

    if (currentUser && requiresConsent && hasAgreedToTerms) {
      setIsSubmittingConsent(true);
      try {
        await recordUserConsent({
          userId: currentUser.id,
          userName: currentUser.displayName,
          subscriptionId: plan.id,
          subscriptionName: plan.name,
          termsVersion: plan.termsVersion,
        });
      } catch (err) {
        console.warn('Could not record consent:', err);
      } finally {
        setIsSubmittingConsent(false);
      }
    }

    const message = generateInquiryMessage(plan, useInstallment, selectedPaymentMethodId);
    onStartInquiry?.(message);
    onClose();
  };

  const handleCopyAllPaymentInfo = () => {
    const fullText = formatAllPaymentDetails(plan, selectedPaymentMethodId, useInstallment);
    copyToClipboard(fullText, 'copy_all', 'تم نسخ جميع بيانات الدفع والمحفظة بنجاح!');
  };

  const handleOpenLink = (url: string) => {
    if (!url || !url.trim()) return;
    const cleanUrl = url.trim();
    const targetUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
      ? cleanUrl
      : `https://${cleanUrl}`;
    try {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = targetUrl;
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#090f1d] border-2 border-amber-500/35 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.2)] overflow-hidden my-auto max-h-[94vh] flex flex-col text-right select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Copy Toast Notification */}
        {copyToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <CheckCircle2 className="w-4 h-4" />
            <span>{copyToast}</span>
          </div>
        )}

        {/* Header with Luxury Golden Banner */}
        <div className="relative px-5 py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/20 via-[#0e172a] to-amber-500/15 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Logo / Badge */}
            {plan.imageUrl ? (
              <img
                src={plan.imageUrl}
                alt={plan.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0">
                {isVip ? <Crown className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white truncate">{plan.name}</h3>
                {isVip && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.6)] shrink-0">
                    👑 VIP حصرية
                  </span>
                )}
                {isPlanClosed ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0">
                    مغلق مؤقتاً
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
                    متاح للاشتراك ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>المعرف الثابت:</span>
                <span className="font-mono text-amber-300 font-bold">{plan.id}</span>
                {plan.depositNetwork && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {plan.depositNetwork}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-right divide-y divide-slate-800/60">
          {/* Section 0: Closed Message Banner if not active */}
          {isPlanClosed && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-start gap-3 text-rose-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">استقبال الاشتراكات الجديدة متوقف حالياً</p>
                <p className="text-rose-300/90 leading-relaxed">
                  {plan.closedMessage || 'الاشتراك مغلق مؤقتاً بقرار من الإدارة. تواصل مع Sami للاستفسار والحجز المسبق.'}
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Financial & Metric Badges Grid (4-cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {/* Price Badge */}
            <div className="p-3 rounded-2xl bg-[#0d1627] border border-amber-500/35 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-amber-400/5 group-hover:bg-amber-400/10 transition" />
              <p className="text-[11px] font-bold text-slate-400">سعر الاشتراك</p>
              <p className="text-xl font-black text-amber-400 mt-1 font-mono">
                {plan.price} {plan.currency}
              </p>
            </div>

            {/* Duration Badge */}
            <div className="p-3 rounded-2xl bg-[#0d1627] border border-slate-700/60 text-center">
              <p className="text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                المدة المعتمدة
              </p>
              <p className="text-sm font-black text-white mt-1.5">
                {plan.durationDays > 0 ? `${plan.durationDays} يوم` : 'مستمر'}
              </p>
            </div>

            {/* Capacity / Seats Badge */}
            <div className="p-3 rounded-2xl bg-[#0d1627] border border-slate-700/60 text-center">
              <p className="text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                المقاعد المتاحة
              </p>
              <p className="text-sm font-black text-white mt-1.5">
                {plan.maxSubscribers > 0
                  ? `${plan.enrolledCount}/${plan.maxSubscribers} مشتركين`
                  : 'مفتوح للجميع'}
              </p>
            </div>

            {/* Installments Badge */}
            <div className="p-3 rounded-2xl bg-[#0d1627] border border-slate-700/60 text-center">
              <p className="text-[11px] font-bold text-slate-400">نظام السداد</p>
              <p className="text-xs font-bold text-slate-200 mt-1.5">
                {plan.allowsInstallments
                  ? `دفعات (بدءاً من ${plan.installmentMinimum}${plan.currency})`
                  : 'دفع كامل مقدماً'}
              </p>
            </div>
          </div>

          {/* Section 2: Descriptions & Features Checklist */}
          <div className="pt-4 space-y-3">
            {/* Short Description */}
            <div className="p-3.5 rounded-2xl bg-[#0c1424] border border-slate-800">
              <h4 className="text-xs font-black text-amber-400 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>نبذة عن الاشتراك</span>
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed">{plan.shortDescription}</p>
            </div>

            {/* Full Description */}
            {plan.fullDescription && (
              <div className="p-3.5 rounded-2xl bg-[#0c1424] border border-slate-800">
                <h4 className="text-xs font-black text-amber-400 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>التفاصيل والشرح الكامل للباقة</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {plan.fullDescription}
                </p>
              </div>
            )}

            {/* Features Checklist */}
            {plan.features && plan.features.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#0c1424] border border-amber-500/20">
                <h4 className="text-xs font-black text-amber-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>أهم مزايا ومحتويات الباقة</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plan.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200"
                    >
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Prominent Wallet, Network & Direct Payment Box */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Wallet className="w-4 h-4" />
                <span>تفاصيل المحفظة وبيانات التحويل المباشر</span>
              </h4>
              <button
                type="button"
                onClick={handleCopyAllPaymentInfo}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="نسخ جميع بيانات الدفع والمحفظة بنقرة واحدة"
              >
                {copiedKey === 'copy_all' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">تم نسخ كامل التفاصيل</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ جميع بيانات الدفع</span>
                  </>
                )}
              </button>
            </div>

            {/* Payment Method Selector Tabs: includes Primary Wallet & all active Payment Methods */}
            {(hasPrimaryWallet || (activeMethods && activeMethods.length > 0)) && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  اختر طريقة الدفع لعرض عنوان المحفظة والشبكة والتعليمات الخاصة بها:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Primary Wallet Tab */}
                  {hasPrimaryWallet && (
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethodId('primary')}
                      className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                        selectedPaymentMethodId === 'primary'
                          ? 'bg-amber-500/25 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                          : 'bg-[#0b1220] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs font-black truncate block">المحفظة الرئيسية</span>
                      </div>
                      <span className="text-[10px] text-amber-300 font-mono mt-1 block truncate">
                        {plan.depositNetwork || 'USDT TRC20'}
                      </span>
                    </button>
                  )}

                  {/* Additional Payment Methods Tabs */}
                  {activeMethods.map((method) => {
                    const isSelected = selectedPaymentMethodId === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/25 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                            : 'bg-[#0b1220] border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xs font-bold truncate block">{method.name}</span>
                        {method.network && (
                          <span className="text-[10px] text-amber-300/80 font-mono mt-1 block truncate">
                            {method.network}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Wallet Details Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-[#0a1120] to-[#070d18] border border-amber-500/40 shadow-inner space-y-3">
              {/* Network Row */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">شبكة التحويل / الإيداع:</span>
                <span className="text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
                  {effectiveWalletInfo.network}
                </span>
              </div>

              {/* Wallet Address Row */}
              {effectiveWalletInfo.address && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">عنوان المحفظة / رقم الحساب:</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(effectiveWalletInfo.address, 'wallet_addr', 'تم نسخ عنوان المحفظة!')
                      }
                      className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedKey === 'wallet_addr' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ العنوان</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2">
                    <code className="text-xs text-amber-300 font-mono break-all select-all dir-ltr text-left flex-1">
                      {effectiveWalletInfo.address}
                    </code>
                  </div>
                </div>
              )}

              {!effectiveWalletInfo.address && (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>تواصل مع القائد Sami عبر المحادثة الخاصة لتأكيد مقعدك واستلام بيانات التحويل المباشرة المعتمدة لبلدك.</span>
                </div>
              )}

              {/* Wallet Link / Payment URL Row if present */}
              {effectiveWalletInfo.linkUrl && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-xs text-slate-300">
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate max-w-[240px] font-mono text-[11px] text-slate-400 dir-ltr text-left">
                      {effectiveWalletInfo.linkUrl}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(effectiveWalletInfo.linkUrl, 'wallet_link', 'تم نسخ رابط المحفظة!')
                      }
                      className="text-xs px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ الرابط</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenLink(effectiveWalletInfo.linkUrl)}
                      className="text-xs px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black flex items-center gap-1 transition cursor-pointer hover:brightness-110"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>فتح الرابط مباشرة ↗</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Specific Payment Method Instructions */}
              {effectiveWalletInfo.instructions && (
                <div className="p-3 rounded-xl bg-[#0e172a] border border-slate-800 text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>تعليمات الدفع والتحويل المعتمدة:</span>
                  </p>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line text-[11.5px]">
                    {effectiveWalletInfo.instructions}
                  </p>
                </div>
              )}

              {/* Installment Choice Option if Plan Allows */}
              {plan.allowsInstallments && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-100">الرغبة في السداد بنظام الدفعات</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      الحد الأدنى للدفعة الأولى: {plan.installmentMinimum} {plan.currency}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useInstallment}
                      onChange={(e) => setUseInstallment(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Owner Notes & Guidance from Sami */}
          {plan.ownerNotes && (
            <div className="pt-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#0c1424] to-amber-500/5 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs">
                    👑
                  </div>
                  <span className="text-xs font-black text-amber-300">
                    توجيهات وملاحظات القائد Sami للمشتركين:
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed pr-8 whitespace-pre-line">
                  {plan.ownerNotes}
                </p>
              </div>
            </div>
          )}

          {/* Section 5: Terms and Conditions Section (Expandable clauses) */}
          {activeTerms.length > 0 && (
            <div className="pt-4 space-y-2">
              <div className="rounded-2xl border border-slate-800 bg-[#0b1220] overflow-hidden">
                <div className="p-3.5 flex items-center justify-between text-right border-b border-slate-800/80 bg-[#0d1627]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black text-white">
                      {plan.termsTitle || 'الشروط والأحكام الرسمية'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono">
                      v{plan.termsVersion} ({activeTerms.length} بند)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFullTermsAccordion(!showFullTermsAccordion)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showFullTermsAccordion ? 'طي البنود' : 'عرض البنود'}</span>
                      {showFullTermsAccordion ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {showFullTermsAccordion && (
                  <div className="p-3 space-y-2 bg-[#080d17]/90 max-h-80 overflow-y-auto">
                    {/* Search inside terms if many */}
                    {activeTerms.length > 5 && (
                      <input
                        type="text"
                        placeholder="🔍 بحث في نصوص الشروط..."
                        value={termsSearchQuery}
                        onChange={(e) => setTermsSearchQuery(e.target.value)}
                        className="w-full bg-[#0d1627] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400 mb-2"
                      />
                    )}

                    {filteredTerms.map((term, index) => {
                      const isExpanded = expandedTermId === term.id;
                      return (
                        <div
                          key={term.id}
                          className="p-2.5 rounded-xl bg-[#0d1627] border border-slate-800 text-right space-y-1 transition hover:border-slate-700"
                        >
                          <div
                            onClick={() => setExpandedTermId(isExpanded ? null : term.id)}
                            className="flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black flex items-center justify-center font-mono shrink-0">
                                {term.order || index + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-200">{term.title}</span>
                            </div>
                            <span className="text-slate-500 text-[11px]">
                              {isExpanded ? 'إخفاء' : 'عرض التفاصيل'}
                            </span>
                          </div>
                          <p
                            className={`text-xs text-slate-300/95 leading-relaxed pt-1 border-t border-slate-800/50 mt-1.5 ${
                              isExpanded ? 'block' : 'line-clamp-2'
                            }`}
                          >
                            {term.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 6: Official Agreement Checkbox for Sami VIP */}
          {requiresConsent && !isPlanClosed && (
            <div className="pt-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasAgreedToTerms}
                    onChange={(e) => {
                      setHasAgreedToTerms(e.target.checked);
                      if (e.target.checked) setConsentError(null);
                    }}
                    className="mt-1 w-4 h-4 text-amber-500 rounded bg-slate-900 border-slate-700 focus:ring-amber-400 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-200 leading-relaxed">
                    أقر بموافقتي الكاملة والتزامي بجميع بنود وشروط وقوانين الانضباط الـ 16 الخاصة بعضوية قناة Sami VIP (الإصدار v{plan.termsVersion}) وإدارة المخاطر.
                  </span>
                </label>

                {consentError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-in shake duration-200">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{consentError}</span>
                  </div>
                )}

                {userPreviousConsentVersion && userPreviousConsentVersion !== plan.termsVersion && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 pr-7 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      تم تحديث شروط القناة من الإصدار v{userPreviousConsentVersion} إلى v{plan.termsVersion}. يرجى الموافقة على النسخة الجديدة للمتابعة.
                    </span>
                  </div>
                )}

                {hasAgreedToTerms && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 pr-7 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>تم تسجيل وتأكيد الموافقة الرسمية بنجاح ✓</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#090f1d] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              إغلاق
            </button>

            <button
              type="button"
              onClick={handleCopyAllPaymentInfo}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="نسخ تقرير الدفع كاملاً"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>مشاركة بيانات الدفع</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isPlanClosed || (!isGuest && requiresConsent && !hasAgreedToTerms) || isSubmittingConsent}
            onClick={handleInquiryClick}
            className={`px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition cursor-pointer shadow-lg ${
              isPlanClosed || (!isGuest && requiresConsent && !hasAgreedToTerms)
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-amber-500/25 active:scale-95'
            }`}
          >
            {isSubmittingConsent ? (
              <span>جاري الحفظ...</span>
            ) : isPlanClosed ? (
              <>
                <Lock className="w-4 h-4" />
                <span>الاشتراك مغلق مؤقتاً</span>
              </>
            ) : isGuest ? (
              <>
                <Send className="w-4 h-4" />
                <span>طلب الاستفسار والاشتراك كضيف 💬</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>طلب الاشتراك وتأكيد التحويل في الخاص 👑</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
