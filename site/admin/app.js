/* =====================================================================
 * EduLink Admin — المحرك (vanilla JS + supabase-js)
 * ===================================================================== */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const el = (tag, props = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) n.setAttribute(k, v);
  }
  (Array.isArray(kids) ? kids : [kids]).forEach(c => c != null && n.append(c.nodeType ? c : document.createTextNode(String(c))));
  return n;
};
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = {
  sb: null,
  user: null,
  resource: 'dashboard',
  page: 0,
  pageSize: 25,
  search: '',
  total: 0,
  rows: [],
  editing: null,
  relCache: {},   // resource -> {id: row}
  relLoaded: {},  // resource -> bool
};

/* ---------- utils ---------- */
const pick = (obj) => {
  if (obj == null) return '';
  if (typeof obj !== 'object') return String(obj);
  return obj.ar || obj.en || Object.values(obj).find(Boolean) || '';
};
const fmtDate = s => s ? new Date(s).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtMoney = n => (n == null || n === '') ? '—' : `RM ${Number(n).toLocaleString('en')}`;
const shortId = s => s ? String(s).slice(0, 8) : '—';

function toast(msg, kind = '') {
  const t = el('div', { class: 'toast ' + kind, text: msg });
  $('#toast').append(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3200);
}

/* ---------- session / login ---------- */
function initClient(url, key) {
  return window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'edulink-admin-auth' },
  });
}

async function tryRestore() {
  const url = localStorage.getItem('edulink_url');
  const key = localStorage.getItem('edulink_key');
  if (!url || !key) return false;
  $('#in-url').value = url;
  $('#in-key').value = key;
  state.sb = initClient(url, key);
  const { data } = await state.sb.auth.getSession();
  if (data?.session) {
    state.user = data.session.user;
    if (await verifyAdmin()) { enterApp(); return true; }
  }
  return false;
}

async function verifyAdmin() {
  // المسار الأساسي: دالة is_admin() (security definer — تتجاوز RLS)
  let r = await state.sb.rpc('is_admin');
  if (!r.error && typeof r.data === 'boolean') return r.data;
  // توافق قديم: am_i_admin() إن وُجدت
  r = await state.sb.rpc('am_i_admin');
  if (!r.error && typeof r.data === 'boolean') return r.data;
  // احتياطي أخير: قراءة مباشرة من admin_users (قد يحجبها RLS)
  const { data: rows } = await state.sb.from('admin_users').select('user_id').eq('user_id', state.user.id).maybeSingle();
  return !!rows;
}

async function doLogin() {
  const url = $('#in-url').value.trim().replace(/\/+$/, '');
  const key = $('#in-key').value.trim();
  const email = $('#in-email').value.trim();
  const pass = $('#in-pass').value;
  const msg = $('#login-msg');
  msg.className = 'msg';
  if (!url || !key || !email || !pass) { msg.className = 'msg err'; msg.textContent = 'أكمل كل الحقول.'; return; }

  $('#btn-login').disabled = true;
  $('#btn-login').textContent = 'جارٍ الدخول…';
  try {
    state.sb = initClient(url, key);
    const { data, error } = await state.sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    state.user = data.user;
    const ok = await verifyAdmin();
    if (!ok) {
      await state.sb.auth.signOut();
      throw new Error('هذا الحساب ليس مديراً. نفّذ ملف «٨- سياسات لوحة التحكم.sql» ثم رقِّ بريدك في جدول admin_users.');
    }
    localStorage.setItem('edulink_url', url);
    localStorage.setItem('edulink_key', key);
    enterApp();
  } catch (e) {
    msg.className = 'msg err';
    msg.textContent = e.message || 'فشل تسجيل الدخول.';
  } finally {
    $('#btn-login').disabled = false;
    $('#btn-login').textContent = 'تسجيل الدخول';
  }
}

async function doLogout() {
  await state.sb?.auth.signOut();
  location.reload();
}

function enterApp() {
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#who').textContent = state.user?.email || '';
  const host = (localStorage.getItem('edulink_url') || '').replace(/^https?:\/\//, '');
  $('#conn').textContent = '● ' + host;
  buildNav();
  go('dashboard');
}

/* ---------- navigation ---------- */
function buildNav() {
  const nav = $('#nav');
  nav.innerHTML = '';
  for (const g of NAV_GROUPS) {
    const items = Object.entries(RESOURCES).filter(([, r]) => r.group === g);
    if (!items.length) continue;
    nav.append(el('div', { class: 'nav-group', text: g }));
    for (const [key, r] of items) {
      nav.append(el('div', {
        class: 'nav-item' + (key === state.resource ? ' active' : ''),
        'data-r': key,
        onclick: () => { go(key); $('#aside').classList.remove('open'); },
      }, [el('span', { class: 'ic', text: r.icon }), el('span', { text: r.label })]));
    }
  }
}

function go(resource) {
  state.resource = resource;
  state.page = 0;
  state.search = '';
  $('#search').value = '';
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.r === resource));
  const r = RESOURCES[resource];
  $('#view-title').textContent = r.label;
  const showList = !r.custom || r.custom === 'applications';
  $('#search').classList.toggle('hidden', !showList);
  $('#btn-export').classList.toggle('hidden', !showList);
  $('#btn-new').classList.toggle('hidden', !showList || r.readOnly || r.canCreate === false);
  if (r.custom === 'dashboard') renderDashboard();
  else if (r.custom === 'notifications') renderNotifications();
  else loadList();
}

/* ---------- relations ---------- */
async function ensureRelation(resName) {
  if (state.relLoaded[resName]) return;
  const r = RESOURCES[resName];
  const pk = r?.pk || 'id';
  const { data } = await state.sb.from(resName).select('*').limit(1000);
  const map = {};
  (data || []).forEach(row => { map[row[pk]] = row; });
  state.relCache[resName] = map;
  state.relLoaded[resName] = true;
}
function relLabel(resName, id) {
  const row = state.relCache[resName]?.[id];
  if (!row) return id ? shortId(id) : '—';
  const r = RESOURCES[resName];
  const nameField = r.fields?.find(f => f.type === 'i18n') ? (row.name ? 'name' : row.title ? 'title' : null) : null;
  if (row.name) return pick(row.name);
  if (row.title) return pick(row.title);
  if (row.native_name) return row.native_name;
  return row.code || shortId(id);
}

/* ---------- list view ---------- */
async function loadList() {
  const r = RESOURCES[state.resource];
  const view = $('#view');
  view.innerHTML = '<div class="empty">جارٍ التحميل…</div>';

  // preload relations used by columns/fields
  const relResources = new Set();
  (r.columns || []).forEach(c => c.type === 'relation' && relResources.add(c.resource));
  (r.fields || []).forEach(f => f.type === 'relation' && relResources.add(f.resource));
  await Promise.all([...relResources].map(ensureRelation));

  const pk = r.pk || 'id';
  let q = state.sb.from(state.resource).select('*', { count: 'exact' });

  // search: pick a searchable column; JSONB (i18n) columns are queried via ->>ar
  if (state.search) {
    const sc = (r.columns || []).find(c => !c.type || c.type === 'i18n' || c.type === 'status');
    const col = sc?.key || pk;
    const target = sc?.type === 'i18n' ? `${col}->>ar` : col;
    q = q.ilike(target, `%${state.search}%`);
  }

  // order
  const ord = r.order || pk;
  if (ord.startsWith('-')) q = q.order(ord.slice(1), { ascending: false });
  else q = q.order(ord, { ascending: true });

  const from = state.page * state.pageSize;
  q = q.range(from, from + state.pageSize - 1);

  const { data, error, count } = await q;
  if (error) { view.innerHTML = `<div class="empty">خطأ: ${esc(error.message)}</div>`; return; }
  state.rows = data || [];
  state.total = count ?? state.rows.length;
  renderTable();
}

function renderTable() {
  const r = RESOURCES[state.resource];
  const pk = r.pk || 'id';
  const view = $('#view');
  if (!state.rows.length) {
    view.innerHTML = '';
    view.append(el('div', { class: 'panel' }, el('div', { class: 'empty', text: 'لا توجد بيانات بعد.' })));
    return;
  }
  const head = el('tr', {}, [
    ...(r.columns || []).map(c => el('th', { text: c.label || c.key })),
    el('th', { text: 'إجراءات' }),
  ]);
  const body = state.rows.map(row => {
    const tds = (r.columns || []).map(c => el('td', {}, cellContent(c, row)));
    const actions = el('div', { class: 'cell-actions' });
    if (state.resource === 'applications') {
      actions.append(el('button', { class: 'btn ghost sm', text: 'المستندات', onclick: () => openAppDetail(row) }));
    }
    if (!r.readOnly) actions.append(el('button', { class: 'btn ghost sm', text: 'تعديل', onclick: () => openEditor(row) }));
    if (!r.readOnly && r.canDelete !== false) actions.append(el('button', { class: 'btn danger sm', text: 'حذف', onclick: () => del(row[pk]) }));
    tds.push(el('td', {}, actions));
    return el('tr', {}, tds);
  });

  view.innerHTML = '';
  const panel = el('div', { class: 'panel' }, [
    el('div', { class: 'table-wrap' }, el('table', {}, [el('thead', {}, head), el('tbody', {}, body)])),
  ]);
  const pages = Math.max(1, Math.ceil(state.total / state.pageSize));
  panel.append(el('div', { class: 'pager' }, [
    el('button', { class: 'btn ghost sm', disabled: state.page === 0 ? '' : null, text: '‹ السابق', onclick: () => { if (state.page > 0) { state.page--; loadList(); } } }),
    el('span', { text: `صفحة ${state.page + 1} / ${pages} — إجمالي ${state.total}` }),
    el('button', { class: 'btn ghost sm', disabled: state.page + 1 >= pages ? '' : null, text: 'التالي ›', onclick: () => { if (state.page + 1 < pages) { state.page++; loadList(); } } }),
  ]));
  view.append(panel);
}

function cellContent(c, row) {
  const v = row[c.key];
  switch (c.type) {
    case 'i18n': return pick(v) || el('span', { class: 'muted', text: '—' });
    case 'money': return fmtMoney(v);
    case 'date': return fmtDate(v);
    case 'short': return el('span', { class: 'muted', text: shortId(v) });
    case 'bool': return el('span', { class: 'badge ' + (v ? 'on' : 'off'), text: v ? 'نعم' : 'لا' });
    case 'status': return el('span', { class: 'badge ' + statusClass(v), text: statusLabel(v) });
    case 'tags': return (Array.isArray(v) && v.length)
      ? el('span', {}, v.map(t => el('span', { class: 'badge neutral', text: t, style: 'margin-inline-end:4px' }))) : '—';
    case 'relation': return relLabel(c.resource, v);
    case 'json': return el('code', { class: 'muted', text: (JSON.stringify(v) || '').slice(0, 60) });
    default: return (v === null || v === undefined || v === '') ? el('span', { class: 'muted', text: '—' }) : String(v);
  }
}

const STATUS_META = {
  // applications pipeline
  documents: ['warn', 'تجهيز المستندات'], review: ['info', 'مراجعة'], submitted: ['info', 'مُرسل للمعهد'],
  offer: ['info', 'خطاب القبول'], payment: ['warn', 'الدفع'], visa: ['info', 'التأشيرة'],
  ticket: ['info', 'السفر'], completed: ['on', 'مكتمل'], rejected: ['off', 'مرفوض'],
  // partners
  pending: ['warn', 'قيد الانتظار'], connected: ['on', 'متصل'], disabled: ['off', 'معطّل'],
  // commissions
  due: ['warn', 'مستحقة'], invoiced: ['info', 'مفوترة'], paid: ['on', 'مدفوعة'], cancelled: ['off', 'ملغاة'],
  // documents
  approved: ['on', 'مقبول'], rejected_doc: ['off', 'مرفوض'],
};
const statusClass = v => (STATUS_META[v]?.[0]) || 'neutral';
const statusLabel = v => (STATUS_META[v]?.[1]) || v || '—';

/* ---------- delete ---------- */
async function del(id) {
  const r = RESOURCES[state.resource];
  const pk = r.pk || 'id';
  if (!confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع.')) return;
  const { error } = await state.sb.from(state.resource).delete().eq(pk, id);
  if (error) return toast('تعذّر الحذف: ' + error.message, 'err');
  toast('تم الحذف', 'ok');
  loadList();
}

/* ---------- editor modal ---------- */
async function openEditor(row) {
  const r = RESOURCES[state.resource];
  state.editing = row || null;
  const pk = r.pk || 'id';

  // preload relation options for selects
  await Promise.all((r.fields || []).filter(f => f.type === 'relation').map(f => ensureRelation(f.resource)));

  const getters = [];
  const body = el('div', { class: 'grid2' });
  for (const field of r.fields) {
    const current = row ? row[field.name] : (field.default !== undefined ? field.default : undefined);
    const { node, get } = renderField(field, current, !!row);
    getters.push([field, get]);
    const wrap = el('div', { class: 'field' + (field.big ? '' : (field.half ? '' : '')) });
    wrap.style.gridColumn = field.half ? 'span 1' : 'span 2';
    wrap.append(el('label', { text: fieldLabel(field.name) + (field.required ? ' *' : '') }));
    wrap.append(node);
    if (field.hint) wrap.append(el('div', { class: 'hint', text: field.hint }));
    body.append(wrap);
  }

  const overlay = el('div', { class: 'overlay', onclick: e => { if (e.target === overlay) overlay.remove(); } });
  const modal = el('div', { class: 'modal' }, [
    el('div', { class: 'modal-head' }, [
      el('h3', { text: (row ? 'تعديل — ' : 'إضافة — ') + r.label }),
      el('button', { class: 'x', text: '×', onclick: () => overlay.remove() }),
    ]),
    el('div', { class: 'modal-body' }, body),
    el('div', { class: 'modal-foot' }, [
      el('button', { class: 'btn ghost', text: 'إلغاء', onclick: () => overlay.remove() }),
      el('button', { class: 'btn', text: 'حفظ', onclick: () => save(getters, overlay) }),
    ]),
  ]);
  overlay.append(modal);
  document.body.append(overlay);
}

function fieldLabel(name) {
  const map = {
    slug: 'المعرّف (slug)', name: 'الاسم', title: 'العنوان', description: 'الوصف', city: 'المدينة',
    city_key: 'مفتاح المدينة', price_myr: 'السعر (رينغت)', price_month_myr: 'السعر الشهري',
    price_min_myr: 'أدنى سعر', price_max_myr: 'أعلى سعر', price_estimated: 'سعر تقديري', price_verified: 'سعر مؤكَّد',
    min_weeks: 'أدنى أسابيع', max_weeks: 'أقصى أسابيع', tags: 'المميزات', images: 'الصور', whatsapp: 'واتساب',
    location_lat: 'خط العرض', location_lng: 'خط الطول', price_note: 'ملاحظة السعر', extra_fees: 'رسوم إضافية',
    partner_id: 'الشريك', sort_order: 'الترتيب', is_active: 'مفعّل', is_featured: 'مميّز', category: 'التصنيف',
    features: 'المزايا', expires_at: 'تاريخ الانتهاء', status: 'الحالة', weeks: 'الأسابيع', start_month: 'شهر البدء',
    arrival_date: 'تاريخ الوصول', flight_number: 'رقم الرحلة', entry_point: 'منفذ الدخول', mdac_done: 'MDAC مكتمل',
    mdac_ref: 'مرجع MDAC', address_my: 'العنوان في ماليزيا', notes: 'ملاحظات', institute_id: 'المعهد',
    key: 'المفتاح', input_type: 'نوع الإدخال', validation: 'قواعد الفحص', is_required: 'إلزامي', fix: 'طريقة الإصلاح',
    step_order: 'ترتيب المرحلة', eta_days: 'المدة (أيام)', explanation: 'الشرح', your_action: 'المطلوب من الطالب',
    question: 'السؤال', answer: 'الجواب', context_tags: 'وسوم السياق', type: 'النوع', contact_email: 'البريد',
    contact_phone: 'الهاتف', commission_type: 'نوع العمولة', commission_rate: 'نسبة العمولة',
    delivery_portal: 'تسليم عبر البوابة', delivery_webhook: 'تسليم Webhook', delivery_email: 'تسليم بريد',
    webhook_url: 'رابط Webhook', webhook_secret: 'سر Webhook', amount: 'المبلغ', currency: 'العملة',
    invoice_ref: 'مرجع الفاتورة', note: 'ملاحظة', code: 'الرمز', native_name: 'الاسم الأصلي', is_rtl: 'من اليمين',
    symbol: 'العلامة', rate_to_myr: 'مقابل الرينغت', lang: 'اللغة', excerpt: 'المقتطف', body_md: 'المحتوى (Markdown)',
    cover_image: 'صورة الغلاف', reading_min: 'دقائق القراءة', keywords: 'كلمات مفتاحية', is_published: 'منشور',
    meta_desc: 'وصف Meta', h1: 'عنوان H1', og_image: 'صورة OG', intent: 'النية', funnel: 'المسار',
    difficulty: 'الصعوبة', priority: 'الأولوية', target_page: 'الصفحة المستهدفة', institute: 'المعهد',
    amount_myr: 'المبلغ (رينغت)', unit: 'الوحدة', hours_week: 'ساعات/أسبوع', collected_at: 'تاريخ الجمع',
    source: 'المصدر', value: 'القيمة (JSON)', full_name: 'الاسم الكامل', phone: 'الهاتف', country: 'الدولة',
    preferred_lang: 'اللغة المفضّلة', preferred_currency: 'العملة المفضّلة',
  };
  return map[name] || name;
}

/* ---------- field renderers ---------- */
function renderField(field, value, isEdit) {
  const t = field.type;
  if (t === 'i18n') return renderI18n(value, field.textarea);
  if (t === 'i18n_list') return renderI18nList(value);
  if (t === 'string_array') return renderStringArray(value, field);
  if (t === 'json') return renderJson(value, field.big);
  if (t === 'bool') return renderBool(value, field.name);
  if (t === 'select') return renderSelect(field, value);
  if (t === 'relation') return renderRelation(field, value);
  if (t === 'textarea') {
    const ta = el('textarea', { value: value ?? '' });
    if (field.big) ta.style.minHeight = '180px';
    return { node: ta, get: () => ta.value.trim() || null };
  }
  if (t === 'number') {
    const inp = el('input', { type: 'number', step: 'any', value: value ?? '' });
    return { node: inp, get: () => inp.value === '' ? null : Number(inp.value) };
  }
  if (t === 'date') {
    const inp = el('input', { type: 'date', value: value ? String(value).slice(0, 10) : '' });
    return { node: inp, get: () => inp.value || null };
  }
  if (t === 'datetime') {
    const inp = el('input', { type: 'datetime-local', value: value ? toLocalDT(value) : '' });
    return { node: inp, get: () => inp.value ? new Date(inp.value).toISOString() : null };
  }
  // text (+ pk lock on edit)
  const inp = el('input', { type: 'text', value: value ?? '' });
  if (field.pk && isEdit) { inp.disabled = true; inp.style.opacity = '.6'; }
  return { node: inp, get: () => inp.value.trim() === '' ? null : inp.value.trim(), locked: field.pk && isEdit };
}

const toLocalDT = v => { const d = new Date(v); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function renderI18n(value, textarea) {
  value = (value && typeof value === 'object') ? { ...value } : {};
  const box = el('div', { class: 'i18n' });
  const tabs = el('div', { class: 'i18n-tabs' });
  const pane = el('div', { class: 'i18n-pane' });
  const inputs = {};
  const langs = Array.from(new Set([...LANGS, ...Object.keys(value)]));
  let active = langs[0];
  const showTab = (lg) => {
    active = lg;
    $$('.i18n-tab', tabs).forEach(t => t.classList.toggle('active', t.dataset.l === lg));
    pane.innerHTML = '';
    pane.append(inputs[lg]);
  };
  langs.forEach(lg => {
    inputs[lg] = textarea ? el('textarea', { value: value[lg] || '' }) : el('input', { type: 'text', value: value[lg] || '' });
    tabs.append(el('div', { class: 'i18n-tab' + (lg === active ? ' active' : ''), 'data-l': lg, text: lg, onclick: () => showTab(lg) }));
  });
  box.append(tabs, pane);
  showTab(active);
  return {
    node: box,
    get: () => {
      const out = {};
      for (const lg of langs) { const v = inputs[lg].value.trim(); if (v) out[lg] = v; }
      return Object.keys(out).length ? out : null;
    },
  };
}

function renderI18nList(value) {
  const items = Array.isArray(value) ? value.map(v => ({ ...v })) : [];
  const box = el('div', { class: 'i18n' });
  const list = el('div', { class: 'i18n-pane' });
  const rowGetters = [];
  const addRow = (val = {}) => {
    const rowInputs = {};
    const rowEl = el('div', { class: 'row', style: 'margin-bottom:8px;align-items:center' });
    LANGS.forEach(lg => {
      rowInputs[lg] = el('input', { type: 'text', placeholder: lg, value: val[lg] || '', style: 'flex:1;min-width:90px' });
      rowEl.append(rowInputs[lg]);
    });
    const rm = el('button', { class: 'btn danger sm', text: '×', onclick: () => { rowEl.remove(); g.dead = true; } });
    rowEl.append(rm);
    const g = { dead: false, read: () => { if (g.dead) return null; const o = {}; LANGS.forEach(lg => { const v = rowInputs[lg].value.trim(); if (v) o[lg] = v; }); return Object.keys(o).length ? o : null; } };
    rowGetters.push(g);
    list.append(rowEl);
  };
  items.forEach(addRow);
  box.append(list, el('button', { class: 'btn ghost sm', text: '+ عنصر', style: 'margin:8px', onclick: () => addRow() }));
  return { node: box, get: () => { const out = rowGetters.map(g => g.read()).filter(Boolean); return out; } };
}

function renderStringArray(value, field) {
  const ta = el('textarea', { value: Array.isArray(value) ? value.join('\n') : (value || '') });
  ta.placeholder = 'عنصر واحد في كل سطر';
  const box = el('div', {}, ta);
  if (field?.upload) {
    const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: '', style: 'display:none' });
    const btn = el('button', { class: 'btn ghost sm', type: 'button', style: 'margin-top:6px', text: '⤒ رفع صور', onclick: () => fileInput.click() });
    const status = el('span', { class: 'hint', style: 'margin-inline-start:8px' });
    fileInput.addEventListener('change', async () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;
      btn.disabled = true;
      let done = 0;
      for (const file of files) {
        status.textContent = `جارٍ الرفع ${++done}/${files.length}…`;
        const safe = file.name.replace(/[^\w.\-]+/g, '_');
        const path = `${state.resource}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
        const { error } = await state.sb.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
        if (error) { toast('تعذّر رفع ' + file.name + ': ' + error.message, 'err'); continue; }
        const { data } = state.sb.storage.from('media').getPublicUrl(path);
        ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + data.publicUrl;
      }
      status.textContent = 'تم ✓';
      btn.disabled = false;
      fileInput.value = '';
    });
    box.append(el('div', {}, [btn, status, fileInput]));
  }
  return { node: box, get: () => ta.value.split('\n').map(s => s.trim()).filter(Boolean) };
}

function renderJson(value, big) {
  const ta = el('textarea', { value: value != null ? JSON.stringify(value, null, 2) : '' });
  ta.style.fontFamily = 'monospace';
  if (big) ta.style.minHeight = '200px';
  ta.dataset.json = '1';
  return {
    node: ta,
    get: () => {
      const s = ta.value.trim();
      if (!s) return null;
      try { return JSON.parse(s); } catch (e) { throw new Error('JSON غير صالح في أحد الحقول: ' + e.message); }
    },
  };
}

function renderBool(value, name) {
  const id = 'chk_' + name + '_' + Math.random().toString(36).slice(2);
  const inp = el('input', { type: 'checkbox', id });
  inp.checked = !!value;
  const wrap = el('label', { class: 'chk', for: id }, [inp, el('span', { text: 'نعم / مفعّل' })]);
  return { node: wrap, get: () => inp.checked };
}

function renderSelect(field, value) {
  const sel = el('select', {});
  sel.append(el('option', { value: '', text: '— اختر —' }));
  (field.options || []).forEach(o => sel.append(el('option', { value: o, text: o, selected: o === value ? '' : null })));
  if (field.free) {
    // allow free value not in list
    if (value && !field.options.includes(value)) sel.append(el('option', { value, text: value, selected: '' }));
  }
  if (value != null) sel.value = value;
  return { node: sel, get: () => sel.value || null };
}

function renderRelation(field, value) {
  const sel = el('select', {});
  sel.append(el('option', { value: '', text: '— بدون —' }));
  const map = state.relCache[field.resource] || {};
  Object.keys(map).forEach(id => sel.append(el('option', { value: id, text: relLabel(field.resource, id), selected: id === value ? '' : null })));
  if (value != null) sel.value = value;
  return { node: sel, get: () => sel.value || null };
}

/* ---------- save ---------- */
async function save(getters, overlay) {
  const r = RESOURCES[state.resource];
  const pk = r.pk || 'id';
  const payload = {};
  try {
    for (const [field, get] of getters) {
      if (field.pk && state.editing) continue; // don't send locked pk on update
      const v = get();
      if (field.required && (v === null || v === '' || (Array.isArray(v) && !v.length))) {
        throw new Error(`الحقل «${fieldLabel(field.name)}» مطلوب.`);
      }
      payload[field.name] = v;
    }
  } catch (e) { return toast(e.message, 'err'); }

  let error;
  if (state.editing) {
    ({ error } = await state.sb.from(state.resource).update(payload).eq(pk, state.editing[pk]));
  } else {
    ({ error } = await state.sb.from(state.resource).insert(payload));
  }
  if (error) return toast('تعذّر الحفظ: ' + error.message, 'err');
  toast('تم الحفظ بنجاح', 'ok');
  overlay.remove();
  loadList();
}

/* ---------- applications detail (documents + events) ---------- */
async function openAppDetail(app) {
  await ensureRelation('rejection_reasons');
  await ensureRelation('institutes');
  const overlay = el('div', { class: 'overlay', onclick: e => { if (e.target === overlay) overlay.remove(); } });
  const body = el('div', { class: 'modal-body' }, el('div', { class: 'empty', text: 'جارٍ التحميل…' }));
  const modal = el('div', { class: 'modal', style: 'max-width:820px' }, [
    el('div', { class: 'modal-head' }, [
      el('h3', { text: 'الطلب ' + shortId(app.id) + ' — ' + relLabel('institutes', app.institute_id) }),
      el('button', { class: 'x', text: '×', onclick: () => overlay.remove() }),
    ]),
    body,
  ]);
  overlay.append(modal);
  document.body.append(overlay);

  const [{ data: docs }, { data: events }] = await Promise.all([
    state.sb.from('application_documents').select('*').eq('application_id', app.id).order('created_at'),
    state.sb.from('application_events').select('*').eq('application_id', app.id).order('created_at'),
  ]);

  body.innerHTML = '';
  // status quick bar
  body.append(el('div', { class: 'field' }, [
    el('label', { text: 'المرحلة الحالية' }),
    (() => {
      const sel = el('select', {});
      ['documents', 'review', 'submitted', 'offer', 'payment', 'visa', 'ticket', 'completed', 'rejected']
        .forEach(s => sel.append(el('option', { value: s, text: statusLabel(s), selected: s === app.status ? '' : null })));
      sel.onchange = async () => {
        const { error } = await state.sb.from('applications').update({ status: sel.value, updated_at: new Date().toISOString() }).eq('id', app.id);
        toast(error ? 'خطأ: ' + error.message : 'تم تحديث المرحلة', error ? 'err' : 'ok');
        if (!error) { app.status = sel.value; loadList(); }
      };
      return sel;
    })(),
  ]));

  // خطاب القبول: يرفعه المدير في مجلد الطالب فيحمّله الطالب من صفحة المتابعة
  {
    const offer = (docs || []).find(d => d.requirement_key === 'offer_letter');
    const fld = el('div', { class: 'panel', style: 'margin:8px 0 4px;padding:12px 14px' }, [
      el('div', { style: 'display:flex;align-items:center;gap:10px;flex-wrap:wrap' }, [
        el('b', { text: '📄 خطاب القبول (offer_letter)' }),
        offer ? el('span', { class: 'badge on', text: 'مرفوع' }) : el('span', { class: 'badge warn', text: 'غير مرفوع' }),
        el('span', { class: 'spacer', style: 'flex:1' }),
        offer && offer.storage_path ? el('button', {
          class: 'btn ghost sm', text: 'عرض',
          onclick: async () => {
            const { data, error } = await state.sb.storage.from('documents').createSignedUrl(offer.storage_path, 3600);
            if (error) return toast('تعذّر الفتح: ' + error.message, 'err');
            window.open(data.signedUrl, '_blank');
          },
        }) : null,
      ]),
      el('div', { class: 'muted', style: 'font-size:12.5px;margin-top:6px', text: 'PDF يُوضّح القبول والرسوم. يظهر للطالب في مرحلة «القبول» ليحمّله.' }),
      (() => {
        const fi = el('input', { type: 'file', accept: '.pdf,image/*', style: 'display:none' });
        fi.onchange = async () => {
          const f = fi.files[0]; if (!f) return;
          const ext = (f.name.split('.').pop() || 'pdf').toLowerCase();
          const path = `${app.user_id}/${app.id}/offer_letter.${ext}`;
          toast('جارٍ رفع خطاب القبول…');
          const { error: up } = await state.sb.storage.from('documents').upload(path, f, { upsert: true, contentType: f.type || 'application/pdf' });
          if (up) return toast('تعذّر الرفع: ' + up.message, 'err');
          const { error } = await state.sb.from('application_documents').upsert(
            { application_id: app.id, requirement_key: 'offer_letter', storage_path: path, status: 'approved', reviewed_at: new Date().toISOString() },
            { onConflict: 'application_id,requirement_key' });
          toast(error ? error.message : 'تم رفع خطاب القبول', error ? 'err' : 'ok');
          if (!error) openAppDetailReload(app, overlay);
        };
        return el('div', { style: 'margin-top:10px' }, [
          el('button', { class: 'btn sm', text: offer ? 'استبدال الخطاب' : 'رفع خطاب القبول', onclick: () => fi.click() }, fi),
        ]);
      })(),
    ]);
    body.append(fld);
  }

  // documents
  body.append(el('h3', { text: 'المستندات', style: 'margin:18px 0 8px;font-size:15px' }));
  if (!docs?.length) body.append(el('div', { class: 'muted', text: 'لا مستندات مرفوعة.' }));
  for (const d of (docs || [])) {
    const card = el('div', { class: 'panel', style: 'margin-bottom:10px' });
    const head = el('div', { style: 'display:flex;align-items:center;gap:10px;padding:12px 14px' }, [
      el('b', { text: d.requirement_key }),
      el('span', { class: 'badge ' + (d.status === 'approved' ? 'on' : d.status === 'rejected' ? 'off' : 'warn'), text: statusLabel(d.status === 'rejected' ? 'rejected_doc' : d.status) }),
      d.ai_verdict ? el('span', { class: 'badge info', text: 'AI: ' + d.ai_verdict }) : null,
      el('span', { class: 'spacer', style: 'flex:1' }),
    ]);
    if (d.storage_path) {
      head.append(el('button', {
        class: 'btn ghost sm', text: 'عرض الملف',
        onclick: async () => {
          const { data, error } = await state.sb.storage.from('documents').createSignedUrl(d.storage_path, 3600);
          if (error) return toast('تعذّر فتح الملف: ' + error.message, 'err');
          window.open(data.signedUrl, '_blank');
        },
      }));
    }
    card.append(head);
    if (d.value_text) card.append(el('div', { style: 'padding:0 14px 8px', class: 'muted', text: 'قيمة: ' + d.value_text }));

    const actions = el('div', { class: 'row', style: 'padding:0 14px 14px' });
    actions.append(el('button', {
      class: 'btn sm', text: 'اعتماد',
      onclick: async () => {
        const { error } = await state.sb.from('application_documents').update({ status: 'approved', rejection_key: null, reviewed_at: new Date().toISOString() }).eq('id', d.id);
        toast(error ? error.message : 'تم الاعتماد', error ? 'err' : 'ok'); if (!error) openAppDetailReload(app, overlay);
      },
    }));
    const reasonSel = el('select', { style: 'max-width:200px' });
    reasonSel.append(el('option', { value: '', text: 'سبب الرفض…' }));
    Object.values(state.relCache.rejection_reasons || {}).forEach(rr => reasonSel.append(el('option', { value: rr.key, text: pick(rr.title) })));
    actions.append(reasonSel);
    actions.append(el('button', {
      class: 'btn danger sm', text: 'رفض',
      onclick: async () => {
        if (!reasonSel.value) return toast('اختر سبب الرفض', 'err');
        const { error } = await state.sb.from('application_documents').update({ status: 'rejected', rejection_key: reasonSel.value, reviewed_at: new Date().toISOString() }).eq('id', d.id);
        toast(error ? error.message : 'تم الرفض', error ? 'err' : 'ok'); if (!error) openAppDetailReload(app, overlay);
      },
    }));
    card.append(actions);
    body.append(card);
  }

  // events / timeline
  body.append(el('h3', { text: 'سجل الأحداث (يراه الطالب)', style: 'margin:18px 0 8px;font-size:15px' }));
  for (const ev of (events || [])) {
    body.append(el('div', { style: 'padding:8px 0;border-bottom:1px solid var(--line)' }, [
      el('span', { text: pick(ev.title) }),
      el('span', { class: 'muted', style: 'float:inline-end', text: fmtDate(ev.created_at) }),
    ]));
  }
  const evI18n = renderI18n({}, false);
  const evWrap = el('div', { class: 'field', style: 'margin-top:12px' }, [el('label', { text: 'إضافة حدث للطالب' }), evI18n.node]);
  body.append(evWrap);
  body.append(el('button', {
    class: 'btn', text: 'إضافة الحدث',
    onclick: async () => {
      const title = evI18n.get();
      if (!title) return toast('اكتب نص الحدث', 'err');
      const { error } = await state.sb.from('application_events').insert({ application_id: app.id, title });
      toast(error ? error.message : 'أُضيف الحدث', error ? 'err' : 'ok'); if (!error) openAppDetailReload(app, overlay);
    },
  }));
}
function openAppDetailReload(app, overlay) { overlay.remove(); openAppDetail(app); }

/* ---------- dashboard ---------- */
async function renderDashboard() {
  const view = $('#view');
  view.innerHTML = '<div class="empty">جارٍ تحميل الإحصائيات…</div>';

  const counts = {};
  const countTables = ['applications', 'institutes', 'listings', 'partners', 'profiles', 'commissions'];
  await Promise.all(countTables.map(async t => {
    const { count } = await state.sb.from(t).select('*', { count: 'exact', head: true });
    counts[t] = count ?? 0;
  }));

  const [{ data: funnel }, { data: monthly }, { data: perf }] = await Promise.all([
    state.sb.from('v_funnel').select('*').maybeSingle(),
    state.sb.from('v_apps_monthly').select('*').order('month', { ascending: false }).limit(6),
    state.sb.from('v_partner_performance').select('*').limit(20),
  ]);

  view.innerHTML = '';
  const stats = el('div', { class: 'stat-grid' });
  const cards = [
    ['📝 طلبات التسجيل', counts.applications, statusLabel('completed') + ': ' + (funnel?.completed ?? 0)],
    ['🏫 المعاهد', counts.institutes, ''],
    ['🏠 الإعلانات', counts.listings, ''],
    ['🤝 الشركاء', counts.partners, ''],
    ['👤 المستخدمون', counts.profiles, ''],
    ['💰 العمولات', counts.commissions, ''],
  ];
  cards.forEach(([k, v, sub]) => stats.append(el('div', { class: 'stat' }, [
    el('div', { class: 'k', text: k }),
    el('div', { class: 'v', html: `${v ?? 0} ${sub ? `<small>${esc(sub)}</small>` : ''}` }),
  ])));
  view.append(stats);

  // funnel
  if (funnel) {
    const steps = [['بدأ', funnel.started], ['أكمل المستندات', funnel.docs_done], ['مقبول', funnel.accepted], ['اكتمل', funnel.completed]];
    const max = Math.max(1, funnel.started);
    const panel = el('div', { class: 'panel', style: 'margin-bottom:22px' }, el('h3', { text: 'مسار التسجيل (Funnel)' }));
    const inner = el('div', { style: 'padding:16px' });
    steps.forEach(([label, val]) => {
      inner.append(el('div', { style: 'margin-bottom:12px' }, [
        el('div', { style: 'display:flex;justify-content:space-between;margin-bottom:4px' }, [el('span', { text: label }), el('b', { text: val ?? 0 })]),
        el('div', { style: 'height:10px;background:var(--panel-2);border-radius:20px;overflow:hidden' },
          el('div', { style: `height:100%;width:${Math.round((val || 0) / max * 100)}%;background:var(--brand)` })),
      ]));
    });
    panel.append(inner);
    view.append(panel);
  }

  // monthly
  if (monthly?.length) {
    const panel = el('div', { class: 'panel', style: 'margin-bottom:22px' }, el('h3', { text: 'الطلبات شهرياً (آخر 6)' }));
    const rows = monthly.map(m => el('tr', {}, [
      el('td', { text: fmtDate(m.month) }), el('td', { text: m.total }), el('td', {}, el('span', { class: 'badge on', text: m.completed })),
    ]));
    panel.append(el('div', { class: 'table-wrap' }, el('table', {}, [
      el('thead', {}, el('tr', {}, [el('th', { text: 'الشهر' }), el('th', { text: 'إجمالي' }), el('th', { text: 'مكتمل' })])),
      el('tbody', {}, rows),
    ])));
    view.append(panel);
  }

  // partner performance
  if (perf?.length) {
    const panel = el('div', { class: 'panel' }, el('h3', { text: 'أداء الشركاء' }));
    const rows = perf.map(p => el('tr', {}, [
      el('td', { text: pick(p.name) }), el('td', { text: p.type }), el('td', { text: p.students }),
      el('td', { text: fmtMoney(p.earned_paid) }), el('td', {}, el('span', { class: 'badge warn', text: fmtMoney(p.earned_due) })),
    ]));
    panel.append(el('div', { class: 'table-wrap' }, el('table', {}, [
      el('thead', {}, el('tr', {}, ['الشريك', 'النوع', 'طلاب', 'مدفوع', 'مستحق'].map(h => el('th', { text: h })))),
      el('tbody', {}, rows),
    ])));
    view.append(panel);
  }
}

/* ---------- CSV export ---------- */
async function exportCsv() {
  const r = RESOURCES[state.resource];
  if (!r || r.custom) return;
  const pk = r.pk || 'id';
  const ord = r.order || pk;
  let q = state.sb.from(state.resource).select('*').limit(5000);
  q = ord.startsWith('-') ? q.order(ord.slice(1), { ascending: false }) : q.order(ord, { ascending: true });
  const { data, error } = await q;
  if (error) return toast('تعذّر التصدير: ' + error.message, 'err');
  const rows = data || [];
  if (!rows.length) return toast('لا بيانات للتصدير', 'err');

  const keys = (r.columns || []).length ? r.columns.map(c => c.key) : Object.keys(rows[0]);
  const val = (k, row) => {
    const v = row[k];
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v.map(x => (x && typeof x === 'object') ? pick(x) : x).join(' | ');
    if (typeof v === 'object') return pick(v) || JSON.stringify(v);
    return String(v);
  };
  const cell = s => { s = String(s).replace(/"/g, '""'); return /[",\n]/.test(s) ? `"${s}"` : s; };
  const csv = '﻿' + keys.join(',') + '\n' +
    rows.map(row => keys.map(k => cell(val(k, row))).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = el('a', { href: url, download: `${state.resource}-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  toast(`صُدّر ${rows.length} صفاً`, 'ok');
}

/* ---------- notifications (Expo Push broadcast) ---------- */
async function renderNotifications() {
  const view = $('#view');
  view.innerHTML = '<div class="empty">جارٍ التحميل…</div>';
  const { count } = await state.sb.from('push_tokens').select('*', { count: 'exact', head: true });

  view.innerHTML = '';
  const inner = el('div', { style: 'padding:18px;max-width:560px' });
  inner.append(el('div', { class: 'muted', style: 'margin-bottom:14px', text: `عدد الأجهزة المسجّلة: ${count ?? 0}` }));

  const langSel = el('select', {});
  langSel.append(el('option', { value: '', text: 'كل اللغات' }));
  ['ar', 'en', 'ms', 'ru'].forEach(l => langSel.append(el('option', { value: l, text: l })));
  const title = el('input', { type: 'text', placeholder: 'عنوان الإشعار' });
  const bodyI = el('textarea', { placeholder: 'نص الإشعار' });

  inner.append(el('label', { text: 'اللغة المستهدفة' }), langSel);
  inner.append(el('label', { text: 'العنوان' }), title);
  inner.append(el('label', { text: 'النص' }), bodyI);

  const send = el('button', {
    class: 'btn', style: 'margin-top:16px', text: 'إرسال الآن',
    onclick: async () => {
      if (!title.value.trim() || !bodyI.value.trim()) return toast('أدخل العنوان والنص', 'err');
      if (!confirm(`إرسال الإشعار إلى ${langSel.value || 'كل'} الأجهزة؟`)) return;
      send.disabled = true; send.textContent = 'جارٍ الإرسال…';
      const { data, error } = await state.sb.functions.invoke('push-broadcast', {
        body: { title: title.value.trim(), body: bodyI.value.trim(), lang: langSel.value || null },
      });
      send.disabled = false; send.textContent = 'إرسال الآن';
      if (error) return toast('فشل الإرسال: ' + error.message, 'err');
      toast(`أُرسل: ${data?.sent ?? 0} — فشل: ${data?.failed ?? 0}`, data?.sent ? 'ok' : 'err');
      title.value = ''; bodyI.value = '';
    },
  });
  inner.append(send);
  inner.append(el('div', { class: 'hint', style: 'margin-top:10px', text: 'يتطلّب نشر دالة push-broadcast (انظر supabase/functions/README.md).' }));

  const panel = el('div', { class: 'panel' }, [el('h3', { text: 'إرسال إشعار Push للمستخدمين' }), inner]);
  view.append(panel);
}

/* ---------- wire up ---------- */
$('#btn-login').onclick = doLogin;
$('#in-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
$('#btn-logout').onclick = doLogout;
$('#btn-refresh').onclick = () => { state.relLoaded = {}; go(state.resource); };
$('#btn-export').onclick = exportCsv;
$('#btn-new').onclick = () => openEditor(null);
$('#btn-menu').onclick = () => $('#aside').classList.toggle('open');
let searchT;
$('#search').addEventListener('input', e => { clearTimeout(searchT); searchT = setTimeout(() => { state.search = e.target.value.trim(); state.page = 0; loadList(); }, 350); });

// تعبئة رابط المشروع والمفتاح العام تلقائياً من config.js (نفس مشروع الموقع)
// حتى لا يحتاج المدير سوى إدخال البريد وكلمة المرور.
(function prefillFromConfig() {
  const c = window.EDULINK_CONFIG;
  if (!c) return;
  const u = $('#in-url'), k = $('#in-key');
  if (u && !u.value && c.url) u.value = c.url;
  if (k && !k.value && c.anonKey) k.value = c.anonKey;
})();

tryRestore();
