/* =====================================================================
 * EduLink Admin — تعريف الموارد (Schema-driven CRUD)
 * كل مورد يصف: الجدول، المفتاح، الأعمدة المعروضة، وحقول النموذج.
 * أنواع الحقول المدعومة:
 *   text | textarea | number | bool | date | datetime
 *   i18n         => نص متعدد اللغات {ar,en,ms,...}
 *   i18n_list    => مصفوفة نصوص متعددة اللغات [{ar,en}, ...]
 *   string_array => مصفوفة نصوص عادية (سطر لكل عنصر)
 *   json         => محرر JSON خام
 *   select       => قائمة خيارات ثابتة
 *   relation     => مفتاح خارجي يُختار من مورد آخر
 * ===================================================================== */

const LANGS = ['ar', 'en', 'ms', 'ru'];               // لغات محرر i18n الافتراضية
const CITY_KEYS = ['kuala_lumpur', 'selangor', 'penang', 'johor', 'cyberjaya'];

// اختصارات لإنشاء الحقول
const f = (name, type, opts = {}) => ({ name, type, ...opts });

const RESOURCES = {

  /* ------------------------- لوحة القيادة ------------------------- */
  dashboard: { label: 'لوحة القيادة', icon: '📊', group: 'عام', custom: 'dashboard' },

  /* ------------------------- إرسال إشعار ------------------------- */
  notifications: { label: 'إرسال إشعار', icon: '🔔', group: 'العمليات', custom: 'notifications' },

  /* --------------------------- المعاهد --------------------------- */
  institutes: {
    label: 'المعاهد', icon: '🏫', group: 'المحتوى', order: 'sort_order',
    columns: [
      { key: 'name', type: 'i18n', label: 'الاسم' },
      { key: 'city', type: 'i18n', label: 'المدينة' },
      { key: 'price_myr', type: 'money', label: 'سعر/أسبوع' },
      { key: 'is_active', type: 'bool', label: 'مفعّل' },
      { key: 'sort_order', label: 'ترتيب' },
    ],
    fields: [
      f('slug', 'text', { required: true, hint: 'معرّف الرابط: elc-kuala-lumpur' }),
      f('name', 'i18n', { required: true }),
      f('description', 'i18n', { textarea: true }),
      f('city', 'i18n'),
      f('city_key', 'select', { options: CITY_KEYS, required: true, free: true }),
      f('price_myr', 'number', { required: true, hint: 'السعر الأساس أسبوعياً (رينغت)' }),
      f('price_month_myr', 'number', { half: true }),
      f('price_min_myr', 'number', { half: true }),
      f('price_max_myr', 'number', { half: true }),
      f('price_estimated', 'bool', { half: true }),
      f('price_verified', 'bool', { half: true }),
      f('min_weeks', 'number', { half: true, default: 4 }),
      f('max_weeks', 'number', { half: true, default: 48 }),
      f('tags', 'i18n_list', { hint: 'مميزات المعهد مترجمة' }),
      f('images', 'string_array', { upload: true, hint: 'ارفع صوراً أو الصق روابط عامة' }),
      f('whatsapp', 'text', { hint: 'صيغة دولية: 60123456789' }),
      f('location_lat', 'number', { half: true }),
      f('location_lng', 'number', { half: true }),
      f('price_note', 'i18n', { textarea: true }),
      f('extra_fees', 'json', { hint: '[{"key":"...","amount":0,"label":{...}}]' }),
      f('partner_id', 'relation', { resource: 'partners', half: true }),
      f('sort_order', 'number', { half: true, default: 0 }),
      f('is_active', 'bool', { default: true }),
    ],
  },

  /* -------------------- الإعلانات / السكن -------------------- */
  listings: {
    label: 'الإعلانات والسكن', icon: '🏠', group: 'المحتوى', order: 'sort_order',
    columns: [
      { key: 'title', type: 'i18n', label: 'العنوان' },
      { key: 'category', label: 'النوع' },
      { key: 'price_myr', type: 'money', label: 'سعر/شهر' },
      { key: 'is_featured', type: 'bool', label: 'مميّز' },
      { key: 'is_active', type: 'bool', label: 'مفعّل' },
    ],
    fields: [
      f('slug', 'text', { required: true }),
      f('category', 'select', { options: ['housing', 'services', 'transport'], default: 'housing' }),
      f('title', 'i18n', { required: true }),
      f('description', 'i18n', { textarea: true }),
      f('city_key', 'select', { options: CITY_KEYS, required: true, free: true }),
      f('city', 'i18n'),
      f('price_myr', 'number', { required: true }),
      f('features', 'i18n_list'),
      f('images', 'string_array', { upload: true }),
      f('whatsapp', 'text', { required: true }),
      f('is_featured', 'bool', { half: true }),
      f('is_active', 'bool', { half: true, default: true }),
      f('sort_order', 'number', { half: true, default: 0 }),
      f('expires_at', 'datetime', { half: true, hint: 'إيقاف تلقائي' }),
      f('partner_id', 'relation', { resource: 'partners' }),
    ],
  },

  /* --------------------------- الطلبات --------------------------- */
  applications: {
    label: 'طلبات التسجيل', icon: '📝', group: 'العمليات', order: '-created_at',
    custom: 'applications', canCreate: false,
    columns: [
      { key: 'id', type: 'short', label: '#' },
      { key: 'status', type: 'status', label: 'المرحلة' },
      { key: 'weeks', label: 'أسابيع' },
      { key: 'emgs_progress', label: 'EMGS٪' },
      { key: 'lang', label: 'اللغة' },
      { key: 'created_at', type: 'date', label: 'أُنشئ' },
    ],
    fields: [
      f('status', 'select', {
        options: ['documents', 'review', 'submitted', 'offer', 'payment', 'visa', 'ticket', 'completed', 'rejected'],
        required: true,
      }),
      f('weeks', 'number', { half: true }),
      f('start_month', 'date', { half: true }),
      // المرحلة الثانية: خطاب القبول والرسوم وتقدّم التأشيرة
      f('final_price_myr', 'number', { half: true, hint: 'الإجمالي النهائي بالرنقت (يظهر للطالب)' }),
      f('offer_issued_at', 'date', { half: true, hint: 'تاريخ إصدار خطاب القبول' }),
      f('final_fees', 'json', { hint: '[{"label":{"ar":"رسوم الفيزا","en":"Visa fee"},"amount":2900}]' }),
      f('emgs_progress', 'number', { half: true, hint: 'تقدّم EMGS 0..100 — عند 70 نبلغ الطالب بالتنسيق' }),
      f('arrival_date', 'date', { half: true }),
      f('flight_number', 'text', { half: true }),
      f('entry_point', 'text', { half: true }),
      f('mdac_done', 'bool', { half: true }),
      f('mdac_ref', 'text', { half: true }),
      f('address_my', 'textarea'),
      f('notes', 'textarea'),
    ],
  },

  /* ------------------------- المتطلبات ------------------------- */
  requirements: {
    label: 'متطلبات المستندات', icon: '📋', group: 'المحتوى', order: 'sort_order',
    columns: [
      { key: 'name', type: 'i18n', label: 'الاسم' },
      { key: 'key', label: 'المفتاح' },
      { key: 'input_type', label: 'النوع' },
      { key: 'is_required', type: 'bool', label: 'إلزامي' },
    ],
    fields: [
      f('institute_id', 'relation', { resource: 'institutes', hint: 'اتركه فارغاً = ينطبق على كل المعاهد' }),
      f('key', 'text', { required: true, hint: 'passport, photo, certificate…' }),
      f('name', 'i18n', { required: true }),
      f('description', 'i18n', { textarea: true }),
      f('input_type', 'select', { options: ['file', 'text', 'date', 'select'], default: 'file' }),
      f('validation', 'json', { hint: '{"formats":["pdf"],"max_mb":10}' }),
      f('is_required', 'bool', { half: true, default: true }),
      f('sort_order', 'number', { half: true, default: 0 }),
    ],
  },

  /* --------------------- أسباب الرفض --------------------- */
  rejection_reasons: {
    label: 'أسباب رفض المستندات', icon: '🚫', group: 'المحتوى', pk: 'key',
    columns: [
      { key: 'key', label: 'المفتاح' },
      { key: 'title', type: 'i18n', label: 'السبب' },
    ],
    fields: [
      f('key', 'text', { required: true, pk: true, hint: 'blurry, expired, wrong_doc…' }),
      f('title', 'i18n', { required: true }),
      f('fix', 'i18n', { required: true, textarea: true, hint: 'طريقة الإصلاح — تصل للطالب بلغته' }),
    ],
  },

  /* ------------------- مراحل خط سير الطلب ------------------- */
  pipeline_steps: {
    label: 'مراحل خط السير', icon: '🧭', group: 'المحتوى', pk: 'status', order: 'step_order',
    columns: [
      { key: 'step_order', label: '#' },
      { key: 'status', label: 'المرحلة' },
      { key: 'title', type: 'i18n', label: 'العنوان' },
      { key: 'eta_days', label: 'مدة (يوم)' },
    ],
    fields: [
      f('status', 'text', { required: true, pk: true }),
      f('step_order', 'number', { required: true, half: true }),
      f('eta_days', 'number', { half: true, hint: 'اتركه فارغاً = حسب الطالب' }),
      f('title', 'i18n', { required: true }),
      f('explanation', 'i18n', { required: true, textarea: true }),
      f('your_action', 'i18n', { required: true, textarea: true }),
    ],
  },

  /* ----------------------- الأسئلة الشائعة ----------------------- */
  faq: {
    label: 'الأسئلة الشائعة', icon: '❓', group: 'المحتوى', order: 'sort_order',
    columns: [
      { key: 'question', type: 'i18n', label: 'السؤال' },
      { key: 'context_tags', type: 'tags', label: 'السياق' },
      { key: 'is_active', type: 'bool', label: 'مفعّل' },
    ],
    fields: [
      f('question', 'i18n', { required: true }),
      f('answer', 'i18n', { required: true, textarea: true }),
      f('context_tags', 'string_array', { hint: 'visa, payment, documents…' }),
      f('sort_order', 'number', { half: true, default: 0 }),
      f('is_active', 'bool', { half: true, default: true }),
    ],
  },

  /* ---------------------------- الشركاء ---------------------------- */
  partners: {
    label: 'الشركاء', icon: '🤝', group: 'الأعمال', order: '-created_at',
    columns: [
      { key: 'name', type: 'i18n', label: 'الاسم' },
      { key: 'type', label: 'النوع' },
      { key: 'commission_rate', label: 'العمولة' },
      { key: 'status', type: 'status', label: 'الحالة' },
    ],
    fields: [
      f('type', 'select', { options: ['institute', 'housing', 'service'], required: true }),
      f('name', 'i18n', { required: true }),
      f('contact_email', 'text', { half: true }),
      f('contact_phone', 'text', { half: true }),
      f('commission_type', 'select', { options: ['percent', 'fixed'], half: true, default: 'percent' }),
      f('commission_rate', 'number', { half: true, hint: '8 = 8% أو 150 = RM150' }),
      f('delivery_portal', 'bool', { half: true, default: true }),
      f('delivery_webhook', 'bool', { half: true }),
      f('delivery_email', 'bool', { half: true }),
      f('webhook_url', 'text'),
      f('webhook_secret', 'text'),
      f('status', 'select', { options: ['pending', 'connected', 'disabled'], default: 'pending' }),
    ],
  },

  /* --------------------------- العمولات --------------------------- */
  commissions: {
    label: 'العمولات', icon: '💰', group: 'الأعمال', order: '-created_at',
    columns: [
      { key: 'partner_id', type: 'relation', resource: 'partners', label: 'الشريك' },
      { key: 'base_amount', type: 'money', label: 'الأساس' },
      { key: 'amount', type: 'money', label: 'العمولة' },
      { key: 'status', type: 'status', label: 'الحالة' },
      { key: 'created_at', type: 'date', label: 'التاريخ' },
    ],
    canCreate: false,
    fields: [
      f('status', 'select', { options: ['due', 'invoiced', 'paid', 'cancelled'], required: true }),
      f('amount', 'number'),
      f('currency', 'text', { half: true, default: 'MYR' }),
      f('invoice_ref', 'text', { half: true }),
      f('note', 'textarea'),
    ],
  },

  /* --------------------------- اللغات --------------------------- */
  languages: {
    label: 'اللغات', icon: '🌍', group: 'الإعدادات', pk: 'code', order: 'sort_order',
    columns: [
      { key: 'code', label: 'الرمز' },
      { key: 'native_name', label: 'الاسم' },
      { key: 'is_rtl', type: 'bool', label: 'RTL' },
      { key: 'is_active', type: 'bool', label: 'مفعّل' },
    ],
    fields: [
      f('code', 'text', { required: true, pk: true, hint: 'ar, en, ms, ru…' }),
      f('native_name', 'text', { required: true }),
      f('is_rtl', 'bool', { half: true }),
      f('is_active', 'bool', { half: true, default: true }),
      f('sort_order', 'number', { default: 0 }),
    ],
  },

  /* --------------------------- العملات --------------------------- */
  currencies: {
    label: 'العملات', icon: '💱', group: 'الإعدادات', pk: 'code', order: 'sort_order',
    columns: [
      { key: 'code', label: 'الرمز' },
      { key: 'symbol', type: 'i18n', label: 'العلامة' },
      { key: 'rate_to_myr', label: 'مقابل الرينغت' },
      { key: 'is_active', type: 'bool', label: 'مفعّل' },
    ],
    fields: [
      f('code', 'text', { required: true, pk: true, hint: 'MYR, SAR, USD…' }),
      f('symbol', 'i18n', { required: true }),
      f('rate_to_myr', 'number', { required: true, hint: '1 وحدة = كم رينغت' }),
      f('is_active', 'bool', { half: true, default: true }),
      f('sort_order', 'number', { half: true, default: 0 }),
    ],
  },

  /* --------------------------- المدونة --------------------------- */
  blog_posts: {
    label: 'المدونة', icon: '✍️', group: 'SEO والمحتوى', order: '-updated_at',
    columns: [
      { key: 'title', label: 'العنوان' },
      { key: 'lang', label: 'اللغة' },
      { key: 'category', label: 'التصنيف' },
      { key: 'is_published', type: 'bool', label: 'منشور' },
    ],
    fields: [
      f('slug', 'text', { required: true, half: true }),
      f('lang', 'relation', { resource: 'languages', half: true, required: true }),
      f('title', 'text', { required: true }),
      f('excerpt', 'textarea'),
      f('body_md', 'textarea', { hint: 'Markdown', big: true }),
      f('cover_image', 'text'),
      f('category', 'select', { options: ['visa', 'costs', 'life', 'institutes'], free: true, half: true }),
      f('reading_min', 'number', { half: true }),
      f('keywords', 'string_array'),
      f('is_published', 'bool' ),
    ],
  },

  /* ------------------------ صفحات SEO ------------------------ */
  seo_pages: {
    label: 'صفحات SEO', icon: '🔎', group: 'SEO والمحتوى', order: '-updated_at',
    columns: [
      { key: 'title', label: 'العنوان' },
      { key: 'lang', label: 'اللغة' },
      { key: 'type', label: 'النوع' },
      { key: 'is_published', type: 'bool', label: 'منشور' },
    ],
    fields: [
      f('slug', 'text', { required: true, half: true }),
      f('lang', 'relation', { resource: 'languages', half: true, required: true }),
      f('type', 'select', { options: ['institute', 'guide', 'comparison', 'city', 'blog', 'home'], required: true }),
      f('title', 'text', { required: true, hint: '50–60 حرفاً' }),
      f('meta_desc', 'textarea', { required: true, hint: '150–160 حرفاً' }),
      f('h1', 'text', { required: true }),
      f('body_md', 'textarea', { big: true }),
      f('keywords', 'string_array'),
      f('og_image', 'text'),
      f('institute_id', 'relation', { resource: 'institutes' }),
      f('is_published', 'bool'),
    ],
  },

  /* ------------------- الكلمات المفتاحية ------------------- */
  seo_keywords: {
    label: 'كلمات SEO', icon: '🔑', group: 'SEO والمحتوى', order: 'priority',
    columns: [
      { key: 'keyword', label: 'الكلمة' },
      { key: 'lang', label: 'اللغة' },
      { key: 'intent', label: 'النية' },
      { key: 'priority', label: 'أولوية' },
      { key: 'target_page', label: 'الصفحة' },
    ],
    fields: [
      f('lang', 'relation', { resource: 'languages', half: true, required: true }),
      f('keyword', 'text', { required: true, half: true }),
      f('intent', 'select', { options: ['informational', 'commercial', 'transactional', 'navigational'], half: true }),
      f('funnel', 'select', { options: ['awareness', 'consideration', 'decision'], half: true }),
      f('difficulty', 'select', { options: ['low', 'medium', 'high'], half: true }),
      f('priority', 'number', { half: true, default: 3 }),
      f('target_page', 'text'),
      f('notes', 'textarea'),
    ],
  },

  /* --------------------- مراسي الأسعار --------------------- */
  price_anchors: {
    label: 'مراسي الأسعار', icon: '⚓', group: 'الأعمال', order: '-collected_at',
    columns: [
      { key: 'institute', label: 'المعهد' },
      { key: 'amount_myr', type: 'money', label: 'المبلغ' },
      { key: 'unit', label: 'الوحدة' },
      { key: 'source', label: 'المصدر' },
    ],
    fields: [
      f('institute', 'text', { required: true }),
      f('amount_myr', 'number', { required: true, half: true }),
      f('unit', 'select', { options: ['month', 'week'], half: true, default: 'month' }),
      f('hours_week', 'number', { half: true }),
      f('collected_at', 'date', { half: true }),
      f('source', 'text', { required: true }),
      f('note', 'textarea'),
    ],
  },

  /* -------------------- إعدادات التطبيق -------------------- */
  app_config: {
    label: 'إعدادات التطبيق', icon: '⚙️', group: 'الإعدادات', pk: 'key',
    columns: [
      { key: 'key', label: 'المفتاح' },
      { key: 'value', type: 'json', label: 'القيمة' },
    ],
    fields: [
      f('key', 'text', { required: true, pk: true, hint: 'mdac, seo…' }),
      f('value', 'json', { required: true, big: true }),
    ],
  },

  /* ------------------------ المستخدمون ------------------------ */
  profiles: {
    label: 'المستخدمون', icon: '👤', group: 'العمليات', order: '-created_at',
    readOnly: true,
    columns: [
      { key: 'full_name', label: 'الاسم' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'country', label: 'الدولة' },
      { key: 'preferred_lang', label: 'اللغة' },
      { key: 'created_at', type: 'date', label: 'انضم' },
    ],
    fields: [],
  },
};

const NAV_GROUPS = ['عام', 'المحتوى', 'العمليات', 'الأعمال', 'SEO والمحتوى', 'الإعدادات'];
