/* ================================================================
   BREATHE — EXPENSE TRACKER  |  app.js
   ================================================================ */

'use strict';

// ══════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════
const USERS = [
  {
    username: 'daddy',
    email: 'daddy@gmail.com',
    display: 'Daddy'
  },
  {
    username: 'oghenero',
    email: 'oghenero@gmail.com',
    display: 'Oghenero'
  }
];

const SK = {
  theme:   'breathe_theme',
  records: 'breathe_records',
  session: 'breathe_session',
};

const CURRENCY = '₦';
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// ══════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════
const S = {
  user:    null,
  theme:   'dark',
  records: [],
  screen:  'splash',
  navStack:   ['splash'],
  receiptRec: null,
  dateMode:   'single',
};

// ══════════════════════════════════════════════════════════
//  STORAGE
// ══════════════════════════════════════════════════════════
const Store = {
  get(k)    { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch(e) {
      if (e.name === 'QuotaExceededError') toast('Storage full — try removing old receipt images.', 'err');
    }
  },
  del(k) { localStorage.removeItem(k); },
};

// ══════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════
function init() {
  S.theme   = Store.get(SK.theme)   || 'dark';
  S.records = Store.get(SK.records) || [];
  applyTheme(S.theme, false);

  const session = Store.get(SK.session);
  if (session) {
    const u = USERS.find(x => x.username === session.username);
    if (u) S.user = u;
  }

  // Pre-render all screens
  renderLogin();
  renderMain();
  renderEnter();
  renderCheck();

  setTimeout(() => nav(S.user ? 'main' : 'login'), 2650);
}

// ══════════════════════════════════════════════════════════
//  THEME
// ══════════════════════════════════════════════════════════
function applyTheme(t, save = true) {
  S.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  if (save) Store.set(SK.theme, t);
  document.querySelectorAll('[data-theme-icon]')
    .forEach(el => el.textContent = t === 'dark' ? '☀️' : '🌙');
}

function toggleTheme() { applyTheme(S.theme === 'dark' ? 'light' : 'dark'); }

// ══════════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════════
function nav(screenId) {
  const cur  = document.getElementById('screen-' + S.screen);
  const next = document.getElementById('screen-' + screenId);
  if (!next || cur === next) return;

  if (cur) {
    cur.classList.add('out-left');
    cur.classList.remove('active');
    setTimeout(() => cur.classList.remove('out-left'), 350);
  }
  next.classList.add('active');
  S.navStack.push(screenId);
  S.screen = screenId;

  if (screenId === 'check') refreshCheckTab();
  if (screenId === 'main')  renderMain();
}

function goBack() {
  S.navStack.pop();
  const prev = S.navStack[S.navStack.length - 1] || 'main';
  const cur  = document.getElementById('screen-' + S.screen);
  const tgt  = document.getElementById('screen-' + prev);
  if (!tgt) return;
  if (cur) { cur.classList.remove('active'); }
  tgt.classList.remove('out-left');
  tgt.classList.add('active');
  S.screen = prev;
  if (prev === 'main') renderMain();
}

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════
function getUserByUsername(username) {
  return USERS.find(u =>
    u.username.toLowerCase() ===
    username.toLowerCase().trim()
  ) || null;
}

async function doLogout() {

  try {

    await window.BreatheFirebase.logout();

    S.user = null;

    Store.del(SK.session);

    S.records = [];

    S.navStack = ['login'];

    renderLogin();

    const screens = [
      'main',
      'enter',
      'check',
      'receipt'
    ];

    screens.forEach(s => {

      const el =
        document.getElementById(
          'screen-' + s
        );

      if (el) {
        el.classList.remove(
          'active',
          'out-left'
        );
      }

    });

    const login =
      document.getElementById(
        'screen-login'
      );

    login.classList.add('active');

    S.screen = 'login';

    toast(
      'Logged out successfully 👋',
      'info'
    );

  } catch (error) {

    console.error(
      'Logout error:',
      error
    );

    toast(
      'Could not log out. Please try again.',
      'err'
    );
  }
}

// ══════════════════════════════════════════════════════════
//  RECORDS
// ══════════════════════════════════════════════════════════
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,9); }

function saveRecord(data) {
  const rec = {
    id:       uid(),
    username: S.user.username,
    name:     data.name.trim(),
    amount:   parseFloat(data.amount) || 0,
    description: (data.description || '').trim(),
    receiptImage: data.receiptImage || null,
    date:     data.date || todayStr(),
    createdAt: new Date().toISOString(),
  };
  S.records.unshift(rec);
  Store.set(SK.records, S.records);
  return rec;
}

function myRecords() {
  if (!S.user) return [];
  return S.records;
}

// ══════════════════════════════════════════════════════════
//  DATE UTILS
// ══════════════════════════════════════════════════════════
function todayStr()  { return new Date().toISOString().split('T')[0]; }
function toStr(d)    { return d.toISOString().split('T')[0]; }
function parseD(s)   { return new Date(s + 'T00:00:00'); }

function fmtDate(s) {
  const d = parseD(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

function fmtCur(n) {
  return CURRENCY + (+n).toLocaleString('en-NG', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function sumAmt(arr) { return arr.reduce((s, r) => s + r.amount, 0); }

function monthKey(s) {
  const d = parseD(s);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function monthLabel(k) {
  const [yr, mo] = k.split('-');
  return `${MONTHS[parseInt(mo)-1]} ${yr}`;
}

function weekOfMonth(s) {
  const d = parseD(s);
  const f = new Date(d.getFullYear(), d.getMonth(), 1);
  const fDow = f.getDay() === 0 ? 6 : f.getDay() - 1; // Mon=0
  return Math.ceil((d.getDate() + fDow) / 7);
}

function weekRangeLabel(yr, mo0, wk) {
  // mo0 = 0-indexed month
  const f   = new Date(yr, mo0, 1);
  const fDow = f.getDay() === 0 ? 6 : f.getDay() - 1;
  const wsDay = 1 + (wk - 1) * 7 - fDow;
  const ws  = new Date(yr, mo0, wsDay);
  const we  = new Date(yr, mo0, wsDay + 6);
  const mS  = new Date(yr, mo0, 1);
  const mE  = new Date(yr, mo0 + 1, 0);
  const cs  = ws < mS ? mS : ws;
  const ce  = we > mE ? mE : we;
  const f2  = d => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`;
  return `${f2(cs)} – ${f2(ce)}`;
}

function getMondayOf(d) {
  const dt = new Date(d);
  const dow = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
  dt.setDate(dt.getDate() - dow);
  return dt;
}

function groupByMonthWeek(records) {
  const out = {};
  records.forEach(r => {
    const mk = monthKey(r.date);
    const wk = weekOfMonth(r.date);
    if (!out[mk])      out[mk] = {};
    if (!out[mk][wk])  out[mk][wk] = [];
    out[mk][wk].push(r);
  });
  return out;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ══════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════
function toast(msg, type = 'info') {
  const c   = document.getElementById('toast-container');
  const el  = document.createElement('div');
  const ico = { ok:'✅', err:'❌', info:'ℹ️' };
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${ico[type]||'ℹ️'}</span><span>${esc(msg)}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

// ══════════════════════════════════════════════════════════
//  HTML UTILS
// ══════════════════════════════════════════════════════════
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function themeBtn() {
  return `<button class="btn-theme" data-theme-icon onclick="toggleTheme()">${S.theme==='dark'?'☀️':'🌙'}</button>`;
}

// ══════════════════════════════════════════════════════════
//  ─── SCREEN: LOGIN ───
// ══════════════════════════════════════════════════════════
function renderLogin() {
  const el = document.getElementById('screen-login');
  el.innerHTML = `
    <div class="login-footer">${themeBtn()}</div>
    <div class="login-wrap">
      <div class="login-header">
        <div class="login-logo-box"><span>🌬️</span></div>
        <h1>Breathe</h1>
        <p>Sign in to your account</p>
      </div>

      <form class="login-form" id="login-form" onsubmit="handleLogin(event)" autocomplete="off">
        <div class="fg">
          <label class="label" for="l-user">Username</label>
          <div class="inp-icon-wrap">
            <span class="inp-icon">👤</span>
            <input class="inp" id="l-user" type="text"
              placeholder="Enter username" autocomplete="username" required>
          </div>
        </div>

        <div class="fg" style="margin-top:14px">
          <label class="label" for="l-pass">Password</label>
          <div class="inp-icon-wrap">
            <span class="inp-icon">🔒</span>
            <input class="inp" id="l-pass" type="password"
              placeholder="Enter password" autocomplete="current-password" required>
          </div>
        </div>

        <div class="login-error" id="l-err">❌ Invalid username or password</div>

        <button class="btn btn-primary" type="submit" id="l-btn" style="margin-top:22px">
          Sign In &rarr;
        </button>
      </form>

      <p style="text-align:center;font-size:12px;color:var(--txt3);margin-top:28px;">
        Breathe &copy; ${new Date().getFullYear()} &bull; Expense Accountability
      </p>
    </div>
  `;
}

async function handleLogin(e) {
  e.preventDefault();

  const username =
    document.getElementById('l-user').value;

  const password =
    document.getElementById('l-pass').value;

  const err =
    document.getElementById('l-err');

  const btn =
    document.getElementById('l-btn');

  err.style.display = 'none';

  btn.innerHTML =
    '<div class="spinner"></div>';

  btn.disabled = true;

  try {

    const account =
      getUserByUsername(username);

    if (!account) {
      throw new Error('Invalid username or password');
    }

    // Firebase handles the password verification.
    const firebaseUser =
      await window.BreatheFirebase.login(
        account.email,
        password
      );

    // Make sure the Firebase user is actually
    // part of the Family Accountability session.
    const session =
      await window.BreatheFirebase.getFamilySession();

    // Store the application user information.
    S.user = {
      username: account.username,
      email: account.email,
      display: account.display,
      uid: firebaseUser.uid
    };

    // We no longer need to store the password
    // or authentication token ourselves.
    Store.set(SK.session, {
      username: account.username,
      uid: firebaseUser.uid
    });

    console.log(
      'Logged into Family Accountability:',
      session.name
    );

    renderMain();

    nav('main');

    toast(
      `Welcome back, ${account.display}! 👋`,
      'ok'
    );

  } catch (error) {

    console.error(
      'Login error:',
      error
    );

    err.textContent =
      '❌ Invalid username or password';

    err.style.display = 'block';

    btn.innerHTML =
      'Sign In &rarr;';

    btn.disabled = false;
  }
}

// ══════════════════════════════════════════════════════════
//  ─── SCREEN: MAIN MENU ───
// ══════════════════════════════════════════════════════════
function renderMain() {
  const el = document.getElementById('screen-main');
  if (!S.user) return;

  const all    = myRecords();
  const today  = todayStr();
  const todayR = all.filter(r => r.date === today);
  const todayT = sumAmt(todayR);

  el.innerHTML = `
    <div class="header">
      <div style="flex:1">
        <div style="font-size:13px;color:var(--txt2);font-weight:500">Good ${getGreeting()}</div>
        <div class="header-title">${esc(S.user.display)} 👋</div>
      </div>
      ${themeBtn()}
      <button class="btn-icon" onclick="doLogout()" title="Logout" style="margin-left:4px">🚪</button>
    </div>

    <div class="scroll" style="display:flex;flex-direction:column;gap:0">
      <div class="menu-welcome">
        <div class="menu-greeting">Expense Tracker</div>
        <div class="menu-name">Dashboard</div>
      </div>

      ${todayT > 0 ? `
        <div class="today-banner">
          <div>
            <div class="today-lbl">Today's Spending</div>
            <div class="today-amt">${fmtCur(todayT)}</div>
            <div class="today-count">${todayR.length} transaction${todayR.length!==1?'s':''}</div>
          </div>
          <div class="today-icon">💰</div>
        </div>
      ` : ''}

      <div class="section-hd">What would you like to do?</div>

      <button class="menu-card" id="btn-add" onclick="goEnter()">
        <div class="menu-card-icon icon-add">➕</div>
        <div class="menu-card-body">
          <h2>Enter New Record</h2>
          <p>Log a payment with optional receipt</p>
        </div>
        <span class="menu-card-arrow">›</span>
      </button>

      <button class="menu-card" id="btn-check" onclick="goCheck()">
        <div class="menu-card-icon icon-check">📊</div>
        <div class="menu-card-body">
          <h2>Check Records</h2>
          <p>View, search &amp; analyse transactions</p>
        </div>
        <span class="menu-card-arrow">›</span>
      </button>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-lbl">Total Records</div>
          <div class="stat-val primary">${all.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-lbl">All-Time Total</div>
          <div class="stat-val accent">${fmtCur(sumAmt(all))}</div>
        </div>
      </div>
      <div class="spacer"></div>
    </div>
  `;
}

function goEnter() { renderEnter(); nav('enter'); }
function goCheck() { nav('check'); }

// ══════════════════════════════════════════════════════════
//  ─── SCREEN: ENTER RECORD ───
// ══════════════════════════════════════════════════════════
let _receiptData = null;

function renderEnter() {
  _receiptData = null;
  const el = document.getElementById('screen-enter');
  el.innerHTML = `
    <div class="header">
      <button class="btn-icon" onclick="goBack()">‹</button>
      <div class="header-title">New Record</div>
      ${themeBtn()}
    </div>

    <div class="scroll">
      <form id="enter-form" onsubmit="handleAddRecord(event)">

        <div class="fg">
          <label class="label" for="e-name">Recipient Name *</label>
          <input class="inp" id="e-name" type="text"
            placeholder="Who received this payment?" required>
        </div>

        <div class="fg">
          <label class="label" for="e-amt">Amount Sent *</label>
          <div class="inp-wrap">
            <div class="inp-prefix">${CURRENCY}</div>
            <input class="inp" id="e-amt" type="number"
              placeholder="0.00" step="0.01" min="0" required>
          </div>
        </div>

        <div class="fg">
          <label class="label" for="e-date">Date *</label>
          <input class="inp" id="e-date" type="date" value="${todayStr()}" required>
        </div>

        <div class="fg">
          <label class="label" for="e-desc">Description</label>
          <textarea class="inp inp-area" id="e-desc"
            placeholder="What was this payment for?"></textarea>
        </div>

        <div class="fg">
          <label class="label">Receipt Image (Optional)</label>
          <div id="receipt-drop" class="receipt-drop" onclick="triggerUpload()">
            <div class="receipt-drop-icon">📎</div>
            <div class="receipt-drop-title">Tap to upload receipt</div>
            <div class="receipt-drop-sub">JPG · PNG · GIF · up to 5 MB</div>
          </div>
          <input type="file" id="receipt-file" accept="image/*"
            style="display:none" onchange="handleReceiptFile(event)">
        </div>

        <div class="spacer" style="height:12px"></div>
        <button class="btn btn-primary" type="submit" id="e-submit">
          💾 Save Record
        </button>
        <div class="spacer"></div>
      </form>
    </div>
  `;
}

function triggerUpload() {
  document.getElementById('receipt-file').click();
}

function handleReceiptFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Image too large. Max 5 MB.', 'err'); return; }

  const reader = new FileReader();
  reader.onload = ev => {
    _receiptData = ev.target.result;
    const drop = document.getElementById('receipt-drop');
    drop.style.padding = '0';
    drop.style.borderStyle = 'solid';
    drop.innerHTML = `
      <div class="receipt-preview-wrap">
        <img src="${_receiptData}" alt="Receipt preview">
        <div class="receipt-overlay">
          <button type="button" onclick="clearReceipt()"
            style="background:rgba(255,85,133,.9);color:#fff">Remove</button>
          <button type="button" onclick="triggerUpload()"
            style="background:rgba(118,80,255,.9);color:#fff">Change</button>
        </div>
      </div>`;
  };
  reader.readAsDataURL(file);
}

function clearReceipt() {
  _receiptData = null;
  document.getElementById('receipt-file').value = '';
  const drop = document.getElementById('receipt-drop');
  drop.style.padding = '';
  drop.style.borderStyle = '';
  drop.innerHTML = `
    <div class="receipt-drop-icon">📎</div>
    <div class="receipt-drop-title">Tap to upload receipt</div>
    <div class="receipt-drop-sub">JPG · PNG · GIF · up to 5 MB</div>`;
}

function handleAddRecord(e) {
  e.preventDefault();
  const btn = document.getElementById('e-submit');
  btn.innerHTML = '<div class="spinner"></div>';
  btn.disabled = true;

  setTimeout(() => {
    saveRecord({
      name:         document.getElementById('e-name').value,
      amount:       document.getElementById('e-amt').value,
      date:         document.getElementById('e-date').value,
      description:  document.getElementById('e-desc').value,
      receiptImage: _receiptData,
    });
    toast('Record saved successfully! ✨', 'ok');
    renderMain();
    renderEnter();
    goBack();
  }, 550);
}

// ══════════════════════════════════════════════════════════
//  ─── SCREEN: CHECK RECORDS ───
// ══════════════════════════════════════════════════════════
let _activeTab = 'monthly';

function renderCheck() {
  const el = document.getElementById('screen-check');
  el.innerHTML = `
    <div class="header">
      <button class="btn-icon" onclick="goBack()">‹</button>
      <div class="header-title">Check Records</div>
      ${themeBtn()}
    </div>

    <div class="tab-bar">
      <button class="tab-btn active" id="tab-monthly"  onclick="switchTab('monthly')">📅 Monthly</button>
      <button class="tab-btn"        id="tab-date"     onclick="switchTab('date')">📆 By Date</button>
      <button class="tab-btn"        id="tab-name"     onclick="switchTab('name')">👤 By Name</button>
      <button class="tab-btn"        id="tab-general"  onclick="switchTab('general')">🔍 General</button>
    </div>

    <div class="tab-panel active" id="panel-monthly"></div>
    <div class="tab-panel"        id="panel-date"></div>
    <div class="tab-panel"        id="panel-name"></div>
    <div class="tab-panel"        id="panel-general"></div>
  `;

  buildMonthlyPanel();
  buildDatePanel();
  buildNamePanel();
  buildGeneralPanel();
}

function refreshCheckTab() {
  // Re-render current tab with fresh data
  const el = document.getElementById('screen-check');
  if (!el) { renderCheck(); return; }
  buildMonthlyPanel();
  buildNamePanel();
}

function switchTab(tab) {
  _activeTab = tab;
  ['monthly','date','name','general'].forEach(t => {
    document.getElementById('tab-' + t)?.classList.toggle('active', t === tab);
    document.getElementById('panel-' + t)?.classList.toggle('active', t === tab);
  });
}

// ── MONTHLY PANEL ──
function buildMonthlyPanel() {
  const panel = document.getElementById('panel-monthly');
  if (!panel) return;

  const all = myRecords();
  if (all.length === 0) {
    panel.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">No Records Yet</div>
        <div class="empty-sub">Add your first expense and it will appear here.</div>
      </div>`;
    return;
  }

  const grouped   = groupByMonthWeek(all);
  const monthKeys = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
  const opts      = monthKeys.map(k =>
    `<option value="${k}">${monthLabel(k)}</option>`).join('');

  panel.innerHTML = `
    <div class="fg" style="flex-shrink:0">
      <label class="label">Select Month</label>
      <select class="inp-sel" id="month-sel" onchange="renderMonthView(this.value)">
        ${opts}
      </select>
    </div>
    <div id="month-content" style="display:flex;flex-direction:column;gap:12px;flex:1"></div>
  `;

  if (monthKeys.length) renderMonthView(monthKeys[0]);
}

function renderMonthView(mk) {
  const cont = document.getElementById('month-content');
  if (!cont) return;

  const all     = myRecords();
  const grouped = groupByMonthWeek(all);
  const data    = grouped[mk] || {};
  const [yr, mo] = mk.split('-').map(Number);
  const moRecs  = all.filter(r => monthKey(r.date) === mk);
  const moTotal = sumAmt(moRecs);

  if (!Object.keys(data).length) {
    cont.innerHTML = `<div class="no-results">
      <div class="no-results-icon">📭</div>
      <div class="no-results-title">No records for ${monthLabel(mk)}</div></div>`;
    return;
  }

  let html = '';
  const weeks = Object.keys(data).map(Number).sort((a,b) => a-b);

  weeks.forEach((wk, idx) => {
    const wRecs  = data[wk];
    const wTotal = sumAmt(wRecs);
    const wRange = weekRangeLabel(yr, mo - 1, wk);
    const sid    = `ws-${mk.replace('-','')}-${wk}`;

    html += `
      <div class="week-section${idx===0?' open':''}" id="${sid}">
        <div class="week-hdr" onclick="toggleWeek('${sid}')">
          <span class="week-badge">Week ${wk}</span>
          <span class="week-range">${wRange}</span>
          <span class="week-total">${fmtCur(wTotal)}</span>
          <span class="week-chevron">▾</span>
        </div>
        <div class="week-body">
          ${wRecs.map(r => recRow(r)).join('')}
        </div>
      </div>`;
  });

  html += `
    <div class="month-footer">
      <div class="month-footer-lbl">${monthLabel(mk)} Total</div>
      <div class="month-footer-amt">${fmtCur(moTotal)}</div>
      <div class="month-footer-cnt">${moRecs.length} transaction${moRecs.length!==1?'s':''}</div>
    </div>`;

  cont.innerHTML = html;
}

function toggleWeek(sid) {
  document.getElementById(sid)?.classList.toggle('open');
}

function recRow(r) {
  const init = (r.name||'?').charAt(0).toUpperCase();
  return `
    <div class="rec-row" onclick="openRecord('${r.id}')">
      <div class="rec-ava">${init}</div>
      <div class="rec-info">
        <div class="rec-name">${esc(r.name)}</div>
        <div class="rec-desc">${esc(r.description)||'No description'}</div>
        <div class="rec-date">${fmtDate(r.date)}</div>
      </div>
      <div class="rec-right">
        <div class="rec-amount">−${fmtCur(r.amount)}</div>
        ${r.receiptImage ? '<div class="rec-receipt" title="Has receipt">🧾</div>' : ''}
      </div>
    </div>`;
}

// ── DATE PANEL ──
function buildDatePanel() {
  const panel = document.getElementById('panel-date');
  if (!panel) return;

  panel.innerHTML = `
    <div class="card" style="display:flex;flex-direction:column;gap:14px;flex-shrink:0">
      <div style="font-size:14px;font-weight:800;color:var(--txt)">Search by Date</div>

      <div class="mode-btns">
        <button class="tab-btn active" id="dmode-single" onclick="setDateMode('single')">📅 Single Day</button>
        <button class="tab-btn"        id="dmode-range"  onclick="setDateMode('range')">📆 Date Range</button>
      </div>

      <div id="d-single">
        <div class="fg">
          <label class="label">Select Date</label>
          <input class="inp" id="d-day" type="date" value="${todayStr()}">
        </div>
      </div>

      <div id="d-range" style="display:none">
        <div class="date-range-grid">
          <div class="fg">
            <label class="label">From</label>
            <input class="inp" id="d-from" type="date">
          </div>
          <div class="fg">
            <label class="label">To</label>
            <input class="inp" id="d-to" type="date" value="${todayStr()}">
          </div>
        </div>
      </div>

      <button class="btn btn-primary" onclick="runDateSearch()">🔍 Search</button>
    </div>

    <div id="date-results" style="display:flex;flex-direction:column;gap:12px"></div>
  `;
}

function setDateMode(m) {
  S.dateMode = m;
  document.getElementById('dmode-single')?.classList.toggle('active', m==='single');
  document.getElementById('dmode-range')?.classList.toggle('active', m==='range');
  const ds = document.getElementById('d-single');
  const dr = document.getElementById('d-range');
  if (ds) ds.style.display = m==='single' ? '' : 'none';
  if (dr) dr.style.display = m==='range'  ? '' : 'none';
}

function runDateSearch() {
  const all = myRecords();
  let filtered, label;

  if (S.dateMode === 'single') {
    const d = document.getElementById('d-day')?.value;
    if (!d) { toast('Please select a date', 'err'); return; }
    filtered = all.filter(r => r.date === d);
    label    = fmtDate(d);
  } else {
    const from = document.getElementById('d-from')?.value;
    const to   = document.getElementById('d-to')?.value;
    if (!from||!to)  { toast('Please select both dates', 'err'); return; }
    if (from > to)   { toast('Start date must be before end date', 'err'); return; }
    filtered = all.filter(r => r.date >= from && r.date <= to);
    label    = `${fmtDate(from)} → ${fmtDate(to)}`;
  }

  renderResults('date-results', filtered, label);
}

// ── NAME PANEL ──
function buildNamePanel() {
  const panel = document.getElementById('panel-name');
  if (!panel) return;

  const names = [...new Set(myRecords().map(r => r.name))].sort();

  panel.innerHTML = `
    <div class="card" style="display:flex;flex-direction:column;gap:14px;flex-shrink:0">
      <div style="font-size:14px;font-weight:800;color:var(--txt)">Search by Recipient</div>

      <div class="fg">
        <label class="label">Recipient Name</label>
        <input class="inp" id="n-name" type="text"
          placeholder="Start typing a name…" list="n-suggestions">
        <datalist id="n-suggestions">
          ${names.map(n => `<option value="${esc(n)}">`).join('')}
        </datalist>
      </div>

      <div class="fg">
        <label class="label">Time Period</label>
        <select class="inp-sel" id="n-period" onchange="toggleNameCustom()">
          <option value="1">Last 1 Month</option>
          <option value="2">Last 2 Months</option>
          <option value="3">Last 3 Months</option>
          <option value="6">Last 6 Months</option>
          <option value="12">Last 12 Months (1 Year)</option>
          <option value="24">Last 24 Months (2 Years)</option>
          <option value="all">All Time</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      <div id="n-custom" style="display:none">
        <div class="date-range-grid">
          <div class="fg">
            <label class="label">From</label>
            <input class="inp" id="n-from" type="date">
          </div>
          <div class="fg">
            <label class="label">To</label>
            <input class="inp" id="n-to" type="date" value="${todayStr()}">
          </div>
        </div>
      </div>

      <button class="btn btn-primary" onclick="runNameSearch()">🔍 Search</button>
    </div>

    <div id="name-results" style="display:flex;flex-direction:column;gap:12px"></div>
  `;
}

function toggleNameCustom() {
  const v = document.getElementById('n-period')?.value;
  const c = document.getElementById('n-custom');
  if (c) c.style.display = v === 'custom' ? '' : 'none';
}

function runNameSearch() {
  const name = (document.getElementById('n-name')?.value || '').trim();
  if (!name) { toast('Please enter a name', 'err'); return; }

  const period = document.getElementById('n-period')?.value;
  let filtered = myRecords().filter(r =>
    r.name.toLowerCase().includes(name.toLowerCase())
  );

  if (period !== 'all' && period !== 'custom') {
    const months = parseInt(period);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutStr = toStr(cutoff);
    filtered = filtered.filter(r => r.date >= cutStr);
  } else if (period === 'custom') {
    const from = document.getElementById('n-from')?.value;
    const to   = document.getElementById('n-to')?.value;
    if (!from||!to) { toast('Please select custom date range', 'err'); return; }
    filtered = filtered.filter(r => r.date >= from && r.date <= to);
  }

  const pLabels = {
    '1':'Last 1 Month','2':'Last 2 Months','3':'Last 3 Months',
    '6':'Last 6 Months','12':'Last 12 Months','24':'Last 24 Months',
    'all':'All Time','custom':'Custom Range'
  };
  renderResults('name-results', filtered, `"${name}" — ${pLabels[period]}`);
}

// ── GENERAL PANEL ──
function buildGeneralPanel() {
  const panel = document.getElementById('panel-general');
  if (!panel) return;

  panel.innerHTML = `
    <div class="card" style="display:flex;flex-direction:column;gap:14px;flex-shrink:0">
      <div style="font-size:14px;font-weight:800;color:var(--txt)">General Query</div>

      <div class="fg">
        <label class="label">Query Type</label>
        <select class="inp-sel" id="g-type" onchange="updateGenFields()">
          <option value="today">Today</option>
          <option value="this-week">This Week</option>
          <option value="last-week">Last Week</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="this-year">This Year</option>
          <option value="last-year">Last Year</option>
          <option value="day">Specific Day</option>
          <option value="week">Specific Week</option>
          <option value="month">Specific Month</option>
          <option value="year">Specific Year</option>
          <option value="all">All Records</option>
        </select>
      </div>

      <div id="g-extra"></div>

      <button class="btn btn-primary" onclick="runGeneral()">🔍 Run Query</button>
    </div>

    <div id="gen-results" style="display:flex;flex-direction:column;gap:12px"></div>
  `;
}

function updateGenFields() {
  const t     = document.getElementById('g-type')?.value;
  const extra = document.getElementById('g-extra');
  if (!extra) return;
  const yr  = new Date().getFullYear();
  const yrOptions = Array.from({length:10},(_,i)=>yr-i)
    .map(y=>`<option value="${y}">${y}</option>`).join('');

  switch(t) {
    case 'day':
      extra.innerHTML = `<div class="fg"><label class="label">Select Day</label>
        <input class="inp" id="g-day" type="date" value="${todayStr()}"></div>`;
      break;
    case 'week':
      extra.innerHTML = `<div class="fg"><label class="label">Pick any day in the week</label>
        <input class="inp" id="g-week" type="date" value="${todayStr()}"></div>`;
      break;
    case 'month':
      extra.innerHTML = `<div class="fg"><label class="label">Select Month</label>
        <input class="inp" id="g-month" type="month" value="${todayStr().slice(0,7)}"></div>`;
      break;
    case 'year':
      extra.innerHTML = `<div class="fg"><label class="label">Select Year</label>
        <select class="inp-sel" id="g-year">${yrOptions}</select></div>`;
      break;
    default:
      extra.innerHTML = '';
  }
}

function runGeneral() {
  const type = document.getElementById('g-type')?.value;
  const all  = myRecords();
  const now  = new Date();
  let filtered, label;

  switch(type) {
    case 'today': {
      const d = todayStr();
      filtered = all.filter(r => r.date === d);
      label = `Today (${fmtDate(d)})`;
      break;
    }
    case 'this-week': {
      const mon = getMondayOf(now);
      const sun = new Date(mon); sun.setDate(mon.getDate()+6);
      const from = toStr(mon), to = toStr(sun);
      filtered = all.filter(r => r.date >= from && r.date <= to);
      label = `This Week (${fmtDate(from)} – ${fmtDate(to)})`;
      break;
    }
    case 'last-week': {
      const mon = getMondayOf(now); mon.setDate(mon.getDate()-7);
      const sun = new Date(mon); sun.setDate(mon.getDate()+6);
      const from = toStr(mon), to = toStr(sun);
      filtered = all.filter(r => r.date >= from && r.date <= to);
      label = `Last Week (${fmtDate(from)} – ${fmtDate(to)})`;
      break;
    }
    case 'this-month': {
      const mk = monthKey(todayStr());
      filtered = all.filter(r => monthKey(r.date) === mk);
      label = `This Month (${monthLabel(mk)})`;
      break;
    }
    case 'last-month': {
      const lm = new Date(now.getFullYear(), now.getMonth()-1, 1);
      const mk = `${lm.getFullYear()}-${String(lm.getMonth()+1).padStart(2,'0')}`;
      filtered = all.filter(r => monthKey(r.date) === mk);
      label = `Last Month (${monthLabel(mk)})`;
      break;
    }
    case 'this-year': {
      const y = now.getFullYear().toString();
      filtered = all.filter(r => r.date.startsWith(y));
      label = `This Year (${y})`;
      break;
    }
    case 'last-year': {
      const y = (now.getFullYear()-1).toString();
      filtered = all.filter(r => r.date.startsWith(y));
      label = `Last Year (${y})`;
      break;
    }
    case 'day': {
      const d = document.getElementById('g-day')?.value;
      if (!d) { toast('Please select a day','err'); return; }
      filtered = all.filter(r => r.date === d);
      label = fmtDate(d);
      break;
    }
    case 'week': {
      const dv = document.getElementById('g-week')?.value;
      if (!dv) { toast('Please select a day','err'); return; }
      const mon = getMondayOf(parseD(dv));
      const sun = new Date(mon); sun.setDate(mon.getDate()+6);
      const from = toStr(mon), to = toStr(sun);
      filtered = all.filter(r => r.date >= from && r.date <= to);
      label = `Week of ${fmtDate(from)} – ${fmtDate(to)}`;
      break;
    }
    case 'month': {
      const mv = document.getElementById('g-month')?.value;
      if (!mv) { toast('Please select a month','err'); return; }
      filtered = all.filter(r => r.date.startsWith(mv));
      label = monthLabel(mv);
      break;
    }
    case 'year': {
      const yv = document.getElementById('g-year')?.value;
      if (!yv) { toast('Please select a year','err'); return; }
      filtered = all.filter(r => r.date.startsWith(yv));
      label = `Year ${yv}`;
      break;
    }
    case 'all':
    default:
      filtered = all;
      label = 'All Records';
  }

  renderResults('gen-results', filtered, label);
}

// ── SHARED RESULTS RENDERER ──
function renderResults(containerId, records, label) {
  const cont = document.getElementById(containerId);
  if (!cont) return;

  if (!records.length) {
    cont.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">🔍</div>
        <div class="no-results-title">No results found</div>
        <div class="no-results-sub">No transactions match your criteria.</div>
      </div>`;
    return;
  }

  const total  = sumAmt(records);
  const sorted = [...records].sort((a,b) => b.date.localeCompare(a.date));

  cont.innerHTML = `
    <div class="sum-banner">
      <div>
        <div class="sum-lbl">${esc(label)}</div>
        <div class="sum-amt">${fmtCur(total)}</div>
        <div class="sum-count">${records.length} transaction${records.length!==1?'s':''}</div>
      </div>
      <div class="sum-icon">📊</div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      ${sorted.map(r => recRow(r)).join('')}
    </div>`;
}

// ══════════════════════════════════════════════════════════
//  ─── SCREEN: RECEIPT VIEWER ───
// ══════════════════════════════════════════════════════════
function openRecord(recId) {
  const all = myRecords();
  const rec = all.find(r => r.id === recId);
  if (!rec) return;

  if (!rec.receiptImage) {
    toast(`${rec.name}: ${fmtCur(rec.amount)} — ${fmtDate(rec.date)}`, 'info');
    return;
  }

  S.receiptRec = rec;
  const screen = document.getElementById('screen-receipt');

  screen.innerHTML = `
    <div class="rv-header">
      <button class="rv-btn" onclick="closeReceipt()">‹</button>
      <div class="rv-info">
        <div class="rv-info-name">${esc(rec.name)}</div>
        <div class="rv-info-date">${fmtDate(rec.date)} · ${fmtCur(rec.amount)}</div>
      </div>
      <div style="width:40px"></div>
    </div>

    <div class="rv-img-wrap">
      <img src="${rec.receiptImage}" alt="Receipt for ${esc(rec.name)}">
    </div>

    <div class="rv-footer">
      <button class="btn btn-secondary" onclick="closeReceipt()">← Go Back</button>
      <button class="btn btn-primary"   onclick="exportReceipt('${rec.id}')">⬇️ Export</button>
    </div>
  `;

  nav('receipt');
}

function closeReceipt() {
  S.receiptRec = null;
  goBack();
}

function exportReceipt(recId) {
  const all = myRecords();
  const rec = all.find(r => r.id === recId);
  if (!rec?.receiptImage) return;

  const link      = document.createElement('a');
  link.href       = rec.receiptImage;
  link.download   = `receipt_${rec.name.replace(/\s+/g,'_')}_${rec.date}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast('Receipt downloaded! 📥', 'ok');
}

// ══════════════════════════════════════════════════════════
//  BOOT
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);
