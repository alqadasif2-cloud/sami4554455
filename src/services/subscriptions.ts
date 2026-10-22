import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  SubscriptionPlan,
  SubscriptionPlanId,
  SubscriptionAuditLog,
  SubscriptionConsent,
  TermsItem,
  PaymentMethodItem,
} from '../types/subscription';

const PLANS_COLLECTION = 'subscription_plans';
const AUDIT_LOGS_COLLECTION = 'subscription_audit_logs';
const CONSENTS_COLLECTION = 'subscription_consents';
const LOCAL_PLANS_CACHE_KEY = 'sami_subscription_plans_cache_v2';
const LOCAL_CONSENTS_CACHE_KEY = 'sami_user_consents_cache_v1';

export const DEFAULT_PAYMENT_METHODS: PaymentMethodItem[] = [
  {
    id: 'usdt_trc20',
    name: 'USDT (شبكة TRC20 - Tron)',
    type: 'crypto',
    network: 'Tron (USDT TRC20)',
    addressOrDetails: 'TYAS89kLmnPqRstUvwXyz1234567890ABC',
    linkUrl: 'https://tronscan.org/#/address/TYAS89kLmnPqRstUvwXyz1234567890ABC',
    instructions: 'التحويل عبر شبكة TRC20 مع إرسال صورة التحويل عبر المحادثة الخاصة مع Sami.',
    isEnabled: true,
  },
  {
    id: 'usdt_bep20',
    name: 'USDT (شبكة BEP20 - BSC)',
    type: 'crypto',
    network: 'BNB Smart Chain (BEP20)',
    addressOrDetails: '0x1A2B3C4D5E6F7890123456789ABCDEF012345678',
    linkUrl: 'https://bscscan.com/token/0x55d398326f99059ff775485246999027b3197955?a=0x1A2B3C4D5E6F7890123456789ABCDEF012345678',
    instructions: 'يرجى التأكد من اختيار شبكة BEP20 حصراً وإرسال إيصال التحويل مع هاش المعاملة.',
    isEnabled: true,
  },
  {
    id: 'binance_pay',
    name: 'Binance Pay (بينانس باي)',
    type: 'wallet',
    network: 'Binance Pay ID',
    addressOrDetails: 'Pay ID: 789123456',
    linkUrl: 'https://app.binance.com/qr/cplnk?id=789123456',
    instructions: 'تحويل مباشر وسريع بدون رسوم شبكة عبر معرف بينانس باي الرسمي.',
    isEnabled: true,
  },
  {
    id: 'bank_transfer',
    name: 'تحويل بنكي / صرافة محلية',
    type: 'bank',
    network: 'حوالات مصرفية معتمدة',
    addressOrDetails: 'يتم تزويد المشترك بالحساب البنكي أو مكتب الصرافة بعد التواصل المباشر',
    instructions: 'تواصل مع Sami عبر المحادثة الخاصة لمعرفة بيانات الحساب البنكي المتاح لبلدك.',
    isEnabled: true,
  },
];

export const INITIAL_SAMI_VIP_TERMS: TermsItem[] = [
  {
    id: 'term_1',
    order: 1,
    title: 'عنوان الشروط',
    content: 'وثيقة الشروط والأحكام الرسمية والملزمة لعضوية قناة Sami VIP للتداول الاحترافي والتوصيات الخاصة.',
    isEnabled: true,
  },
  {
    id: 'term_2',
    order: 2,
    title: 'معلومات الاشتراك',
    content: 'قناة Sami VIP هي قناة حصرية لنخبة المتداولين، تهدف إلى تقديم صفقات مدروسة بدقة متناهية وإرشادات مباشرة من القائد Sami مع متابعة حية ومستمرة.',
    isEnabled: true,
  },
  {
    id: 'term_3',
    order: 3,
    title: 'قيمة الاشتراك',
    content: 'قيمة الاشتراك الأسبوعي محددة بـ 200$ (مائتي دولار أمريكي) تدفع مقدماً ولا تشمل أي رسوم تحويل خاصة بشبكات البلوكتشين أو البنوك.',
    isEnabled: true,
  },
  {
    id: 'term_4',
    order: 4,
    title: 'مدة الاشتراك الأساسية',
    content: 'مدة الاشتراك الأساسية هي 7 أيام (أسبوع كامل)، تبدأ رسمياً من تاريخ تأكيد الدفع وإضافة المشترك إلى القناة الخاصة وتجدد برغبة الطرفين.',
    isEnabled: true,
  },
  {
    id: 'term_5',
    order: 5,
    title: 'شروط الاشتراك الأساسية',
    content: 'يشترط امتلاك حساب تداول حقيقي وموثق لدى وسيط مرخص، مع توفر رأس مال كافٍ لتطبيق قواعد إدارة المخاطر بدقة دون مجازفة غير محسوبة.',
    isEnabled: true,
  },
  {
    id: 'term_6',
    order: 6,
    title: 'شروط الالتزام بالتوصيات',
    content: 'الالتزام التام بنقاط الدخول، مستويات وقف الخسارة (Stop Loss)، ومستويات جني الأرباح (Take Profit) المحددة في كل صفقة فور نشرها دون أي تأخير أو تغيير شخصي.',
    isEnabled: true,
  },
  {
    id: 'term_7',
    order: 7,
    title: 'الحد الأقصى لحجم الصفقات',
    content: 'يُمنع تجاوز حجم العقد (Lot Size) المحدد لكل صفقة وفق جدول إدارة رأس المال المعتمد (بما لا يتعدى 1% إلى 2% كحد أقصى للمخاطرة من إجمالي المحفظة).',
    isEnabled: true,
  },
  {
    id: 'term_8',
    order: 8,
    title: 'شروط تأمين الصفقة عند تحقيق ربح +10$',
    content: 'عند وصول الصفقة إلى ربح عائم مقداره +10$ أو ما يعادل الهدف الأول، يجب فوراً نقل وقف الخسارة إلى نقطة الدخول (Breakeven) لحماية رأس المال وحجز جزء من الأرباح.',
    isEnabled: true,
  },
  {
    id: 'term_9',
    order: 9,
    title: 'أوقات التوصيات',
    content: 'تُنشر التوصيات خلال جلسات التداول العالمية النشطة (جلسة لندن وجلسة نيويورك) وحسب توفر الفرص الفنية الآمنة المكتملة الشروط فقط دون تسرع.',
    isEnabled: true,
  },
  {
    id: 'term_10',
    order: 10,
    title: 'شروط مراجعة الخسائر وطلبات التعويض',
    content: 'تتم مراجعة أي خسارة ناتجة عن التوصية للتأكد من التزام المشترك بالدخول والوقف. لا تُقبل أي مطالبات مراجعة أو تعويض في حال خالف المشترك حجم العقد أو دخل متأخراً.',
    isEnabled: true,
  },
  {
    id: 'term_11',
    order: 11,
    title: 'مدة الاشتراك والاستمرار',
    content: 'يستمر الاشتراك لمدة 7 أيام قابلة للتجديد بموافقة الإدارة، مع الاحتفاظ بحق إنهاء الاشتراك لأي عضو لا يلتزم بالقواعد العامة وقوانين الانضباط.',
    isEnabled: true,
  },
  {
    id: 'term_12',
    order: 12,
    title: 'قواعد المخالفات وزيادة حجم الصفقات',
    content: 'يُحظر منعاً باتاً مضاعفة حجم اللوت عند التعرض لخسارة (نظام المارتينجيل) أو الدخول بصفقات انتقامية؛ ويُعد ذلك خرقاً جوهرياً لشروط العضوية.',
    isEnabled: true,
  },
  {
    id: 'term_13',
    order: 13,
    title: 'شروط وقف الخسارة والإنذارات',
    content: 'إلغاء أمر وقف الخسارة أو تحريكه إلى الخلف يُعرّض العضو لإنذار رسمي فوري. الحصول على 3 إنذارات يترتب عليه الإلغاء الفوري للاشتراك والطرد من القناة.',
    isEnabled: true,
  },
  {
    id: 'term_14',
    order: 14,
    title: 'شروط الانسحاب والاسترداد',
    content: 'رسوم الاشتراك غير قابلة للاسترداد بعد تسليم رابط القناة وتفعيل الاشتراك وبدء استقبال الصفقات والتحليلات الخاصة.',
    isEnabled: true,
  },
  {
    id: 'term_15',
    order: 15,
    title: 'الحد الأقصى للمشتركين',
    content: 'الحد الأقصى للمشتركين في قناة Sami VIP محدد بـ 10 مشتركين أسبوعياً فقط لضمان التركيز الكامل والمتابعة الحثيثة لكل متداول بشكل فردي.',
    isEnabled: true,
  },
  {
    id: 'term_16',
    order: 16,
    title: 'التنبيهات والإقرارات النهائية',
    content: 'التداول في الأسواق المالية ينطوي على مخاطر عالية. يقر المشترك بأنه وحده المسؤول عن اتخاذ قراراته الاستثمارية وإدارة حسابه، وأن التوصيات تقدم كدليل تحليلي مدروس.',
    isEnabled: true,
  },
];

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'journey_3000',
    name: 'قناة الرحلة إلى 3000$',
    price: 150,
    currency: '$',
    shortDescription: 'رحلة تداول مدروسة ومحسوبة بهدف مضاعفة رأس المال تدريجياً والوصول إلى 3000$ بأمان.',
    fullDescription: 'قناة تداول خاصة تهدف لمتابعة صفقات دقيقة ومدروسة مع خطة إدارة مخاطر صارمة بهدف الوصول بحساب التداول إلى 3000$. تتضمن تحديثات مستمرة وإرشادات لإدارة رأس المال وتحليلات فنية مباشرة مع القائد Sami.',
    depositNetwork: 'Tron (USDT TRC20)',
    walletAddress: 'TYAS89kLmnPqRstUvwXyz1234567890ABC',
    walletLink: 'https://tronscan.org/#/address/TYAS89kLmnPqRstUvwXyz1234567890ABC',
    features: [
      'توصيات يومية دقيقة بهدف الوصول برأس المال إلى 3000$',
      'تحديد مستويات وقف الخسارة ونقاط الدخول وجني الأرباح بدقة',
      'إرشادات صارمة لإدارة رأس المال وتحديد حجم العقد المناسب',
      'متابعة حية ومستمرة لحركة السوق مع Sami شخصياً',
    ],
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    allowsInstallments: true,
    installmentMinimum: 50,
    durationDays: 30,
    maxSubscribers: 50,
    enrolledCount: 18,
    isActive: true,
    status: 'active',
    closedMessage: 'الاشتراك مغلق مؤقتاً لاكتمال مقاعد الدفعة الحالية. سيتم فتح باب التسجيل قريباً.',
    termsTitle: 'شروط قناة الرحلة إلى 3000$',
    termsItems: [
      {
        id: 'j3k_1',
        order: 1,
        title: 'الالتزام برأس المال',
        content: 'يجب بدء الرحلة برأس مال لا يقل عن 200$ ولا يزيد عن 1000$ لضمان دقة نسب العائد.',
        isEnabled: true,
      },
      {
        id: 'j3k_2',
        order: 2,
        title: 'تنفيذ الصفقات اليومية',
        content: 'متابعة المحطات التداولية وتنفيذ الصفقات المسجلة وفق الخطة المحددة دون زيادة المخاطرة.',
        isEnabled: true,
      },
      {
        id: 'j3k_3',
        order: 3,
        title: 'نظام الدفعات',
        content: 'يمكن دفع الاشتراك على دفعتين كحد أقصى بحد أدنى 50$ للدفعة الأولى قبل الدخول.',
        isEnabled: true,
      },
    ],
    termsVersion: 1,
    paymentInstructions: 'يمكنك التحويل عبر USDT (شبكة TRC20 أو BEP20) أو بينانس باي المعتمد. يرجى إرسال لقطة الشاشة أو هاش المعاملة في الخاص مع Sami لتأكيد اشتراكك فوراً.',
    ownerNotes: 'رحلة متدرجة ومدروسة تناسب الحسابات الصغيرة والمتوسطة الباحثة عن الانضباط وتحقيق هدف 3000$ بأمان.',
    publishedAt: Date.now(),
    updatedAt: Date.now(),
    updatedBy: 1,
  },
  {
    id: 'journey_5000',
    name: 'قناة الرحلة إلى 5000$',
    price: 250,
    currency: '$',
    shortDescription: 'المرحلة المتقدمة من رحلة النمو التراكمي للوصول برأس المال إلى 5000$ باستراتيجيات متقدمة.',
    fullDescription: 'قناة مخصصة للمتداولين الساعين لتحقيق نمو مستقر ومدروس نحو هدف 5000$. تركيز كامل على الصفقات المتأرجحة والموجهة وإدارة الصفقات الرابحة وحماية الأرباح المحققة مع Sami.',
    depositNetwork: 'Tron (USDT TRC20)',
    walletAddress: 'TYAS89kLmnPqRstUvwXyz1234567890ABC',
    walletLink: 'https://tronscan.org/#/address/TYAS89kLmnPqRstUvwXyz1234567890ABC',
    features: [
      'استراتيجيات متقدمة لإدارة الصفقات الرابحة ونمو الحساب إلى 5000$',
      'تحديد صفقات Swing متوسطة المدى بأعلى نسب نجاح',
      'حماية الأرباح ونقل الوقف لنقطة الدخول عند تحقيق الأهداف',
      'إمكانية الاستفادة من نظام الدفعات المرن (بدءاً من 100$)',
    ],
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    allowsInstallments: true,
    installmentMinimum: 100,
    durationDays: 45,
    maxSubscribers: 40,
    enrolledCount: 14,
    isActive: true,
    status: 'active',
    closedMessage: 'استقبال المشتركين الجدد متوقف حالياً استعداداً لانطلاق الجولة القادمة.',
    termsTitle: 'شروط قناة الرحلة إلى 5000$',
    termsItems: [
      {
        id: 'j5k_1',
        order: 1,
        title: 'المستوى الفني المطلوب',
        content: 'معرفة جيدة بمفاهيم الشموع اليابانية ومستويات الدعم والمقاومة وطريقة إدارة الصفقات المفتوحة.',
        isEnabled: true,
      },
      {
        id: 'j5k_2',
        order: 2,
        title: 'الحد الأدنى للدفعة',
        content: 'في حال استخدام نظام الدفعات، فإن الحد الأدنى للدفع المبدئي هو 100$ وتستكمل بقية القيمة خلال أسبوعين.',
        isEnabled: true,
      },
    ],
    termsVersion: 1,
    paymentInstructions: 'التحويل متاح عبر شبكة TRC20 أو BEP20 أو بينانس باي. بعد التحويل يرجى مشاركة إيصال الإيداع مع Sami لتفعيل عضويتك.',
    ownerNotes: 'استراتيجيات متوسطة المدى وصفقات دقيقة ذات نسبة نجاح عالية للوصول إلى هدف 5000$.',
    publishedAt: Date.now(),
    updatedAt: Date.now(),
    updatedBy: 1,
  },
  {
    id: 'journey_10000',
    name: 'قناة الرحلة إلى 10,000$',
    price: 400,
    currency: '$',
    shortDescription: 'تحدي النخبة الاستثماري للوصول إلى 10,000$ بإشراف ومتابعة حثيثة من القائد Sami.',
    fullDescription: 'أعلى مستويات التحدي والتداول المنضبط. ترتكز القناة على استهداف تحركات سعرية كبرى بنسب عائد إلى مخاطرة مرتفعة مع تدريب على التحكم النفسي وإدارة الحسابات الكبيرة.',
    depositNetwork: 'Tron (USDT TRC20)',
    walletAddress: 'TYAS89kLmnPqRstUvwXyz1234567890ABC',
    walletLink: 'https://tronscan.org/#/address/TYAS89kLmnPqRstUvwXyz1234567890ABC',
    features: [
      'تحدي النخبة الاستثماري الأكبر للوصول بالحساب إلى 10,000$',
      'اقتناص موجات سعرية كبرى بنسب عائد إلى مخاطرة استثنائية (1:3 وأكثر)',
      'توجيه نفسي مكثف للسيطرة على المشاعر وحفظ الأرباح الكبيرة',
      'متابعة حصرية مباشرة مع Sami طوال فترة الـ 60 يوماً',
    ],
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    allowsInstallments: true,
    installmentMinimum: 100,
    durationDays: 60,
    maxSubscribers: 30,
    enrolledCount: 9,
    isActive: true,
    status: 'active',
    closedMessage: 'اكتملت المقاعد المخصصة لهذه الرحلة الاستثنائية. تواصل مع Sami للحجز في الدفعة القادمة.',
    termsTitle: 'شروط قناة الرحلة إلى 10,000$',
    termsItems: [
      {
        id: 'j10k_1',
        order: 1,
        title: 'الانضباط والتحكم النفسي',
        content: 'الالتزام الصارم بقواعد وقف الخسارة وعدم التردد في إغلاق الصفقات أو حجز الأرباح عند الإشارة.',
        isEnabled: true,
      },
      {
        id: 'j10k_2',
        order: 2,
        title: 'نظام الدفعات المرن',
        content: 'متاح تقسيط الاشتراك بدفعة أولى 100$ كحد أدنى، وتستكمل بقية القيمة على دفعات مجدولة.',
        isEnabled: true,
      },
    ],
    termsVersion: 1,
    paymentInstructions: 'يرجى مراجعة Sami في الخاص لتأكيد توفر المقعد ورقم المعاملة الخاص بالاشتراك قبل إجراء التحويل.',
    ownerNotes: 'رحلة كبار المتداولين المحترفين بهدف تنمية رأس المال إلى 10,000$ بأعلى معايير الانضباط.',
    publishedAt: Date.now(),
    updatedAt: Date.now(),
    updatedBy: 1,
  },
  {
    id: 'sami_vip',
    name: 'قناة Sami VIP',
    price: 200,
    currency: '$',
    shortDescription: 'القناة الخاصة الحصرية للنخبة مع توصيات يومية حية وتحليلات مباشرة وشروط انضباط صارمة.',
    fullDescription: 'قناة Sami VIP توفر صفقات استثنائية بدقة عالية ومتابعة لحظية مع Sami شخصياً. مقاعد محدودة أسبوعياً (10 مشتركين فقط) لضمان جودة المتابعة الفردية والانضباط التام.',
    depositNetwork: 'BNB Smart Chain (BEP20)',
    walletAddress: '0x1A2B3C4D5E6F7890123456789ABCDEF012345678',
    walletLink: 'https://bscscan.com/token/0x55d398326f99059ff775485246999027b3197955?a=0x1A2B3C4D5E6F7890123456789ABCDEF012345678',
    features: [
      'القناة الملكية الحصرية لنخبة المتداولين مع Sami شخصياً',
      'توصيات خاصة بأعلى درجات الدقة والفرص المكتملة الشروط فقط',
      'متابعة فردية وتأمين الصفقات فور تحقيق ربح +10$',
      'الحد الأقصى 10 مشتركين أسبوعياً لضمان التركيز والخصوصية التامة',
      'وثيقة الشروط الـ 16 الإلزامية لضمان الانضباط وحماية رأس المال',
    ],
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    allowsInstallments: false,
    installmentMinimum: 200,
    durationDays: 7,
    maxSubscribers: 10,
    enrolledCount: 7,
    isActive: true,
    status: 'active',
    closedMessage: 'مقاعد هذا الأسبوع مكتملة بالكامل (10/10). يمكنك حجز مقعدك للأسبوع المقبل.',
    termsTitle: 'شروط وأحكام الانضمام لقناة Sami VIP',
    termsItems: INITIAL_SAMI_VIP_TERMS,
    termsVersion: 1,
    paymentInstructions: 'الدفع الكامل مقدماً بقيمة 200$ أسبوعياً عبر USDT BEP20 أو بينانس باي. لا يتم تفعيل القناة إلا بعد الموافقة الرسمية على وثيقة الشروط الـ 16.',
    ownerNotes: 'القناة الأهم والأعلى قيمة؛ تخضع للرقابة الصارمة وشروط الالتزام الـ 16 لحماية رأس المال.',
    publishedAt: Date.now(),
    updatedAt: Date.now(),
    updatedBy: 1,
  },
  {
    id: 'sami_scalping',
    name: 'قناة Sami Scalping',
    price: 180,
    currency: '$',
    shortDescription: 'صفقات سريعة وخاطفة على الفريمات الزمنية الصغيرة بدقة عالية وسرعة في جني الأرباح.',
    fullDescription: 'قناة مخصصة لعشاق التداول اللحظي السريع (Scalping) على العملات والمؤشرات والذهب. توصيات سريعة بنقاط دخول وخروج واضحة ومحددة تناسب أوقات السيولة المرتفعة.',
    depositNetwork: 'Tron (USDT TRC20)',
    walletAddress: 'TYAS89kLmnPqRstUvwXyz1234567890ABC',
    walletLink: 'https://tronscan.org/#/address/TYAS89kLmnPqRstUvwXyz1234567890ABC',
    features: [
      'صفقات خاطفة وسريعة على فريمات الدقيقة و 5 دقائق',
      'نقاط دخول وخروج محددة بالمللي لاقتناص قمم وقيعان السيولة',
      'أوامر وقف خسارة ضيقة جداً للحد من أي ارتداد مفاجئ',
      'إشارات مكثفة خلال فترات افتتاح بورصة لندن وبورصة نيويورك',
    ],
    paymentMethods: DEFAULT_PAYMENT_METHODS,
    allowsInstallments: false,
    installmentMinimum: 180,
    durationDays: 14,
    maxSubscribers: 25,
    enrolledCount: 11,
    isActive: true,
    status: 'active',
    closedMessage: 'استقبال طلبات الاشتراك متوقف مؤقتاً لتحديث مؤشرات واستراتيجيات الاسكالبينج.',
    termsTitle: 'شروط قناة Sami Scalping',
    termsItems: [
      {
        id: 'scalp_1',
        order: 1,
        title: 'سرعة التنفيذ',
        content: 'صفقات الاسكالبينج سريعة وخاطفة، تتطلب التواجد الفوري عند إرسال الإشارة وسرعة إدخال الأوامر.',
        isEnabled: true,
      },
      {
        id: 'scalp_2',
        order: 2,
        title: 'فروقات الأسعار (Spread)',
        content: 'يجب استخدام حساب تداول بفروقات أسعار منخفضة (Raw / ECN) لتفادي تأثير السبريد على نتائج الصفقات.',
        isEnabled: true,
      },
    ],
    termsVersion: 1,
    paymentInstructions: 'التحويل عبر USDT (TRC20 أو BEP20) ثم إرسال المعاملة إلى Sami للتحقق وإضافتك للقناة فوراً.',
    ownerNotes: 'صفقات ذات أهداف سريعة وأوامر وقف دقيقة جداً؛ تتطلب سرعة في إدخال الأوامر عبر المنصة.',
    publishedAt: Date.now(),
    updatedAt: Date.now(),
    updatedBy: 1,
  },
];

// Helper to safely parse plan documents with all fields
function parseSubscriptionPlanDoc(data: Record<string, unknown>, id: string): SubscriptionPlan {
  const fallback = DEFAULT_SUBSCRIPTION_PLANS.find((p) => p.id === id) || DEFAULT_SUBSCRIPTION_PLANS[0];
  return {
    id: String(data.id || id),
    name: String(data.name !== undefined && data.name !== null ? data.name : fallback.name),
    price: typeof data.price === 'number' && !isNaN(data.price) ? data.price : fallback.price,
    currency: String(data.currency || fallback.currency || '$'),
    shortDescription: String(
      data.shortDescription !== undefined && data.shortDescription !== null
        ? data.shortDescription
        : fallback.shortDescription
    ),
    fullDescription: String(
      data.fullDescription !== undefined && data.fullDescription !== null
        ? data.fullDescription
        : fallback.fullDescription
    ),
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : fallback.imageUrl,
    walletAddress:
      typeof data.walletAddress === 'string'
        ? data.walletAddress
        : (fallback.walletAddress || ''),
    walletLink:
      typeof data.walletLink === 'string'
        ? data.walletLink
        : (fallback.walletLink || ''),
    depositNetwork:
      typeof data.depositNetwork === 'string'
        ? data.depositNetwork
        : (fallback.depositNetwork || ''),
    features: Array.isArray(data.features)
      ? (data.features as string[])
      : fallback.features,
    paymentMethods: Array.isArray(data.paymentMethods)
      ? (data.paymentMethods as PaymentMethodItem[]).map((m, idx) => ({
          id: String(m.id || `pm_${idx}`),
          name: String(m.name || 'طريقة دفع'),
          type: (m.type as PaymentMethodItem['type']) || 'crypto',
          network: typeof m.network === 'string' ? m.network : undefined,
          addressOrDetails: typeof m.addressOrDetails === 'string' ? m.addressOrDetails : undefined,
          linkUrl: typeof m.linkUrl === 'string' ? m.linkUrl : undefined,
          instructions: typeof m.instructions === 'string' ? m.instructions : undefined,
          qrCodeUrl: typeof m.qrCodeUrl === 'string' ? m.qrCodeUrl : undefined,
          isEnabled: typeof m.isEnabled === 'boolean' ? m.isEnabled : true,
        }))
      : fallback.paymentMethods,
    allowsInstallments:
      typeof data.allowsInstallments === 'boolean'
        ? data.allowsInstallments
        : fallback.allowsInstallments,
    installmentMinimum:
      typeof data.installmentMinimum === 'number'
        ? data.installmentMinimum
        : fallback.installmentMinimum,
    durationDays:
      typeof data.durationDays === 'number' ? data.durationDays : fallback.durationDays,
    maxSubscribers:
      typeof data.maxSubscribers === 'number' ? data.maxSubscribers : fallback.maxSubscribers,
    enrolledCount:
      typeof data.enrolledCount === 'number' ? data.enrolledCount : fallback.enrolledCount,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : fallback.isActive,
    status:
      data.status === 'closed' || data.status === 'paused' || data.status === 'active'
        ? data.status
        : fallback.status,
    closedMessage:
      typeof data.closedMessage === 'string' ? data.closedMessage : fallback.closedMessage,
    termsTitle:
      typeof data.termsTitle === 'string' ? data.termsTitle : fallback.termsTitle,
    termsItems: Array.isArray(data.termsItems)
      ? (data.termsItems as TermsItem[])
      : fallback.termsItems,
    termsFullText:
      typeof data.termsFullText === 'string' ? data.termsFullText : fallback.termsFullText,
    termsVersion:
      typeof data.termsVersion === 'number' ? data.termsVersion : fallback.termsVersion,
    paymentInstructions:
      typeof data.paymentInstructions === 'string'
        ? data.paymentInstructions
        : (fallback.paymentInstructions || ''),
    ownerNotes:
      typeof data.ownerNotes === 'string'
        ? data.ownerNotes
        : (fallback.ownerNotes || ''),
    publishedAt:
      typeof data.publishedAt === 'number' ? data.publishedAt : fallback.publishedAt,
    updatedAt:
      typeof data.updatedAt === 'number' ? data.updatedAt : fallback.updatedAt,
    updatedBy:
      typeof data.updatedBy === 'number' ? data.updatedBy : 1,
  };
}

// Ultra-fast 0ms single plan retrieval from local memory cache
export function getSubscriptionPlanById(planId: string): SubscriptionPlan | null {
  const plans = getInitialPlansFromCache();
  return plans.find((p) => p.id === planId) || null;
}

// Shared in-memory multicast cache to prevent duplicate Firestore listeners and redundant reads
let memoryCachedPlans: SubscriptionPlan[] | null = null;
const plansSubscribers = new Set<(plans: SubscriptionPlan[]) => void>();
let globalPlansUnsub: (() => void) | null = null;

export function getInitialPlansFromCache(): SubscriptionPlan[] {
  if (memoryCachedPlans) return memoryCachedPlans;
  try {
    const raw = localStorage.getItem(LOCAL_PLANS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCachedPlans = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  memoryCachedPlans = DEFAULT_SUBSCRIPTION_PLANS;
  return DEFAULT_SUBSCRIPTION_PLANS;
}

/**
 * Subscribes to real-time subscription plans updates from Firestore.
 * Uses a single shared multiplexed listener and in-memory cache to guarantee maximum speed,
 * instant 0ms initial delivery, and zero redundant queries.
 */
export function subscribeToSubscriptionPlans(
  callback: (plans: SubscriptionPlan[]) => void
): () => void {
  // 1. Immediately deliver latest cached plans synchronously
  const currentPlans = getInitialPlansFromCache();
  callback(currentPlans);

  // 2. Register subscriber callback
  plansSubscribers.add(callback);

  // 3. Start shared Firestore listener if not already active
  if (!globalPlansUnsub) {
    try {
      const q = collection(db, PLANS_COLLECTION);
      globalPlansUnsub = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            memoryCachedPlans = DEFAULT_SUBSCRIPTION_PLANS;
            plansSubscribers.forEach((cb) => cb(DEFAULT_SUBSCRIPTION_PLANS));
            return;
          }

          const map = new Map<string, SubscriptionPlan>();
          for (const def of DEFAULT_SUBSCRIPTION_PLANS) {
            map.set(def.id, def);
          }

          snapshot.forEach((docSnap) => {
            const parsed = parseSubscriptionPlanDoc(docSnap.data(), docSnap.id);
            map.set(parsed.id, parsed);
          });

          // Preserve default plans order first, then append any custom plans added to Firestore
          const allPlans: SubscriptionPlan[] = [];
          const processedIds = new Set<string>();
          for (const def of DEFAULT_SUBSCRIPTION_PLANS) {
            allPlans.push(map.get(def.id) || def);
            processedIds.add(def.id);
          }
          map.forEach((plan, planId) => {
            if (!processedIds.has(planId)) {
              allPlans.push(plan);
            }
          });

          memoryCachedPlans = allPlans;
          try {
            localStorage.setItem(LOCAL_PLANS_CACHE_KEY, JSON.stringify(allPlans));
          } catch {
            // Ignore
          }

          plansSubscribers.forEach((cb) => cb(allPlans));
        },
        (error) => {
          console.warn('Subscription plans listener fallback:', error);
          if (memoryCachedPlans) {
            plansSubscribers.forEach((cb) => cb(memoryCachedPlans!));
          }
        }
      );
    } catch (err) {
      console.warn('Error setting up plans listener:', err);
    }
  }

  return () => {
    plansSubscribers.delete(callback);
    if (plansSubscribers.size === 0 && globalPlansUnsub) {
      globalPlansUnsub();
      globalPlansUnsub = null;
    }
  };
}

/**
 * Saves modifications to a subscription plan in Firestore.
 * Strictly checks that the caller is Owner Sami (id: 1).
 * Creates an immutable audit trail entry in `subscription_audit_logs`.
 */
export async function saveSubscriptionPlan(
  plan: SubscriptionPlan,
  ownerUser: { id: number; displayName: string },
  changeType: SubscriptionAuditLog['changeType'] = 'details_update',
  summary = 'تحديث بيانات الاشتراك بواسطة المالك Sami'
): Promise<void> {
  if (ownerUser.id !== 1) {
    throw new Error('غير مصرح لك بتعديل الاشتراكات. هذه الميزة مخصصة للمالك SAMI وحده.');
  }

  // Validation
  if (!plan.name || plan.name.trim().length === 0) {
    throw new Error('اسم الاشتراك مطلوب ولا يمكن تركه فارغاً.');
  }
  if (typeof plan.price !== 'number' || isNaN(plan.price) || plan.price < 0) {
    throw new Error('سعر الاشتراك يجب أن يكون رقماً صحيحاً أو موجباً.');
  }
  if (!plan.currency || plan.currency.trim().length === 0) {
    plan.currency = '$';
  }

  const now = Date.now();
  const updatedPlan: SubscriptionPlan = {
    ...plan,
    price: Number(plan.price),
    installmentMinimum: Number(plan.installmentMinimum || 0),
    durationDays: Number(plan.durationDays || 7),
    maxSubscribers: Number(plan.maxSubscribers || 10),
    termsVersion: Number(plan.termsVersion || 1),
    updatedAt: now,
    updatedBy: 1,
  };

  // 1. Instantly update in-memory cache and localStorage for 0ms UI responsiveness
  if (memoryCachedPlans) {
    const nextList = memoryCachedPlans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p));
    if (!nextList.some((p) => p.id === updatedPlan.id)) {
      nextList.push(updatedPlan);
    }
    memoryCachedPlans = nextList;
    try {
      localStorage.setItem(LOCAL_PLANS_CACHE_KEY, JSON.stringify(nextList));
    } catch {
      // Ignore
    }
    plansSubscribers.forEach((cb) => cb(nextList));
  }

  // 2. Save plan to Firestore
  const planDocRef = doc(db, PLANS_COLLECTION, plan.id);
  await setDoc(planDocRef, updatedPlan, { merge: true });

  // 3. Add audit log
  try {
    const auditLogId = `audit_${plan.id}_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const auditRef = doc(db, AUDIT_LOGS_COLLECTION, auditLogId);
    const auditData: SubscriptionAuditLog = {
      id: auditLogId,
      subscriptionId: plan.id,
      subscriptionName: plan.name,
      changeType,
      summary,
      newData: {
        price: updatedPlan.price,
        currency: updatedPlan.currency,
        name: updatedPlan.name,
        isActive: updatedPlan.isActive,
        status: updatedPlan.status,
        durationDays: updatedPlan.durationDays,
        maxSubscribers: updatedPlan.maxSubscribers,
        termsVersion: updatedPlan.termsVersion,
        walletAddress: updatedPlan.walletAddress,
        depositNetwork: updatedPlan.depositNetwork,
        walletLink: updatedPlan.walletLink,
      },
      changedBy: 1,
      changedByName: ownerUser.displayName || 'Sami',
      timestamp: now,
    };
    await setDoc(auditRef, auditData);
  } catch (auditErr) {
    console.warn('Failed to record audit log:', auditErr);
  }
}

/**
 * Publishes a subscription plan.
 * Optionally increments the terms version if terms were updated.
 */
export async function publishSubscriptionPlan(
  plan: SubscriptionPlan,
  ownerUser: { id: number; displayName: string },
  incrementTerms = false
): Promise<SubscriptionPlan> {
  const nextTermsVersion = incrementTerms ? (plan.termsVersion || 1) + 1 : plan.termsVersion || 1;
  const publishedPlan: SubscriptionPlan = {
    ...plan,
    termsVersion: nextTermsVersion,
    publishedAt: Date.now(),
  };

  await saveSubscriptionPlan(
    publishedPlan,
    ownerUser,
    incrementTerms ? 'terms_update' : 'full_publish',
    incrementTerms
      ? `نشر نسخة شروط جديدة رقم (v${nextTermsVersion}) لاشتراك "${plan.name}"`
      : `نشر التعديلات الكاملة لاشتراك "${plan.name}"`
  );

  return publishedPlan;
}

/**
 * Subscribes to real-time audit logs of subscription modifications.
 */
export function subscribeToSubscriptionAuditLogs(
  callback: (logs: SubscriptionAuditLog[]) => void,
  subscriptionId?: string
): () => void {
  try {
    const q = query(collection(db, AUDIT_LOGS_COLLECTION), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: SubscriptionAuditLog[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const logItem: SubscriptionAuditLog = {
            id: String(data.id || d.id),
            subscriptionId: String(data.subscriptionId || ''),
            subscriptionName: String(data.subscriptionName || ''),
            changeType: (data.changeType as SubscriptionAuditLog['changeType']) || 'details_update',
            summary: String(data.summary || ''),
            previousData: data.previousData as Partial<SubscriptionPlan> | undefined,
            newData: data.newData as Partial<SubscriptionPlan> | undefined,
            changedBy: Number(data.changedBy || 1),
            changedByName: String(data.changedByName || 'Sami'),
            timestamp: Number(data.timestamp || Date.now()),
          };
          if (!subscriptionId || logItem.subscriptionId === subscriptionId) {
            list.push(logItem);
          }
        });
        callback(list);
      },
      (err) => {
        console.warn('Audit logs listener fallback:', err);
        callback([]);
      }
    );
  } catch (err) {
    console.warn('Audit logs setup error:', err);
    return () => {};
  }
}

// In-memory cache for ultra-fast instant 0ms user consent lookups
const consentsMemoryCache = new Map<string, SubscriptionConsent>();

function getLocalConsentsMap(): Record<string, SubscriptionConsent> {
  try {
    const raw = localStorage.getItem(LOCAL_CONSENTS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCachedUserConsent(
  userId: number,
  subscriptionId: string
): SubscriptionConsent | null {
  const consentId = `consent_${userId}_${subscriptionId}`;
  if (consentsMemoryCache.has(consentId)) {
    return consentsMemoryCache.get(consentId)!;
  }
  const localMap = getLocalConsentsMap();
  if (localMap[consentId]) {
    consentsMemoryCache.set(consentId, localMap[consentId]);
    return localMap[consentId];
  }
  return null;
}

/**
 * Records user consent to a specific terms version.
 */
export async function recordUserConsent(consent: {
  userId: number;
  userName: string;
  subscriptionId: string;
  subscriptionName: string;
  termsVersion: number;
}): Promise<void> {
  const now = Date.now();
  const consentId = `consent_${consent.userId}_${consent.subscriptionId}`;
  const data: SubscriptionConsent = {
    id: consentId,
    userId: consent.userId,
    userName: consent.userName,
    subscriptionId: consent.subscriptionId,
    subscriptionName: consent.subscriptionName,
    termsVersion: consent.termsVersion,
    agreedAt: now,
    timestamp: now,
    status: 'active',
  };

  // Instant synchronous cache
  consentsMemoryCache.set(consentId, data);
  try {
    const localMap = getLocalConsentsMap();
    localMap[consentId] = data;
    localStorage.setItem(LOCAL_CONSENTS_CACHE_KEY, JSON.stringify(localMap));
  } catch {
    // Ignore
  }

  // Cloud persist
  const ref = doc(db, CONSENTS_COLLECTION, consentId);
  await setDoc(ref, data, { merge: true });
}

/**
 * Retrieves the recorded user consent for a specific subscription.
 * Returns cached consent immediately to avoid modal opening delays,
 * and refreshes in background if needed.
 */
export async function getUserConsent(
  userId: number,
  subscriptionId: string
): Promise<SubscriptionConsent | null> {
  const cached = getCachedUserConsent(userId, subscriptionId);
  const consentId = `consent_${userId}_${subscriptionId}`;

  try {
    const snap = await getDoc(doc(db, CONSENTS_COLLECTION, consentId));
    if (snap.exists()) {
      const data = snap.data();
      const consentItem: SubscriptionConsent = {
        id: consentId,
        userId: Number(data.userId),
        userName: String(data.userName || ''),
        subscriptionId: String(data.subscriptionId || ''),
        subscriptionName: String(data.subscriptionName || ''),
        termsVersion: Number(data.termsVersion || 1),
        agreedAt: Number(data.agreedAt || data.timestamp || Date.now()),
        timestamp: Number(data.timestamp || Date.now()),
        status: (data.status as 'active' | 'superseded') || 'active',
      };
      consentsMemoryCache.set(consentId, consentItem);
      try {
        const localMap = getLocalConsentsMap();
        localMap[consentId] = consentItem;
        localStorage.setItem(LOCAL_CONSENTS_CACHE_KEY, JSON.stringify(localMap));
      } catch {
        // Ignore
      }
      return consentItem;
    }
  } catch (err) {
    console.warn('Failed to fetch user consent:', err);
  }
  return cached;
}

/**
 * Resolves effective wallet details for a plan (combines plan-level & selected payment method).
 * Accurately prioritizes the plan's configured primary wallet address and network without
 * letting fallback mock values override the owner's entered data.
 */
export function getEffectiveWalletInfo(
  plan: SubscriptionPlan,
  selectedMethodId?: string
): {
  address: string;
  network: string;
  linkUrl: string;
  instructions: string;
  methodName: string;
  type: string;
  isPlanPrimary: boolean;
} {
  const activeMethods = (plan.paymentMethods || []).filter((m) => m.isEnabled);

  // 1. If user explicitly selected a specific payment method from the list (other than 'primary')
  if (selectedMethodId && selectedMethodId !== 'primary') {
    const matchedMethod = activeMethods.find((m) => m.id === selectedMethodId);
    if (matchedMethod) {
      return {
        address: (matchedMethod.addressOrDetails || '').trim(),
        network: (matchedMethod.network || plan.depositNetwork || (matchedMethod.type === 'crypto' ? 'Tron (USDT TRC20)' : 'حوالة معتمدة')).trim(),
        linkUrl: (matchedMethod.linkUrl || '').trim(),
        instructions: [plan.paymentInstructions, matchedMethod.instructions].filter(Boolean).join('\n\n').trim(),
        methodName: matchedMethod.name || 'طريقة دفع إضافية',
        type: matchedMethod.type || 'crypto',
        isPlanPrimary: false,
      };
    }
  }

  // 2. If the plan has its own primary wallet address configured by the owner
  if (plan.walletAddress && plan.walletAddress.trim().length > 0) {
    return {
      address: plan.walletAddress.trim(),
      network: (plan.depositNetwork || 'Tron (USDT TRC20)').trim(),
      linkUrl: (plan.walletLink || '').trim(),
      instructions: (plan.paymentInstructions || '').trim(),
      methodName: 'المحفظة والشبكة الرئيسية للباقة',
      type: 'crypto',
      isPlanPrimary: true,
    };
  }

  // 3. Fallback to the first enabled payment method
  const fallbackMethod = activeMethods[0] || (plan.paymentMethods && plan.paymentMethods[0]);
  return {
    address: (fallbackMethod?.addressOrDetails || plan.walletAddress || '').trim(),
    network: (fallbackMethod?.network || plan.depositNetwork || 'Tron (USDT TRC20)').trim(),
    linkUrl: (fallbackMethod?.linkUrl || plan.walletLink || '').trim(),
    instructions: [plan.paymentInstructions, fallbackMethod?.instructions].filter(Boolean).join('\n\n').trim(),
    methodName: fallbackMethod?.name || 'طريقة الدفع المعتمدة',
    type: fallbackMethod?.type || 'crypto',
    isPlanPrimary: !fallbackMethod,
  };
}

/**
 * Formats a clean Arabic copy text with all payment and transfer details.
 */
export function formatAllPaymentDetails(
  plan: SubscriptionPlan,
  selectedMethodId?: string,
  isInstallment = false
): string {
  const info = getEffectiveWalletInfo(plan, selectedMethodId);
  const priceDisplay = `${plan.price} ${plan.currency}`;
  const amountToPay = isInstallment
    ? `${plan.installmentMinimum} ${plan.currency} (الدفعة الأولى)`
    : priceDisplay;

  const lines = [
    `📋 بيانات الدفع والتحويل لاشتراك [${plan.name}]:`,
    `----------------------------------------`,
    `• اسم الباقة: ${plan.name}`,
    `• المبلغ المطلوب: ${amountToPay}`,
    `• طريقة الدفع المحددة: ${info.methodName}`,
    `• شبكة التحويل / الإيداع: ${info.network}`,
  ];

  if (info.address) {
    lines.push(`• عنوان المحفظة / الحساب: ${info.address}`);
  }
  if (info.linkUrl) {
    lines.push(`• رابط المحفظة / الدفع: ${info.linkUrl}`);
  }
  if (info.instructions) {
    lines.push(`• تعليمات التحويل: ${info.instructions}`);
  }

  lines.push(`----------------------------------------`);
  lines.push(`يرجى تحويل المبلغ بدقة ثم إرسال لقطة الشاشة مع المعاملة في الخاص مع Sami لتأكيد الاشتراك فوراً.`);

  return lines.join('\n');
}

/**
 * Generates an inquiry message formatted with current saved details
 * for sending directly to Sami in private chat.
 */
export function generateInquiryMessage(
  plan: SubscriptionPlan,
  isInstallment = false,
  selectedMethodId?: string
): string {
  const info = getEffectiveWalletInfo(plan, selectedMethodId);
  const priceDisplay = `${plan.price} ${plan.currency}`;
  const durationDisplay =
    plan.durationDays > 0 ? `${plan.durationDays} يوم` : 'اشتراك مستمر';
  const installmentText = isInstallment
    ? `\n• نظام الدفع المطلوب: بنظام الدفعات (الحد الأدنى للدفعة: ${plan.installmentMinimum} ${plan.currency})`
    : `\n• نظام الدفع المطلوب: دفع كامل (${priceDisplay})`;

  return `مرحباً كابتن Sami 👑

أرغب بالاستفسار والاشتراك في:
💎 ${plan.name}

تفاصيل الاشتراك:
• السعر المعتمد: ${priceDisplay}
• مدة الاشتراك: ${durationDisplay}${installmentText}
• طريقة الدفع المختارة: ${info.methodName} (${info.network})
${info.address ? `• عنوان المحفظة المحدد: ${info.address}` : ''}

يرجى تأكيد المقعد وتزويدي بأي توجيهات إضافية لتفعيل الاشتراك. شكراً لك!`;
}
