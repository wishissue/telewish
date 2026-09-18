"use strict";

/* =========================================================================
   SPLASH
   ========================================================================= */
(function initSplash(){
  const splash = document.getElementById('splash');
  if (!splash) return;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fadeAt   = reduced ? 350 : 1500;
  const removeAt = reduced ? 550 : 2050;
  setTimeout(() => splash.classList.add('hidden'), fadeAt);
  setTimeout(() => { try { splash.remove(); } catch(e){} }, removeAt);
})();

/* =========================================================================
   UTILITIES
   ========================================================================= */
function $(id){ return document.getElementById(id); }
function esc(str){
  return String(str == null ? '' : str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escAttr(str){ return esc(str); }
function genId(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
function safeId(id){ return (typeof id === 'string' && /^[a-z0-9]{4,24}$/.test(id)) ? id : null; }
function todayKey(){ return new Date().toISOString().slice(0,10); }

const toastWrap = $('toastWrap');
function toast(text, ms){
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, ms || 2200);
}

/* =========================================================================
   SOUND
   ========================================================================= */
const Sound = (() => {
  let ctx = null;
  let enabled = true;

  function ac(){
    if (!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch(e){ return null; }
    }
    if (ctx.state === 'suspended'){ try { ctx.resume(); } catch(e){} }
    return ctx;
  }
  function tone(freq, dur, type, gain, delay, sweepTo){
    if (!enabled) return;
    const a = ac(); if (!a) return;
    const t0 = a.currentTime + (delay || 0);
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, sweepTo), t0 + dur);
    const peak = gain == null ? 0.07 : gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function noise(dur, gain, delay){
    if (!enabled) return;
    const a = ac(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random()*2 - 1) * (1 - i/n);
    const src = a.createBufferSource(); src.buffer = buf;
    const g = a.createGain(); g.gain.value = gain == null ? 0.03 : gain;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.9;
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start(a.currentTime + (delay || 0));
  }

  return {
    unlock(){ ac(); },
    setEnabled(v){ enabled = !!v; if (enabled) ac(); },
    isEnabled(){ return enabled; },
    click(){ tone(760, 0.045, 'triangle', 0.035); },
    tap(){ tone(1020, 0.03, 'sine', 0.022); },
    send(){ tone(680, 0.085, 'sine', 0.06); tone(1020, 0.11, 'sine', 0.045, 0.055); },
    receive(){ tone(540, 0.09, 'sine', 0.06); tone(810, 0.13, 'sine', 0.05, 0.06); noise(0.05, 0.012, 0.02); },
    connect(){ [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.24, 'triangle', 0.055, i * 0.085)); },
    disconnect(){ tone(440, 0.16, 'sine', 0.05); tone(294, 0.26, 'sine', 0.05, 0.14); },
    error(){ tone(210, 0.22, 'sawtooth', 0.035, 0, 130); tone(160, 0.24, 'sawtooth', 0.03, 0.08, 100); },
    copy(){ tone(1046.5, 0.06, 'sine', 0.045); tone(1396.9, 0.09, 'sine', 0.04, 0.055); },
    toggle(on){ tone(on ? 700 : 420, 0.07, 'triangle', 0.05); if (on) tone(1050, 0.08, 'triangle', 0.04, 0.06); },
    reveal(){ tone(620, 0.06, 'sine', 0.04); tone(930, 0.08, 'sine', 0.035, 0.05); tone(1240, 0.1, 'sine', 0.03, 0.1); },
    recStart(){ tone(880, 0.07, 'triangle', 0.05); },
    recStop(){ tone(560, 0.09, 'triangle', 0.05); }
  };
})();

/* =========================================================================
   APP SETTINGS (theme, sound, notifications, chat saving)
   ========================================================================= */
const Settings = {
  get theme(){ try { return localStorage.getItem('telewishTheme') || 'light'; } catch(e){ return 'light'; } },
  set theme(v){ try { localStorage.setItem('telewishTheme', v); } catch(e){} applyTheme(v); },
  get customColor(){ try { return localStorage.getItem('telewishCustomColor') || '#7c5cff'; } catch(e){ return '#7c5cff'; } },
  set customColor(v){ try { localStorage.setItem('telewishCustomColor', v); } catch(e){} },
  get customBase(){ try { return localStorage.getItem('telewishCustomBase') || 'light'; } catch(e){ return 'light'; } },
  set customBase(v){ try { localStorage.setItem('telewishCustomBase', v === 'dark' ? 'dark' : 'light'); } catch(e){} },
  get sound(){ try { return localStorage.getItem('telewishSound') !== 'off'; } catch(e){ return true; } },
  set sound(v){ try { localStorage.setItem('telewishSound', v ? 'on' : 'off'); } catch(e){} },
  get notif(){ try { return localStorage.getItem('telewishNotif') === 'on'; } catch(e){ return false; } },
  set notif(v){ try { localStorage.setItem('telewishNotif', v ? 'on' : 'off'); } catch(e){} },
  get saveChats(){ try { return localStorage.getItem('telewishSaveChats') === 'on'; } catch(e){ return false; } },
  set saveChats(v){ try { localStorage.setItem('telewishSaveChats', v ? 'on' : 'off'); } catch(e){} }
};

/* ---- tiny color helpers for the custom theme ---- */
function hexToRgb(hex){
  hex = (hex || '#7c5cff').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b){
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
function mixColor(hex, targetHex, amount){
  const a = hexToRgb(hex), b = hexToRgb(targetHex);
  return rgbToHex(a.r + (b.r - a.r) * amount, a.g + (b.g - a.g) * amount, a.b + (b.b - a.b) * amount);
}
function readableInk(hex){
  const { r, g, b } = hexToRgb(hex);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.6 ? '#181410' : '#ffffff';
}

function applyCustomThemeColors(color, base){
  const root = document.documentElement.style;
  const dim = mixColor(color, base === 'dark' ? '#000000' : '#ffffff', base === 'dark' ? 0.72 : 0.85);
  const ink = readableInk(color);
  root.setProperty('--accent', color);
  root.setProperty('--accent-ink', ink);
  root.setProperty('--accent-dim', dim);
  root.setProperty('--accent2', mixColor(color, '#5ec2ff', 0.5));
  root.setProperty('--sky', mixColor(color, '#7bd4ff', 0.4));
  root.setProperty('--sky2', mixColor(color, '#a6e3ff', 0.4));
}
function clearCustomThemeColors(){
  const root = document.documentElement.style;
  ['--accent', '--accent-ink', '--accent-dim', '--accent2', '--sky', '--sky2'].forEach(v => root.removeProperty(v));
}

function applyTheme(t){
  if (t !== 'light' && t !== 'dark' && t !== 'rose' && t !== 'custom') t = 'light';
  if (t === 'custom'){
    const base = Settings.customBase;
    document.documentElement.setAttribute('data-theme', base);
    applyCustomThemeColors(Settings.customColor, base);
  } else {
    clearCustomThemeColors();
    document.documentElement.setAttribute('data-theme', t);
  }
  document.querySelectorAll('.themeSwatch').forEach(el => {
    el.classList.toggle('sel', el.dataset.themePick === t);
  });
  const cRow = $('customThemeRow');
  if (cRow) cRow.style.display = t === 'custom' ? 'flex' : 'none';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta){
    meta.content = t === 'custom' ? Settings.customColor
      : t === 'dark' ? '#141210' : (t === 'rose' ? '#fff7f7' : '#fff9e8');
  }
}
applyTheme(Settings.theme);
Sound.setEnabled(Settings.sound);

/* =========================================================================
   PROFILE
   ========================================================================= */
const Profile = {
  _data: null,
  load(){
    if (this._data) return this._data;
    try {
      const raw = localStorage.getItem('telewishProfile');
      this._data = raw ? JSON.parse(raw) : { name: '', avatar: '' };
    } catch(e){ this._data = { name: '', avatar: '' }; }
    if (!this._data || typeof this._data !== 'object') this._data = { name:'', avatar:'' };
    return this._data;
  },
  save(data){
    this._data = { name: String(data.name || '').slice(0,28), avatar: data.avatar || '' };
    try {
      if (this._data.avatar && this._data.avatar.length > 400000){
        // too big to persist reliably — keep it in memory for this session only
        const slim = { name: this._data.name, avatar: '' };
        localStorage.setItem('telewishProfile', JSON.stringify(slim));
      } else {
        localStorage.setItem('telewishProfile', JSON.stringify(this._data));
      }
    } catch(e){ toast('Could not save profile — storage full'); }
    renderProfileButton();
    return this._data;
  },
  initial(){
    const p = this.load();
    if (p.name) return p.name.trim().charAt(0).toUpperCase();
    return '?';
  },
  displayName(){
    // Used for our own UI (header, own message group label). "You" is fine here
    // because it's never shown to the other person.
    const p = this.load();
    return p.name && p.name.trim() ? p.name.trim() : 'You';
  },
  shareName(){
    // Used whenever we send our name to the peer. Sending "You" would make the
    // peer's screen say "You" for OUR messages, which reads as if it were them
    // talking to themselves — so an unset name goes out as "Anonymous" instead.
    const p = this.load();
    return p.name && p.name.trim() ? p.name.trim() : 'Anonymous';
  }
};

function renderProfileButton(){
  const btn = $('profileBtn');
  const p = Profile.load();
  if (p.avatar){
    btn.innerHTML = '<img src="' + escAttr(p.avatar) + '" alt="">';
  } else {
    btn.innerHTML = '<span>' + esc(Profile.initial()) + '</span>';
  }
}
renderProfileButton();

function avatarHTML(profile, fallbackLetter, sizeClass){
  const cls = 'chAvatar' + (sizeClass ? ' ' + sizeClass : '');
  if (profile && profile.avatar){
    return '<span class="' + cls + '"><img src="' + escAttr(profile.avatar) + '" alt=""></span>';
  }
  const letter = (profile && profile.name ? profile.name.trim().charAt(0) : (fallbackLetter || '?')).toUpperCase();
  return '<span class="' + cls + '"><span>' + esc(letter) + '</span></span>';
}

/* =========================================================================
   LOCAL CHAT STORE
   ========================================================================= */
const ChatStore = {
  KEY: 'telewishChats',
  all(){
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e){ return {}; }
  },
  write(all){
    try { localStorage.setItem(this.KEY, JSON.stringify(all)); return true; }
    catch(e){ toast('Local storage is full — older chats may need deleting'); return false; }
  },
  ensure(id, meta){
    const all = this.all();
    if (!all[id]){
      all[id] = { id, peer: meta || {}, messages: [], updatedAt: Date.now() };
      this.write(all);
    } else if (meta){
      all[id].peer = Object.assign({}, all[id].peer, meta);
      this.write(all);
    }
    return all[id];
  },
  add(chatId, meta, record){
    if (!Settings.saveChats || !chatId) return;
    const all = this.all();
    if (!all[chatId]) all[chatId] = { id: chatId, peer: meta || {}, messages: [], updatedAt: Date.now() };
    if (meta) all[chatId].peer = Object.assign({}, all[chatId].peer, meta);
    const list = all[chatId].messages;
    if (!list.some(m => m.id === record.id)) list.push(record);
    if (list.length > 800) list.splice(0, list.length - 800);
    all[chatId].updatedAt = Date.now();
    this.write(all);
  },
  update(chatId, msgId, patch){
    if (!Settings.saveChats || !chatId) return;
    const all = this.all();
    const c = all[chatId];
    if (!c) return;
    const m = c.messages.find(x => x.id === msgId);
    if (!m) return;
    Object.assign(m, patch);
    this.write(all);
  },
  removeMessage(chatId, msgId){
    if (!chatId) return;
    const all = this.all();
    const c = all[chatId];
    if (!c) return;
    c.messages = c.messages.filter(x => x.id !== msgId);
    this.write(all);
  },
  remove(chatId){
    const all = this.all();
    delete all[chatId];
    this.write(all);
  },
  count(){ return Object.keys(this.all()).length; }
};

/* Convert a blob URL to a data URL for persistence (small media only). */
async function blobUrlToDataUrl(url, maxBytes){
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    if (maxBytes && blob.size > maxBytes) return '';
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(new Error('read fail'));
      fr.readAsDataURL(blob);
    });
  } catch(e){ return ''; }
}

/* =========================================================================
   WORD DIRECTORY + PASSPHRASE LOGIC
   ========================================================================= */
const WORDS = [
  "amber","apple","arrow","baker","beach","birch","blaze","bloom",
  "brick","brook","cabin","candy","cedar","chalk","chess","cloud",
  "coral","crane","cream","crown","daisy","delta","diner","drape",
  "eagle","ember","fable","fern","flame","flute","forge","frost",
  "glass","globe","grape","grove","hazel","honey","ivory","jade",
  "jolly","kite","lemon","lilac","lunar","maple","march","melon",
  "mint","noble","north","olive","onyx","opera","peach","pearl",
  "pine","plum","quartz","raven","river","robin","sable","solar"
];
const WORD_INDEX = Object.create(null);
WORDS.forEach((w, i) => { WORD_INDEX[w] = i; });

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function secureRandomInt(max){
  if (max <= 0) return 0;
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}
function tokenChars(t, mode){
  // Secure-mode tokens store two word-list indices ({w, n}); simple-mode
  // tokens store the two raw characters directly ({s}). Using the wrong
  // shape here used to silently produce the string "NaN" for simple-mode
  // tokens, corrupting the rebuilt code — that was the root cause of
  // "that code and passphrase don't fit together" always firing in Simple mode.
  return mode === 'simple' ? t.s : (B64[t.w] + B64[t.n]);
}
function passphraseText(tokens, mode){
  if (mode === 'simple') return tokens.map(t => t.s).join('');
  return tokens.map(t => WORDS[t.w] + ' ' + (t.n + 1)).join('  ');
}
function tokensToCanonical(tokens, mode){
  if (mode === 'simple') return tokens.map(t => t.s).join('');
  return tokens.map(t => WORDS[t.w] + ' ' + (t.n + 1)).join(' ');
}

function parseSimplePass(raw){
  const clean = String(raw || '').toLowerCase().replace(/[\s-]/g, '');
  if (clean.length === 0) throw new Error('Type the 8-character passphrase they gave you.');
  if (clean.length !== 8) throw new Error('Simple passphrase must be exactly 8 characters (you typed ' + clean.length + ').');
  if (!/^[a-z0-9]{8}$/.test(clean)) throw new Error('Simple passphrase can only contain letters a–z and numbers 0–9.');
  return [
    { s: clean.slice(0, 2) }, { s: clean.slice(2, 4) },
    { s: clean.slice(4, 6) }, { s: clean.slice(6, 8) }
  ];
}
function parseSecurePass(raw){
  const parts = String(raw || '').toLowerCase().match(/[a-z]+|\d+/g) || [];
  const tokens = [];
  let pending = null, pendingName = '';
  for (const p of parts){
    if (/^\d+$/.test(p)){
      if (pending === null) throw new Error('Found the number ' + p + ' without a word in front of it.');
      const n = parseInt(p, 10);
      if (!(n >= 1 && n <= 64)) throw new Error('"' + n + '" isn\'t a valid passphrase number — they run from 1 to 64.');
      tokens.push({ w: pending, n: n - 1 });
      pending = null;
    } else {
      if (pending !== null) throw new Error('The word "' + pendingName + '" is missing its number.');
      if (!(p in WORD_INDEX)) throw new Error('"' + p + '" isn\'t one of the passphrase words. Check the spelling.');
      pending = WORD_INDEX[p]; pendingName = p;
    }
  }
  if (pending !== null) throw new Error('The word "' + pendingName + '" is missing its number.');
  return tokens;
}
function parsePassphrase(raw, mode){
  return mode === 'simple' ? parseSimplePass(raw) : parseSecurePass(raw);
}
function countPlaceholders(visible){
  const m = String(visible || '').match(/[~-](\d+)[~-]/g);
  return m ? m.length : 0;
}
function detectMode(visible){
  const s = String(visible || '');
  if (/-\d+-/.test(s)) return 'simple';
  if (/~\d+~/.test(s)) return 'secure';
  return null;
}
function splitCode(code, mode){
  mode = mode || 'secure';
  const chars = Array.from(code);
  const len = chars.length;
  const ch = mode === 'simple' ? '-' : '~';
  let slots;
  if (mode === 'simple'){ slots = 4; }
  else {
    slots = 5;
    if (len < 60) slots = 4;
    if (len < 40) slots = 3;
    if (len < 24) slots = 2;
    if (len < 12) slots = 1;
  }
  const positions = [];
  let attempts = 0, minGap = 5;
  while (positions.length < slots && attempts < 2000){
    attempts++;
    if (attempts === 900) minGap = 2;
    const span = Math.max(1, len - 8);
    const p = 3 + secureRandomInt(span);
    if (p + 1 >= len) continue;
    if (mode === 'simple'){
      if (!/[a-z0-9]/.test(chars[p]) || !/[a-z0-9]/.test(chars[p + 1])) continue;
    } else {
      if (B64.indexOf(chars[p]) < 0 || B64.indexOf(chars[p + 1]) < 0) continue;
    }
    if (positions.some(q => Math.abs(q - p) < minGap)) continue;
    positions.push(p);
  }
  positions.sort((a, b) => a - b);
  let visible = '', last = 0;
  const tokens = [];
  positions.forEach((p, i) => {
    visible += chars.slice(last, p).join('');
    if (mode === 'simple'){ tokens.push({ s: chars[p] + chars[p + 1] }); }
    else { tokens.push({ w: B64.indexOf(chars[p]), n: B64.indexOf(chars[p + 1]) }); }
    visible += ch + (i + 1) + ch;
    last = p + 2;
  });
  visible += chars.slice(last).join('');
  return { visible, tokens, mode };
}
function mergeCode(visible, tokens){
  const mode = detectMode(visible) || 'secure';
  const ch = mode === 'simple' ? '-' : '~';
  let out = visible;
  for (let i = 0; i < tokens.length; i++){
    const marker = ch + (i + 1) + ch;
    if (out.indexOf(marker) === -1)
      throw new Error('The code is missing placeholder ' + (i + 1) + '. Make sure you pasted the whole thing.');
    out = out.split(marker).join(tokenChars(tokens[i], mode));
  }
  if (/[~-]\d+[~-]/.test(out))
    throw new Error('The code still has unfilled gaps — you may have missed a word or character.');
  return out;
}

/* =========================================================================
   CRYPTO
   ========================================================================= */
const CRYPTO_AVAILABLE = !!(window.crypto && window.crypto.subtle);

function b64u(bytes){
  let binary = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH){
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(str){
  str = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function bytesToBase64(bytes){
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize){
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
function base64ToBytes(str){
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveCrypto(tokens, saltBytes, mode){
  if (!CRYPTO_AVAILABLE) throw new Error('WebCrypto unavailable (needs https:// or localhost).');
  if (!saltBytes || saltBytes.length < 16) throw new Error('Corrupt or missing salt in the code.');
  const pass = tokensToCanonical(tokens, mode || 'secure');
  const baseKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pass), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 250000, hash: 'SHA-256' },
    baseKey, 512
  );
  const arr = new Uint8Array(bits);
  const aesBytes = arr.slice(0, 32);
  const sasBytes = arr.slice(32, 36);
  const aesKey = await crypto.subtle.importKey(
    'raw', aesBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  );
  const hex = Array.from(sasBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const sas = hex.slice(0, 4) + '-' + hex.slice(4, 8);
  return { aesKey, sas };
}

async function encryptMessage(key, obj){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return JSON.stringify({ v: 1, iv: b64u(iv), ct: b64u(new Uint8Array(ct)) });
}
async function decryptMessage(key, raw){
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.v !== 1 || !parsed.iv || !parsed.ct) throw new Error('bad envelope');
  const iv = b64uDecode(parsed.iv);
  const ct = b64uDecode(parsed.ct);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(pt));
}

/* =========================================================================
   WebRTC + APP
   ========================================================================= */
const rtcConfig = { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
]};

let pc = null, dc = null;
let sessionKey = null;
let sessionSas = '';
let sessionChatId = '';
let peerProfile = { name: '', avatar: '' };

let lastSender = null;
const statusEl = $('status');
const messagesEl = $('messages');
const msgInput = $('msgInput');
const sendBtn = $('sendBtn');
const setupEl = $('setup');
const setupScrollEl = $('setupScroll');
const chatWrap = $('chatWrap');
const attachBtn = $('attachBtn');
const emojiBtn = $('emojiBtn');
const micBtn = $('micBtn');
const emojiPop = $('emojiPop');
const fileInput = $('fileInput');
const attachPreview = $('attachPreview');
const lightbox = $('lightbox');
const lightboxImg = $('lightboxImg');
const chatDot = $('chatDot');
const chatName = $('chatName');
const chatAvatar = $('chatAvatar');
const chatSas = $('chatSas');
const chatSasValue = $('chatSasValue');
const chatDisconnect = $('chatDisconnect');
const qBars = $('qBars');
const connBanner = $('connBanner');
const connBannerText = $('connBannerText');
const replyBar = $('replyBar');
const rbName = $('rbName');
const rbText = $('rbText');
const recBar = $('recBar');
const recTime = $('recTime');

/* --- passphrase mode toggle --- */
const strongPassCheck = $('strongPassCheck');
const strongPill = $('strongPill');
const strongPassExplain = $('strongPassExplain');

function modeFromToggle(){ return strongPassCheck.checked ? 'secure' : 'simple'; }
function refreshModeUI(){
  const secure = strongPassCheck.checked;
  strongPill.textContent = secure ? 'On' : 'Off';
  strongPill.className = 'modePill ' + (secure ? 'strong' : 'simple');
  strongPassExplain.innerHTML = secure
    ? 'When <b>on</b>: 5 dictionary words + numbers, like "raven 37 amber 12" — easier to read aloud and much harder to guess. When <b>off</b>: a short 8-character password like "king1625" that\'s quicker to type and say, but noticeably weaker.'
    : 'Currently <b>off</b>: you\'ll get a short 8-character passphrase like "king1625". Turn this on to use 5 dictionary words + numbers instead — much stronger, and still easy to read aloud.';
}
try { strongPassCheck.checked = localStorage.getItem('telewishStrongPass') !== 'off'; } catch(e){}
refreshModeUI();
strongPassCheck.addEventListener('change', () => {
  try { localStorage.setItem('telewishStrongPass', strongPassCheck.checked ? 'on' : 'off'); } catch(e){}
  refreshModeUI();
  Sound.toggle(strongPassCheck.checked);
});

/* =========================================================================
   EMOJI SETS
   ========================================================================= */
const QUICK_REACTIONS = ['❤️','😂','👍','😮','😢','🔥'];
const FULL_EMOJI = [
  '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','💩','🤡','👻','👽','🤖',
  '👍','👎','👌','🤌','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤝','🙏','✍️','💅','🤳','💪','🦾','🫶','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💯','🔥','✨','⭐','🌟','💫','⚡','💥','🎉','🎊','🎈','🎁','🏆','🥇','🥳','🎯','🚀','🌈','☀️','🌙','⛅','☕','🍕','🍔','🍟','🍰','🍩','🍎','🍉','🍓','🥑','🎵','🎧','📷','📎','📌','💡','⏰','✅','❌','⚠️','❓','❗','💬','👀','🫡','🫠','🥹','🫣','🫢','🩷','🩵','🩶'
];
const EMOJI_LIST = FULL_EMOJI;

/* =========================================================================
   FILE / MEDIA HELPERS
   ========================================================================= */
const CHUNK_BYTES = 12000;                    /* ~16 KB base64 per chunk */
const MAX_FILE_BYTES = 500 * 1024 * 1024;     /* 500 MB hard cap — tune this if you need bigger.
  Everything is base64-encoded and held in memory on both ends (no disk streaming), so pushing this
  much higher risks the tab running out of memory on large files, especially on phones. */
const LARGE_FILE_WARN_BYTES = 100 * 1024 * 1024; /* above this, warn the user about memory/speed
  before they send, and suggest zipping first if the file type would benefit from it. */
const PERSIST_MEDIA_MAX = 1.5 * 1024 * 1024;  /* only small media saved to disk */

/* File types that are already compressed (or gain little from zipping) — no need to
   suggest zipping these even if they're large. Everything else gets the suggestion. */
const ALREADY_COMPRESSED_EXTS = new Set([
  'zip','rar','7z','gz','tgz','bz2','xz',
  'mp4','mkv','mov','avi','webm','m4v',
  'mp3','aac','flac','ogg','m4a','wma',
  'jpg','jpeg','png','gif','webp','heic','heif',
  'pdf'
]);

function shouldSuggestZip(name){
  const ext = (name.split('.').pop() || '').toLowerCase();
  return !ALREADY_COMPRESSED_EXTS.has(ext);
}

function largeFileWarning(file){
  let msg = '"' + file.name + '" is ' + humanSize(file.size) + '. Large files are held entirely ' +
    'in memory on both ends during transfer (nothing streams to disk), so this can slow the chat down, ' +
    'use a lot of RAM, or fail partway through if either device or browser tab runs low on memory — ' +
    'especially on phones.';
  if (shouldSuggestZip(file.name)){
    msg += ' If this can be zipped, compressing it first is a good idea — it\'ll be smaller, transfer faster, and use less memory.';
  }
  return msg;
}

function humanSize(bytes){
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  const units = ['KB','MB','GB'];
  let u = -1;
  do { bytes /= 1024; u++; } while (bytes >= 1024 && u < units.length - 1);
  return bytes.toFixed(1) + ' ' + units[u];
}
function fileIconFor(mime, name){
  mime = mime || ''; name = name || '';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return '📄';
  if (/\.(zip|rar|7z|tar|gz|bz2|xz)$/i.test(name)) return '🗜️';
  if (/\.(docx?|pages|odt|rtf|txt|md)$/i.test(name)) return '📝';
  if (/\.(xlsx?|csv|numbers|ods)$/i.test(name)) return '📊';
  if (/\.(pptx?|key|odp)$/i.test(name)) return '📽️';
  if (/\.(js|ts|jsx|tsx|py|rb|go|rs|java|c|cpp|h|css|html|json|xml|yml|yaml|sh)$/i.test(name)) return '⌨️';
  if (/\.(exe|msi|dmg|deb|apk|appimage)$/i.test(name)) return '⚙️';
  return '📎';
}
function fileCardHTML(name, mime, size, url){
  const dl = url
    ? '<a class="file-dl" href="' + escAttr(url) + '" download="' + escAttr(name) + '" title="Download" rel="noopener noreferrer">' +
      '<svg class="icon" viewBox="0 0 24 24" style="width:13px;height:13px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></a>'
    : '';
  return '<div class="file-card">' +
    '<div class="file-icon">' + fileIconFor(mime, name) + '</div>' +
    '<div class="file-meta">' +
      '<div class="file-name" title="' + escAttr(name) + '">' + esc(name) + '</div>' +
      '<div class="file-size">' + humanSize(size) + '</div>' +
    '</div>' + dl + '</div>';
}
function mediaOrCardHTML(name, mime, size, url){
  if (mime.startsWith('image/')){
    return '<div class="media-holder"><img class="chat-img" src="' + escAttr(url) + '" alt="' + escAttr(name) + '">' +
      '<button class="dl-btn" data-dl="' + escAttr(url) + '" data-name="' + escAttr(name) + '" title="Download" aria-label="Download image">' +
      '<svg class="icon" viewBox="0 0 24 24" style="width:15px;height:15px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button></div>';
  }
  if (mime.startsWith('video/')){
    return '<div class="media-holder"><video class="chat-video" src="' + escAttr(url) + '" controls playsinline preload="metadata"></video>' +
      '<button class="dl-btn" data-dl="' + escAttr(url) + '" data-name="' + escAttr(name) + '" title="Download" aria-label="Download video">' +
      '<svg class="icon" viewBox="0 0 24 24" style="width:15px;height:15px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button></div>';
  }
  return fileCardHTML(name, mime, size, url);
}
function voiceBubbleHTML(url, duration){
  const bars = 26;
  let wave = '';
  for (let i = 0; i < bars; i++){
    const h = 30 + Math.round(Math.abs(Math.sin(i * 1.7)) * 55);
    wave += '<i style="height:' + h + '%"></i>';
  }
  return '<div class="voice-msg" data-url="' + escAttr(url) + '" data-dur="' + (duration || 0) + '">' +
    '<button class="voice-play" type="button" aria-label="Play voice message">▶</button>' +
    '<div class="voice-track">' + wave + '</div>' +
    '<span class="voice-time">' + fmtDur(duration || 0) + '</span>' +
  '</div>';
}
function fmtDur(sec){
  sec = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}
function progressHTML(name, mime, size, direction){
  // direction is 'send' or 'receive' — controls whether the label says
  // "Sending…" or "Receiving…". Defaults to 'receive' for backwards callers.
  const verb = direction === 'send' ? 'Sending' : 'Receiving';
  return '<div class="file-progress-wrap" data-direction="' + (direction === 'send' ? 'send' : 'receive') + '">' +
    '<div class="file-card">' +
      '<div class="file-icon">' + fileIconFor(mime, name) + '</div>' +
      '<div class="file-meta"><div class="file-name" title="' + escAttr(name) + '">' + esc(name) + '</div><div class="file-size">' + humanSize(size) + '</div></div>' +
    '</div>' +
    '<div class="file-progress-track"><div class="file-progress-bar" style="width:0%"></div></div>' +
    '<div class="file-progress-label">' + verb + '… 0%</div>' +
  '</div>';
}
function b64toBlob(b64, mime){
  const byteChars = atob(b64);
  const sliceSize = 4096;
  const byteArrays = [];
  for (let offset = 0; offset < byteChars.length; offset += sliceSize){
    const slice = byteChars.slice(offset, offset + sliceSize);
    const nums = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) nums[i] = slice.charCodeAt(i);
    byteArrays.push(new Uint8Array(nums));
  }
  return new Blob(byteArrays, { type: mime || 'application/octet-stream' });
}
function waitForBuffer(){
  return new Promise(resolve => {
    (function check(){
      if (!dc || dc.readyState !== 'open' || dc.bufferedAmount < 262144) resolve();
      else setTimeout(check, 25);
    })();
  });
}

/* =========================================================================
   MESSAGE RENDERING
   ========================================================================= */
let replyContext = null;

function newBubbleWrap(id, innerHTML, extraClass){
  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap';
  wrap.dataset.id = id;
  wrap.innerHTML =
    '<div class="bubble' + (extraClass ? ' ' + extraClass : '') + '">' + innerHTML + '</div>' +
    '<div class="react-trigger" title="React" role="button" tabindex="0">⋯</div>' +
    '<div class="msg-reactions"></div>';
  return wrap;
}
function appendToGroup(wrap, type){
  hideTypingIndicator();
  let group;
  if (lastSender === type && messagesEl.lastElementChild && messagesEl.lastElementChild.classList.contains('msg-group')){
    group = messagesEl.lastElementChild;
    const t = group.querySelector('.msg-time');
    if (t) t.remove();
  } else {
    group = document.createElement('div');
    group.className = 'msg-group ' + type;
    messagesEl.appendChild(group);
  }
  group.appendChild(wrap);
  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  group.appendChild(time);
  lastSender = type;
  messagesEl.scrollTop = messagesEl.scrollHeight;
  const trig = wrap.querySelector('.react-trigger');
  if (trig){
    trig.onclick = (e) => { e.stopPropagation(); openActionPop(wrap); };
    trig.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openActionPop(wrap); } };
  }
  telewishBubbleInteractions(wrap);
  return group;
}

function telewishBubbleInteractions(wrap){
  let pressTimer = null;
  let moved = false;

  wrap.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openActionPop(wrap);
  });
  wrap.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    moved = false;
    pressTimer = setTimeout(() => {
      if (!moved) { openActionPop(wrap); try { navigator.vibrate && navigator.vibrate(12); } catch(err){} }
    }, 480);
  });
  wrap.addEventListener('pointermove', () => { moved = true; clearTimeout(pressTimer); });
  wrap.addEventListener('pointerup', () => clearTimeout(pressTimer));
  wrap.addEventListener('pointercancel', () => clearTimeout(pressTimer));
  wrap.addEventListener('pointerleave', () => clearTimeout(pressTimer));
}

function flipReplyWho(reply){
  if (!reply) return reply;
  return Object.assign({}, reply, { who: reply.who === 'me' ? 'them' : 'me' });
}
function buildReplyQuoteHTML(reply){
  if (!reply) return '';
  const who = reply.who === 'me' ? 'You' : (reply.name || 'Them');
  const txt = reply.kind === 'voice' ? '🎤 Voice message'
            : reply.kind === 'file' ? '📎 ' + (reply.text || 'Attachment')
            : (reply.text || '');
  return '<div class="reply-quote"><div class="rq-body">' +
    '<span class="rq-name">' + esc(who) + '</span>' +
    '<span class="rq-text">' + esc(txt) + '</span></div></div>';
}

function addMessage(text, type, id, replyTo){
  const inner = buildReplyQuoteHTML(replyTo) + esc(text).replace(/\n/g, '<br>');
  const wrap = newBubbleWrap(id || genId(), inner);
  appendToGroup(wrap, type);
  return wrap;
}

function addFileBubble(id, type, name, mime, size, url, opts){
  opts = opts || {};
  const isVoice = !!opts.voice;
  const isMedia = url && (mime.startsWith('image/') || mime.startsWith('video/'));
  let inner;
  if (isVoice && url) inner = voiceBubbleHTML(url, opts.duration);
  else if (url) inner = mediaOrCardHTML(name, mime, size, url);
  else inner = progressHTML(name, mime, size, type === 'me' ? 'send' : 'receive');

  const cls = (isMedia ? 'media' : '') + (isVoice ? ' voice' : '');
  const wrap = newBubbleWrap(id, buildReplyQuoteHTML(opts.replyTo) + inner, cls.trim());
  appendToGroup(wrap, type);
  if (isMedia || isVoice) telewishMediaButtons(wrap);
  return wrap;
}
function telewishMediaButtons(wrap){
  wrap.querySelectorAll('.dl-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const url = btn.dataset.dl;
      const name = btn.dataset.name || 'download';
      downloadUrl(url, name);
    };
  });
}
async function downloadUrl(url, name){
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'telewish-download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    Sound.tap();
  } catch(e){
    toast('Download failed — try right-clicking the media');
  }
}
function updateFileProgress(id, pct){
  const wrap = messagesEl.querySelector('.bubble-wrap[data-id="' + id + '"]');
  if (!wrap) return;
  const progressWrap = wrap.querySelector('.file-progress-wrap');
  const bar = wrap.querySelector('.file-progress-bar');
  const label = wrap.querySelector('.file-progress-label');
  const verb = progressWrap && progressWrap.dataset.direction === 'send' ? 'Sending' : 'Receiving';
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = verb + '… ' + pct + '%';
}
function finalizeFileBubble(id, url, mime, name, size, opts){
  opts = opts || {};
  const wrap = messagesEl.querySelector('.bubble-wrap[data-id="' + id + '"]');
  if (!wrap) return;
  const bubble = wrap.querySelector('.bubble');
  if (opts.voice){
    bubble.classList.add('voice');
    bubble.innerHTML = buildReplyQuoteHTML(opts.replyTo) + voiceBubbleHTML(url, opts.duration);
    telewishMediaButtons(wrap);
    return;
  }
  if (mime.startsWith('image/') || mime.startsWith('video/')) bubble.classList.add('media');
  bubble.innerHTML = buildReplyQuoteHTML(opts.replyTo) + mediaOrCardHTML(name, mime, size, url);
  telewishMediaButtons(wrap);
}

function showTypingIndicator(){
  if ($('typingIndicator')) return;
  const g = document.createElement('div');
  g.className = 'typing-group';
  g.id = 'typingIndicator';
  g.innerHTML = '<div class="typing-bubble"><span></span><span></span><span></span></div>';
  messagesEl.appendChild(g);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function hideTypingIndicator(){ const el = $('typingIndicator'); if (el) el.remove(); }

/* =========================================================================
   REACTIONS
   ========================================================================= */
let reactions = {};

function toggleReaction(id, emoji){
  if (!id || !emoji) return;
  reactions[id] = reactions[id] || {};
  reactions[id][emoji] = reactions[id][emoji] || { me:false, them:false };
  reactions[id][emoji].me = !reactions[id][emoji].me;
  renderReactions(id);
  sendEncrypted({ t:'reaction', id, emoji, on: reactions[id][emoji].me });
  ChatStore.update(sessionChatId, id, { reactions: JSON.parse(JSON.stringify(reactions[id])) });
}
function applyRemoteReaction(id, emoji, on){
  if (!emoji) return;
  reactions[id] = reactions[id] || {};
  reactions[id][emoji] = reactions[id][emoji] || { me:false, them:false };
  reactions[id][emoji].them = !!on;
  renderReactions(id);
}
function renderReactions(id){
  const wrap = messagesEl.querySelector('.bubble-wrap[data-id="' + id + '"]');
  if (!wrap) return;
  const box = wrap.querySelector('.msg-reactions');
  if (!box) return;
  const data = reactions[id] || {};
  box.innerHTML = '';
  Object.keys(data).forEach(emoji => {
    const st = data[emoji];
    const count = (st.me ? 1 : 0) + (st.them ? 1 : 0);
    if (!count) return;
    const pill = document.createElement('span');
    pill.className = 'reaction-pill';
    pill.textContent = emoji + (count > 1 ? ' ' + count : '');
    pill.onclick = (e) => { e.stopPropagation(); toggleReaction(id, emoji); Sound.tap(); };
    box.appendChild(pill);
  });
}

/* =========================================================================
   MESSAGE ACTION POPOVER
   ========================================================================= */
let actionPopEl = null;

function closeActionPop(){
  if (actionPopEl){ actionPopEl.remove(); actionPopEl = null; }
  document.removeEventListener('pointerdown', outsideActionPop, true);
  document.removeEventListener('keydown', escActionPop, true);
}
function outsideActionPop(e){
  if (actionPopEl && !actionPopEl.contains(e.target)) closeActionPop();
}
function escActionPop(e){ if (e.key === 'Escape') closeActionPop(); }

function openActionPop(wrap){
  closeActionPop();
  const id = wrap.dataset.id;
  if (!id) return;
  const bubble = wrap.querySelector('.bubble');
  const isMe = wrap.closest('.msg-group').classList.contains('me');
  const isMedia = bubble.classList.contains('media') || bubble.classList.contains('voice');
  const hasText = !!getMessageText(wrap);

  const pop = document.createElement('div');
  pop.className = 'action-pop';

  const reactBar = document.createElement('div');
  reactBar.className = 'react-bar';
  QUICK_REACTIONS.forEach(e => {
    const s = document.createElement('span');
    s.className = 'rq';
    s.textContent = e;
    s.onclick = (ev) => { ev.stopPropagation(); toggleReaction(id, e); closeActionPop(); Sound.tap(); };
    reactBar.appendChild(s);
  });
  const plus = document.createElement('button');
  plus.className = 'rplus';
  plus.type = 'button';
  plus.textContent = '+';
  plus.title = 'More emojis';
  reactBar.appendChild(plus);
  pop.appendChild(reactBar);

  const grid = document.createElement('div');
  grid.className = 'emoji-grid';
  grid.style.display = 'none';
  FULL_EMOJI.forEach(e => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = e;
    b.onclick = (ev) => { ev.stopPropagation(); toggleReaction(id, e); closeActionPop(); Sound.tap(); };
    grid.appendChild(b);
  });
  pop.appendChild(grid);
  plus.onclick = (ev) => {
    ev.stopPropagation();
    grid.style.display = grid.style.display === 'none' ? 'grid' : 'none';
    positionPop();
  };

  const list = document.createElement('div');
  list.className = 'action-list';

  if (hasText){
    list.appendChild(actionBtn('📋', 'Copy text', () => {
      copyTextToClipboard(getMessageText(wrap));
      closeActionPop();
    }));
  }
  list.appendChild(actionBtn('↩️', 'Reply', () => {
    startReply(wrap);
    closeActionPop();
  }));
  if (isMedia){
    const dlUrl = wrap.querySelector('.dl-btn')?.dataset.dl || wrap.querySelector('.voice-msg')?.dataset.url;
    const dlName = wrap.querySelector('.dl-btn')?.dataset.name || (wrap.querySelector('.voice-msg') ? 'voice-message.webm' : 'telewish-file');
    if (dlUrl) list.appendChild(actionBtn('⬇️', 'Download', () => { downloadUrl(dlUrl, dlName); closeActionPop(); }));
  }
  if (isMe){
    list.appendChild(actionBtn('🗑️', 'Unsend', () => {
      unsendMessage(id);
      closeActionPop();
    }, true));
  }
  list.appendChild(actionBtn('❌', 'Delete for me', () => {
    removeMessageLocal(id);
    closeActionPop();
  }, true));

  pop.appendChild(list);
  document.body.appendChild(pop);
  actionPopEl = pop;
  positionPop();

  function positionPop(){
    const r = wrap.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    let left = r.left + r.width / 2 - pr.width / 2;
    let top = r.top - pr.height - 10;
    if (top < 8) top = r.bottom + 10;
    left = Math.max(8, Math.min(left, window.innerWidth - pr.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - pr.height - 8));
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  setTimeout(() => {
    document.addEventListener('pointerdown', outsideActionPop, true);
    document.addEventListener('keydown', escActionPop, true);
  }, 10);
}
function actionBtn(icon, label, fn, danger){
  const b = document.createElement('button');
  b.type = 'button';
  if (danger) b.className = 'danger';
  b.innerHTML = '<span class="icon">' + icon + '</span><span>' + esc(label) + '</span>';
  b.onclick = (e) => { e.stopPropagation(); fn(); Sound.tap(); };
  return b;
}
function getMessageText(wrap){
  const bubble = wrap.querySelector('.bubble');
  if (!bubble) return '';
  if (bubble.classList.contains('media') || bubble.classList.contains('voice')) return '';
  const clone = bubble.cloneNode(true);
  clone.querySelectorAll('.reply-quote').forEach(n => n.remove());
  return (clone.textContent || '').trim();
}
function copyTextToClipboard(text){
  if (navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(() => { toast('Copied'); Sound.copy(); }).catch(() => legacyCopy(text));
  } else {
    if (legacyCopy(text)) toast('Copied');
    else toast('Copy failed');
  }
}
function legacyCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly','');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch(e){ ok = false; }
  document.body.removeChild(ta);
  return ok;
}

/* --- reply --- */
function startReply(wrap){
  const id = wrap.dataset.id;
  const text = getMessageText(wrap) || (wrap.querySelector('.voice-msg') ? '🎤 Voice message' : '📎 Attachment');
  const isMe = wrap.closest('.msg-group').classList.contains('me');
  replyContext = {
    id,
    text: text.slice(0, 120),
    who: isMe ? 'me' : 'them',
    name: isMe ? Profile.shareName() : (peerProfile.name || 'Them')
  };
  rbName.textContent = 'Replying to ' + replyContext.name;
  rbText.textContent = replyContext.text;
  replyBar.classList.add('show');
  if (!msgInput.disabled) msgInput.focus();
}
function clearReply(){
  replyContext = null;
  replyBar.classList.remove('show');
}
$('rbClose').onclick = () => { clearReply(); Sound.tap(); };

/* --- delete / unsend --- */
function removeMessageLocal(id, silent){
  const wrap = messagesEl.querySelector('.bubble-wrap[data-id="' + id + '"]');
  if (wrap){
    const group = wrap.closest('.msg-group');
    wrap.remove();
    if (group && !group.querySelector('.bubble-wrap')) group.remove();
  }
  delete reactions[id];
  ChatStore.removeMessage(sessionChatId, id);
  if (!silent) addSystem('Message deleted from this device.');
}
function unsendMessage(id){
  const wrap = messagesEl.querySelector('.bubble-wrap[data-id="' + id + '"]');
  if (wrap){
    const group = wrap.closest('.msg-group');
    wrap.remove();
    if (group && !group.querySelector('.bubble-wrap')) group.remove();
  }
  delete reactions[id];
  ChatStore.removeMessage(sessionChatId, id);
  sendEncrypted({ t:'delete', id });
  addSystem('You unsent a message.');
}

/* =========================================================================
   SYSTEM MESSAGES
   ========================================================================= */
function addSystem(text, secure){
  lastSender = null;
  const div = document.createElement('div');
  div.className = 'msg-sys' + (secure ? ' secure' : '');
  div.innerHTML = '<svg class="icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M9.5 12l1.8 1.8L15 10"/></svg><span></span>';
  div.querySelector('span').textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* =========================================================================
   SETUP NAVIGATION HELPERS
   ========================================================================= */
function show(stepId){
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const el = $(stepId);
  if (el) el.classList.add('active');
  setupScrollEl.scrollTop = 0;
}
function setStatus(text, cls){
  statusEl.innerHTML = '<span class="dot"></span>' + esc(text);
  statusEl.className = cls || '';
}
function scrollSetupTo(el){
  if (!el || !setupScrollEl) return;
  const elRect = el.getBoundingClientRect();
  const cRect = setupScrollEl.getBoundingClientRect();
  const delta = (elRect.top - cRect.top) - Math.min(24, cRect.height * 0.1);
  const target = Math.max(0, setupScrollEl.scrollTop + delta);
  setupScrollEl.scrollTo({ top: target, behavior: 'smooth' });
}
function reveal(el, playSound){
  if (!el || el.style.display !== 'none') return;
  el.style.display = '';
  if (playSound !== false) Sound.reveal();
  setTimeout(() => scrollSetupTo(el), 60);
}
function hide(el){ if (el) el.style.display = 'none'; }

function showError(elId, text){
  const el = $(elId);
  if (!el) return;
  el.querySelector('span').textContent = text;
  el.style.display = 'flex';
}
function clearError(elId){
  const el = $(elId);
  if (el) el.style.display = 'none';
}
function updateCount(countElId, text, expectedMin){
  const el = $(countElId);
  if (!el) return;
  const len = String(text).trim().length;
  if (len === 0){ el.textContent = ''; el.className = 'charCount'; return; }
  el.textContent = len + ' characters';
  el.className = 'charCount' + (expectedMin && len >= expectedMin ? ' ok' : '');
}

/* =========================================================================
   PASSPHRASE CHIPS / PREVIEW
   ========================================================================= */
function renderPassChips(containerId, tokens, mode){
  const box = $(containerId);
  if (!box) return;
  box.innerHTML = '';
  if (!tokens.length){
    box.innerHTML = '<span class="passEmpty">— no passphrase needed for this code —</span>';
    return;
  }
  if (mode === 'simple'){
    const chip = document.createElement('span');
    chip.className = 'passChip passChipSimple';
    chip.innerHTML = '<span class="slot">8</span>' + esc(tokens.map(t => t.s).join(''));
    box.appendChild(chip);
    return;
  }
  tokens.forEach((t, i) => {
    const chip = document.createElement('span');
    chip.className = 'passChip';
    chip.style.animationDelay = (i * 50) + 'ms';
    chip.innerHTML = '<span class="slot">' + (i + 1) + '</span>' + esc(WORDS[t.w]) +
      ' <span class="num">' + (t.n + 1) + '</span>';
    box.appendChild(chip);
  });
}
function livePassPreview(inputId, previewId, codeInputId){
  const input = $(inputId), box = $(previewId);
  const codeEl = codeInputId ? $(codeInputId) : null;
  if (!input || !box) return;
  const raw = input.value.trim();
  if (!raw){ box.innerHTML = ''; return; }

  const codeVisible = codeEl ? extractCode(codeEl.value) : '';
  const mode = detectMode(codeVisible) || 'secure';
  const expected = codeVisible ? countPlaceholders(codeVisible) : 0;

  let tokens;
  try { tokens = parsePassphrase(raw, mode); }
  catch(e){
    box.innerHTML = '<span class="passPreviewErr">' + esc(e.message) + '</span>';
    return;
  }
  if (expected && tokens.length > expected){
    box.innerHTML = '<span class="passPreviewErr">Too many ' + (mode === 'simple' ? 'characters' : 'words') + ' — this code only has ' + expected + ' gaps.</span>';
    return;
  }
  let chips;
  if (mode === 'simple'){
    chips = '<span class="passChip mini" style="letter-spacing:.18em;">' + esc(tokens.map(t => t.s).join('')) + '</span>';
  } else {
    chips = tokens.map((t, i) =>
      '<span class="passChip mini"><span class="slot">' + (i + 1) + '</span>' +
      esc(WORDS[t.w]) + ' <span class="num">' + (t.n + 1) + '</span></span>').join('');
  }
  const unit = mode === 'simple' ? 'chunks' : 'words';
  const status = (expected && tokens.length === expected)
    ? '<span class="passPreviewOk">All ' + expected + ' ' + unit + ' in — ready to go</span>'
    : (expected ? '<span class="passPreviewErr">' + tokens.length + ' of ' + expected + ' ' + unit + ' entered</span>' : '');
  box.innerHTML = chips + status;
}

/* =========================================================================
   COMPACT ENCODE / DECODE
   ========================================================================= */
function trimSdpCandidates(sdp){
  const keepTypes = ['relay', 'srflx', 'host'];
  const kept = { relay: 0, srflx: 0, host: 0 };
  return sdp.split('\r\n').filter(line => {
    if (!line.startsWith('a=candidate:')) return true;
    const m = line.match(/typ (\w+)/);
    const type = m && m[1];
    if (!keepTypes.includes(type)) return false;
    if (kept[type] >= 1) return false;
    kept[type]++;
    return true;
  }).join('\r\n');
}
async function encodeCompact(obj){
  const trimmed = (obj && typeof obj.sdp === 'string')
    ? Object.assign({}, obj, { sdp: trimSdpCandidates(obj.sdp) })
    : obj;
  const json = JSON.stringify(trimmed);
  const raw = new TextEncoder().encode(json);
  let payload = raw, compressed = 0;
  if (typeof CompressionStream !== 'undefined'){
    try {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(raw);
      writer.close();
      const buf = await new Response(cs.readable).arrayBuffer();
      const gz = new Uint8Array(buf);
      if (gz.length + 1 < raw.length){ payload = gz; compressed = 1; }
    } catch(e){ /* fall back */ }
  }
  const out = new Uint8Array(payload.length + 1);
  out[0] = compressed;
  out.set(payload, 1);
  return bytesToBase64(out);
}
async function decodeCompact(str){
  const bytes = base64ToBytes(extractCode(str));
  if (bytes.length < 2) throw new Error('Code too short');
  const flag = bytes[0];
  const payload = bytes.slice(1);
  let json;
  if (flag === 1){
    if (typeof DecompressionStream === 'undefined')
      throw new Error('This browser cannot decompress the code');
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(payload);
    writer.close();
    const buf = await new Response(ds.readable).arrayBuffer();
    json = new TextDecoder().decode(new Uint8Array(buf));
  } else {
    json = new TextDecoder().decode(payload);
  }
  return JSON.parse(json);
}
function extractCode(raw){
  let str = String(raw).trim();
  const hashIdx = str.lastIndexOf('#');
  if (hashIdx !== -1 && /[a-zA-Z]{1,4}=/.test(str.slice(hashIdx + 1, hashIdx + 6))) str = str.slice(hashIdx + 1);
  const eqIdx = str.indexOf('=');
  if (eqIdx !== -1 && /^[a-zA-Z]{1,4}$/.test(str.slice(0, eqIdx))) str = str.slice(eqIdx + 1);
  return str.replace(/\s+/g, '');
}
async function decodeWithPass(visibleRaw, passRaw){
  const visible = extractCode(visibleRaw);
  if (!visible) throw new Error('Paste the code they sent you first.');
  const mode = detectMode(visible) || 'secure';
  const tokens = parsePassphrase(passRaw, mode);
  const gaps = countPlaceholders(visible);
  if (gaps && !tokens.length)
    throw new Error('This code needs a passphrase — type the ' + (mode === 'simple' ? '8 characters they gave you' : 'words they read out to you') + '.');
  if (gaps && tokens.length !== gaps)
    throw new Error('This code has ' + gaps + ' gaps, but you entered ' + tokens.length + ' ' + (mode === 'simple' ? 'chunks' : ('word' + (tokens.length === 1 ? '' : 's'))) + '.');
  const full = mergeCode(visible, tokens);
  let json;
  try { json = await decodeCompact(full); }
  catch(e){ throw new Error("That code and passphrase don't fit together — double-check both and try again."); }
  return { payload: json, tokens, mode };
}

/* =========================================================================
   QR RENDERING
   ========================================================================= */
function renderQr(canvas, text, targetSize){
  if (typeof qrcode !== 'function') return false;
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const quiet = 4;
    const total = count + quiet * 2;
    const scale = Math.max(2, Math.floor(targetSize / total));
    const px = total * scale;
    canvas.width = px; canvas.height = px;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = '#000000';
    for (let y = 0; y < count; y++){
      for (let x = 0; x < count; x++){
        if (qr.isDark(y, x)) ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }
    }
    canvas._qrText = text;
    return true;
  } catch(e){ return false; }
}
function renderQrPanel(canvasId, fallbackId, text, targetSize){
  const canvas = $(canvasId);
  const fallback = $(fallbackId);
  if (!canvas) return false;
  const ok = renderQr(canvas, text, targetSize || 480);
  canvas.style.display = ok ? '' : 'none';
  if (fallback) fallback.style.display = ok ? 'none' : 'block';
  return ok;
}

const qrFullscreen = $('qrFullscreen');
const qrFullscreenCanvas = $('qrFullscreenCanvas');
function openQrFullscreen(canvas){
  const text = canvas._qrText;
  if (!text) return;
  const avail = Math.min(window.innerWidth, window.innerHeight) * 0.9;
  renderQr(qrFullscreenCanvas, text, avail);
  qrFullscreen.classList.add('open');
  Sound.reveal();
  if (qrFullscreen.requestFullscreen) qrFullscreen.requestFullscreen().catch(() => {});
}
function closeQrFullscreen(){
  qrFullscreen.classList.remove('open');
  if (document.fullscreenElement === qrFullscreen) document.exitFullscreen().catch(() => {});
}
$('offerQrCanvas').addEventListener('click', (e) => openQrFullscreen(e.currentTarget));
$('answerQrCanvas').addEventListener('click', (e) => openQrFullscreen(e.currentTarget));
$('qrFullscreenClose').onclick = closeQrFullscreen;
qrFullscreen.addEventListener('click', (e) => { if (e.target === qrFullscreen) closeQrFullscreen(); });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) qrFullscreen.classList.remove('open'); });

/* =========================================================================
   CAMERA SCANNER (upgraded)
   ========================================================================= */
const scanModal = $('scanModal');
const scanVideo = $('scanVideo');
let scanStream = null;
let scanRAFId = null;
let scanFacing = 'environment';
let scanTorchOn = false;
let scanOnDecoded = null;
const scanCanvasEl = document.createElement('canvas');
const scanCtx = scanCanvasEl.getContext('2d', { willReadFrequently: true });

function showScanError(text){
  const el = $('scanErr');
  el.querySelector('span').textContent = text;
  el.style.display = 'flex';
}
function clearScanError(){ $('scanErr').style.display = 'none'; }

async function openScanner(onDecoded){
  clearScanError();
  scanOnDecoded = onDecoded;
  if (typeof jsQR !== 'function' && typeof BarcodeDetector === 'undefined'){
    scanModal.classList.add('open');
    showScanError("QR scanning library didn't load — check your connection, or paste/upload the code instead.");
    return;
  }
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    scanModal.classList.add('open');
    showScanError("Camera scanning needs a secure page (https://). Upload a QR image or paste the code instead.");
    return;
  }
  scanModal.classList.add('open');
  await startScanStream();
}
async function startScanStream(){
  stopScanStream();
  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: scanFacing },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      advanced: [{ focusMode: 'continuous' }]
    }
  };
  try {
    scanStream = await navigator.mediaDevices.getUserMedia(constraints);
    scanVideo.srcObject = scanStream;
    await scanVideo.play().catch(() => {});
    scanTorchOn = false;
    scanLoop();
  } catch(e){
    // fallback to any camera
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({ video: true });
      scanVideo.srcObject = scanStream;
      await scanVideo.play().catch(() => {});
      scanLoop();
    } catch(err){
      const name = err.name || 'unknown error';
      if (name === 'NotAllowedError') showScanError('Camera permission was denied — check your browser settings, or upload a QR image / paste the code instead.');
      else if (name === 'NotFoundError') showScanError('No camera found. Upload a QR image or paste the code instead.');
      else showScanError("Couldn't access the camera (" + name + '). Upload a QR image or paste the code instead.');
    }
  }
}
function stopScanStream(){
  if (scanRAFId) cancelAnimationFrame(scanRAFId);
  scanRAFId = null;
  if (scanStream){ scanStream.getTracks().forEach(t => t.stop()); scanStream = null; }
  scanVideo.srcObject = null;
}
function closeScanner(){
  scanModal.classList.remove('open');
  stopScanStream();
  scanOnDecoded = null;
}
function scanLoop(){
  if (!scanModal.classList.contains('open')) return;
  if (scanVideo.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA){
    scanCanvasEl.width = scanVideo.videoWidth;
    scanCanvasEl.height = scanVideo.videoHeight;
    scanCtx.drawImage(scanVideo, 0, 0, scanCanvasEl.width, scanCanvasEl.height);
    let found = null;
    if (typeof jsQR === 'function'){
      try {
        const imageData = scanCtx.getImageData(0, 0, scanCanvasEl.width, scanCanvasEl.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
        if (result && result.data) found = result.data;
      } catch(e){ /* ignore */ }
    }
    if (found){
      const cb = scanOnDecoded;
      closeScanner();
      Sound.reveal();
      if (cb) cb(found);
      return;
    }
  }
  scanRAFId = requestAnimationFrame(scanLoop);
}
$('scanClose').onclick = closeScanner;
$('scanSwitch').onclick = async () => {
  Sound.click();
  scanFacing = scanFacing === 'environment' ? 'user' : 'environment';
  await startScanStream();
};
$('scanTorch').onclick = async () => {
  Sound.click();
  if (!scanStream) return;
  const track = scanStream.getVideoTracks()[0];
  if (!track) return;
  let caps = {};
  try { caps = track.getCapabilities ? track.getCapabilities() : {}; } catch(e){}
  if (!caps.torch){ toast('Torch not available on this camera'); return; }
  scanTorchOn = !scanTorchOn;
  try { await track.applyConstraints({ advanced: [{ torch: scanTorchOn }] }); }
  catch(e){ toast('Could not toggle torch'); }
};

/* --- QR upload decoding --- */
const qrUploadInput = $('qrUploadInput');
let qrUploadTarget = null;

function decodeQrFile(file, onDecoded, onError){
  if (typeof jsQR !== 'function'){ onError("QR decoding library didn't load."); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, c.width, c.height);
    let result = null;
    try { result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' }); }
    catch(e){ /* ignore */ }
    URL.revokeObjectURL(url);
    if (result && result.data){ Sound.reveal(); onDecoded(result.data); }
    else onError("Couldn't find a QR code in that image. Try a clearer, well-lit photo.");
  };
  img.onerror = () => { URL.revokeObjectURL(url); onError("Couldn't load that image file."); };
  img.src = url;
}
qrUploadInput.onchange = () => {
  const file = qrUploadInput.files[0];
  qrUploadInput.value = '';
  if (!file) return;
  const target = qrUploadTarget;
  decodeQrFile(file, (text) => {
    if (target === 'offer'){
      const el = $('offerIn');
      el.value = text;
      updateCount('offerInCount', el.value, 200);
      onJoinCodeChanged(true);
    } else {
      const el = $('answerIn');
      el.value = text;
      updateCount('answerInCount', el.value, 200);
      onReplyCodeChanged(true);
    }
  }, (msg) => {
    const errId = target === 'offer' ? 'errB' : 'errA';
    showError(errId, msg);
    Sound.error();
  });
};
$('scanOfferBtn').onclick = () => {
  $('scanHintText').textContent = 'Point your camera at the QR code on the other person\u2019s screen.';
  Sound.click();
  openScanner((data) => {
    const el = $('offerIn');
    el.value = data;
    updateCount('offerInCount', el.value, 200);
    onJoinCodeChanged(true);
  });
};
$('scanAnswerBtn').onclick = () => {
  $('scanHintText').textContent = 'Point your camera at the reply QR code on their screen.';
  Sound.click();
  openScanner((data) => {
    const el = $('answerIn');
    el.value = data;
    updateCount('answerInCount', el.value, 200);
    onReplyCodeChanged(true);
  });
};
$('uploadOfferBtn').onclick = () => { qrUploadTarget = 'offer'; qrUploadInput.click(); Sound.click(); };
$('uploadAnswerBtn').onclick = () => { qrUploadTarget = 'answer'; qrUploadInput.click(); Sound.click(); };

/* =========================================================================
   PROGRESSIVE DISCLOSURE
   ========================================================================= */
const startReadyRow = $('startReadyRow');
const startStage2 = $('startStage2');
const startStage3 = $('startStage3');
const joinStage2 = $('joinStage2');
const joinStage3 = $('joinStage3');

$('startReadyBtn').onclick = () => {
  Sound.click();
  hide(startReadyRow);
  reveal(startStage2);
};
function applyModeToAnswerPassUI(mode){
  const label = $('answerPassLabel'), input = $('answerPassIn');
  if (!label || !input) return;
  if (mode === 'simple'){ label.textContent = 'Type the 8-character reply passphrase they told you'; input.placeholder = 'king1625'; }
  else { label.textContent = 'Type the reply passphrase they told you'; input.placeholder = 'raven 37 amber 12 …'; }
}
function applyModeToOfferPassUI(mode){
  const label = $('offerPassLabel'), input = $('offerPassIn');
  if (!label || !input) return;
  if (mode === 'simple'){ label.textContent = 'Type the 8-character passphrase they told you'; input.placeholder = 'king1625'; }
  else { label.textContent = 'Type the passphrase they told you'; input.placeholder = 'raven 37 amber 12 …'; }
}
function onReplyCodeChanged(force){
  const val = $('answerIn').value.trim();
  if (val.length >= 20 || force){
    const mode = detectMode(extractCode(val)) || currentOfferMode || 'secure';
    applyModeToAnswerPassUI(mode);
    if (startStage3.style.display === 'none') reveal(startStage3);
  }
}
$('answerIn').addEventListener('input', () => onReplyCodeChanged(false));
function onJoinCodeChanged(force){
  const val = $('offerIn').value.trim();
  if (val.length >= 20 || force){
    const mode = detectMode(extractCode(val)) || 'secure';
    applyModeToOfferPassUI(mode);
    if (joinStage2.style.display === 'none') reveal(joinStage2);
    if (joinStage3.style.display === 'none') reveal(joinStage3, false);
  }
}
$('offerIn').addEventListener('input', () => onJoinCodeChanged(false));

['offerIn', 'answerIn'].forEach(id => {
  const el = $(id);
  el.addEventListener('input', () => updateCount(id + 'Count', el.value, 200));
});

/* =========================================================================
   CONSENT GATE (once per day)
   ========================================================================= */
const consentCheck = $('consentCheck');
const continueBtn = $('continueBtn');

function hasConsentedToday(){
  try { return localStorage.getItem('telewishConsentDate') === todayKey(); } catch(e){ return false; }
}
function markConsented(){
  try { localStorage.setItem('telewishConsentDate', todayKey()); } catch(e){}
}
consentCheck.addEventListener('change', () => {
  continueBtn.disabled = !consentCheck.checked;
  if (consentCheck.checked) Sound.tap();
});
continueBtn.onclick = () => {
  Sound.click();
  markConsented();
  show('stepChoose');
};

/* =========================================================================
   PROFILE / SETTINGS SHEET
   ========================================================================= */
const profileSheet = $('profileSheet');
const chatsSheet = $('chatsSheet');
const viewSheet = $('viewSheet');

function openSheet(el){ el.classList.add('open'); }
function closeSheet(el){ el.classList.remove('open'); }
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.onclick = () => { closeSheet($(btn.dataset.close)); Sound.tap(); };
});
[profileSheet, chatsSheet, viewSheet].forEach(sh => {
  sh.addEventListener('click', (e) => { if (e.target === sh) closeSheet(sh); });
});

function syncSwitch(el, on){
  el.classList.toggle('on', !!on);
  el.setAttribute('aria-checked', on ? 'true' : 'false');
}
function bindSwitch(el, getter, setter){
  el.onclick = () => {
    const next = !getter();
    setter(next);
    syncSwitch(el, next);
    Sound.toggle(next);
  };
  el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); el.click(); } };
}

const setSound = $('setSound');
const setNotif = $('setNotif');
const setSave = $('setSave');

syncSwitch(setSound, Settings.sound);
syncSwitch(setNotif, Settings.notif);
syncSwitch(setSave, Settings.saveChats);

bindSwitch(setSound, () => Settings.sound, (v) => {
  Settings.sound = v;
  Sound.setEnabled(v);
});
bindSwitch(setNotif, () => Settings.notif, (v) => {
  Settings.notif = v;
  if (v) requestNotifPermission();
});
bindSwitch(setSave, () => Settings.saveChats, (v) => {
  Settings.saveChats = v;
  if (v){
    toast('Chats will now be saved on this device');
    if (sessionChatId && sessionKey) ChatStore.ensure(sessionChatId, peerMeta());
  } else {
    toast('Chat saving turned off — existing saved chats remain');
  }
});

$('profileBtn').onclick = () => {
  Sound.click();
  const p = Profile.load();
  $('pfName').value = p.name || '';
  renderPfAvatar();
  applyTheme(Settings.theme);
  refreshCustomSwatchPreview();
  syncSwitch(setSound, Settings.sound);
  syncSwitch(setNotif, Settings.notif);
  syncSwitch(setSave, Settings.saveChats);
  openSheet(profileSheet);
};
function renderPfAvatar(){
  const p = Profile.load();
  const box = $('pfAvatar');
  if (p.avatar){
    box.innerHTML = '<img src="' + escAttr(p.avatar) + '" alt=""><span class="camTag">CHANGE</span>';
  } else {
    box.innerHTML = '<span>' + esc(Profile.initial()) + '</span><span class="camTag">CHANGE</span>';
  }
}
$('pfAvatar').onclick = () => { $('pfAvatarInput').click(); Sound.click(); };
$('pfAvatarInput').onchange = () => {
  const file = $('pfAvatarInput').files[0];
  $('pfAvatarInput').value = '';
  if (!file) return;
  if (!file.type.startsWith('image/')){ toast('Please choose an image file'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      const dataUrl = c.toDataURL('image/jpeg', 0.82);
      const p = Profile.load();
      Profile.save({ name: p.name, avatar: dataUrl });
      renderPfAvatar();
      toast('Profile picture updated');
      Sound.reveal();
    };
    img.onerror = () => toast('Could not read that image');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
};
$('pfSave').onclick = () => {
  const name = $('pfName').value.trim().slice(0, 28);
  const p = Profile.load();
  Profile.save({ name, avatar: p.avatar });
  toast('Profile saved');
  Sound.copy();
  sendEncrypted({ t:'profile', name: Profile.shareName(), avatar: Profile.load().avatar || '' });
  updateChatHeader();
  closeSheet(profileSheet);
};
$('pfClearPic').onclick = () => {
  const p = Profile.load();
  Profile.save({ name: p.name, avatar: '' });
  renderPfAvatar();
  toast('Photo removed');
  Sound.tap();
};
document.querySelectorAll('.themeSwatch').forEach(sw => {
  sw.onclick = () => {
    Settings.theme = sw.dataset.themePick;
    Sound.toggle(true);
  };
});

const customThemeColorInput = $('customThemeColor');
const customThemeBaseSwitch = $('customThemeBase');
const customDot1 = $('customDot1');
const customDot2 = $('customDot2');

function refreshCustomSwatchPreview(){
  const color = Settings.customColor;
  customThemeColorInput.value = color;
  customDot1.style.background = color;
  customDot2.style.background = Settings.customBase === 'dark' ? '#1d1a16' : '#ffffff';
  syncSwitch(customThemeBaseSwitch, Settings.customBase === 'dark');
}
refreshCustomSwatchPreview();
$('customThemeRow').style.display = Settings.theme === 'custom' ? 'flex' : 'none';

customThemeColorInput.oninput = () => {
  Settings.customColor = customThemeColorInput.value;
  refreshCustomSwatchPreview();
  if (Settings.theme === 'custom') applyCustomThemeColors(Settings.customColor, Settings.customBase);
};
bindSwitch(customThemeBaseSwitch, () => Settings.customBase === 'dark', (v) => {
  Settings.customBase = v ? 'dark' : 'light';
  refreshCustomSwatchPreview();
  if (Settings.theme === 'custom') applyTheme('custom');
});

/* =========================================================================
   NOTIFICATIONS
   ========================================================================= */
function requestNotifPermission(){
  if (!('Notification' in window)){ toast('Notifications not supported here'); return; }
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied'){ toast('Notifications are blocked in browser settings'); return; }
  Notification.requestPermission().then(p => {
    if (p === 'granted'){ toast('Notifications enabled'); }
    else { toast('Notification permission not granted'); }
  }).catch(() => {});
}
let unreadCount = 0;
function updateTitle(){
  const base = 'Telewish — Direct P2P Chat';
  document.title = unreadCount > 0 ? '(' + unreadCount + ') ' + base : base;
}
function notifyIncoming(name, body){
  if (!Settings.notif) return;
  if (document.visibilityState === 'visible') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(name || 'New message', {
      body: body || 'Sent you a message',
      icon: Profile.load().avatar || undefined,
      tag: 'telewish-msg',
      renotify: true
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch(e){ /* ignore */ }
}
function bumpUnread(){
  unreadCount++;
  updateTitle();
}
function clearUnread(){
  unreadCount = 0;
  updateTitle();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') clearUnread(); });

/* =========================================================================
   CHAT LIST (saved chats)
   ========================================================================= */
$('chatsBtn').onclick = () => {
  Sound.click();
  renderChatList();
  openSheet(chatsSheet);
};
function renderChatList(){
  const list = $('chatList');
  const all = ChatStore.all();
  const ids = Object.keys(all).sort((a, b) => (all[b].updatedAt || 0) - (all[a].updatedAt || 0));
  if (!ids.length){
    list.innerHTML = '<div class="emptyState">' +
      '<svg class="icon" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/></svg>' +
      'No saved chats yet.<br>Turn on “Save chats on this device” in your profile settings, then start a conversation.</div>';
    return;
  }
  list.innerHTML = '';
  ids.forEach(id => {
    const c = all[id];
    const last = c.messages[c.messages.length - 1];
    const peer = c.peer || {};
    const item = document.createElement('div');
    item.className = 'chatItem';
    const av = peer.avatar
      ? '<span class="ci-av"><img src="' + escAttr(peer.avatar) + '" alt=""></span>'
      : '<span class="ci-av"><span>' + esc((peer.name || '?').trim().charAt(0).toUpperCase() || '?') + '</span></span>';
    let preview = 'No messages';
    if (last){
      if (last.kind === 'voice') preview = '🎤 Voice message';
      else if (last.kind === 'file') preview = '📎 ' + (last.text || 'Attachment');
      else preview = last.text || '';
      preview = (last.who === 'me' ? 'You: ' : '') + preview;
    }
    item.innerHTML = av +
      '<div class="ci-body"><div class="ci-name">' + esc(peer.name || 'Unknown peer') + '</div>' +
      '<div class="ci-last">' + esc(preview.slice(0, 80)) + '</div></div>' +
      '<div class="ci-time">' + esc(new Date(c.updatedAt || Date.now()).toLocaleDateString()) + '</div>';
    item.onclick = () => { Sound.tap(); openSavedChat(id); };
    list.appendChild(item);
  });
}
let currentViewChatId = null;
function openSavedChat(id){
  const all = ChatStore.all();
  const c = all[id];
  if (!c) return;
  currentViewChatId = id;
  const peer = c.peer || {};
  $('viewTitle').textContent = peer.name || 'Saved chat';
  const vav = $('viewAvatar');
  if (peer.avatar){
    vav.style.display = '';
    vav.innerHTML = '<img src="' + escAttr(peer.avatar) + '" alt="">';
  } else {
    vav.style.display = '';
    vav.innerHTML = '<span>' + esc((peer.name || '?').trim().charAt(0).toUpperCase() || '?') + '</span>';
  }
  const body = $('viewBody');
  body.innerHTML = '';
  lastSender = null;
  if (!c.messages.length){
    body.innerHTML = '<div class="emptyState">This saved chat has no messages.</div>';
  }
  c.messages.forEach(m => renderSavedMessage(body, m));
  closeSheet(chatsSheet);
  openSheet(viewSheet);
  body.scrollTop = body.scrollHeight;
}
function renderSavedMessage(container, m){
  const type = m.who === 'me' ? 'me' : 'them';
  let group;
  if (lastSender === type && container.lastElementChild && container.lastElementChild.classList.contains('msg-group')){
    group = container.lastElementChild;
  } else {
    group = document.createElement('div');
    group.className = 'msg-group ' + type;
    container.appendChild(group);
  }
  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap';
  let inner = '';
  if (m.replyTo){
    inner += '<div class="reply-quote"><div class="rq-body"><span class="rq-name">' +
      esc(m.replyTo.who === 'me' ? 'You' : (m.replyTo.name || 'Them')) + '</span><span class="rq-text">' +
      esc(m.replyTo.text || '') + '</span></div></div>';
  }
  if (m.kind === 'voice'){
    inner += voiceBubbleHTML(m.url || '', m.duration || 0);
    wrap.className += ' voice';
    wrap.innerHTML = '<div class="bubble voice">' + inner + '</div>';
  } else if (m.kind === 'file'){
    const media = m.url && (m.mime.startsWith('image/') || m.mime.startsWith('video/'));
    inner += m.url ? mediaOrCardHTML(m.name || 'file', m.mime || '', m.size || 0, m.url)
                   : fileCardHTML(m.name || 'file', m.mime || '', m.size || 0, '');
    wrap.innerHTML = '<div class="bubble' + (media ? ' media' : '') + '">' + inner + '</div>';
  } else {
    inner += esc(m.text || '').replace(/\n/g, '<br>');
    wrap.innerHTML = '<div class="bubble">' + inner + '</div>';
  }
  group.appendChild(wrap);
  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = new Date(m.ts || Date.now()).toLocaleString([], {hour:'2-digit', minute:'2-digit'});
  group.appendChild(time);
  lastSender = type;
}
$('viewDelete').onclick = () => {
  if (!currentViewChatId) return;
  if (!confirm('Delete this saved chat permanently? This cannot be undone.')) return;
  ChatStore.remove(currentViewChatId);
  currentViewChatId = null;
  closeSheet(viewSheet);
  renderChatList();
  toast('Saved chat deleted');
  Sound.disconnect();
};

/* =========================================================================
   CONNECTION QUALITY
   ========================================================================= */
let qualityTimer = null;
async function pollQuality(){
  if (!pc || !dc || dc.readyState !== 'open'){ qBars.className = 'qbars off'; return; }
  try {
    const stats = await pc.getStats();
    let rtt = null;
    stats.forEach(r => {
      if (r.type === 'candidate-pair' && r.state === 'succeeded' && r.currentRoundTripTime != null && r.nominated !== false){
        rtt = r.currentRoundTripTime;
      }
    });
    if (rtt == null){
      qBars.className = 'qbars off';
      qBars.title = 'Measuring…';
      return;
    }
    const ms = Math.round(rtt * 1000);
    let level = 3;
    if (rtt > 0.30) level = 1;
    else if (rtt > 0.15) level = 2;
    qBars.className = 'qbars q' + level;
    qBars.title = 'Connection quality · ' + ms + ' ms round trip';
  } catch(e){
    qBars.className = 'qbars off';
  }
}
function startQualityPolling(){
  stopQualityPolling();
  pollQuality();
  qualityTimer = setInterval(pollQuality, 3000);
}
function stopQualityPolling(){
  if (qualityTimer){ clearInterval(qualityTimer); qualityTimer = null; }
  qBars.className = 'qbars off';
  qBars.title = 'Connection quality';
}

/* =========================================================================
   DATA CHANNEL
   ========================================================================= */
let reconnectAttempts = 0;
let wasConnected = false;

function peerMeta(){
  return { name: peerProfile.name || '', avatar: peerProfile.avatar || '' };
}
function updateChatHeader(){
  const label = peerProfile.name ? peerProfile.name : 'Connected peer';
  chatName.textContent = label;
  if (peerProfile.avatar){
    chatAvatar.style.display = '';
    chatAvatar.innerHTML = '<img src="' + escAttr(peerProfile.avatar) + '" alt="">';
  } else if (peerProfile.name){
    chatAvatar.style.display = '';
    chatAvatar.innerHTML = '<span>' + esc(peerProfile.name.charAt(0).toUpperCase()) + '</span>';
  } else {
    chatAvatar.style.display = 'none';
  }
}

function setChatStatus(state, text){
  chatDot.className = 'chDot' + (state ? ' ' + state : '');
  if (text) chatName.textContent = text;
  if (state === 'connected'){
    chatDisconnect.disabled = false;
  } else {
    chatDisconnect.disabled = true;
    chatSas.style.display = 'none';
  }
}

function telewishDataChannel(){
  dc.onopen = async () => {
    wasConnected = true;
    reconnectAttempts = 0;
    connBanner.classList.remove('show');
    setStatus('connected', 'connected');
    setupEl.parentElement.style.display = 'none';
    chatWrap.style.display = 'flex';
    setChatStatus('connected', peerProfile.name || 'Connected peer');
    updateChatHeader();
    if (sessionSas){
      chatSas.style.display = 'flex';
      chatSasValue.textContent = sessionSas;
    }
    const modeLabel = currentOfferMode === 'simple' ? '8-character passphrase' : 'word passphrase';
    addSystem('Connected — direct P2P, DTLS + AES-256-GCM (salted with the ' + modeLabel + ').', true);
    if (sessionSas){
      addSystem('Verify code: ' + sessionSas + ' — read it aloud to confirm no one is in the middle.', true);
    }
    msgInput.disabled = false;
    sendBtn.disabled = false;
    attachBtn.disabled = false;
    emojiBtn.disabled = false;
    micBtn.disabled = false;
    if (window.matchMedia('(min-width: 700px)').matches) msgInput.focus();
    Sound.connect();

    // share profile
    try {
      const p = Profile.load();
      sendEncrypted({ t:'profile', name: Profile.shareName(), avatar: p.avatar || '' });
    } catch(e){}

    // prepare chat store
    sessionChatId = sessionSas || ('sess-' + Date.now().toString(36));
    if (Settings.saveChats) ChatStore.ensure(sessionChatId, peerMeta());

    startQualityPolling();

    // scrub handshake material from the DOM
    try {
      ['offerOut','answerIn','answerPassIn','offerIn','offerPassIn','answerOut'].forEach(id => {
        const el = $(id); if (el) el.value = '';
      });
      $('offerPassChips').innerHTML = '';
      $('answerPassChips').innerHTML = '';
      const oc = $('offerQrCanvas'); if (oc) oc._qrText = '';
      const ac = $('answerQrCanvas'); if (ac) ac._qrText = '';
    } catch(e){}
    currentOfferTokens = [];
    currentAnswerTokens = [];
    currentOfferSalt = null;
  };
  dc.onmessage = (e) => handleIncoming(e.data);
  dc.onerror = (e) => { console.warn('Data channel error', e); };
  dc.onclose = () => {
    stopQualityPolling();
    setStatus('peer disconnected', 'error');
    setChatStatus('disconnected', 'Disconnected');
    connBanner.classList.remove('show');
    if (wasConnected) addSystem('The other side disconnected.');
    hideTypingIndicator();
    msgInput.disabled = true; sendBtn.disabled = true;
    attachBtn.disabled = true; emojiBtn.disabled = true; micBtn.disabled = true;
    emojiPop.classList.remove('open');
    incomingFiles = {};
    Sound.disconnect();
  };
}

/* --- reconnect handling --- */
function handleIceState(){
  if (!pc) return;
  const st = pc.iceConnectionState;
  if (st === 'disconnected'){
    connBannerText.textContent = 'Connection interrupted — waiting for it to recover…';
    connBanner.classList.add('show');
    setChatStatus('connecting', 'Reconnecting…');
  } else if (st === 'failed'){
    connBanner.classList.remove('show');
    if (reconnectAttempts < 2 && wasConnected){
      reconnectAttempts++;
      connBannerText.textContent = 'Trying to reconnect…';
      connBanner.classList.add('show');
      try { pc.restartIce(); } catch(e){}
      setTimeout(() => { if (pc && pc.iceConnectionState === 'failed') finishFailed(); }, 3500);
    } else {
      finishFailed();
    }
  } else if (st === 'connected' || st === 'completed'){
    connBanner.classList.remove('show');
    reconnectAttempts = 0;
    if (dc && dc.readyState === 'open') setChatStatus('connected', peerProfile.name || 'Connected peer');
  }
}
function finishFailed(){
  connBanner.classList.remove('show');
  setStatus('connection failed', 'error');
  setChatStatus('disconnected', 'Connection failed');
  addSystem('The connection dropped and could not be recovered. Start a new chat to reconnect.');
  Sound.error();
}

/* =========================================================================
   INCOMING
   ========================================================================= */
let incomingFiles = {};

async function handleIncoming(raw){
  let data;
  if (!sessionKey){
    let p;
    try { p = JSON.parse(raw); } catch(e){ return; }
    if (!p || typeof p.plain !== 'string') return;
    if (p.plain === 'bye'){ addSystem('The other person ended the connection.'); return; }
    return;
  }
  try { data = await decryptMessage(sessionKey, raw); }
  catch(e){ return; }
  if (!data || typeof data.t !== 'string') return;

  // A reply quote's "who" is recorded from the SENDER's point of view (their
  // own earlier message is "me" to them). From our side that's reversed, so
  // flip it once here rather than at every place replyTo gets used below.
  if (data.replyTo) data.replyTo = flipReplyWho(data.replyTo);

  switch (data.t) {
    case 'msg': {
      if (typeof data.text !== 'string') return;
      const id = safeId(data.id) || genId();
      addMessage(data.text, 'them', id, data.replyTo);
      Sound.receive();
      notifyIncoming(peerProfile.name || 'New message', data.text.slice(0, 90));
      if (document.visibilityState !== 'visible') bumpUnread();
      ChatStore.add(sessionChatId, peerMeta(), {
        id, who: 'them', kind: 'text', text: data.text, ts: Date.now(), replyTo: data.replyTo || null
      });
      break;
    }
    case 'typing':
      data.on ? showTypingIndicator() : hideTypingIndicator();
      break;
    case 'profile': {
      peerProfile = {
        name: typeof data.name === 'string' ? data.name.slice(0, 28) : '',
        avatar: typeof data.avatar === 'string' && data.avatar.length < 400000 ? data.avatar : ''
      };
      updateChatHeader();
      if (sessionChatId && Settings.saveChats) ChatStore.ensure(sessionChatId, peerMeta());
      break;
    }
    case 'file-meta': {
      const id = safeId(data.id);
      if (!id || incomingFiles[id]) return;
      const total = Number(data.total) || 1;
      incomingFiles[id] = {
        name: String(data.name || 'file').slice(0, 200),
        mime: String(data.mime || 'application/octet-stream'),
        size: Number(data.size) || 0,
        total,
        chunks: new Array(total),
        received: 0,
        voice: !!data.voice,
        duration: Number(data.duration) || 0,
        replyTo: data.replyTo || null
      };
      addFileBubble(id, 'them', incomingFiles[id].name, incomingFiles[id].mime,
        incomingFiles[id].size, null, { voice: incomingFiles[id].voice, replyTo: data.replyTo });
      Sound.tap();
      break;
    }
    case 'file-chunk': {
      const id = safeId(data.id);
      if (!id) return;
      const f = incomingFiles[id];
      if (!f) return;
      const seq = Number(data.seq);
      if (!Number.isInteger(seq) || seq < 0 || seq >= f.total) return;
      if (f.chunks[seq] != null) return;
      f.chunks[seq] = data.data;
      f.received++;
      updateFileProgress(id, Math.min(100, Math.round((f.received / (f.total || 1)) * 100)));
      break;
    }
    case 'file-done': {
      const id = safeId(data.id);
      if (!id) return;
      const f = incomingFiles[id];
      if (!f) return;
      try {
        const b64 = f.chunks.join('');
        const blob = b64toBlob(b64, f.mime);
        const url = URL.createObjectURL(blob);
        finalizeFileBubble(id, url, f.mime, f.name, f.size, {
          voice: f.voice, duration: f.duration, replyTo: f.replyTo
        });
        if (f.voice) Sound.receive(); else Sound.receive();
        notifyIncoming(peerProfile.name || 'New message',
          f.voice ? 'Sent you a voice message' : 'Sent you a file: ' + f.name);
        if (document.visibilityState !== 'visible') bumpUnread();
        // persist small media only
        let storeUrl = '';
        if (blob.size <= PERSIST_MEDIA_MAX) storeUrl = await blobUrlToDataUrl(url, PERSIST_MEDIA_MAX);
        ChatStore.add(sessionChatId, peerMeta(), {
          id, who: 'them', kind: f.voice ? 'voice' : 'file',
          name: f.name, mime: f.mime, size: f.size, url: storeUrl,
          duration: f.duration, ts: Date.now(), replyTo: f.replyTo || null
        });
      } catch(e){
        console.warn('file assembly failed', e);
      }
      delete incomingFiles[id];
      break;
    }
    case 'reaction': {
      const id = safeId(data.id);
      if (!id) return;
      applyRemoteReaction(id, data.emoji, data.on);
      Sound.tap();
      break;
    }
    case 'delete': {
      const id = safeId(data.id);
      if (!id) return;
      removeMessageLocal(id, true);
      addSystem('The other person unsent a message.');
      break;
    }
    case 'bye':
      addSystem('The other person ended the connection.');
      break;
  }
}

/* =========================================================================
   SEND
   ========================================================================= */
async function sendEncrypted(obj){
  if (!dc || dc.readyState !== 'open') return false;
  if (!sessionKey) return false;
  try {
    const env = await encryptMessage(sessionKey, obj);
    dc.send(env);
    return true;
  } catch(e){
    console.error('encrypt failed', e);
    return false;
  }
}

async function sendMessage(){
  if (!dc || dc.readyState !== 'open') return;
  if (!sessionKey) return;
  const text = msgInput.value.trim();
  const files = pendingFiles.slice();
  if (!text && !files.length) return;

  if (text){
    const id = genId();
    const ok = await sendEncrypted({ t:'msg', id, text, replyTo: replyContext });
    if (ok){
      const wrap = addMessage(text, 'me', id, replyContext);
      ChatStore.add(sessionChatId, peerMeta(), {
        id, who: 'me', kind: 'text', text, ts: Date.now(), replyTo: replyContext || null
      });
    }
  }
  if (files.length){
    clearAttachPreview();
    files.forEach(f => sendFile(f));
  }
  msgInput.value = '';
  clearReply();
  clearTimeout(typingTimeout);
  sendEncrypted({ t:'typing', on:false });
  sendBtn.classList.remove('sent'); void sendBtn.offsetWidth; sendBtn.classList.add('sent');
  Sound.send();
}
sendBtn.onclick = sendMessage;
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
});
msgInput.addEventListener('input', () => {
  if (!dc || dc.readyState !== 'open') return;
  sendEncrypted({ t:'typing', on:true });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    if (dc && dc.readyState === 'open') sendEncrypted({ t:'typing', on:false });
  }, 1500);
});
let typingTimeout = null;

/* =========================================================================
   FILE SENDING
   ========================================================================= */
let pendingFiles = [];

async function sendFile(file, opts){
  opts = opts || {};
  if (file.size > MAX_FILE_BYTES){
    let msg = '"' + file.name + '" is ' + humanSize(file.size) + ', over the ' + humanSize(MAX_FILE_BYTES) + ' limit — not sent. ' +
      'Files this size risk crashing the tab since the whole thing is held in memory during transfer.';
    if (shouldSuggestZip(file.name)) msg += ' Try zipping it first, or splitting it into smaller pieces.';
    addSystem(msg);
    Sound.error();
    return;
  }
  const id = genId();
  const mime = file.type || 'application/octet-stream';
  const total = Math.max(1, Math.ceil(file.size / CHUNK_BYTES));
  const reply = opts.replyTo || replyContext;

  // local echo — media/voice get an instant preview; plain files show a
  // "Sending…" progress card (since there's nothing to preview yet) and are
  // swapped for a real file card once every chunk is confirmed sent below.
  let localUrl = '';
  const isPreviewable = !!opts.voice || mime.startsWith('image/') || mime.startsWith('video/');
  if (isPreviewable) localUrl = URL.createObjectURL(file);
  addFileBubble(id, 'me', file.name, mime, file.size, localUrl, {
    voice: !!opts.voice, duration: opts.duration, replyTo: reply
  });

  if (!dc || dc.readyState !== 'open'){
    addSystem('Connection lost — file not sent.');
    return;
  }
  const okMeta = await sendEncrypted({
    t:'file-meta', id, name:file.name, mime, size:file.size, total,
    voice: !!opts.voice, duration: opts.duration || 0, replyTo: reply
  });
  if (!okMeta) return;

  for (let seq = 0; seq < total; seq++){
    await waitForBuffer();
    if (!dc || dc.readyState !== 'open'){
      addSystem('Connection lost mid-transfer.');
      return;
    }
    const slice = file.slice(seq * CHUNK_BYTES, (seq + 1) * CHUNK_BYTES);
    const buf = await slice.arrayBuffer();
    const b64 = bytesToBase64(new Uint8Array(buf));
    const ok = await sendEncrypted({ t:'file-chunk', id, seq, data: b64 });
    if (!ok) return;
    if (!isPreviewable) updateFileProgress(id, Math.round(((seq + 1) / total) * 100));
  }
  await sendEncrypted({ t:'file-done', id });
  if (!isPreviewable){
    // Give the sender a working local copy so their own bubble also gets a
    // real file card + download link instead of sitting at "Sending… 100%".
    localUrl = URL.createObjectURL(file);
    finalizeFileBubble(id, localUrl, mime, file.name, file.size, { replyTo: reply });
  }

  // persist small media only
  let storeUrl = '';
  if (localUrl && file.size <= PERSIST_MEDIA_MAX){
    storeUrl = await blobUrlToDataUrl(localUrl, PERSIST_MEDIA_MAX);
  }
  ChatStore.add(sessionChatId, peerMeta(), {
    id, who: 'me', kind: opts.voice ? 'voice' : 'file',
    name: file.name, mime, size: file.size, url: storeUrl,
    duration: opts.duration || 0, ts: Date.now(), replyTo: reply || null
  });
}

function addPendingFiles(files){
  files.forEach(f => {
    if (f.size > MAX_FILE_BYTES){
      let msg = '"' + f.name + '" is ' + humanSize(f.size) + ', over the ' + humanSize(MAX_FILE_BYTES) + ' limit — skipped. ' +
        'Files this size risk crashing the tab since the whole thing is held in memory during transfer.';
      if (shouldSuggestZip(f.name)) msg += ' Try zipping it first, or splitting it into smaller pieces.';
      addSystem(msg);
      Sound.error();
      return;
    }
    if (pendingFiles.some(p => p.name === f.name && p.size === f.size && p.lastModified === f.lastModified)) return;
    if (f.size > LARGE_FILE_WARN_BYTES){
      addSystem(largeFileWarning(f));
    }
    pendingFiles.push(f);
    const thumb = document.createElement('div');
    thumb.className = 'attach-thumb';
    if (f.type.startsWith('image/')){
      const img = document.createElement('img');
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result; };
      reader.readAsDataURL(f);
      thumb.appendChild(img);
    } else if (f.type.startsWith('audio/')){
      thumb.textContent = '🎵';
    } else {
      thumb.textContent = fileIconFor(f.type, f.name);
    }
    const rm = document.createElement('div');
    rm.className = 'remove';
    rm.textContent = '×';
    rm.onclick = () => {
      const idx = pendingFiles.indexOf(f);
      if (idx > -1) pendingFiles.splice(idx, 1);
      thumb.remove();
      if (!pendingFiles.length) attachPreview.classList.remove('show');
      Sound.tap();
    };
    thumb.appendChild(rm);
    attachPreview.appendChild(thumb);
  });
  if (pendingFiles.length){
    attachPreview.classList.add('show');
    toast(pendingFiles.length + ' file' + (pendingFiles.length > 1 ? 's' : '') + ' ready to send');
  }
}
function clearAttachPreview(){
  pendingFiles = [];
  attachPreview.innerHTML = '';
  attachPreview.classList.remove('show');
}

attachBtn.onclick = () => { Sound.click(); fileInput.click(); };
fileInput.addEventListener('change', () => {
  addPendingFiles(Array.from(fileInput.files));
  fileInput.value = '';
});

/* ---- drag & drop anywhere on the page, no floating dropzone ---- */
let dragDepth = 0;
function hasFiles(e){
  if (!e.dataTransfer) return false;
  const types = e.dataTransfer.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i++) if (types[i] === 'Files') return true;
  return false;
}
window.addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth++;
  if (dc && dc.readyState === 'open') document.body.classList.add('dragging');
});
window.addEventListener('dragover', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('dragleave', (e) => {
  if (!hasFiles(e)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) document.body.classList.remove('dragging');
});
window.addEventListener('drop', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  document.body.classList.remove('dragging');
  if (!dc || dc.readyState !== 'open'){
    toast('Not connected yet — files will be ready once you connect');
    return;
  }
  const files = Array.from(e.dataTransfer.files || []);
  if (files.length) addPendingFiles(files);
});
window.addEventListener('dragend', () => {
  dragDepth = 0;
  document.body.classList.remove('dragging');
});

msgInput.addEventListener('paste', (e) => {
  const items = e.clipboardData && e.clipboardData.items ? e.clipboardData.items : [];
  const files = [];
  for (let i = 0; i < items.length; i++){
    const it = items[i];
    if (it.kind === 'file'){ const f = it.getAsFile(); if (f) files.push(f); }
  }
  if (files.length) addPendingFiles(files);
});

/* =========================================================================
   VOICE MESSAGES
   ========================================================================= */
let mediaRecorder = null;
let recChunks = [];
let recStartTs = 0;
let recTimer = null;
let recCancelled = false;

function pickAudioMime(){
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/mpeg'
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const c of candidates){
    try { if (MediaRecorder.isTypeSupported(c)) return c; } catch(e){}
  }
  return '';
}

async function startRecording(){
  if (!dc || dc.readyState !== 'open') return;
  if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    toast('Voice recording is not supported in this browser');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true } });
    const mime = pickAudioMime();
    const opts = mime ? { mimeType: mime } : undefined;
    mediaRecorder = new MediaRecorder(stream, opts);
    recChunks = [];
    recCancelled = false;
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) recChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      stopRecTimer();
      recBar.classList.remove('show');
      micBtn.classList.remove('recording');
      if (recCancelled) return;
      const type = mediaRecorder.mimeType || 'audio/webm';
      const blob = new Blob(recChunks, { type });
      const duration = (Date.now() - recStartTs) / 1000;
      if (blob.size < 1200 || duration < 0.6){
        toast('Recording too short');
        return;
      }
      const ext = type.indexOf('mp4') > -1 ? 'm4a' : (type.indexOf('ogg') > -1 ? 'ogg' : 'webm');
      const file = new File([blob], 'voice-message-' + Date.now() + '.' + ext, { type });
      sendFile(file, { voice: true, duration: Math.round(duration), replyTo: replyContext });
      clearReply();
    };
    mediaRecorder.start(250);
    recStartTs = Date.now();
    recBar.classList.add('show');
    micBtn.classList.add('recording');
    Sound.recStart();
    startRecTimer();
  } catch(e){
    if (e.name === 'NotAllowedError') toast('Microphone permission denied');
    else toast('Could not start recording');
  }
}
function stopRecording(cancel){
  recCancelled = !!cancel;
  if (mediaRecorder && mediaRecorder.state !== 'inactive'){
    try { mediaRecorder.stop(); } catch(e){}
  }
  if (cancel) Sound.tap(); else Sound.recStop();
}
function startRecTimer(){
  stopRecTimer();
  recTimer = setInterval(() => {
    const s = Math.round((Date.now() - recStartTs) / 1000);
    recTime.textContent = fmtDur(s);
    if (s >= 180) stopRecording(false);
  }, 200);
  recTime.textContent = '0:00';
}
function stopRecTimer(){
  if (recTimer){ clearInterval(recTimer); recTimer = null; }
}
micBtn.onclick = () => {
  if (micBtn.classList.contains('recording')) stopRecording(false);
  else startRecording();
};
$('recCancel').onclick = () => stopRecording(true);
$('recSend').onclick = () => stopRecording(false);

/* =========================================================================
   VOICE PLAYBACK (single shared audio element)
   ========================================================================= */
const sharedAudio = new Audio();
let currentVoiceEl = null;

sharedAudio.addEventListener('timeupdate', () => {
  if (!currentVoiceEl) return;
  const dur = sharedAudio.duration && isFinite(sharedAudio.duration) ? sharedAudio.duration : (Number(currentVoiceEl.dataset.dur) || 1);
  const pct = dur ? sharedAudio.currentTime / dur : 0;
  const bars = currentVoiceEl.querySelectorAll('.voice-track i');
  const onCount = Math.round(pct * bars.length);
  bars.forEach((b, i) => b.classList.toggle('on', i < onCount));
  const t = currentVoiceEl.querySelector('.voice-time');
  if (t) t.textContent = fmtDur(sharedAudio.currentTime);
});
sharedAudio.addEventListener('ended', () => {
  if (currentVoiceEl){
    currentVoiceEl.querySelector('.voice-play').textContent = '▶';
    currentVoiceEl.querySelectorAll('.voice-track i').forEach(b => b.classList.remove('on'));
    const t = currentVoiceEl.querySelector('.voice-time');
    if (t) t.textContent = fmtDur(Number(currentVoiceEl.dataset.dur) || 0);
    currentVoiceEl = null;
  }
});
messagesEl.addEventListener('click', (e) => {
  const playBtn = e.target.closest('.voice-play');
  const track = e.target.closest('.voice-track');
  const vm = e.target.closest('.voice-msg');
  if (!vm) return;
  if (!playBtn && !track) return;
  e.stopPropagation();
  const url = vm.dataset.url;
  if (!url) return;

  if (currentVoiceEl === vm && !sharedAudio.paused){
    sharedAudio.pause();
    playBtn.textContent = '▶';
    return;
  }
  if (currentVoiceEl && currentVoiceEl !== vm){
    currentVoiceEl.querySelector('.voice-play').textContent = '▶';
    currentVoiceEl.querySelectorAll('.voice-track i').forEach(b => b.classList.remove('on'));
  }
  currentVoiceEl = vm;
  if (sharedAudio.src !== url){
    sharedAudio.src = url;
    sharedAudio.currentTime = 0;
  }
  sharedAudio.play().then(() => {
    playBtn.textContent = '❚❚';
    Sound.tap();
  }).catch(() => {
    toast('Could not play voice message');
    playBtn.textContent = '▶';
  });
});

/* =========================================================================
   EMOJI PICKER (composer)
   ========================================================================= */
emojiPop.innerHTML = EMOJI_LIST.map(e => '<button type="button">' + e + '</button>').join('');
emojiPop.querySelectorAll('button').forEach(b => {
  b.onclick = () => {
    const start = msgInput.selectionStart ?? msgInput.value.length;
    const end = msgInput.selectionEnd ?? msgInput.value.length;
    msgInput.value = msgInput.value.slice(0, start) + b.textContent + msgInput.value.slice(end);
    const pos = start + b.textContent.length;
    msgInput.focus();
    msgInput.setSelectionRange(pos, pos);
    emojiPop.classList.remove('open');
    Sound.tap();
  };
});
emojiBtn.onclick = (e) => { e.stopPropagation(); emojiPop.classList.toggle('open'); Sound.tap(); };
document.addEventListener('click', (e) => {
  if (!emojiPop.contains(e.target) && e.target !== emojiBtn) emojiPop.classList.remove('open');
});

/* =========================================================================
   LIGHTBOX
   ========================================================================= */
let lightboxDownloadUrl = '';
messagesEl.addEventListener('click', (e) => {
  const img = e.target.closest('img.chat-img');
  if (img && !e.target.closest('.dl-btn')){
    lightboxImg.src = img.src;
    lightboxDownloadUrl = img.src;
    lightbox.classList.add('open');
    Sound.tap();
  }
});
$('lbDownload').onclick = (e) => {
  e.stopPropagation();
  downloadUrl(lightboxDownloadUrl, 'telewish-image');
};
lightbox.onclick = (e) => {
  if (e.target === lightbox){
    lightbox.classList.remove('open');
    lightboxImg.src = '';
  }
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape'){
    if (lightbox.classList.contains('open')){ lightbox.classList.remove('open'); lightboxImg.src = ''; }
    if (qrFullscreen.classList.contains('open')) closeQrFullscreen();
    if (scanModal.classList.contains('open')) closeScanner();
    closeActionPop();
  }
});

/* =========================================================================
   BACK NAVIGATION
   ========================================================================= */
function goBackToChoose(){
  Sound.click();
  teardownSession();
  closeRelay();
  currentOfferTokens = [];
  currentAnswerTokens = [];
  currentOfferSalt = null;
  currentOfferMode = modeFromToggle();
  currentAnswerMode = 'secure';
  peerProfile = { name:'', avatar:'' };
  clearReply();

  ['offerOut','answerIn','answerPassIn','offerIn','offerPassIn','answerOut','relayCodeIn','relayCodeOut']
    .forEach(id => { const el = $(id); if (el) el.value = ''; });
  ['offerPassChips','answerPassChips','offerPassPreview','answerPassPreview'].forEach(id => {
    const el = $(id); if (el) el.innerHTML = '';
  });
  ['offerInCount','answerInCount','offerOutCount','answerOutCount'].forEach(id => updateCount(id, ''));

  hide($('startStage2'));
  hide($('startStage3'));
  hide($('joinStage2'));
  hide($('joinStage3'));
  const startReadyRowEl = $('startReadyRow');
  if (startReadyRowEl) startReadyRowEl.style.display = '';
  const answerOutWrap = $('answerOutWrap'); if (answerOutWrap) answerOutWrap.style.display = 'none';
  const relayCodeOutWrap = $('relayCodeOutWrap'); if (relayCodeOutWrap) relayCodeOutWrap.style.display = 'none';
  const relayJoinWrap = $('relayJoinWrap'); if (relayJoinWrap) relayJoinWrap.style.display = 'none';
  const relayCreateWrap = $('relayCreateWrap'); if (relayCreateWrap) relayCreateWrap.style.display = '';

  clearError('errA'); clearError('errB'); clearError('errRelay');
  const rc = $('relayCreateBtn'); if (rc) rc.disabled = false;
  const rj = $('relayJoinGo'); if (rj) rj.disabled = false;

  setStatus('not connected', '');
  show('stepChoose');
}
$('back1').onclick = goBackToChoose;
$('back2').onclick = goBackToChoose;
$('backRelay').onclick = goBackToChoose;

/* =========================================================================
   SESSION TEARDOWN
   ========================================================================= */
function teardownSession(){
  stopQualityPolling();
  stopRecTimer();
  if (mediaRecorder && mediaRecorder.state !== 'inactive'){ try { mediaRecorder.stop(); } catch(e){} }
  try { if (dc && dc.readyState === 'open') dc.send(JSON.stringify({ v: 1, plain: 'bye' })); } catch(e){}
  try { if (dc) dc.close(); } catch(e){}
  try { if (pc) pc.close(); } catch(e){}
  dc = null; pc = null;
  sessionKey = null; sessionSas = ''; sessionChatId = '';
  incomingFiles = {};
  reactions = {};
  hideTypingIndicator();
  connBanner.classList.remove('show');
}

chatDisconnect.onclick = () => {
  if (!dc && !pc) return;
  teardownSession();
  Sound.disconnect();
  setStatus('disconnected', 'error');
  setChatStatus('disconnected', 'Disconnected');
  addSystem('You ended the connection.');
  msgInput.disabled = true; sendBtn.disabled = true;
  attachBtn.disabled = true; emojiBtn.disabled = true; micBtn.disabled = true;
  emojiPop.classList.remove('open');
  clearReply();
};

/* =========================================================================
   ICE
   ========================================================================= */
function waitForIceComplete(peerConn){
  return new Promise(resolve => {
    if (peerConn.iceGatheringState === 'complete'){ resolve(); return; }
    function check(){
      if (peerConn.iceGatheringState === 'complete'){
        peerConn.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    }
    peerConn.addEventListener('icegatheringstatechange', check);
    setTimeout(resolve, 4000);
  });
}

/* =========================================================================
   ROLE A: START
   ========================================================================= */
let currentOfferTokens = [];
let currentAnswerTokens = [];
let currentOfferSalt = null;
let currentOfferMode = 'secure';
let currentAnswerMode = 'secure';

$('startBtn').onclick = async () => {
  Sound.click();
  show('stepStartA');
  setStatus('generating code…', 'connecting');

  if (!CRYPTO_AVAILABLE){
    showError('errA', 'WebCrypto is required for encryption — open Telewish over https:// or localhost.');
    Sound.error();
    return;
  }
  const mode = modeFromToggle();
  currentOfferMode = mode;

  const lockTag = $('offerLockTag');
  const noteEl = $('offerPassNote');
  if (mode === 'simple'){
    lockTag.textContent = '8 chars · say it aloud';
    lockTag.classList.add('simple');
    noteEl.innerHTML = 'This <b>8-character password</b> is the missing half of the code — and it also seeds the AES-256 key. Say it aloud or send it in a separate message. Never alongside the code.';
  } else {
    lockTag.textContent = 'say it aloud';
    lockTag.classList.remove('simple');
    noteEl.innerHTML = 'These words <b>are</b> the missing half of the code — and they also seed the AES-256 key. Read them aloud, or send them in a separate message. Never alongside the code.';
  }

  currentOfferSalt = crypto.getRandomValues(new Uint8Array(16));
  pc = new RTCPeerConnection(rtcConfig);
  dc = pc.createDataChannel('chat', { ordered: true });
  telewishDataChannel();
  pc.oniceconnectionstatechange = handleIceState;

  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceComplete(pc);

    const payload = {
      type: 'offer',
      sdp: pc.localDescription.sdp,
      salt: b64u(currentOfferSalt),
      mode: mode,
      v: 2
    };
    const offerCode = await encodeCompact(payload);
    const { visible, tokens } = splitCode(offerCode, mode);

    $('offerOut').value = visible;
    updateCount('offerOutCount', visible);
    renderPassChips('offerPassChips', tokens, mode);
    renderQrPanel('offerQrCanvas', 'offerQrFallback', visible, 460);
    currentOfferTokens = tokens;
  } catch(e){
    showError('errA', 'Could not generate the connection code. Try again.');
    setStatus('error', 'error');
    Sound.error();
    return;
  }
  setStatus('waiting for reply code…', 'connecting');
  Sound.reveal();
};

$('copyOffer').onclick = (e) => {
  const ta = $('offerOut');
  copyToClipboard(ta.value, e.currentTarget, ta);
};
$('copyOfferPass').onclick = (e) => {
  copyToClipboard(passphraseText(currentOfferTokens, currentOfferMode), e.currentTarget, null);
};

async function copyToClipboard(text, btnEl, textareaEl){
  const originalHTML = btnEl.innerHTML;
  const checkIcon = '<svg class="icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  const warnIcon = '<svg class="icon" viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  let ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch(e){ ok = false; }
  if (!ok) ok = legacyCopy(text);
  if (ok){
    Sound.copy();
    btnEl.innerHTML = checkIcon + ' Copied';
  } else {
    if (textareaEl){
      textareaEl.focus();
      textareaEl.setSelectionRange(0, textareaEl.value.length);
    }
    btnEl.innerHTML = warnIcon + ' Select &amp; copy manually';
  }
  setTimeout(() => { btnEl.innerHTML = originalHTML; }, 2200);
}

async function connectWithAnswer(){
  clearError('errA');
  const codeVal = $('answerIn').value.trim();
  const passVal = $('answerPassIn').value.trim();
  if (!codeVal){ showError('errA', 'Paste their reply code first.'); Sound.error(); return; }

  let parsed;
  try { parsed = await decodeWithPass(codeVal, passVal); }
  catch(e){
    showError('errA', e.message || 'That reply code looks invalid or incomplete. Ask them to resend it.');
    Sound.error();
    return;
  }
  const answer = parsed.payload;
  if (answer.type !== 'answer'){
    showError('errA', 'That looks like a start code, not a reply code — make sure they sent you the code generated after pasting yours.');
    Sound.error();
    return;
  }
  if (!currentOfferSalt || !currentOfferTokens.length){
    showError('errA', 'Session state missing — start over.');
    Sound.error();
    return;
  }
  const answerMode = (answer.mode === 'simple' || answer.mode === 'secure') ? answer.mode : currentOfferMode;

  try {
    const d = await deriveCrypto(currentOfferTokens, currentOfferSalt, answerMode);
    sessionKey = d.aesKey;
    sessionSas = d.sas;
  } catch(e){
    showError('errA', 'Could not derive the encryption key (' + e.message + ').');
    Sound.error();
    return;
  }
  try {
    await pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
    setStatus('connecting…', 'connecting');
    Sound.click();
  } catch(e){
    showError('errA', "That reply code didn't match this connection. Ask them to send it again.");
    Sound.error();
  }
}
$('finishConnect').onclick = connectWithAnswer;
$('answerPassIn').addEventListener('input', () => livePassPreview('answerPassIn', 'answerPassPreview', 'answerIn'));

/* =========================================================================
   ROLE B: JOIN
   ========================================================================= */
$('joinBtn').onclick = () => { Sound.click(); show('stepJoinB'); };

async function generateAnswer(){
  clearError('errB');
  const codeVal = $('offerIn').value.trim();
  const passVal = $('offerPassIn').value.trim();
  if (!codeVal){ showError('errB', 'Paste their code first.'); Sound.error(); return; }
  if (!CRYPTO_AVAILABLE){ showError('errB', 'WebCrypto required — open over https://.'); Sound.error(); return; }

  let parsed;
  try { parsed = await decodeWithPass(codeVal, passVal); }
  catch(e){
    showError('errB', e.message || 'That code looks invalid or incomplete. Ask them to resend it.');
    Sound.error();
    return;
  }
  const offer = parsed.payload;
  if (offer.type !== 'offer'){
    showError('errB', 'That looks like a reply code, not a start code — make sure they sent you the very first code.');
    Sound.error();
    return;
  }
  if (typeof offer.salt !== 'string' || offer.salt.length > 64){
    showError('errB', 'That start code is missing its salt — ask them to resend it.');
    Sound.error();
    return;
  }
  let saltBytes;
  try { saltBytes = b64uDecode(offer.salt); }
  catch(e){ showError('errB', 'That start code is malformed — ask them to resend it.'); Sound.error(); return; }
  if (saltBytes.length !== 16){
    showError('errB', 'That start code is malformed — ask them to resend it.');
    Sound.error();
    return;
  }
  const detected = detectMode(extractCode(codeVal)) || 'secure';
  const offerMode = (offer.mode === 'simple' || offer.mode === 'secure') ? offer.mode : detected;

  try {
    const d = await deriveCrypto(parsed.tokens, saltBytes, offerMode);
    sessionKey = d.aesKey;
    sessionSas = d.sas;
  } catch(e){
    showError('errB', 'Could not derive encryption key (' + e.message + ').');
    Sound.error();
    return;
  }
  try {
    setStatus('generating reply…', 'connecting');
    pc = new RTCPeerConnection(rtcConfig);
    pc.ondatachannel = (e) => { dc = e.channel; telewishDataChannel(); };
    pc.oniceconnectionstatechange = handleIceState;

    await pc.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceComplete(pc);

    const payload = { type: 'answer', sdp: pc.localDescription.sdp, mode: offerMode, v: 2 };
    const answerCode = await encodeCompact(payload);
    const { visible, tokens } = splitCode(answerCode, offerMode);

    $('answerOut').value = visible;
    updateCount('answerOutCount', visible);

    const lockTag = $('answerLockTag');
    const noteEl = $('answerPassNote');
    if (offerMode === 'simple'){
      lockTag.textContent = '8 chars · say it aloud';
      lockTag.classList.add('simple');
      noteEl.innerHTML = 'Read this <b>8-character password</b> to them the same way you got theirs. They\'ll need <b>both</b> halves before the connection opens.';
    } else {
      lockTag.textContent = 'say it aloud';
      lockTag.classList.remove('simple');
      noteEl.innerHTML = 'Read these to them the same way you got theirs. They\'ll need <b>both</b> halves before the connection opens.';
    }
    renderPassChips('answerPassChips', tokens, offerMode);
    renderQrPanel('answerQrCanvas', 'answerQrFallback', visible, 460);
    currentAnswerTokens = tokens;
    currentAnswerMode = offerMode;
    currentOfferMode = offerMode;

    const wrap = $('answerOutWrap');
    wrap.style.display = 'block';
    Sound.reveal();
    setTimeout(() => scrollSetupTo(wrap), 80);
    setStatus('waiting for them to connect…', 'connecting');
    hide(joinStage3);
  } catch(e){
    showError('errB', 'Could not process that code. Ask them to resend it, or start over below.');
    setStatus('error', 'error');
    Sound.error();
  }
}
$('genAnswer').onclick = generateAnswer;
$('offerPassIn').addEventListener('input', () => livePassPreview('offerPassIn', 'offerPassPreview', 'offerIn'));

$('copyAnswer').onclick = (e) => {
  const ta = $('answerOut');
  copyToClipboard(ta.value, e.currentTarget, ta);
};
$('copyAnswerPass').onclick = (e) => {
  copyToClipboard(passphraseText(currentAnswerTokens, currentAnswerMode), e.currentTarget, null);
};

/* =========================================================================
   RELAY (quick connect)
   ========================================================================= */
$('openRelayBtn').onclick = () => { Sound.click(); show('stepRelay'); };
try { $('relayUrl').value = localStorage.getItem('telewishRelayUrl') || ''; } catch(e){}

$('relayShowJoin').onclick = () => {
  Sound.click();
  $('relayCreateWrap').style.display = 'none';
  $('relayJoinWrap').style.display = 'block';
};

let relayWs = null;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genRoomCode(len){
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => ROOM_CODE_ALPHABET[n % ROOM_CODE_ALPHABET.length]).join('');
}
function closeRelay(){
  if (relayWs){ try { relayWs.close(); } catch(e){} relayWs = null; }
}
function relayJoin(url, code, onMessage){
  return new Promise((resolve, reject) => {
    let ws;
    try { ws = new WebSocket(url); } catch(e){ reject(new Error('That relay address looks invalid.')); return; }
    relayWs = ws;
    const timeout = setTimeout(() => { ws.close(); reject(new Error("Couldn't reach the relay server (timed out). Check the address and that it's running.")); }, 8000);
    ws.onopen = () => ws.send(JSON.stringify({ t: 'join', code }));
    ws.onerror = () => { clearTimeout(timeout); reject(new Error("Couldn't reach the relay server — check the wss:// address, and that it's running and reachable.")); };
    ws.onclose = () => { if (relayWs === ws) relayWs = null; };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch(err){ return; }
      if (msg.t === 'full'){ clearTimeout(timeout); reject(new Error('That room code already has two people in it. Try a different code.')); return; }
      if (msg.t === 'ready'){ clearTimeout(timeout); resolve(ws); return; }
      if (msg.t === 'peer-left'){ showError('errRelay', 'The other person disconnected before the handshake finished. Try again.'); return; }
      onMessage(msg);
    };
  });
}

$('relayCreateBtn').onclick = async () => {
  clearError('errRelay');
  const createBtn = $('relayCreateBtn');
  const url = $('relayUrl').value.trim();
  if (!url){ showError('errRelay', 'Enter your relay server\u2019s wss:// address first.'); Sound.error(); return; }
  try { localStorage.setItem('telewishRelayUrl', url); } catch(e){}
  Sound.click();
  currentOfferMode = modeFromToggle();

  const code = genRoomCode(6);
  $('relayCodeOut').value = code;
  $('relayCodeOutWrap').style.display = 'block';
  createBtn.disabled = true;
  setStatus('waiting for someone to join…', 'connecting');

  try {
    const ws = await relayJoin(url, code, async (msg) => {
      if (msg.t === 'answer' && msg.sdp){
        if (!msg.sdp || typeof msg.sdp !== 'object') return;
        try {
          await pc.setRemoteDescription(msg.sdp);
          setStatus('connecting…', 'connecting');
          closeRelay();
        } catch(e){
          showError('errRelay', 'That reply didn\u2019t look right. Try again.');
          Sound.error();
        }
      }
    });
    pc = new RTCPeerConnection(rtcConfig);
    dc = pc.createDataChannel('chat', { ordered: true });
    telewishDataChannel();
    pc.oniceconnectionstatechange = handleIceState;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceComplete(pc);
    ws.send(JSON.stringify({ t: 'offer', sdp: pc.localDescription }));
  } catch(e){
    showError('errRelay', e.message || 'Something went wrong reaching the relay.');
    setStatus('error', 'error');
    createBtn.disabled = false;
    Sound.error();
  }
};

$('relayJoinGo').onclick = async () => {
  clearError('errRelay');
  const joinGoBtn = $('relayJoinGo');
  const url = $('relayUrl').value.trim();
  const code = $('relayCodeIn').value.trim().toUpperCase();
  if (!url){ showError('errRelay', 'Enter the relay server\u2019s wss:// address first.'); Sound.error(); return; }
  if (!code){ showError('errRelay', 'Enter the room code they sent you.'); Sound.error(); return; }
  try { localStorage.setItem('telewishRelayUrl', url); } catch(e){}
  Sound.click();
  joinGoBtn.disabled = true;
  setStatus('joining room…', 'connecting');

  try {
    await relayJoin(url, code, async (msg) => {
      if (msg.t === 'offer' && msg.sdp){
        if (!msg.sdp || typeof msg.sdp !== 'object') return;
        try {
          pc = new RTCPeerConnection(rtcConfig);
          pc.ondatachannel = (e) => { dc = e.channel; telewishDataChannel(); };
          pc.oniceconnectionstatechange = handleIceState;
          await pc.setRemoteDescription(msg.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await waitForIceComplete(pc);
          if (relayWs) relayWs.send(JSON.stringify({ t: 'answer', sdp: pc.localDescription }));
          setStatus('connecting…', 'connecting');
          closeRelay();
        } catch(e){
          showError('errRelay', 'Could not process the connection from the other side. Try again.');
          Sound.error();
        }
      }
    });
  } catch(e){
    showError('errRelay', e.message || 'Something went wrong reaching the relay.');
    setStatus('error', 'error');
    joinGoBtn.disabled = false;
    Sound.error();
  }
};

$('copyRelayCode').onclick = (e) => {
  const input = $('relayCodeOut');
  copyToClipboard(input.value, e.currentTarget, input);
};

/* =========================================================================
   BOOT
   ========================================================================= */
(function boot(){
  if (hasConsentedToday()){
    // skip straight to the chooser
    show('stepChoose');
    const greet = $('chooseGreeting');
    if (greet){
      const p = Profile.load();
      greet.textContent = p.name ? ('Hey ' + p.name + ' — start or join a chat') : 'Start or join a chat';
    }
    continueBtn.disabled = false;
    consentCheck.checked = true;
  }
  if (Profile.load().name){
    const greet = $('chooseGreeting');
    if (greet) greet.textContent = 'Hey ' + Profile.load().name + ' — start or join a chat';
  }
})();

Sound.setEnabled(Settings.sound);

window.addEventListener('beforeunload', () => {
  try { teardownSession(); } catch(e){}
});

if (!CRYPTO_AVAILABLE){
  console.warn('Telewish: WebCrypto unavailable — serve over https:// or localhost for encrypted connections.');
}
