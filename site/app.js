/* =====================================================================
 * إيدولينك — بوابة الطلاب (Web SPA, vanilla JS + supabase-js)
 * ===================================================================== */
'use strict';

/* ---------- tiny DOM helpers ---------- */
const el = (t, p = {}, k = []) => {
  const n = document.createElement(t);
  for (const [key, v] of Object.entries(p)) {
    if (key === 'class') n.className = v;
    else if (key === 'html') n.innerHTML = v;
    else if (key.startsWith('on') && typeof v === 'function') n.addEventListener(key.slice(2), v);
    else if (v != null) n.setAttribute(key, v);
  }
  (Array.isArray(k) ? k : [k]).forEach(c => c != null && n.append(c.nodeType ? c : document.createTextNode(String(c))));
  return n;
};
const $ = s => document.querySelector(s);
const mount = node => { const a = $('#app'); a.innerHTML = ''; a.append(node); window.scrollTo(0, 0); if (typeof applyReveal === 'function') applyReveal(); };
const spinner = () => { $('#app').innerHTML = '<div class="spin"></div>'; };

/* ---------- state ---------- */
const S = {
  sb: null, user: null, profile: null,
  lang: localStorage.getItem('edu_lang') || 'ar',
  currency: null, currencies: [], cfg: {},
};

/* ---------- i18n (UI strings) ---------- */
const T = {
  ar: {
    institutes: 'المعاهد', housing: 'السكن', login: 'دخول', logout: 'خروج', myApps: 'طلباتي',
    register: 'حساب جديد', email: 'البريد الإلكتروني', password: 'كلمة المرور', fullName: 'الاسم الكامل',
    heroTitle: 'ادرس الإنجليزية في ماليزيا — بثقة',
    heroSub: 'معاهد معتمدة، أسعار واضحة، ومتابعة لطلبك خطوة بخطوة حتى الوصول.',
    browse: 'تصفّح المعاهد', city: 'المدينة', allCities: 'كل المدن', sort: 'الترتيب',
    priceLow: 'الأقل سعراً', priceHigh: 'الأعلى سعراً', perMonth: 'شهرياً', estimated: 'تقديري',
    apply: 'قدّم الآن', applyTo: 'التقديم على', weeks: 'عدد الأسابيع', startMonth: 'شهر البدء',
    submitApp: 'إرسال الطلب', contact: 'تواصل واتساب', features: 'المميزات', about: 'نبذة',
    myApplications: 'طلباتي', noApps: 'لا توجد طلبات بعد — تصفّح المعاهد وابدأ التقديم.',
    trackTitle: 'متابعة الطلب', requirements: 'المستندات المطلوبة', timeline: 'سجل الطلب',
    upload: 'رفع', uploaded: 'تم الرفع', notUploaded: 'لم يُرفع', pending: 'قيد المراجعة',
    approved: 'مقبول', rejected: 'مرفوض', yourAction: 'المطلوب منك الآن', profile: 'الملف الشخصي',
    phone: 'الهاتف', country: 'الدولة', save: 'حفظ', loginNeeded: 'سجّل الدخول لإكمال التقديم',
    haveAccount: 'لديك حساب؟', noAccount: 'ليس لديك حساب؟', back: 'رجوع',
    startTip: 'اختر أول شهر تنوي بدء الدراسة فيه', ok: 'تم', apply_done: 'تم إرسال طلبك بنجاح!',
    save_text: 'حفظ', value: 'القيمة',
    howNav: 'رحلة التقديم', howTitle: 'رحلة التقديم — من التسجيل حتى الوصول',
    howSub: 'كل خطوة، ومدتها المتوقعة، وكل ما قد تواجهه — واضح أمامك من البداية.',
    usually: 'عادةً', daysUnit: 'يوم', weeksUnit: 'أسبوع', totalEta: 'الوقت المتوقع حتى صدور التأشيرة',
    visaPathT: 'مسار تأشيرتك', estimateNote: 'تقديري — قد يختلف حسب حالتك والجهات الرسمية.',
    visaStates: 'حالات التأشيرة المحتملة', scenarios: 'أشياء قد تواجهها (وكيف نعالجها)',
    startNow: 'ابدأ التقديم الآن', checkPath: 'اعرف مسارك: كم مدة دراستك؟',
    theSteps: 'خطوات التقديم', commonQs: 'أسئلة شائعة',
    duration: 'مدة الدراسة', unit_week: 'أسبوع', unit_month: 'شهر', unit_year: 'سنة',
    rangeIs: 'المدة المتاحة لهذا المعهد', exempt: 'إعفاء من التأشيرة', emgsVisa: 'تأشيرة عبر EMGS',
    docsIntro: 'جهّز مستنداتك خطوة بخطوة. نراجعها ونقدّمها للمعهد، ثم نعود لك بخطاب القبول لاستكمال باقي الإجراءات.',
    ready: 'الجاهز', scan: 'صوّر', uploadFile: 'رفع ملف', redo: 'إعادة', readyBadge: 'جاهز',
    allPages: 'صوّر كل صفحات الجواز الداخلية بوضوح', submitDocs: 'أرسل مستنداتي للمراجعة',
    completeFirst: 'أكمل كل المستندات أولاً', docsDoneTitle: 'تم استلام مستنداتك',
    docsDoneBody: 'سنراجع مستنداتك ونقدّمها للمعهد. سنعود لك بخطاب القبول لاستكمال الإجراءات الأخرى.',
    capture: 'التقط', addPage: 'صفحة أخرى', saveDoc: 'تم — احفظ', lightGood: 'الإضاءة جيدة',
    lightLow: 'قرّب الإضاءة أكثر', alignHint: 'حاذِ المستند داخل الإطار', building: 'جارٍ التجهيز…',
    camFail: 'تعذّر فتح الكاميرا — استخدم «رفع ملف».', pageWord: 'صفحة',
    whatsapp: 'رقم واتساب', whatsappHint: 'نرسل لك تحديثات طلبك على واتساب، ومنه تتواصل مع الدعم.',
    supportBtn: 'تواصل مع الدعم (واتساب)', humanSupport: 'أو كلّم موظفاً عبر واتساب',
    // المرحلة الثانية — القبول والدفع والتأشيرة
    stageOf: 'المرحلة', ofWord: 'من',
    underReviewTitle: 'مستنداتك قيد المراجعة',
    underReviewBody: 'استلمنا مستنداتك ونراجعها ونقدّمها للمعهد. سنعود لك بخطاب القبول وتفاصيل الرسوم قريباً — تابع هنا وسنشعرك عبر واتساب.',
    offerTitle: 'مبروك — تم قبولك! 🎉',
    offerBody: 'صدر خطاب قبولك من المعهد. حمّله من الأسفل واحتفظ به.',
    downloadOffer: 'تحميل خطاب القبول (PDF)',
    offerPending: 'خطاب القبول قيد التجهيز وسيظهر هنا للتحميل قريباً.',
    exemptTitle: 'لا رسوم تأشيرة عليك 🟢',
    exemptBody: 'مدة دراستك ضمن الإعفاء (حتى 90 يوماً)، فلا تحتاج تأشيرة مسبقة ولا رسوم. نستكمل معك باقي الإجراءات، وسيتم التواصل معك عبر واتساب.',
    feesTitle: 'رسوم تقديم التأشيرة',
    paidToInstitute: 'تُدفع للمعهد مباشرةً',
    totalDue: 'المبلغ المستحق للمعهد',
    feesNote: 'الرسوم كما وردت في خطاب القبول. المنصّة لا تستقبل أي مبالغ — الدفع للمعهد مباشرةً.',
    payTitle: 'طريقة الدفع (للمعهد)',
    openPayLink: 'رابط الدفع للمعهد',
    receiptTitle: 'إيصال الدفع',
    receiptHint: 'بعد الدفع للمعهد، صوّر الإيصال أو ارفعه هنا لنبدأ إجراءات التأشيرة.',
    receiptDone: 'استلمنا إيصالك ✓ — نتحقق منه ونبدأ إجراءات تأشيرتك.',
    paymentReviewBody: 'نتحقق من دفعتك للمعهد الآن. فور تأكيدها نبدأ إجراءات تأشيرتك عبر EMGS ونعلمك بالتقدّم.',
    visaTitle: 'إجراءات التأشيرة (EMGS)',
    visaBody: 'بدأنا إجراءات تأشيرتك عبر EMGS. تابع نسبة التقدّم هنا — لا يلزمك أي إجراء الآن.',
    emgsProgressLbl: 'تقدّم معاملة EMGS',
    coordTitle: 'ننسّق معك الخطوات الأخيرة 🤝',
    coordBody: 'وصلت معاملتك إلى 70٪ أو أكثر. سنتواصل معك قريباً لتنسيق: التأشيرة الإلكترونية (e-Visa)، استقبال المطار، والمساعدة في السكن.',
    ticketTitle: 'الوصول والخطوات الأخيرة',
    ticketBody: 'اقتربت رحلتك! ننسّق معك الآن التأشيرة الإلكترونية واستقبال المطار والسكن. أكمل بيانات سفرك أدناه لنساعدك بدقّة.',
    completedTitle: 'رحلتك بدأت — بالتوفيق! 🎓',
    completedBody: 'اكتملت كل الإجراءات. نتمنى لك دراسة موفقة في ماليزيا — الدعم معك في أي وقت عبر واتساب.',
    rejectedTitle: 'طلبك يحتاج مراجعة',
    housingHelp: 'المساعدة في السكن',
    housingHelpBody: 'نرشّح لك خيارات سكن قريبة من معهدك ونساعدك في الحجز.',
    browseHousing: 'تصفّح خيارات السكن',
    contactVia: 'سيتم التواصل معك عبر واتساب على رقمك.',
    addAltNumber: 'أضف رقماً آخر للتواصل',
    altNumberPlaceholder: 'رقم إضافي للتواصل (اختياري)',
    altSaved: 'حفظنا رقمك الإضافي ✓',
    altPhoneLabel: 'رقم تواصل إضافي (اختياري)',
  },
  en: {
    institutes: 'Institutes', housing: 'Housing', login: 'Log in', logout: 'Log out', myApps: 'My applications',
    register: 'Sign up', email: 'Email', password: 'Password', fullName: 'Full name',
    heroTitle: 'Study English in Malaysia — with confidence',
    heroSub: 'Accredited institutes, clear pricing, and step-by-step tracking of your application.',
    browse: 'Browse institutes', city: 'City', allCities: 'All cities', sort: 'Sort',
    priceLow: 'Lowest price', priceHigh: 'Highest price', perMonth: '/month', estimated: 'estimated',
    apply: 'Apply now', applyTo: 'Apply to', weeks: 'Weeks', startMonth: 'Start month',
    submitApp: 'Submit application', contact: 'WhatsApp', features: 'Features', about: 'About',
    myApplications: 'My applications', noApps: 'No applications yet — browse institutes to start.',
    trackTitle: 'Track application', requirements: 'Required documents', timeline: 'Timeline',
    upload: 'Upload', uploaded: 'Uploaded', notUploaded: 'Not uploaded', pending: 'Under review',
    approved: 'Approved', rejected: 'Rejected', yourAction: 'What you need to do now', profile: 'Profile',
    phone: 'Phone', country: 'Country', save: 'Save', loginNeeded: 'Log in to finish applying',
    haveAccount: 'Have an account?', noAccount: 'No account?', back: 'Back',
    startTip: 'Pick the first month you plan to start', ok: 'Done', apply_done: 'Your application was submitted!',
    save_text: 'Save', value: 'Value',
    howNav: 'How it works', howTitle: 'Your journey — from sign-up to arrival',
    howSub: 'Every step, its expected duration, and anything you might face — clear from the start.',
    usually: 'usually', daysUnit: 'days', weeksUnit: 'weeks', totalEta: 'Estimated time until your visa is issued',
    visaPathT: 'Your visa path', estimateNote: 'An estimate — it varies by your case and the authorities.',
    visaStates: 'Possible visa states', scenarios: 'Things you might face (and how we handle them)',
    startNow: 'Start applying', checkPath: 'Find your path: how long will you study?',
    theSteps: 'Application steps', commonQs: 'Common questions',
    duration: 'Study duration', unit_week: 'week(s)', unit_month: 'month(s)', unit_year: 'year(s)',
    rangeIs: 'Available duration for this institute', exempt: 'visa-exempt', emgsVisa: 'EMGS visa',
    docsIntro: 'Prepare your documents step by step. We review and submit them to the institute, then return with your offer letter.',
    ready: 'Ready', scan: 'Scan', uploadFile: 'Upload', redo: 'Redo', readyBadge: 'Ready',
    allPages: 'Capture every inner passport page clearly', submitDocs: 'Submit my documents',
    completeFirst: 'Complete all documents first', docsDoneTitle: 'Documents received',
    docsDoneBody: 'We will review your documents and submit them to the institute, then return with your offer letter.',
    capture: 'Capture', addPage: 'Add page', saveDoc: 'Done — save', lightGood: 'Good lighting',
    lightLow: 'Add more light', alignHint: 'Align the document inside the frame', building: 'Preparing…',
    camFail: 'Camera unavailable — use Upload.', pageWord: 'page',
    whatsapp: 'WhatsApp number', whatsappHint: 'We send application updates on WhatsApp, and you reach support from it.',
    supportBtn: 'Contact support (WhatsApp)', humanSupport: 'Or chat with a human on WhatsApp',
    // Stage two — acceptance, payment, visa
    stageOf: 'Stage', ofWord: 'of',
    underReviewTitle: 'Your documents are under review',
    underReviewBody: 'We received your documents, we are reviewing them and submitting to the institute. We will return with your offer letter and fee details soon — track here and we will notify you on WhatsApp.',
    offerTitle: 'Congratulations — you are accepted! 🎉',
    offerBody: 'Your offer letter has been issued. Download and keep it below.',
    downloadOffer: 'Download offer letter (PDF)',
    offerPending: 'Your offer letter is being prepared and will appear here to download soon.',
    exemptTitle: 'No visa fee for you 🟢',
    exemptBody: 'Your duration is visa-exempt (up to 90 days) — no advance visa and no fee. We continue the rest with you, and you will be contacted on WhatsApp.',
    feesTitle: 'Visa application fee',
    paidToInstitute: 'Paid directly to the institute',
    totalDue: 'Amount due to the institute',
    feesNote: 'Fees as stated in your offer letter. The platform collects no money — you pay the institute directly.',
    payTitle: 'How to pay (the institute)',
    openPayLink: 'Institute payment link',
    receiptTitle: 'Payment receipt',
    receiptHint: 'After paying the institute, scan or upload the receipt here so we start your visa procedures.',
    receiptDone: 'Receipt received ✓ — we are verifying it and will start your visa procedures.',
    paymentReviewBody: 'We are verifying your payment to the institute. Once confirmed we start your EMGS visa procedures and keep you posted.',
    visaTitle: 'Visa procedures (EMGS)',
    visaBody: 'We have started your EMGS visa procedures. Track the progress here — no action needed from you now.',
    emgsProgressLbl: 'EMGS application progress',
    coordTitle: 'We coordinate the final steps with you 🤝',
    coordBody: 'Your application reached 70% or more. We will contact you shortly to coordinate: the e-Visa, airport pickup, and housing help.',
    ticketTitle: 'Arrival & final steps',
    ticketBody: 'Your trip is close! We are coordinating your e-Visa, airport pickup and housing. Complete your travel details below so we help you precisely.',
    completedTitle: 'Your journey has begun — good luck! 🎓',
    completedBody: 'All procedures are complete. We wish you a successful stay in Malaysia — support is with you anytime on WhatsApp.',
    rejectedTitle: 'Your application needs attention',
    housingHelp: 'Housing help',
    housingHelpBody: 'We suggest housing options near your institute and help you book.',
    browseHousing: 'Browse housing options',
    contactVia: 'You will be contacted on WhatsApp at your number.',
    addAltNumber: 'Add another contact number',
    altNumberPlaceholder: 'Additional contact number (optional)',
    altSaved: 'Your extra number is saved ✓',
    altPhoneLabel: 'Additional contact number (optional)',
  },
};
const t = k => (T[S.lang] && T[S.lang][k]) || T.ar[k] || k;
const pick = o => { if (o == null) return ''; if (typeof o !== 'object') return String(o);
  return o[S.lang] || o.ar || o.en || Object.values(o).find(Boolean) || ''; };

// أعمدة المعهد العامة — لا نكشف رقم المعهد (whatsapp) ولا موقعه للطالب،
// حتى لا يتواصل معه مباشرةً ويتجاوز المنصّة. التسجيل يتم عبر المنصّة فقط.
const INST_COLS = 'id,slug,name,description,city,city_key,price_month_myr,price_estimated,price_note,tags,images,min_weeks,max_weeks,is_active,sort_order,rating,rating_count';

/* ---------- money ---------- */
function money(myr) {
  if (myr == null) return '—';
  const rm = `RM ${Number(myr).toLocaleString('en')}`;
  const c = S.currency;
  if (c && c.code !== 'MYR' && c.rate_to_myr) {
    const v = Math.round(Number(myr) / Number(c.rate_to_myr));
    return `${rm} <small>(≈ ${v.toLocaleString('en')} ${pick(c.symbol)})</small>`;
  }
  return rm;
}

/* ---------- SEO: dynamic meta + structured data per route ---------- */
function metaTag(key, isProp) {
  const attr = isProp ? 'property' : 'name';
  let m = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.append(m); }
  return m;
}
function setSeo({ title, desc, jsonld }) {
  if (title) document.title = title;
  if (desc) { metaTag('description').content = desc; metaTag('og:description', true).content = desc; }
  if (title) metaTag('og:title', true).content = title;
  metaTag('og:type', true).content = 'website';
  let c = document.head.querySelector('link[rel="canonical"]');
  if (!c) { c = document.createElement('link'); c.rel = 'canonical'; document.head.append(c); }
  c.href = location.href;
  let s = document.getElementById('ld-json');
  if (!s) { s = document.createElement('script'); s.id = 'ld-json'; s.type = 'application/ld+json'; document.head.append(s); }
  s.textContent = JSON.stringify(jsonld || { '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: 'EduLink' });
}

/* ---------- toast ---------- */
function toast(msg, kind = '') {
  const x = el('div', { class: 'toast ' + kind, html: msg });
  $('#toast').append(x);
  setTimeout(() => { x.style.opacity = '0'; setTimeout(() => x.remove(), 300); }, 3400);
}

/* ---------- init ---------- */
async function init() {
  const cfg = window.EDULINK_CONFIG || {};
  if (!cfg.url || !cfg.anonKey || cfg.anonKey.includes('ضع_مفتاح')) {
    $('#app').innerHTML = '<div class="panel center"><h2>يلزم ضبط الإعدادات</h2>' +
      '<p class="muted">افتح ملف <code>config.js</code> وضع رابط مشروعك ومفتاح anon.</p></div>';
    return;
  }
  S.sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'edulink-student' },
  });
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';

  const { data } = await S.sb.auth.getSession();
  S.user = data?.session?.user || null;
  if (S.user) await loadProfile();
  await loadCurrencies();
  await loadConfig();

  S.sb.auth.onAuthStateChange((_e, sess) => {
    S.user = sess?.user || null;
    if (S.user) loadProfile().then(renderHeader);
    else { S.profile = null; renderHeader(); }
  });

  renderHeader();
  uiChrome();
  window.addEventListener('hashchange', route);
  route();
}

/* ---------- premium chrome: header shadow, footer year, scroll-reveal ---------- */
const _revIO = ('IntersectionObserver' in window)
  ? new IntersectionObserver((ents, o) => ents.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); }
    }), { rootMargin: '0px 0px -6% 0px', threshold: 0.05 })
  : null;
function applyReveal() {
  if (!_revIO) return;
  let i = 0;
  $('#app').querySelectorAll('.hero, .panel, .card, .sec-title').forEach(n => {
    if (n.dataset.rev) return;
    n.dataset.rev = '1';
    n.classList.add('reveal');
    n.style.transitionDelay = Math.min(i++ * 28, 170) + 'ms';
    _revIO.observe(n);
  });
}
function uiChrome() {
  const hdr = document.getElementById('siteHeader');
  if (hdr) {
    const onScroll = () => hdr.classList.toggle('scrolled', window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  const fy = document.getElementById('fyear');
  if (fy) fy.textContent = new Date().getFullYear();
}

async function loadProfile() {
  const { data } = await S.sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle();
  S.profile = data || null;
}
async function loadCurrencies() {
  const { data } = await S.sb.from('currencies').select('*').eq('is_active', true).order('sort_order');
  S.currencies = data || [];
  S.currency = S.currencies.find(c => c.code === (S.profile?.preferred_currency || 'SAR')) || S.currencies[0] || null;
}
async function loadConfig() {
  const { data } = await S.sb.from('app_config').select('*');
  S.cfg = Object.fromEntries((data || []).map(c => [c.key, c.value]));
}
function supportNumber() { return (S.cfg?.support?.whatsapp || '').replace(/[^\d]/g, ''); }
window.contactSupport = () => {
  const n = supportNumber();
  if (!n) return toast(S.lang === 'ar' ? 'رقم الدعم غير مُعدّ بعد.' : 'Support number not set yet.', 'err');
  const msg = encodeURIComponent(S.lang === 'ar' ? 'مرحباً، أحتاج مساعدة في التقديم عبر إيدولينك.' : 'Hi, I need help with my EduLink application.');
  window.open(`https://wa.me/${n}?text=${msg}`, '_blank');
};

/* ---------- header ---------- */
function renderHeader() {
  const area = $('#authArea');
  area.innerHTML = '';
  $('#langBtn').textContent = S.lang === 'ar' ? 'EN' : 'ع';
  if (S.user) {
    const initial = ((S.profile?.full_name || S.user.email || '؟').trim()[0] || '؟').toUpperCase();
    area.append(
      el('a', { class: 'desk-only', onclick: () => go('#/my'), style: 'font-weight:800;color:var(--muted);padding:8px 12px;border-radius:10px' }, t('myApps')),
      el('div', { class: 'avatar', onclick: () => go('#/profile'), title: S.user.email }, initial),
    );
  } else {
    area.append(el('button', { class: 'btn sm', onclick: () => openAuth() }, t('login')));
  }
  updateNav();
}
$('#langBtn').onclick = () => {
  S.lang = S.lang === 'ar' ? 'en' : 'ar';
  localStorage.setItem('edu_lang', S.lang);
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  renderHeader(); route();
};

/* ---------- router ---------- */
function go(hash) { location.hash = hash; }
window.tabAccount = () => (S.user ? go('#/profile') : openAuth('#/profile'));
function updateNav() {
  const h = location.hash || '#/';
  const base = (h.startsWith('#/institute') || h.startsWith('#/apply')) ? '#/'
    : h.startsWith('#/app/') ? '#/my' : h;
  document.querySelectorAll('.navlinks a, .tabbar a').forEach(a => a.classList.toggle('on', a.dataset.r === base));
}
function route() {
  updateNav();
  const h = location.hash || '#/';
  const m = (re) => (h.match(re) || [])[1];
  if (h === '#/' || h === '') return viewHome();
  if (h === '#/how') return viewHow();
  if (h === '#/housing') return viewHousing();
  if (m(/^#\/institute\/(.+)$/)) return viewInstitute(decodeURIComponent(m(/^#\/institute\/(.+)$/)));
  if (m(/^#\/apply\/(.+)$/)) return viewApply(decodeURIComponent(m(/^#\/apply\/(.+)$/)));
  if (h === '#/my') return viewMyApps();
  if (m(/^#\/app\/(.+)$/)) return viewTracker(m(/^#\/app\/(.+)$/));
  if (h === '#/profile') return viewProfile();
  viewHome();
}

/* ---------- HOME (institutes) ---------- */
async function viewHome() {
  setSeo({
    title: S.lang === 'ar' ? 'معاهد اللغة الإنجليزية في ماليزيا — قارن وسجّل | إيدولينك' : 'English language institutes in Malaysia | EduLink',
    desc: S.lang === 'ar' ? 'قارن معاهد اللغة الإنجليزية المعتمدة في ماليزيا بأسعار واضحة، وقدّم طلبك وتابعه خطوة بخطوة حتى الوصول.' : 'Compare accredited English language institutes in Malaysia with clear pricing, and track your application step by step.',
    jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'EduLink', inLanguage: S.lang, potentialAction: { '@type': 'SearchAction', target: location.origin + location.pathname + '#/?q={q}', 'query-input': 'required name=q' } },
  });
  spinner();
  const { data: insts, error } = await S.sb.from('institutes').select(INST_COLS).eq('is_active', true).order('sort_order');
  if (error) return mount(el('div', { class: 'empty' }, 'تعذّر تحميل المعاهد: ' + error.message));
  const list = insts || [];
  const cities = [...new Map(list.map(i => [i.city_key, pick(i.city)])).entries()];

  const wrap = el('div');
  const stat = (b, s) => el('div', { class: 'st' }, [el('b', {}, b), el('span', {}, s)]);
  wrap.append(el('div', { class: 'hero' }, el('div', { class: 'in' }, [
    el('div', { class: 'kicker' }, '🇲🇾 ' + (S.lang === 'ar' ? 'دراسة معتمدة في ماليزيا' : 'Accredited study in Malaysia')),
    el('h1', {}, t('heroTitle')),
    el('p', {}, t('heroSub')),
    el('button', { class: 'btn', onclick: () => document.getElementById('list').scrollIntoView({ behavior: 'smooth' }) }, t('browse') + ' ←'),
    el('div', { class: 'hero-stats' }, [
      stat(String(list.length), S.lang === 'ar' ? 'معهد معتمد' : 'institutes'),
      stat('8', S.lang === 'ar' ? 'خطوات واضحة' : 'clear steps'),
      stat('100%', S.lang === 'ar' ? 'متابعة لطلبك' : 'tracked'),
    ]),
  ])));
  wrap.append(el('h2', { class: 'sec-title' }, t('institutes')));

  const state = { city: '', sort: 'low' };
  const citySel = el('select', { onchange: e => { state.city = e.target.value; draw(); } }, [
    el('option', { value: '' }, t('allCities')),
    ...cities.map(([k, label]) => el('option', { value: k }, label || k)),
  ]);
  const sortSel = el('select', { onchange: e => { state.sort = e.target.value; draw(); } }, [
    el('option', { value: 'low' }, t('priceLow')),
    el('option', { value: 'high' }, t('priceHigh')),
  ]);
  wrap.append(el('div', { class: 'filters' }, [
    el('span', { class: 'muted' }, t('city') + ':'), citySel,
    el('span', { class: 'muted' }, t('sort') + ':'), sortSel,
  ]));

  const grid = el('div', { class: 'grid', id: 'list' });
  wrap.append(grid);
  mount(wrap);

  function draw() {
    let arr = state.city ? list.filter(i => i.city_key === state.city) : list.slice();
    arr.sort((a, b) => state.sort === 'low' ? a.price_month_myr - b.price_month_myr : b.price_month_myr - a.price_month_myr);
    grid.innerHTML = '';
    if (!arr.length) { grid.append(el('div', { class: 'empty' }, '—')); return; }
    arr.forEach(i => grid.append(instituteCard(i)));
  }
  draw();
}

function instituteCard(i) {
  const tags = (i.tags || []).slice(0, 2).map(x => el('span', { class: 'tag' }, pick(x)));
  const nm = pick(i.name);
  const media = el('div', { class: 'media' }, (i.images && i.images[0])
    ? el('img', { src: i.images[0], alt: nm, loading: 'lazy' })
    : el('span', { class: 'mono' }, (nm.replace(/^(معهد|مركز)\s*/, '')[0] || '🏫')));
  if (i.rating) media.append(el('div', { class: 'rate' }, [el('span', { class: 'star' }, '★'), String(i.rating), i.rating_count ? el('small', { style: 'opacity:.8;font-weight:600' }, ` (${i.rating_count})`) : null]));
  return el('div', { class: 'card', onclick: () => go('#/institute/' + i.slug) }, [
    media,
    el('div', { class: 'body' }, [
      el('h3', {}, nm),
      el('div', { class: 'city' }, '📍 ' + pick(i.city)),
      tags.length ? el('div', { class: 'tags' }, tags) : null,
      el('div', { class: 'foot' }, [
        el('div', { class: 'price', html: `<b>${money(i.price_month_myr)}</b> <small>${t('perMonth')}</small>` + (i.price_estimated ? `<span class="est">${t('estimated')}</span>` : '') }),
        el('div', { class: 'go' }, '←'),
      ]),
    ]),
  ]);
}

/* ---------- INSTITUTE DETAIL ---------- */
async function viewInstitute(slug) {
  spinner();
  const { data: i } = await S.sb.from('institutes').select(INST_COLS).eq('slug', slug).maybeSingle();
  if (!i) return mount(el('div', { class: 'empty' }, '—'));
  setSeo({
    title: pick(i.name) + ' — ' + pick(i.city) + ' | إيدولينك',
    desc: (pick(i.description) || '').slice(0, 160),
    jsonld: {
      '@context': 'https://schema.org', '@type': 'Course', name: pick(i.name),
      description: (pick(i.description) || '').slice(0, 300),
      provider: { '@type': 'EducationalOrganization', name: pick(i.name), areaServed: pick(i.city) },
      inLanguage: S.lang,
      ...(i.price_month_myr ? { offers: { '@type': 'Offer', price: i.price_month_myr, priceCurrency: 'MYR' } } : {}),
    },
  });
  const wrap = el('div');
  wrap.append(el('div', { class: 'back', onclick: () => go('#/') }, '→ ' + t('back')));
  if (i.images && i.images.length) {
    wrap.append(el('div', { class: 'panel', style: 'padding:0;overflow:hidden' },
      el('img', { src: i.images[0], style: 'width:100%;max-height:320px;object-fit:cover', alt: pick(i.name) })));
  }
  wrap.append(el('div', { class: 'panel' }, [
    el('h1', { class: 'page', style: 'margin-top:0' }, pick(i.name)),
    el('div', { class: 'muted', style: 'margin-bottom:10px' }, '📍 ' + pick(i.city)),
    el('div', { class: 'price', style: 'font-size:24px', html: money(i.price_month_myr) + ` <small>${t('perMonth')}</small>` + (i.price_estimated ? `<span class="est">${t('estimated')}</span>` : '') }),
    i.price_note ? el('p', { class: 'muted', style: 'font-size:14px' }, pick(i.price_note)) : null,
    el('h3', {}, t('about')),
    el('p', {}, pick(i.description)),
    (i.tags && i.tags.length) ? el('h3', {}, t('features')) : null,
    (i.tags && i.tags.length) ? el('div', { class: 'tags' }, i.tags.map(x => el('span', { class: 'tag' }, pick(x)))) : null,
    el('div', { class: 'row', style: 'margin-top:20px' }, [
      el('button', { class: 'btn accent', onclick: () => go('#/apply/' + i.slug) }, t('apply')),
    ]),
  ]));
  mount(wrap);
}

/* ---------- APPLY ---------- */
async function viewApply(slug) {
  if (!S.user) { openAuth('#/apply/' + slug); return; }
  spinner();
  const { data: i } = await S.sb.from('institutes').select(INST_COLS).eq('slug', slug).maybeSingle();
  if (!i) return mount(el('div', { class: 'empty' }, '—'));

  const minW = i.min_weeks || 4, maxW = i.max_weeks || 48;
  const amount = el('input', { type: 'number', min: 1, value: 1, style: 'flex:2' });
  const unit = unitSelect('month'); unit.style.flex = '1';
  const dpre = el('div', { class: 'muted', style: 'font-size:13.5px;margin-top:6px' });
  const refreshDur = () => {
    const w = toWeeks(amount.value, unit.value);
    const vp = visaPath(w);
    dpre.innerHTML = `≈ <b>${w}</b> ${t('weeksUnit')} · ${vp.short ? '🟢 ' + t('exempt') : '🛂 ' + t('emgsVisa')}`;
  };
  amount.addEventListener('input', refreshDur); unit.addEventListener('change', refreshDur); refreshDur();

  const start = el('input', { type: 'month' });
  const wa = el('input', { type: 'tel', placeholder: '9665xxxxxxxx', value: S.profile?.phone || '' });
  const wrap = el('div');
  wrap.append(el('div', { class: 'back', onclick: () => go('#/institute/' + slug) }, '→ ' + t('back')));
  wrap.append(el('div', { class: 'panel', style: 'max-width:560px' }, [
    el('h1', { class: 'page', style: 'margin-top:0' }, t('applyTo') + ' ' + pick(i.name)),
    el('label', {}, t('duration') + ' *'),
    el('div', { class: 'row' }, [amount, unit]),
    dpre,
    el('div', { class: 'muted', style: 'font-size:12.5px;margin-top:2px' }, `${t('rangeIs')}: ${minW}–${maxW} ${t('weeksUnit')}`),
    el('label', {}, t('startMonth') + ' *'), start,
    el('div', { class: 'muted', style: 'font-size:13px;margin-top:4px' }, t('startTip')),
    el('label', {}, '🟢 ' + t('whatsapp') + ' *'), wa,
    el('div', { class: 'muted', style: 'font-size:13px;margin-top:4px' }, t('whatsappHint')),
    el('button', {
      class: 'btn accent block', style: 'margin-top:20px',
      onclick: async (e) => {
        const wks = toWeeks(amount.value, unit.value);
        if (wks < minW || wks > maxW) return toast(`${t('rangeIs')}: ${minW}–${maxW} ${t('weeksUnit')}`, 'err');
        if (!start.value) return toast(S.lang === 'ar' ? 'اختر شهر البدء' : 'Pick a start month', 'err');
        if (!wa.value.trim()) return toast(S.lang === 'ar' ? 'أدخل رقم واتساب لنرسل لك التحديثات' : 'Enter your WhatsApp number', 'err');
        const btn = e.target; btn.disabled = true;
        // save WhatsApp on the profile so notifications can reach the student
        await S.sb.from('profiles').update({ phone: wa.value.trim() }).eq('id', S.user.id);
        const startDate = start.value + '-01';
        const { data, error } = await S.sb.from('applications').insert({
          user_id: S.user.id, institute_id: i.id, weeks: wks,
          start_month: startDate, lang: S.lang,
        }).select('id').single();
        btn.disabled = false;
        if (error) return toast('تعذّر الإرسال: ' + error.message, 'err');
        toast(t('apply_done'), 'ok');
        go('#/app/' + data.id);
      },
    }, t('submitApp')),
  ]));
  mount(wrap);
}

/* ---------- MY APPLICATIONS ---------- */
async function viewMyApps() {
  if (!S.user) { openAuth('#/my'); return; }
  spinner();
  const { data } = await S.sb.from('applications')
    .select('id,status,weeks,created_at,institutes(name,city)')
    .order('created_at', { ascending: false });
  const wrap = el('div');
  wrap.append(el('h1', { class: 'page' }, t('myApplications')));
  if (!data || !data.length) { wrap.append(el('div', { class: 'empty' }, t('noApps'))); return mount(wrap); }
  const grid = el('div', { class: 'grid' });
  data.forEach(a => grid.append(el('div', { class: 'card', onclick: () => go('#/app/' + a.id) }, [
    el('div', { class: 'body' }, [
      el('h3', {}, pick(a.institutes?.name)),
      el('div', { class: 'city' }, '📍 ' + pick(a.institutes?.city)),
      el('div', {}, statusBadge(a.status)),
    ]),
  ])));
  wrap.append(grid);
  mount(wrap);
}

const STEP_ORDER = ['documents', 'review', 'submitted', 'offer', 'payment', 'visa', 'ticket', 'completed'];
function statusBadge(s) {
  if (s === 'rejected') return el('span', { class: 'badge off' }, t('rejected'));
  if (s === 'completed') return el('span', { class: 'badge on' }, '🎉');
  const i = STEP_ORDER.indexOf(s);
  return el('span', { class: 'badge info' }, `${t('trackTitle')} · ${i + 1}/8`);
}

/* ---------- visa path + duration helpers ---------- */
const WEEKS_PER_MONTH = 4.33, WEEKS_PER_YEAR = 52;
function toWeeks(amount, unit) {
  amount = Number(amount) || 0;
  if (unit === 'month') return Math.round(amount * WEEKS_PER_MONTH);
  if (unit === 'year') return Math.round(amount * WEEKS_PER_YEAR);
  return Math.round(amount);
}
function unitSelect(def = 'month') {
  const s = el('select', {}, [
    el('option', { value: 'week' }, t('unit_week')),
    el('option', { value: 'month' }, t('unit_month')),
    el('option', { value: 'year' }, t('unit_year')),
  ]);
  s.value = def;
  return s;
}
function visaPath(weeks) {
  const days = (weeks || 0) * 7;
  if (days > 0 && days <= 90) return {
    short: true, days,
    title: S.lang === 'ar' ? 'دورة قصيرة — إعفاء من التأشيرة المسبقة' : 'Short course — visa-exempt',
    body: S.lang === 'ar'
      ? 'مدة دراستك ضمن 90 يوماً، والسعوديون (ومعظم الخليجيين) معفون من التأشيرة المسبقة — فلا تحتاج Student Pass. المطلوب فقط: بطاقة MDAC خلال 3 أيام قبل الوصول.'
      : 'Your course is within 90 days, and Saudis (and most GCC citizens) are visa-exempt — no Student Pass needed. You only need the MDAC within 3 days before arrival.',
  };
  return {
    short: false, days,
    title: S.lang === 'ar' ? 'دورة طويلة — تحتاج Student Pass عبر EMGS' : 'Long course — Student Pass via EMGS',
    body: S.lang === 'ar'
      ? 'مدة دراستك تتجاوز 90 يوماً، فتحتاج تصريح طالب (Student Pass). المعهد يقدّم طلبك نيابةً عنك عبر بوابة EMGS الحكومية. يجب أن تكون خارج ماليزيا وقت التقديم؛ وبعد الموافقة (VAL) تدخل وتستلم ملصق التصريح، ثم فحص طبي خلال 7 أيام من الوصول.'
      : 'Your course exceeds 90 days, so you need a Student Pass. The institute files it for you via the EMGS portal. You must be outside Malaysia when applying; after approval (VAL) you enter, receive the pass, then a medical check within 7 days of arrival.',
  };
}
// مجموع المدة المتوقعة من المراجعة حتى التأشيرة (بالأيام)
function etaToVisa(steps) {
  const wanted = ['review', 'submitted', 'visa'];
  return (steps || []).reduce((s, st) => s + (wanted.includes(st.status) && st.eta_days ? st.eta_days : 0), 0);
}
function daysLabel(d) {
  const wk = Math.round(d / 7);
  return `~${d} ${t('daysUnit')}` + (wk >= 2 ? ` (≈ ${wk} ${t('weeksUnit')})` : '');
}

/* ---------- HOW IT WORKS (public journey page) ---------- */
async function viewHow() {
  spinner();
  const [{ data: steps }, { data: cfgRows }, { data: faqs }] = await Promise.all([
    S.sb.from('pipeline_steps').select('*').order('step_order'),
    S.sb.from('app_config').select('*'),
    S.sb.from('faq').select('*').eq('is_active', true).order('sort_order'),
  ]);
  const cfg = Object.fromEntries((cfgRows || []).map(c => [c.key, c.value]));
  const eta = etaToVisa(steps || []);
  setSeo({
    title: (S.lang === 'ar' ? 'رحلة التقديم والدراسة في ماليزيا — الدليل الكامل | إيدولينك' : 'Study in Malaysia — full application guide | EduLink'),
    desc: (S.lang === 'ar' ? 'كل خطوات التقديم ومدتها، مسار التأشيرة (EMGS)، والوقت المتوقع حتى صدور الفيزا — دليل شامل بلا تعقيد.' : 'Every application step and its duration, the visa (EMGS) path, and the estimated time to your visa.'),
    jsonld: (faqs && faqs.length) ? {
      '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: S.lang,
      mainEntity: faqs.slice(0, 10).map(f => ({ '@type': 'Question', name: pick(f.question), acceptedAnswer: { '@type': 'Answer', text: pick(f.answer) } })),
    } : undefined,
  });

  const wrap = el('div');
  wrap.append(el('div', { class: 'hero' }, [
    el('h1', {}, t('howTitle')),
    el('p', {}, t('howSub')),
    el('button', { class: 'btn', onclick: () => go('#/') }, t('startNow')),
  ]));

  // interactive visa-path calculator (choose by week / month / year)
  const calcAmt = el('input', { type: 'number', min: 1, value: 3, style: 'max-width:90px' });
  const calcUnit = unitSelect('month'); calcUnit.style.maxWidth = '120px';
  const pathBox = el('div', { style: 'margin-top:12px' });
  const drawPath = () => {
    const w = toWeeks(calcAmt.value, calcUnit.value);
    const p = visaPath(w);
    pathBox.innerHTML = '';
    pathBox.append(el('div', { class: 'action' }, [
      el('b', {}, (p.short ? '🟢 ' : '🛂 ') + p.title),
      el('p', { style: 'margin:.4em 0 0' }, `${p.body} (≈ ${w} ${t('weeksUnit')})`),
    ]));
  };
  calcAmt.addEventListener('input', drawPath); calcUnit.addEventListener('change', drawPath);
  wrap.append(el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, '🛂 ' + t('visaPathT')),
    el('label', {}, t('checkPath')),
    el('div', { class: 'row', style: 'align-items:center' }, [calcAmt, calcUnit]),
    pathBox,
    el('div', { class: 'muted', style: 'font-size:12.5px;margin-top:6px' }, 'ℹ️ ' + t('estimateNote')),
  ]));
  drawPath();

  // expected total time to visa
  if (eta > 0) {
    wrap.append(el('div', { class: 'panel', style: 'display:flex;gap:14px;align-items:center' }, [
      el('div', { style: 'font-size:34px' }, '⏱'),
      el('div', {}, [
        el('div', { class: 'muted' }, t('totalEta')),
        el('div', { style: 'font-size:24px;font-weight:800;color:var(--brand)' }, daysLabel(eta)),
        el('div', { class: 'muted', style: 'font-size:12.5px' }, t('estimateNote')),
      ]),
    ]));
  }

  // the steps with durations
  const stepPanel = el('div', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, t('theSteps')));
  const stepBox = el('div', { class: 'steps' });
  (steps || []).forEach(s => stepBox.append(el('div', { class: 'step done' }, [
    el('div', { class: 'dot' }, s.step_order),
    el('div', { class: 'st-body' }, [
      el('h4', {}, pick(s.title)),
      el('p', { class: 'muted', style: 'margin:.2em 0' }, pick(s.explanation)),
      s.eta_days ? el('div', { class: 'muted', style: 'font-size:12.5px' }, '⏱ ' + t('usually') + ' ~' + s.eta_days + ' ' + t('daysUnit')) : null,
    ]),
  ])));
  stepPanel.append(stepBox);
  wrap.append(stepPanel);

  // possible visa states
  const states = S.lang === 'ar' ? [
    ['📋 تجهيز المستندات', 'نجمع ونراجع ملفك ونفحص كل مستند قبل الإرسال.'],
    ['📤 مُرسل للمعهد / EMGS', 'قُدّم طلبك رسمياً للجهة المختصة.'],
    ['⏳ قيد المعالجة الحكومية', 'EMGS يدقّق الطلب (يستغرق عادة عدة أسابيع للدورات الطويلة).'],
    ['✅ صدور الموافقة (VAL)', 'خطاب الموافقة المبدئي؛ عندها تحجز تذكرتك وتجهّز سفرك.'],
    ['🛬 الدخول واستلام التصريح', 'تستلم ملصق Student Pass بعد الوصول، مع فحص طبي خلال 7 أيام.'],
    ['🟢 دورة قصيرة: إعفاء', 'لا تحتاج تأشيرة مسبقة — فقط بطاقة MDAC قبل الوصول بـ3 أيام.'],
  ] : [
    ['📋 Preparing documents', 'We collect and auto-check each document before submission.'],
    ['📤 Sent to institute / EMGS', 'Your file is officially filed with the authority.'],
    ['⏳ Government processing', 'EMGS reviews the application (usually a few weeks for long courses).'],
    ['✅ Approval issued (VAL)', 'The approval letter — now you book your flight.'],
    ['🛬 Arrival & pass collection', 'You receive the Student Pass sticker after arrival, plus a medical within 7 days.'],
    ['🟢 Short course: exempt', 'No prior visa — just the MDAC 3 days before arrival.'],
  ];
  const stPanel = el('div', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, t('visaStates')));
  states.forEach(([h, b]) => stPanel.append(el('div', { style: 'padding:9px 0;border-bottom:1px solid var(--line)' }, [
    el('b', {}, h), el('div', { class: 'muted', style: 'font-size:14px' }, b),
  ])));
  wrap.append(stPanel);

  // scenarios you might face
  const scen = S.lang === 'ar' ? [
    ['جواز صلاحيته أقل من 18 شهراً', 'نكتشفه فوراً ونطلب منك تجديده قبل التقديم — لتفادي رفض متأخر.'],
    ['صورتك غير مطابقة', 'استخدم زر «عدّلها تلقائياً» — نجعل الخلفية بيضاء والمقاس صحيحاً دون استوديو.'],
    ['رفض مستند', 'يصلك السبب وطريقة الإصلاح بالضبط بلغتك، وترفع البديل مباشرةً.'],
    ['هل يمكنني العمل؟', 'لا — طلاب مراكز اللغة ممنوعون من العمل (تصريح الـ20 ساعة لطلاب الجامعات فقط).'],
    ['الفحص الطبي', 'يتم داخل ماليزيا خلال 7 أيام من وصولك، ويرتّبه المعهد.'],
    ['بطاقة MDAC', 'مجانية عبر البوابة الرسمية فقط — أي موقع يطلب رسوماً احتيالي.'],
  ] : [
    ['Passport valid under 18 months', 'We catch it immediately and ask you to renew first — avoiding a late rejection.'],
    ['Photo not compliant', 'Use “Auto-fix” — white background and correct size, no studio needed.'],
    ['A document is rejected', 'You get the exact reason and fix in your language, and re-upload right away.'],
    ['Can I work?', 'No — language-centre students cannot work (the 20-hour permit is for university students).'],
    ['Medical check', 'Done inside Malaysia within 7 days of arrival; the institute arranges it.'],
    ['MDAC card', 'Free on the official portal only — any site charging a fee is a scam.'],
  ];
  const scPanel = el('div', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, t('scenarios')));
  scen.forEach(([q, a]) => scPanel.append(el('details', { style: 'border-bottom:1px solid var(--line);padding:9px 0' }, [
    el('summary', { style: 'cursor:pointer;font-weight:600' }, q),
    el('p', { class: 'muted', style: 'margin:.5em 0 0' }, a),
  ])));
  wrap.append(scPanel);

  // FAQ
  if (faqs && faqs.length) {
    const fp = el('div', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, t('commonQs')));
    faqs.slice(0, 8).forEach(f => fp.append(el('details', { style: 'border-bottom:1px solid var(--line);padding:9px 0' }, [
      el('summary', { style: 'cursor:pointer;font-weight:600' }, pick(f.question)),
      el('p', { class: 'muted', style: 'margin:.5em 0 0' }, pick(f.answer)),
    ])));
    wrap.append(fp);
  }

  wrap.append(el('div', { class: 'center', style: 'margin:24px 0' },
    el('button', { class: 'btn accent', onclick: () => go('#/') }, t('startNow'))));
  mount(wrap);
}

/* ---------- helpers for docs ---------- */
function fileToBase64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
}
// فحص فوري قبل الرفع (يوفّر رفضاً لاحقاً) — يعتمد على قواعد المتطلب
function validateFile(file, v) {
  v = v || {};
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (Array.isArray(v.formats) && v.formats.length && !v.formats.includes(ext)) {
    return { ok: false, msg: (S.lang === 'ar' ? 'الصيغة المسموحة: ' : 'Allowed formats: ') + v.formats.join(', ') };
  }
  if (v.max_mb && file.size > v.max_mb * 1024 * 1024) {
    return { ok: false, msg: (S.lang === 'ar' ? 'الحجم الأقصى ' : 'Max size ') + v.max_mb + 'MB' };
  }
  return { ok: true };
}

/* ---------- TRACKER ---------- */
async function viewTracker(id) {
  if (!S.user) { openAuth('#/app/' + id); return; }
  spinner();
  if (!S.profile) await loadProfile();
  const [{ data: app }, { data: steps }, { data: reasons }, { data: cfgRows }, { data: faqs }] = await Promise.all([
    S.sb.from('applications').select('*, institutes(name,city,id)').eq('id', id).maybeSingle(),
    S.sb.from('pipeline_steps').select('*').order('step_order'),
    S.sb.from('rejection_reasons').select('*'),
    S.sb.from('app_config').select('*'),
    S.sb.from('faq').select('*').eq('is_active', true).order('sort_order'),
  ]);
  if (!app) return mount(el('div', { class: 'empty' }, '—'));
  const [{ data: reqs }, { data: docs }, { data: events }] = await Promise.all([
    S.sb.from('requirements').select('*').or(`institute_id.is.null,institute_id.eq.${app.institutes.id}`).order('sort_order'),
    S.sb.from('application_documents').select('*').eq('application_id', id),
    S.sb.from('application_events').select('*').eq('application_id', id).order('created_at'),
  ]);
  const reasonMap = Object.fromEntries((reasons || []).map(r => [r.key, r]));
  const docMap = Object.fromEntries((docs || []).map(d => [d.requirement_key, d]));
  const cfg = Object.fromEntries((cfgRows || []).map(c => [c.key, c.value]));
  const curIdx = STEP_ORDER.indexOf(app.status);
  const reload = () => viewTracker(id);

  // المرحلة الأولى «تجهيز المستندات» — معالج نظيف مركّز بلا مشتتات
  if (app.status === 'documents') return documentsWizard(app, reqs || [], docMap, reasonMap, reload);

  const wrap = el('div');
  wrap.append(el('div', { class: 'back', onclick: () => go('#/my') }, '→ ' + t('back')));
  wrap.append(el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [
    el('h1', { class: 'page', style: 'margin:6px 0' }, pick(app.institutes.name)),
    el('span', { class: 'sp' }),
    supportNumber() ? el('button', { class: 'btn accent sm', onclick: () => window.contactSupport() }, '🟢 ' + t('supportBtn')) : null,
  ]));

  // شريط تقدّم مضغوط: «المرحلة X من N — العنوان»
  if (app.status !== 'rejected') {
    const total = STEP_ORDER.length;
    const stepNo = curIdx + 1;
    const curStep = (steps || []).find(s => s.status === app.status);
    const barPct = Math.round(stepNo / total * 100);
    wrap.append(el('div', { class: 'panel' }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;gap:10px;flex-wrap:wrap' }, [
        el('b', { style: 'font-size:15px' }, `${t('stageOf')} ${stepNo} ${t('ofWord')} ${total}${curStep ? ' — ' + pick(curStep.title) : ''}`),
        el('span', { class: 'muted', style: 'font-size:13px' }, barPct + (S.lang === 'ar' ? '٪' : '%')),
      ]),
      el('div', { style: 'height:10px;background:var(--surface-2);border-radius:20px;overflow:hidden' },
        el('div', { style: `height:100%;width:${barPct}%;background:var(--accent);transition:width .4s` })),
    ]));
  }

  // بطاقة المرحلة الحالية — محتوى مركّز بلا حشو
  wrap.append(stageCard(app, docMap, cfg, steps || [], reasonMap, reload));

  // أسئلة سياقية مختصرة (لمرحلة الطلب الحالية فقط)
  const rel = (faqs || []).filter(f => (f.context_tags || []).includes(app.status)).slice(0, 4);
  if (rel.length) {
    const fp = el('div', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, (S.lang === 'ar' ? 'أسئلة قد تهمّك' : 'Helpful answers')));
    rel.forEach(f => fp.append(el('details', { style: 'border-bottom:1px solid var(--line);padding:8px 0' }, [
      el('summary', { style: 'cursor:pointer;font-weight:600' }, pick(f.question)),
      el('p', { class: 'muted', style: 'margin:.5em 0 0' }, pick(f.answer)),
    ])));
    wrap.append(fp);
  }

  // timeline
  if (events && events.length) {
    const tl = el('div', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, t('timeline')));
    events.forEach(ev => tl.append(el('div', { style: 'padding:8px 0;border-bottom:1px solid var(--line)' }, [
      el('span', {}, pick(ev.title)),
      el('span', { class: 'muted', style: 'float:inline-end;font-size:13px' }, new Date(ev.created_at).toLocaleDateString(S.lang)),
    ])));
    wrap.append(tl);
  }
  mount(wrap);
}

/* ---------- signed download for a stored document ---------- */
async function openDoc(path) {
  if (!path) return;
  toast(S.lang === 'ar' ? 'جارٍ الفتح…' : 'Opening…');
  const { data, error } = await S.sb.storage.from('documents').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return toast(error?.message || 'error', 'err');
  window.open(data.signedUrl, '_blank', 'noopener');
}

// عنصر «سيتم التواصل معك واتساب» + إتاحة إضافة رقم آخر اختياري
function altContact() {
  const wrap = el('div', { style: 'margin-top:12px' });
  wrap.append(el('div', { class: 'muted', style: 'font-size:13.5px' }, '🟢 ' + t('contactVia')));
  const inp = el('input', { type: 'tel', dir: 'ltr', value: (S.profile && S.profile.alt_phone) || '', placeholder: t('altNumberPlaceholder'), style: 'max-width:260px' });
  const saveBtn = el('button', { class: 'btn ghost sm', style: 'margin-inline-start:8px' }, t('save'));
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    const val = inp.value.trim();
    const { error } = await S.sb.from('profiles').update({ alt_phone: val || null }).eq('id', S.user.id);
    saveBtn.disabled = false;
    if (error) return toast(error.message, 'err');
    if (S.profile) S.profile.alt_phone = val;
    toast(t('altSaved'), 'ok');
  };
  const form = el('div', { style: 'display:none;margin-top:8px' }, el('div', { class: 'row', style: 'align-items:center' }, [inp, saveBtn]));
  const toggle = el('button', { class: 'btn ghost sm', style: 'margin-top:8px' },
    '➕ ' + t('addAltNumber'));
  toggle.onclick = () => { form.style.display = form.style.display === 'none' ? 'block' : 'none'; };
  wrap.append(toggle, form);
  return wrap;
}

/* ============ المرحلة الثانية: بطاقة المرحلة المركّزة ============ */
function stageCard(app, docMap, cfg, steps, reasonMap, reload) {
  const box = el('div');
  const st = app.status;

  const msg = (emoji, title, body, extra) => el('div', { class: 'panel center', style: 'padding:26px 22px' }, [
    el('div', { style: 'font-size:52px;line-height:1' }, emoji),
    el('h2', { style: 'margin:.3em 0;font-weight:900' }, title),
    el('p', { class: 'muted', style: 'max-width:480px;margin:0 auto;line-height:1.7' }, body),
    extra || null,
  ]);

  if (st === 'rejected') {
    box.append(msg('⚠️', t('rejectedTitle'),
      app.notes || (S.lang === 'ar' ? 'نحتاج لمراجعة طلبك معك. تواصل مع الدعم لنكمل.' : 'We need to review your application with you. Contact support to continue.'),
      supportNumber() ? el('button', { class: 'btn accent', style: 'margin-top:16px', onclick: () => window.contactSupport() }, '🟢 ' + t('supportBtn')) : null));
    return box;
  }
  if (st === 'review' || st === 'submitted') {
    box.append(msg('🔎', t('underReviewTitle'), t('underReviewBody')));
    return box;
  }
  if (st === 'offer' || st === 'payment') {
    box.append(offerPanel(app, docMap, cfg, reload));
    return box;
  }
  if (st === 'visa') {
    box.append(visaProgressPanel(app));
    box.append(travelPanel(app, steps, cfg, reload));
    return box;
  }
  if (st === 'ticket') {
    box.append(msg('🎟️', t('ticketTitle'), t('ticketBody')));
    box.append(coordPanel(app));
    box.append(travelPanel(app, steps, cfg, reload));
    return box;
  }
  if (st === 'completed') {
    box.append(msg('🎓', t('completedTitle'), t('completedBody'),
      el('button', { class: 'btn', style: 'margin-top:16px', onclick: () => go('#/housing') }, '🏠 ' + t('browseHousing'))));
    return box;
  }
  return box;
}

// خطاب القبول + (للطلاب المحتاجين تأشيرة) رسوم المعهد ورفع الإيصال
function offerPanel(app, docMap, cfg, reload) {
  const offerDoc = docMap['offer_letter'];
  const receipt = docMap['payment_receipt'];
  const fees = Array.isArray(app.final_fees) ? app.final_fees : [];
  const pay = cfg['payment'] || {};
  const needsVisa = !visaPath(app.weeks).short;   // >90 يوماً = تحتاج تأشيرة = رسوم للمعهد
  const box = el('div');

  // بطاقة القبول + تحميل الخطاب
  box.append(el('div', { class: 'panel' }, [
    el('div', { style: 'text-align:center' }, [
      el('div', { style: 'font-size:46px;line-height:1' }, '🎉'),
      el('h2', { style: 'margin:.25em 0;font-weight:900' }, t('offerTitle')),
      el('p', { class: 'muted', style: 'max-width:480px;margin:0 auto;line-height:1.7' }, t('offerBody')),
    ]),
    (offerDoc && offerDoc.storage_path)
      ? el('button', { class: 'btn accent block', style: 'margin-top:16px', onclick: () => openDoc(offerDoc.storage_path) }, '⬇️ ' + t('downloadOffer'))
      : el('div', { class: 'action', style: 'margin-top:16px;text-align:center' }, t('offerPending')),
  ]));

  // الطالب المُعفى (دورة قصيرة ≤ 90 يوماً): لا رسوم ولا دفع — نستكمل عبر واتساب
  if (!needsVisa) {
    box.append(el('div', { class: 'panel', style: 'border:1px solid var(--ok)' }, [
      el('div', { style: 'display:flex;gap:12px;align-items:flex-start' }, [
        el('div', { style: 'font-size:30px' }, '🟢'),
        el('div', {}, [
          el('b', { style: 'font-size:16px' }, t('exemptTitle')),
          el('p', { class: 'muted', style: 'margin:.4em 0 0;line-height:1.7' }, t('exemptBody')),
        ]),
      ]),
      altContact(),
      supportNumber() ? el('button', { class: 'btn accent block', style: 'margin-top:14px', onclick: () => window.contactSupport() }, '🟢 ' + t('supportBtn')) : null,
    ]));
    return box;
  }

  // تنبيه: الدفع للمعهد والمنصّة لا تستقبل أموالاً
  if (pay.disclaimer) box.append(el('div', { class: 'action', style: 'display:flex;gap:10px;align-items:flex-start' }, [
    el('div', { style: 'font-size:20px' }, '🛈'),
    el('p', { style: 'margin:0;line-height:1.7' }, pick(pay.disclaimer)),
  ]));

  // رسوم تقديم التأشيرة (تُدفع للمعهد)
  if (fees.length || app.final_price_myr != null) {
    const rows = el('div');
    fees.forEach(fe => rows.append(el('div', { style: 'display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--line)' }, [
      el('span', {}, pick(fe.label)),
      el('b', { html: money(fe.amount) }),
    ])));
    box.append(el('div', { class: 'panel' }, [
      el('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:4px' }, [
        el('h3', { style: 'margin:0' }, '🧾 ' + t('feesTitle')),
        el('span', { class: 'badge info', style: 'font-size:12px' }, '🏛️ ' + t('paidToInstitute')),
      ]),
      rows,
      app.final_price_myr != null ? el('div', { style: 'display:flex;justify-content:space-between;gap:12px;padding:12px 0 0;font-size:17px' }, [
        el('b', {}, t('totalDue')),
        el('b', { style: 'color:var(--brand)', html: money(app.final_price_myr) }),
      ]) : null,
      el('div', { class: 'muted', style: 'font-size:12.5px;margin-top:8px' }, 'ℹ️ ' + t('feesNote')),
    ]));
  }

  // طريقة الدفع للمعهد (خطوات + رابط المعهد إن وُجد)
  {
    const steps = Array.isArray(pay.steps) ? pay.steps : [];
    const mp = el('div', { class: 'panel' }, [
      el('h3', { style: 'margin-top:0' }, '💳 ' + t('payTitle')),
      pay.note ? el('p', { class: 'muted', style: 'margin:.2em 0 12px' }, pick(pay.note)) : null,
    ]);
    if (steps.length) mp.append(el('ol', { style: 'margin:0;padding-inline-start:20px;line-height:1.95' }, steps.map(s => el('li', {}, pick(s)))));
    if (app.pay_url) mp.append(el('a', { class: 'btn accent block', style: 'margin-top:14px', href: app.pay_url, target: '_blank', rel: 'noopener' }, '🔗 ' + t('openPayLink')));
    box.append(mp);
  }

  // رفع إيصال الدفع
  const rp = el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, '📤 ' + t('receiptTitle')),
    (receipt && receipt.storage_path)
      ? el('div', { class: 'action', style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' }, [
          el('span', { class: 'badge on' }, '✓'),
          el('span', {}, t('receiptDone')),
          el('button', { class: 'btn ghost sm', onclick: () => openDoc(receipt.storage_path) }, '👁️'),
          el('button', { class: 'btn ghost sm', onclick: () => scanDoc({ key: 'payment_receipt' }, app, reload, false) }, t('redo')),
        ])
      : el('div', {}, [
          el('p', { class: 'muted', style: 'margin:.2em 0 12px' }, t('receiptHint')),
          el('div', { class: 'row' }, [
            el('button', { class: 'btn accent sm', onclick: () => scanDoc({ key: 'payment_receipt' }, app, reload, false) }, '📷 ' + t('scan')),
            (() => { const fi = el('input', { type: 'file', accept: 'image/*,.pdf', style: 'display:none' });
              fi.addEventListener('change', () => handleDocFile(fi, { key: 'payment_receipt', validation: { formats: ['pdf', 'jpg', 'jpeg', 'png'], max_mb: 10 } }, app, reload));
              return el('span', {}, [el('button', { class: 'btn ghost sm', onclick: () => fi.click() }, '📎 ' + t('uploadFile')), fi]); })(),
          ]),
        ]),
  ]);
  box.append(rp);

  if (app.status === 'payment' && !(receipt && receipt.storage_path)) {
    box.append(el('div', { class: 'action', style: 'margin-top:2px' }, 'ℹ️ ' + t('paymentReviewBody')));
  }
  return box;
}

// شريط تقدّم معاملة EMGS + رسالة التنسيق عند 70%
function visaProgressPanel(app) {
  const p = Math.max(0, Math.min(100, app.emgs_progress || 0));
  const box = el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, '🛂 ' + t('visaTitle')),
    el('p', { class: 'muted', style: 'margin:.2em 0 14px' }, t('visaBody')),
    el('div', { style: 'display:flex;justify-content:space-between;margin-bottom:6px' }, [
      el('b', {}, t('emgsProgressLbl')),
      el('b', { style: 'color:var(--brand)' }, p + (S.lang === 'ar' ? '٪' : '%')),
    ]),
    el('div', { style: 'height:14px;background:var(--surface-2);border-radius:20px;overflow:hidden' },
      el('div', { style: `height:100%;width:${p}%;background:linear-gradient(90deg,var(--accent),var(--brand));transition:width .5s` })),
  ]);
  if (p >= 70) box.append(coordPanel(app, true));
  return box;
}

// بطاقة التنسيق للخطوات الأخيرة (e-Visa / المطار / السكن)
function coordPanel(app, inline) {
  const items = [
    ['🆔', S.lang === 'ar' ? 'التأشيرة الإلكترونية (e-Visa)' : 'e-Visa', S.lang === 'ar' ? 'نجهّزها لك ونرسلها فور صدورها.' : 'We prepare and send it once issued.'],
    ['✈️', S.lang === 'ar' ? 'استقبال المطار' : 'Airport pickup', S.lang === 'ar' ? 'ننسّق استقبالك عند وصولك.' : 'We arrange your pickup on arrival.'],
    ['🏠', t('housingHelp'), t('housingHelpBody')],
  ];
  const list = el('div', { style: 'margin-top:12px;display:grid;gap:10px' });
  items.forEach(([ic, ttl, sub]) => list.append(el('div', { style: 'display:flex;gap:12px;align-items:flex-start' }, [
    el('div', { style: 'font-size:24px;flex:0 0 auto' }, ic),
    el('div', {}, [el('b', {}, ttl), el('div', { class: 'muted', style: 'font-size:13.5px' }, sub)]),
  ])));
  return el('div', { class: inline ? 'action' : 'panel', style: inline ? 'margin-top:14px' : '' }, [
    el('b', { style: 'font-size:16px' }, t('coordTitle')),
    el('p', { class: 'muted', style: 'margin:.4em 0 0;line-height:1.7' }, t('coordBody')),
    list,
    altContact(),
    el('button', { class: 'btn ghost sm', style: 'margin-top:12px', onclick: () => go('#/housing') }, '🏠 ' + t('browseHousing')),
  ]);
}

function docRow(r, doc, reasonMap, app, reload) {
  const status = doc?.status;
  let badge;
  if (status === 'approved') badge = el('span', { class: 'badge on' }, t('approved'));
  else if (status === 'rejected') badge = el('span', { class: 'badge off' }, t('rejected'));
  else if (doc) badge = el('span', { class: 'badge warn' }, t('pending'));
  else badge = el('span', { class: 'badge', style: 'background:var(--chip);color:var(--muted)' }, t('notUploaded'));

  const v = r.validation || {};
  const hint = [];
  if (Array.isArray(v.formats) && v.formats.length) hint.push(v.formats.join('/').toUpperCase());
  if (v.max_mb) hint.push('≤' + v.max_mb + 'MB');

  const row = el('div', { class: 'doc' }, [
    el('div', { class: 'dinfo' }, [
      el('b', {}, pick(r.name)), ' ', badge,
      r.description ? el('div', { class: 'muted', style: 'font-size:13px' }, pick(r.description)) : null,
      hint.length ? el('div', { class: 'muted', style: 'font-size:12px' }, '📎 ' + hint.join(' · ')) : null,
      (status === 'rejected' && doc.rejection_key && reasonMap[doc.rejection_key])
        ? el('div', { class: 'fix' }, [el('b', {}, '⚠️ ' + pick(reasonMap[doc.rejection_key].title) + ': '), pick(reasonMap[doc.rejection_key].fix)]) : null,
    ]),
  ]);

  if (status === 'approved') return row;

  if (r.input_type === 'file') {
    const fi = el('input', { type: 'file', accept: '.pdf,.jpg,.jpeg,.png', style: 'display:none' });
    fi.addEventListener('change', async () => {
      const f = fi.files[0]; if (!f) return;
      const chk = validateFile(f, v);
      if (!chk.ok) { fi.value = ''; return toast('⚠️ ' + chk.msg, 'err'); }
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${S.user.id}/${app.id}/${r.key}.${ext}`;
      toast(S.lang === 'ar' ? 'جارٍ الرفع…' : 'Uploading…');
      const { error: upErr } = await S.sb.storage.from('documents').upload(path, f, { upsert: true, contentType: f.type });
      if (upErr) return toast('تعذّر الرفع: ' + upErr.message, 'err');
      const { error } = await S.sb.from('application_documents').upsert(
        { application_id: app.id, requirement_key: r.key, storage_path: path },
        { onConflict: 'application_id,requirement_key' });
      if (error) return toast('خطأ: ' + error.message, 'err');
      toast(t('uploaded'), 'ok'); reload();
    });
    const actions = el('div', { class: 'row', style: 'gap:8px' });
    // ⭐ صورة شخصية: زر التعديل بالذكاء الاصطناعي
    if (r.key === 'photo') {
      actions.append(el('button', { class: 'btn sm accent', onclick: () => enhancePhoto(app, reload) },
        '✨ ' + (S.lang === 'ar' ? 'عدّلها تلقائياً' : 'Auto-fix')));
    }
    actions.append(el('button', { class: 'btn ghost sm', onclick: () => fi.click() }, '⤒ ' + t('upload')), fi);
    row.append(actions);
  } else {
    const inp = el('input', { type: r.input_type === 'date' ? 'date' : 'text', value: doc?.value_text || '', style: 'max-width:200px' });
    row.append(inp, el('button', {
      class: 'btn sm', onclick: async () => {
        if (!inp.value) return;
        const { error } = await S.sb.from('application_documents').upsert(
          { application_id: app.id, requirement_key: r.key, value_text: inp.value },
          { onConflict: 'application_id,requirement_key' });
        toast(error ? error.message : t('ok'), error ? 'err' : 'ok'); if (!error) reload();
      },
    }, t('save_text')));
  }
  return row;
}

/* ============================================================
 * المرحلة الأولى: معالج تجهيز المستندات (نظيف، بلا مشتتات)
 * ============================================================ */
function documentsWizard(app, reqs, docMap, reasonMap, reload) {
  const isReady = r => { const d = docMap[r.key]; return !!(d && d.status !== 'rejected' && (d.storage_path || d.value_text)); };
  // مستندات هذه المرحلة فقط (نستبعد الموقوتة/الخارجية مثل MDAC)
  const stageReqs = reqs.filter(r => { const v = r.validation || {}; return !v.time_gated && !v.external; });
  const required = stageReqs.filter(r => r.is_required !== false);
  const readyN = required.filter(isReady).length;
  const allReady = required.length > 0 && readyN === required.length;

  const wrap = el('div');
  wrap.append(el('div', { class: 'back', onclick: () => go('#/my') }, '→ ' + t('back')));
  wrap.append(el('div', { class: 'panel' }, [
    el('h1', { class: 'page', style: 'margin:0 0 6px' }, pick(app.institutes.name)),
    el('p', { class: 'muted', style: 'margin:0;font-size:14.5px' }, t('docsIntro')),
    el('div', { style: 'margin-top:14px;display:flex;justify-content:space-between;font-size:14px' }, [
      el('b', {}, t('ready')), el('span', { class: 'muted' }, `${readyN}/${required.length}`),
    ]),
    el('div', { style: 'height:10px;background:var(--surface-2);border-radius:20px;overflow:hidden;margin-top:6px' },
      el('div', { style: `height:100%;width:${required.length ? Math.round(readyN / required.length * 100) : 0}%;background:var(--ok);transition:.4s` })),
  ]));

  let n = 0;
  stageReqs.forEach(r => wrap.append(docStepCard(r, ++n, docMap[r.key], reasonMap, app, reload)));

  const submit = el('button', {
    class: 'btn accent block', disabled: allReady ? null : '',
    onclick: async () => {
      if (!allReady) return;
      submit.disabled = true;
      const { error } = await S.sb.from('applications').update({ status: 'review' }).eq('id', app.id);
      if (error) { submit.disabled = false; return toast(error.message, 'err'); }
      mount(el('div', { class: 'panel center', style: 'max-width:520px;margin:34px auto' }, [
        el('div', { style: 'font-size:60px' }, '✅'),
        el('h2', { style: 'margin:.2em 0;font-weight:900' }, t('docsDoneTitle')),
        el('p', { class: 'muted' }, t('docsDoneBody')),
        el('button', { class: 'btn block', style: 'margin-top:18px', onclick: () => go('#/my') }, t('myApps')),
      ]));
    },
  }, allReady ? ('📨 ' + t('submitDocs')) : t('completeFirst'));
  wrap.append(el('div', { class: 'panel' }, submit));
  mount(wrap);
}

function docStepCard(r, num, doc, reasonMap, app, reload) {
  const ready = !!(doc && doc.status !== 'rejected' && (doc.storage_path || doc.value_text));
  const rejected = doc && doc.status === 'rejected';
  const isFile = (r.input_type || 'file') === 'file';
  const multi = r.key === 'passport';

  const num_el = el('div', { style: `width:36px;height:36px;flex:0 0 36px;border-radius:50%;display:grid;place-items:center;font-weight:900;${ready ? 'background:var(--ok);color:#fff' : 'background:var(--surface-2);color:var(--muted)'}` }, ready ? '✓' : String(num));
  const body = el('div', { style: 'flex:1;min-width:0' }, [
    el('b', { style: 'font-size:16px' }, pick(r.name)),
    r.description ? el('div', { class: 'muted', style: 'font-size:13.5px;margin:.3em 0' }, pick(r.description)) : null,
    multi ? el('div', { class: 'muted', style: 'font-size:12.5px' }, '📄 ' + t('allPages')) : null,
    (rejected && doc.rejection_key && reasonMap[doc.rejection_key])
      ? el('div', { class: 'fix' }, [el('b', {}, '⚠️ ' + pick(reasonMap[doc.rejection_key].title) + ': '), pick(reasonMap[doc.rejection_key].fix)]) : null,
  ]);

  const acts = el('div', { class: 'row', style: 'margin-top:10px' });
  if (isFile) {
    if (ready) {
      acts.append(el('span', { class: 'badge on', style: 'align-self:center' }, '✓ ' + t('readyBadge')));
      acts.append(el('button', { class: 'btn ghost sm', onclick: () => scanDoc(r, app, reload, multi) }, t('redo')));
    } else {
      acts.append(el('button', { class: 'btn accent sm', onclick: () => scanDoc(r, app, reload, multi) }, '📷 ' + t('scan')));
      const fi = el('input', { type: 'file', accept: 'image/*,.pdf', style: 'display:none' });
      fi.addEventListener('change', () => handleDocFile(fi, r, app, reload));
      acts.append(el('button', { class: 'btn ghost sm', onclick: () => fi.click() }, '📎 ' + t('uploadFile')), fi);
    }
  } else {
    // date / text requirement
    const inp = el('input', { type: r.input_type === 'date' ? 'date' : 'text', value: doc?.value_text || '', style: 'max-width:220px' });
    acts.append(inp, el('button', {
      class: 'btn sm', onclick: async () => {
        if (!inp.value) return;
        const { error } = await S.sb.from('application_documents').upsert(
          { application_id: app.id, requirement_key: r.key, value_text: inp.value }, { onConflict: 'application_id,requirement_key' });
        toast(error ? error.message : t('ok'), error ? 'err' : 'ok'); if (!error) reload();
      },
    }, t('save_text')));
  }
  body.append(acts);
  return el('div', { class: 'panel', style: 'display:flex;gap:14px;align-items:flex-start' }, [num_el, body]);
}

async function uploadDoc(blob, ext, contentType, r, app, reload) {
  const path = `${S.user.id}/${app.id}/${r.key}.${ext}`;
  toast(S.lang === 'ar' ? 'جارٍ الرفع…' : 'Uploading…');
  const { error: up } = await S.sb.storage.from('documents').upload(path, blob, { upsert: true, contentType });
  if (up) return toast(up.message, 'err');
  const { error } = await S.sb.from('application_documents').upsert(
    { application_id: app.id, requirement_key: r.key, storage_path: path }, { onConflict: 'application_id,requirement_key' });
  if (error) return toast(error.message, 'err');
  toast(t('uploaded'), 'ok'); reload();
}

async function handleDocFile(fi, r, app, reload) {
  const f = fi.files[0]; if (!f) return;
  const chk = validateFile(f, r.validation || {}); if (!chk.ok) { fi.value = ''; return toast('⚠️ ' + chk.msg, 'err'); }
  const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
  await uploadDoc(f, ext, f.type, r, app, reload);
}

// دمج الصفحات الملتقطة في ملف PDF واحد
function buildScanPdf(pages) {
  const JsPDF = window.jspdf && window.jspdf.jsPDF;
  const pdf = new JsPDF({ unit: 'pt', format: 'a4' });
  const PW = pdf.internal.pageSize.getWidth(), PH = pdf.internal.pageSize.getHeight(), M = 18;
  pages.forEach((p, i) => {
    if (i) pdf.addPage();
    const maxW = PW - M * 2, maxH = PH - M * 2;
    let w = maxW, h = w * p.h / p.w;
    if (h > maxH) { h = maxH; w = h * p.w / p.h; }
    pdf.addImage(p.data, 'JPEG', (PW - w) / 2, (PH - h) / 2, w, h);
  });
  return pdf.output('blob');
}

/* ---------- 📷 camera document scanner (frame + lighting + multi-page → PDF) ---------- */
async function scanDoc(r, app, reload, multi) {
  if (!(window.jspdf && window.jspdf.jsPDF)) return toast(S.lang === 'ar' ? 'مكتبة PDF لم تُحمّل — استخدم رفع ملف.' : 'PDF lib not loaded.', 'err');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
  } catch (e) { return toast(t('camFail'), 'err'); }

  const root = $('#modalRoot');
  const pages = [];
  const video = el('video', { autoplay: '', muted: '' });
  video.setAttribute('playsinline', ''); video.playsInline = true; video.muted = true; video.srcObject = stream;
  const lite = el('div', { class: 'scan-lite' }, '…');
  const thumbs = el('div', { class: 'scan-thumbs' });
  const stage = el('div', { class: 'scan-stage' }, [
    video,
    el('div', { class: 'scan-frame' }, [el('span', { class: 'c1' }), el('span', { class: 'c2' }), el('span', { class: 'c3' }), el('span', { class: 'c4' })]),
    lite,
    el('div', { class: 'scan-hint' }, multi ? t('allPages') : t('alignHint')),
    el('button', { class: 'scan-x', onclick: close }, '×'),
  ]);
  const shutter = el('button', { class: 'shutter', 'aria-label': t('capture'), onclick: capture });
  const saveBtn = el('button', { class: 'btn accent', style: 'min-width:96px;visibility:hidden', onclick: finish }, t('saveDoc'));
  const ctrl = el('div', { class: 'scan-ctrl' }, [
    el('div', { style: 'flex:1;color:#93a0b5;font-size:13px' }, multi ? (S.lang === 'ar' ? 'صفحة صفحة' : 'page by page') : ''),
    shutter,
    el('div', { style: 'flex:1;text-align:end' }, saveBtn),
  ]);
  root.innerHTML = ''; root.append(el('div', { class: 'scanwrap' }, [stage, thumbs, ctrl]));
  video.play().catch(() => {});

  const lc = document.createElement('canvas'); lc.width = 48; lc.height = 36;
  const lx = lc.getContext('2d');
  const timer = setInterval(() => {
    if (!video.videoWidth) return;
    try {
      lx.drawImage(video, 0, 0, 48, 36);
      const d = lx.getImageData(0, 0, 48, 36).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      const good = s / (d.length / 4) >= 75;
      lite.className = 'scan-lite ' + (good ? 'good' : 'low');
      lite.textContent = good ? '💡 ' + t('lightGood') : '🔅 ' + t('lightLow');
    } catch (_) {}
  }, 500);

  function capture() {
    if (!video.videoWidth) return;
    if (!multi) { pages.length = 0; thumbs.innerHTML = ''; }
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
    const x = c.getContext('2d');
    x.filter = 'contrast(1.12) saturate(1.05) brightness(1.03)';
    x.drawImage(video, 0, 0, c.width, c.height);
    const data = c.toDataURL('image/jpeg', 0.82);
    pages.push({ data, w: c.width, h: c.height });
    thumbs.append(el('div', { class: 'th' }, [el('img', { src: data }), el('div', { class: 'pg' }, String(pages.length))]));
    thumbs.scrollLeft = thumbs.scrollWidth;
    saveBtn.style.visibility = 'visible';
  }
  async function finish() {
    if (!pages.length) return;
    const list = pages.slice(); cleanup();
    toast(t('building'));
    try { await uploadDoc(buildScanPdf(list), 'pdf', 'application/pdf', r, app, reload); }
    catch (e) { toast(String(e), 'err'); }
  }
  function cleanup() { clearInterval(timer); stream.getTracks().forEach(tr => tr.stop()); root.innerHTML = ''; }
  function close() { cleanup(); }
}

/* ---------- ✨ AI photo enhancement (photo-passport function) ---------- */
function enhancePhoto(app, reload) {
  const fi = el('input', { type: 'file', accept: 'image/*' });
  fi.onchange = async () => {
    const f = fi.files[0]; if (!f) return;
    toast(S.lang === 'ar' ? '✨ جارٍ معالجة صورتك…' : '✨ Enhancing your photo…');
    let base64; try { base64 = await fileToBase64(f); } catch { return toast('تعذّر قراءة الصورة', 'err'); }
    const { data, error } = await S.sb.functions.invoke('photo-passport', { body: { imageBase64: base64, applicationId: app.id } });
    if (error || !data || data.error) {
      return toast(S.lang === 'ar'
        ? 'ميزة تعديل الصورة تحتاج تفعيلاً من الإدارة (دالة photo-passport).'
        : 'Photo enhancement is not enabled yet.', 'err');
    }
    photoPreview(data.preview, data.path, app, reload);
  };
  fi.click();
}
function photoPreview(previewUrl, path, app, reload) {
  const root = $('#modalRoot');
  const overlay = el('div', { class: 'overlay', onclick: e => { if (e.target === overlay) root.innerHTML = ''; } });
  overlay.append(el('div', { class: 'modal center' }, [
    el('h2', {}, S.lang === 'ar' ? 'صورتك جاهزة ✨' : 'Your photo is ready ✨'),
    el('p', { class: 'muted' }, S.lang === 'ar' ? 'خلفية بيضاء ومقاس صورة الجواز (35×45مم).' : 'White background, passport size.'),
    el('img', { src: previewUrl, style: 'width:170px;height:auto;border-radius:12px;margin:12px auto;border:1px solid var(--line)' }),
    el('button', {
      class: 'btn accent block', onclick: async () => {
        const { error } = await S.sb.from('application_documents').upsert(
          { application_id: app.id, requirement_key: 'photo', storage_path: path },
          { onConflict: 'application_id,requirement_key' });
        root.innerHTML = ''; toast(error ? error.message : t('uploaded'), error ? 'err' : 'ok'); if (!error) reload();
      },
    }, S.lang === 'ar' ? 'استخدم هذه الصورة' : 'Use this photo'),
    el('button', { class: 'btn ghost block', style: 'margin-top:8px', onclick: () => { root.innerHTML = ''; } },
      S.lang === 'ar' ? 'إعادة المحاولة' : 'Try another'),
  ]));
  root.innerHTML = ''; root.append(overlay);
}

/* ---------- 🛂 Visa (EMGS) + travel + MDAC panel ---------- */
function travelPanel(app, steps, cfg, reload) {
  const visaStep = steps.find(s => s.status === 'visa');
  const mdac = cfg['mdac'] || {};
  const entryPoints = mdac.entry_points || [];

  const arrival = el('input', { type: 'date', value: app.arrival_date || '' });
  const flight = el('input', { value: app.flight_number || '', placeholder: 'MH123' });
  const entry = el('select', {});
  entry.append(el('option', { value: '' }, '—'));
  entryPoints.forEach(p => entry.append(el('option', { value: p, selected: p === app.entry_point ? '' : null }, p)));
  const addr = el('textarea', { placeholder: S.lang === 'ar' ? 'عنوان سكنك في ماليزيا' : 'Your address in Malaysia' });
  addr.value = app.address_my || '';
  const mdacDone = el('input', { type: 'checkbox' }); mdacDone.checked = !!app.mdac_done;
  const mdacRef = el('input', { value: app.mdac_ref || '', placeholder: S.lang === 'ar' ? 'الرقم المرجعي بعد التقديم' : 'Reference after submission' });

  const panel = el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, '🛂 ' + (S.lang === 'ar' ? 'التأشيرة (EMGS) والوصول' : 'Visa (EMGS) & arrival')),
    visaStep ? el('p', { class: 'muted', style: 'font-size:14px' }, pick(visaStep.explanation)) : null,

    // MDAC card
    el('div', { class: 'action', style: 'margin:10px 0' }, [
      el('b', {}, '🪪 ' + (S.lang === 'ar' ? 'بطاقة الوصول الرقمية (MDAC)' : 'Digital Arrival Card (MDAC)')),
      el('p', { class: 'muted', style: 'font-size:13.5px;margin:.4em 0' }, S.lang === 'ar'
        ? `إجراء حكومي مجاني إلزامي، يُقدَّم خلال ${mdac.window_days || 3} أيام فقط قبل الوصول عبر البوابة الرسمية. أي موقع يطلب رسوماً احتيالي.`
        : `A free mandatory step, submitted only within ${mdac.window_days || 3} days before arrival on the official portal.`),
      mdac.official_url ? el('a', { class: 'btn ghost sm', href: mdac.official_url, target: '_blank', rel: 'noopener' },
        '🔗 ' + (S.lang === 'ar' ? 'البوابة الرسمية لـ MDAC' : 'Official MDAC portal')) : null,
    ]),

    el('div', { class: 'row' }, [
      el('div', { style: 'flex:1;min-width:150px' }, [el('label', {}, S.lang === 'ar' ? 'تاريخ الوصول' : 'Arrival date'), arrival]),
      el('div', { style: 'flex:1;min-width:150px' }, [el('label', {}, S.lang === 'ar' ? 'رقم الرحلة' : 'Flight number'), flight]),
    ]),
    el('div', { class: 'row' }, [
      el('div', { style: 'flex:1;min-width:150px' }, [el('label', {}, S.lang === 'ar' ? 'منفذ الدخول' : 'Entry point'), entry]),
    ]),
    el('label', {}, S.lang === 'ar' ? 'العنوان في ماليزيا' : 'Address in Malaysia'), addr,
    el('label', { style: 'display:flex;align-items:center;gap:8px;margin-top:12px' }, [mdacDone, el('span', {}, S.lang === 'ar' ? 'قدّمت بطاقة MDAC' : 'MDAC submitted')]),
    mdacRef,
    el('button', {
      class: 'btn block', style: 'margin-top:14px',
      onclick: async (e) => {
        e.target.disabled = true;
        const { error } = await S.sb.from('applications').update({
          arrival_date: arrival.value || null, flight_number: flight.value || null,
          entry_point: entry.value || null, address_my: addr.value || null,
          mdac_done: mdacDone.checked, mdac_ref: mdacRef.value || null,
        }).eq('id', app.id);
        e.target.disabled = false;
        toast(error ? ('تعذّر الحفظ: ' + error.message) : t('ok'), error ? 'err' : 'ok');
        if (!error) reload();
      },
    }, S.lang === 'ar' ? 'حفظ بيانات السفر' : 'Save travel details'),
  ]);
  return panel;
}

/* ---------- PROFILE ---------- */
async function viewProfile() {
  if (!S.user) { openAuth('#/profile'); return; }
  spinner();
  await loadProfile();
  const p = S.profile || {};
  const name = el('input', { value: p.full_name || '' });
  const phone = el('input', { value: p.phone || '' });
  const altPhone = el('input', { type: 'tel', dir: 'ltr', value: p.alt_phone || '' });
  const country = el('input', { value: p.country || '' });
  const wrap = el('div');
  wrap.append(el('h1', { class: 'page' }, t('profile')));
  wrap.append(el('div', { class: 'panel', style: 'max-width:520px' }, [
    el('label', {}, t('fullName')), name,
    el('label', {}, '🟢 ' + t('whatsapp')), phone,
    el('div', { class: 'muted', style: 'font-size:13px' }, t('whatsappHint')),
    el('label', {}, t('altPhoneLabel')), altPhone,
    el('label', {}, t('country')), country,
    el('div', { class: 'muted', style: 'margin-top:10px' }, S.user.email),
    el('button', {
      class: 'btn block', style: 'margin-top:18px',
      onclick: async () => {
        const { error } = await S.sb.from('profiles').update(
          { full_name: name.value, phone: phone.value, alt_phone: altPhone.value.trim() || null, country: country.value }).eq('id', S.user.id);
        if (!error && S.profile) S.profile.alt_phone = altPhone.value.trim();
        toast(error ? error.message : t('ok'), error ? 'err' : 'ok');
      },
    }, t('save')),
    el('button', { class: 'btn ghost block', style: 'margin-top:10px', onclick: () => go('#/my') }, '📝 ' + t('myApps')),
    el('button', { class: 'btn ghost block', style: 'margin-top:10px', onclick: doLogout }, t('logout')),
  ]));
  mount(wrap);
}

/* ---------- HOUSING ---------- */
async function viewHousing() {
  spinner();
  const { data } = await S.sb.from('listings').select('*').eq('is_active', true).order('sort_order');
  const wrap = el('div');
  wrap.append(el('h1', { class: 'page' }, t('housing')));
  if (!data || !data.length) { wrap.append(el('div', { class: 'empty' }, '—')); return mount(wrap); }
  const grid = el('div', { class: 'grid' });
  data.forEach(l => grid.append(el('div', { class: 'card' }, [
    el('div', { class: 'thumb' }, (l.images && l.images[0]) ? el('img', { src: l.images[0], style: 'height:100%;width:100%;object-fit:cover' }) : '🏠'),
    el('div', { class: 'body' }, [
      el('h3', {}, pick(l.title)),
      el('div', { class: 'city' }, '📍 ' + pick(l.city)),
      el('div', { class: 'price', html: money(l.price_myr) + ` <small>${t('perMonth')}</small>` }),
      l.whatsapp ? el('a', { class: 'btn ghost sm', href: 'https://wa.me/' + l.whatsapp, target: '_blank' }, '🟢 ' + t('contact')) : null,
    ]),
  ])));
  wrap.append(grid);
  mount(wrap);
}

/* ---------- AUTH modal ---------- */
function openAuth(redirect) {
  const root = $('#modalRoot');
  let mode = 'login';
  const nameI = el('input', { placeholder: t('fullName') });
  const emailI = el('input', { type: 'email', placeholder: t('email') });
  const passI = el('input', { type: 'password', placeholder: t('password') });
  const msg = el('div', { class: 'muted', style: 'font-size:14px;margin-top:8px' });

  const overlay = el('div', { class: 'overlay', onclick: e => { if (e.target === overlay) root.innerHTML = ''; } });
  const nameField = el('div', {}, [el('label', {}, t('fullName')), nameI]);
  const tabLogin = el('div', { class: 'tab active' }, t('login'));
  const tabReg = el('div', { class: 'tab' }, t('register'));
  const submit = el('button', { class: 'btn block', style: 'margin-top:16px' }, t('login'));

  function setMode(m) {
    mode = m;
    tabLogin.classList.toggle('active', m === 'login');
    tabReg.classList.toggle('active', m === 'register');
    nameField.style.display = m === 'register' ? '' : 'none';
    submit.textContent = m === 'register' ? t('register') : t('login');
  }
  tabLogin.onclick = () => setMode('login');
  tabReg.onclick = () => setMode('register');

  submit.onclick = async () => {
    msg.textContent = '';
    if (!emailI.value || !passI.value) { msg.textContent = '—'; return; }
    submit.disabled = true;
    try {
      if (mode === 'register') {
        const { data, error } = await S.sb.auth.signUp({
          email: emailI.value.trim(), password: passI.value,
          options: { data: { full_name: nameI.value.trim() } },
        });
        if (error) throw error;
        if (!data.session) {   // email confirmation is ON
          msg.textContent = S.lang === 'ar'
            ? 'تم إنشاء الحساب — فعّل بريدك ثم سجّل الدخول.'
            : 'Account created — confirm your email, then log in.';
          setMode('login'); submit.disabled = false; return;
        }
        S.user = data.session.user;
      } else {
        const { data, error } = await S.sb.auth.signInWithPassword({ email: emailI.value.trim(), password: passI.value });
        if (error) throw error;
        S.user = data.user;
      }
      if (S.user) await loadProfile();
      renderHeader();
      root.innerHTML = '';
      toast(t('ok'), 'ok');
      // setting the same hash won't fire hashchange, so re-route explicitly
      if (redirect && location.hash !== redirect) go(redirect); else route();
    } catch (e) { msg.textContent = e.message; }
    finally { submit.disabled = false; }
  };

  const brand = el('img', { class: 'modal-logo', src: '/assets/edulink-full.jpg', alt: 'EduLink' });
  brand.onerror = () => brand.remove();
  const modal = el('div', { class: 'modal' }, [
    brand,
    el('h2', {}, 'إيدولينك'),
    el('div', { class: 'muted' }, t('loginNeeded')),
    el('div', { class: 'tabs' }, [tabLogin, tabReg]),
    nameField,
    el('label', {}, t('email')), emailI,
    el('label', {}, t('password')), passI,
    submit, msg,
  ]);
  overlay.append(modal); root.innerHTML = ''; root.append(overlay);
  setMode('login');
}

async function doLogout() { await S.sb.auth.signOut(); go('#/'); }

/* ---------- 💬 floating AI assistant (assistant function) ---------- */
function mountAssistant() {
  if (document.getElementById('eduFab')) return;
  const fab = el('button', { class: 'fab', id: 'eduFab', title: 'مساعد', 'aria-label': 'مساعد' }, '💬');
  document.body.append(fab);
  let panel = null;
  fab.onclick = () => {
    if (panel) { panel.remove(); panel = null; fab.textContent = '💬'; return; }
    fab.textContent = '✕';
    const body = el('div', { class: 'chat-body' });
    const input = el('input', { placeholder: S.lang === 'ar' ? 'اسأل عن أي خطوة…' : 'Ask anything…' });
    const send = async () => {
      const q = input.value.trim(); if (!q) return;
      if (!S.user) { toast(S.lang === 'ar' ? 'سجّل الدخول لاستخدام المساعد' : 'Log in to use the assistant', 'err'); openAuth(location.hash); return; }
      input.value = '';
      body.append(el('div', { class: 'msg u' }, q)); body.scrollTop = body.scrollHeight;
      const thinking = el('div', { class: 'msg a' }, '…'); body.append(thinking); body.scrollTop = body.scrollHeight;
      const { data, error } = await S.sb.functions.invoke('assistant', { body: { message: q, lang: S.lang } });
      thinking.textContent = (error || !data || data.error || !data.reply)
        ? (S.lang === 'ar' ? 'المساعد غير مفعّل حالياً (يتطلّب نشر دالة assistant).' : 'Assistant is not enabled yet.')
        : data.reply;
      body.scrollTop = body.scrollHeight;
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    const head = el('div', { class: 'chat-head' }, ['🎓 ', S.lang === 'ar' ? 'مرشد إيدولينك' : 'EduLink guide']);
    if (supportNumber()) {
      head.append(el('span', { class: 'sp', style: 'flex:1' }));
      head.append(el('a', { class: 'link', style: 'font-size:13px;color:var(--accent);cursor:pointer', onclick: () => window.contactSupport() }, '🟢 ' + (S.lang === 'ar' ? 'دعم بشري' : 'Human support')));
    }
    panel = el('div', { class: 'chat' }, [
      head,
      body,
      el('div', { class: 'chat-foot' }, [input, el('button', { class: 'btn sm', onclick: send }, '➤')]),
    ]);
    body.append(el('div', { class: 'msg a' }, S.lang === 'ar' ? 'أهلاً! اسألني عن أي خطوة في تسجيلك.' : 'Hi! Ask me about any step in your application.'));
    document.body.append(panel); input.focus();
  };
}

/* ---------- go ---------- */
window.go = go;
init().then(mountAssistant);
