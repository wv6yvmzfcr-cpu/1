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

/* ---------- TRACKER ---------- */
async function viewTracker(id) {
  if (!S.user) { openAuth('#/app/' + id); return; }
  spinner();
  const [{ data: app }, { data: steps }, { data: reasons }] = await Promise.all([
    S.sb.from('applications').select('*, institutes(name,city,id)').eq('id', id).maybeSingle(),
    S.sb.from('pipeline_steps').select('*').order('step_order'),
    S.sb.from('rejection_reasons').select('*'),
  ]);
  if (!app) return mount(el('div', { class: 'empty' }, '—'));
  const [{ data: reqs }, { data: docs }, { data: events }] = await Promise.all([
    S.sb.from('requirements').select('*').or(`institute_id.is.null,institute_id.eq.${app.institutes.id}`).order('sort_order'),
    S.sb.from('application_documents').select('*').eq('application_id', id),
    S.sb.from('application_events').select('*').eq('application_id', id).order('created_at'),
  ]);
  const reasonMap = Object.fromEntries((reasons || []).map(r => [r.key, r]));
  const docMap = Object.fromEntries((docs || []).map(d => [d.requirement_key, d]));
  const curIdx = STEP_ORDER.indexOf(app.status);

  const wrap = el('div');
  wrap.append(el('div', { class: 'back', onclick: () => go('#/my') }, '→ ' + t('back')));
  wrap.append(el('h1', { class: 'page' }, pick(app.institutes.name)));

  // stepper
  const stepBox = el('div', { class: 'steps panel' });
  (steps || []).forEach(s => {
    const idx = STEP_ORDER.indexOf(s.status);
    const cls = app.status === 'rejected' ? '' : idx < curIdx ? 'done' : idx === curIdx ? 'now' : '';
    stepBox.append(el('div', { class: 'step ' + cls }, [
      el('div', { class: 'dot' }, idx < curIdx ? '✓' : (s.step_order)),
      el('div', { class: 'st-body' }, [
        el('h4', {}, pick(s.title)),
        idx === curIdx ? el('p', { class: 'muted', style: 'margin:.2em 0' }, pick(s.explanation)) : null,
        idx === curIdx ? el('div', { class: 'action' }, [el('b', {}, t('yourAction') + ': '), pick(s.your_action)]) : null,
      ]),
    ]));
  });
  wrap.append(stepBox);

  // requirements + upload
  const reqPanel = el('div', { class: 'panel' }, el('h3', { style: 'margin-top:0' }, t('requirements')));
  (reqs || []).forEach(r => reqPanel.append(docRow(r, docMap[r.key], reasonMap, app, () => viewTracker(id))));
  wrap.append(reqPanel);

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

  const row = el('div', { class: 'doc' }, [
    el('div', { class: 'dinfo' }, [
      el('b', {}, pick(r.name)), badge,
      r.description ? el('div', { class: 'muted', style: 'font-size:13px' }, pick(r.description)) : null,
      (status === 'rejected' && doc.rejection_key && reasonMap[doc.rejection_key])
        ? el('div', { class: 'fix' }, [el('b', {}, '⚠️ ' + pick(reasonMap[doc.rejection_key].title) + ': '), pick(reasonMap[doc.rejection_key].fix)]) : null,
    ]),
  ]);

  if (status === 'approved') return row;

  if (r.input_type === 'file') {
    const fi = el('input', { type: 'file', accept: '.pdf,.jpg,.jpeg,.png', style: 'display:none' });
    fi.addEventListener('change', async () => {
      const f = fi.files[0]; if (!f) return;
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${S.user.id}/${app.id}/${r.key}.${ext}`;
      toast('جارٍ الرفع…');
      const { error: upErr } = await S.sb.storage.from('documents').upload(path, f, { upsert: true, contentType: f.type });
      if (upErr) return toast('تعذّر الرفع: ' + upErr.message, 'err');
      const { error } = await S.sb.from('application_documents').upsert(
        { application_id: app.id, requirement_key: r.key, storage_path: path },
        { onConflict: 'application_id,requirement_key' });
      if (error) return toast('خطأ: ' + error.message, 'err');
      toast(t('uploaded'), 'ok'); reload();
    });
    row.append(el('button', { class: 'btn sm', onclick: () => fi.click() }, '⤒ ' + (doc ? t('uploaded') + ' — ' + t('upload') : t('upload'))), fi);
  } else {
    // text / date / select → value input
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

/* ---------- go ---------- */
window.go = go;
init();
