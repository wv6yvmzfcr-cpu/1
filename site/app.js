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
const mount = node => { const a = $('#app'); a.innerHTML = ''; a.append(node); window.scrollTo(0, 0); };
const spinner = () => { $('#app').innerHTML = '<div class="spin"></div>'; };

/* ---------- state ---------- */
const S = {
  sb: null, user: null, profile: null,
  lang: localStorage.getItem('edu_lang') || 'ar',
  currency: null, currencies: [],
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
    startNow: 'ابدأ التقديم الآن', checkPath: 'اعرف مسارك: كم أسبوعاً تنوي الدراسة؟',
    theSteps: 'خطوات التقديم', commonQs: 'أسئلة شائعة',
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
    startNow: 'Start applying', checkPath: 'Find your path: how many weeks will you study?',
    theSteps: 'Application steps', commonQs: 'Common questions',
  },
};
const t = k => (T[S.lang] && T[S.lang][k]) || T.ar[k] || k;
const pick = o => { if (o == null) return ''; if (typeof o !== 'object') return String(o);
  return o[S.lang] || o.ar || o.en || Object.values(o).find(Boolean) || ''; };

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

  S.sb.auth.onAuthStateChange((_e, sess) => {
    S.user = sess?.user || null;
    if (S.user) loadProfile().then(renderHeader);
    else { S.profile = null; renderHeader(); }
  });

  renderHeader();
  window.addEventListener('hashchange', route);
  route();
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

/* ---------- header ---------- */
function renderHeader() {
  const area = $('#authArea');
  area.innerHTML = '';
  $('#langBtn').textContent = S.lang === 'ar' ? 'EN' : 'ع';
  if (S.user) {
    area.append(
      el('a', { class: 'link', onclick: () => go('#/my') }, t('myApps')),
      el('button', { class: 'btn ghost sm', onclick: doLogout }, t('logout')),
    );
  } else {
    area.append(el('button', { class: 'btn sm', onclick: openAuth }, t('login')));
  }
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
function route() {
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
  spinner();
  const { data: insts, error } = await S.sb.from('institutes').select('*').eq('is_active', true).order('sort_order');
  if (error) return mount(el('div', { class: 'empty' }, 'تعذّر تحميل المعاهد: ' + error.message));
  const list = insts || [];
  const cities = [...new Map(list.map(i => [i.city_key, pick(i.city)])).entries()];

  const wrap = el('div');
  wrap.append(el('div', { class: 'hero' }, [
    el('h1', {}, t('heroTitle')),
    el('p', {}, t('heroSub')),
    el('button', { class: 'btn', onclick: () => document.getElementById('list').scrollIntoView({ behavior: 'smooth' }) }, t('browse')),
  ]));

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
  const tags = (i.tags || []).slice(0, 3).map(x => el('span', { class: 'tag' }, pick(x)));
  return el('div', { class: 'card', onclick: () => go('#/institute/' + i.slug) }, [
    el('div', { class: 'thumb' }, (i.images && i.images[0]) ? el('img', { src: i.images[0], style: 'height:100%;width:100%;object-fit:cover', alt: pick(i.name) }) : '🏫'),
    el('div', { class: 'body' }, [
      el('h3', {}, pick(i.name)),
      el('div', { class: 'city' }, '📍 ' + pick(i.city)),
      el('div', { class: 'tags' }, tags),
      el('div', { class: 'price', html: money(i.price_month_myr) + ` <small>${t('perMonth')}</small>` + (i.price_estimated ? `<span class="est">${t('estimated')}</span>` : '') }),
    ]),
  ]);
}

/* ---------- INSTITUTE DETAIL ---------- */
async function viewInstitute(slug) {
  spinner();
  const { data: i } = await S.sb.from('institutes').select('*').eq('slug', slug).maybeSingle();
  if (!i) return mount(el('div', { class: 'empty' }, '—'));
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
      i.whatsapp ? el('a', { class: 'btn ghost', href: 'https://wa.me/' + i.whatsapp, target: '_blank' }, '🟢 ' + t('contact')) : null,
    ]),
  ]));
  mount(wrap);
}

/* ---------- APPLY ---------- */
async function viewApply(slug) {
  if (!S.user) { openAuth('#/apply/' + slug); return; }
  spinner();
  const { data: i } = await S.sb.from('institutes').select('*').eq('slug', slug).maybeSingle();
  if (!i) return mount(el('div', { class: 'empty' }, '—'));

  const weeks = el('input', { type: 'number', min: i.min_weeks || 4, max: i.max_weeks || 48, value: i.min_weeks || 4 });
  const start = el('input', { type: 'month' });
  const wrap = el('div');
  wrap.append(el('div', { class: 'back', onclick: () => go('#/institute/' + slug) }, '→ ' + t('back')));
  wrap.append(el('div', { class: 'panel', style: 'max-width:560px' }, [
    el('h1', { class: 'page', style: 'margin-top:0' }, t('applyTo') + ' ' + pick(i.name)),
    el('label', {}, t('weeks') + ' *'), weeks,
    el('label', {}, t('startMonth') + ' *'), start,
    el('div', { class: 'muted', style: 'font-size:13px;margin-top:4px' }, t('startTip')),
    el('button', {
      class: 'btn accent block', style: 'margin-top:20px',
      onclick: async (e) => {
        if (!start.value) return toast('اختر شهر البدء', 'err');
        const btn = e.target; btn.disabled = true;
        const startDate = start.value + '-01';
        const { data, error } = await S.sb.from('applications').insert({
          user_id: S.user.id, institute_id: i.id, weeks: Number(weeks.value),
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

  const wrap = el('div');
  wrap.append(el('div', { class: 'hero' }, [
    el('h1', {}, t('howTitle')),
    el('p', {}, t('howSub')),
    el('button', { class: 'btn', onclick: () => go('#/') }, t('startNow')),
  ]));

  // interactive visa-path calculator
  const weeksInp = el('input', { type: 'number', min: 1, value: 8, style: 'max-width:110px' });
  const pathBox = el('div', { style: 'margin-top:12px' });
  const drawPath = () => {
    const p = visaPath(Number(weeksInp.value) || 0);
    pathBox.innerHTML = '';
    pathBox.append(el('div', { class: 'action' }, [
      el('b', {}, (p.short ? '🟢 ' : '🛂 ') + p.title),
      el('p', { style: 'margin:.4em 0 0' }, p.body),
    ]));
  };
  weeksInp.addEventListener('input', drawPath);
  wrap.append(el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, '🛂 ' + t('visaPathT')),
    el('label', {}, t('checkPath')),
    el('div', { class: 'row', style: 'align-items:center' }, [weeksInp, el('span', { class: 'muted' }, t('weeksUnit'))]),
    pathBox,
    el('div', { class: 'muted', style: 'font-size:12.5px;margin-top:6px' }, 'ℹ️ ' + t('estimateNote')),
  ]));

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

  const wrap = el('div');
  wrap.append(el('div', { class: 'back', onclick: () => go('#/my') }, '→ ' + t('back')));
  wrap.append(el('h1', { class: 'page' }, pick(app.institutes.name)));

  // progress summary
  const required = (reqs || []).filter(r => r.is_required !== false);
  const approved = required.filter(r => docMap[r.key]?.status === 'approved').length;
  const pct = required.length ? Math.round(approved / required.length * 100) : 0;
  wrap.append(el('div', { class: 'panel' }, [
    el('div', { style: 'display:flex;justify-content:space-between;margin-bottom:8px' }, [
      el('b', {}, (S.lang === 'ar' ? 'اكتمال المستندات' : 'Documents complete')),
      el('span', { class: 'muted' }, `${approved}/${required.length}`),
    ]),
    el('div', { style: 'height:10px;background:var(--chip);border-radius:20px;overflow:hidden' },
      el('div', { style: `height:100%;width:${pct}%;background:var(--accent);transition:width .4s` })),
  ]));

  // stepper
  const stepBox = el('div', { class: 'steps panel' });
  (steps || []).forEach(s => {
    const idx = STEP_ORDER.indexOf(s.status);
    const cls = app.status === 'rejected' ? '' : idx < curIdx ? 'done' : idx === curIdx ? 'now' : '';
    stepBox.append(el('div', { class: 'step ' + cls }, [
      el('div', { class: 'dot' }, idx < curIdx ? '✓' : (s.step_order)),
      el('div', { class: 'st-body' }, [
        el('h4', {}, pick(s.title)),
        s.eta_days ? el('div', { class: 'muted', style: 'font-size:12.5px' }, '⏱ ' + t('usually') + ' ~' + s.eta_days + ' ' + t('daysUnit')) : null,
        idx === curIdx ? el('p', { class: 'muted', style: 'margin:.2em 0' }, pick(s.explanation)) : null,
        idx === curIdx ? el('div', { class: 'action' }, [el('b', {}, t('yourAction') + ': '), pick(s.your_action)]) : null,
      ]),
    ]));
  });
  wrap.append(stepBox);

  // visa path (by course length) + estimated time to visa
  const vp = visaPath(app.weeks);
  const eta = etaToVisa(steps || []);
  wrap.append(el('div', { class: 'panel' }, [
    el('h3', { style: 'margin-top:0' }, '🛂 ' + t('visaPathT')),
    el('div', { class: 'action' }, [
      el('b', {}, (vp.short ? '🟢 ' : '🛂 ') + vp.title),
      el('p', { style: 'margin:.4em 0 0' }, vp.body),
    ]),
    (!vp.short && eta > 0) ? el('div', { style: 'margin-top:12px;display:flex;gap:12px;align-items:center' }, [
      el('div', { style: 'font-size:28px' }, '⏱'),
      el('div', {}, [
        el('div', { class: 'muted', style: 'font-size:13.5px' }, t('totalEta')),
        el('div', { style: 'font-size:20px;font-weight:800;color:var(--brand)' }, daysLabel(eta)),
      ]),
    ]) : null,
    el('div', { class: 'muted', style: 'font-size:12.5px;margin-top:8px' }, 'ℹ️ ' + t('estimateNote')),
  ]));

  // requirements + upload
  const reqPanel = el('div', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, t('requirements')));
  (reqs || []).forEach(r => reqPanel.append(docRow(r, docMap[r.key], reasonMap, app, reload)));
  wrap.append(reqPanel);

  // visa (EMGS) + travel + MDAC
  wrap.append(travelPanel(app, steps || [], cfg, reload));

  // contextual FAQ
  const rel = (faqs || []).filter(f => (f.context_tags || []).includes(app.status));
  const showFaq = (rel.length ? rel : (faqs || []).slice(0, 3)).slice(0, 5);
  if (showFaq.length) {
    const fp = el('div', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, (S.lang === 'ar' ? 'أسئلة قد تهمّك' : 'Helpful answers')));
    showFaq.forEach(f => {
      const det = el('details', { style: 'border-bottom:1px solid var(--line);padding:8px 0' }, [
        el('summary', { style: 'cursor:pointer;font-weight:600' }, pick(f.question)),
        el('p', { class: 'muted', style: 'margin:.5em 0 0' }, pick(f.answer)),
      ]);
      fp.append(det);
    });
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
  const country = el('input', { value: p.country || '' });
  const wrap = el('div');
  wrap.append(el('h1', { class: 'page' }, t('profile')));
  wrap.append(el('div', { class: 'panel', style: 'max-width:520px' }, [
    el('label', {}, t('fullName')), name,
    el('label', {}, t('phone')), phone,
    el('label', {}, t('country')), country,
    el('div', { class: 'muted', style: 'margin-top:10px' }, S.user.email),
    el('button', {
      class: 'btn block', style: 'margin-top:18px',
      onclick: async () => {
        const { error } = await S.sb.from('profiles').update(
          { full_name: name.value, phone: phone.value, country: country.value }).eq('id', S.user.id);
        toast(error ? error.message : t('ok'), error ? 'err' : 'ok');
      },
    }, t('save')),
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

  const modal = el('div', { class: 'modal' }, [
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
    panel = el('div', { class: 'chat' }, [
      el('div', { class: 'chat-head' }, ['🎓 ', S.lang === 'ar' ? 'مرشد إيدولينك' : 'EduLink guide']),
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
