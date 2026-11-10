/* 工具台 · 纯前端小工具 */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

const charCount = (str) => Array.from(str).length;
const byteCount = (str) => encoder.encode(str).length;

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function setStatus(el, text, kind = '') {
  el.textContent = text;
  el.classList.toggle('is-error', kind === 'error');
  el.classList.toggle('is-ok', kind === 'ok');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.top = '-1000px';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    box.remove();
    return ok;
  }
}

function restoreLabel(btn) {
  btn.textContent = btn.dataset.label;
  btn.classList.remove('is-copied', 'is-failed');
}

function flashCopied(btn) {
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  clearTimeout(btn._copyTimer);
  btn.textContent = '已复制';
  btn.classList.add('is-copied');
  btn.classList.remove('is-failed');
  btn._copyTimer = setTimeout(() => restoreLabel(btn), 1400);
}

function flashFailed(btn) {
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  clearTimeout(btn._copyTimer);
  btn.textContent = '复制失败';
  btn.classList.add('is-failed');
  btn.classList.remove('is-copied');
  btn._copyTimer = setTimeout(() => restoreLabel(btn), 1600);
}

document.addEventListener('click', async (event) => {
  const btn = event.target.closest('[data-copy]');
  if (!btn) return;
  const target = document.getElementById(btn.dataset.copy);
  if (!target) return;
  const text = 'value' in target ? target.value : target.textContent;
  if (!text) return;
  const ok = await copyText(text);
  if (ok) flashCopied(btn);
  else flashFailed(btn);
});

/* ---------- tool switching ---------- */

const tabs = $$('.tool-tab');
const panels = $$('[data-panel]');

function activate(tool, updateHash = true) {
  if (!panels.some((p) => p.dataset.panel === tool)) tool = 'url';
  panels.forEach((p) => { p.hidden = p.dataset.panel !== tool; });
  tabs.forEach((t) => {
    const active = t.dataset.tool === tool;
    t.setAttribute('aria-current', active ? 'true' : 'false');
    if (active) t.scrollIntoView({ block: 'nearest', inline: 'center' });
  });
  if (updateHash) history.replaceState(null, '', `#${tool}`);
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => activate(tab.dataset.tool));
});

window.addEventListener('hashchange', () => activate(location.hash.slice(1), false));

document.addEventListener('keydown', (event) => {
  if (!event.altKey || event.ctrlKey || event.metaKey) return;
  const index = Number(event.key) - 1;
  if (index >= 0 && index < tabs.length) {
    event.preventDefault();
    activate(tabs[index].dataset.tool);
  }
});

/* ---------- UTC clock ---------- */

function pad(n, width = 2) {
  return String(n).padStart(width, '0');
}

const clockEl = $('#utc-clock');
function tickClock() {
  const d = new Date();
  clockEl.textContent = `UTC ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
tickClock();
setInterval(tickClock, 1000);

/* ---------- 01 URL ---------- */

const urlIn = $('#url-in');
const urlOut = $('#url-out');
const urlStatus = $('#url-status');
const urlInMeta = $('#url-in-meta');
const URL_MODES = {
  component: encodeURIComponent,
  uri: encodeURI,
  decode: decodeURIComponent,
};
let urlMode = 'component';

function syncUrlModes() {
  $$('[data-url-mode]').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.urlMode === urlMode ? 'true' : 'false');
  });
}

function updateUrl() {
  const raw = urlIn.value;
  urlInMeta.textContent = `${charCount(raw)} 字符`;
  syncUrlModes();

  if (!raw) {
    urlOut.value = '';
    setStatus(urlStatus, '输入后即时显示转换结果。');
    return;
  }

  try {
    const out = URL_MODES[urlMode](raw);
    urlOut.value = out;
    setStatus(
      urlStatus,
      `输入 ${charCount(raw)} 字符 → 输出 ${charCount(out)} 字符 · ${formatBytes(byteCount(out))}`,
      'ok',
    );
  } catch {
    urlOut.value = '';
    const message = urlMode === 'decode'
      ? '解码失败：百分号转义不完整。检查 % 后是否跟着两位十六进制数。'
      : '编码失败：输入里可能有不配对的代理字符。';
    setStatus(urlStatus, message, 'error');
  }
}

$$('[data-url-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    urlMode = btn.dataset.urlMode;
    updateUrl();
  });
});

urlIn.addEventListener('input', updateUrl);

$('#url-swap').addEventListener('click', () => {
  if (!urlOut.value) return;
  urlMode = urlMode === 'decode' ? 'component' : 'decode';
  urlIn.value = urlOut.value;
  updateUrl();
  urlIn.focus();
});

urlIn.value = 'https://1475369.xyz/search?q=开发者 工具&page=2';
updateUrl();

/* ---------- 02 timestamp ---------- */

const tsInput = $('#ts-input');
const tsUnit = $('#ts-unit');
const tsLocal = $('#ts-local');
const tsUtc = $('#ts-utc');
const tsIso = $('#ts-iso');
const tsRel = $('#ts-rel');
const tsStatus = $('#ts-status');
const dtInput = $('#dt-input');
const dtSec = $('#dt-sec');
const dtMs = $('#dt-ms');
const dtIso = $('#dt-iso');

function fmtDate(date, utc = false) {
  const g = (name) => date[utc ? `getUTC${name}` : `get${name}`]();
  return `${g('FullYear')}-${pad(g('Month') + 1)}-${pad(g('Date'))} `
    + `${pad(g('Hours'))}:${pad(g('Minutes'))}:${pad(g('Seconds'))}.${pad(g('Milliseconds'), 3)}`;
}

function relativeTime(date) {
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  if (abs < 1000) return '现在';
  const units = [
    [365 * 86400000, '年'],
    [30 * 86400000, '个月'],
    [86400000, '天'],
    [3600000, '小时'],
    [60000, '分钟'],
    [1000, '秒'],
  ];
  for (const [size, name] of units) {
    if (abs >= size) {
      const value = Math.floor(abs / size);
      return diff > 0 ? `${value} ${name}后` : `${value} ${name}前`;
    }
  }
  return '现在';
}

function updateNow() {
  const now = new Date();
  $('#now-sec').textContent = String(Math.floor(now.getTime() / 1000));
  $('#now-ms').textContent = String(now.getTime());
  $('#now-local').textContent = fmtDate(now);
  $('#now-utc').textContent = fmtDate(now, true);
  $('#now-iso').textContent = now.toISOString();

  const parsed = parseTimestamp(tsInput.value);
  if (parsed && parsed.date) tsRel.textContent = relativeTime(parsed.date);
}
setInterval(updateNow, 1000);

function parseTimestamp(raw) {
  const value = raw.trim();
  if (!value) return null;
  if (!/^-?\d+(\.\d+)?$/.test(value)) return { error: '只接受数字，可带负号和小数点。' };

  const n = Number(value);
  if (!Number.isFinite(n)) return { error: '数值超出可表示范围。' };

  const digits = value.replace('-', '').split('.')[0].length;
  const isMs = Math.abs(n) >= 1e12 || digits >= 13;
  const date = new Date(isMs ? n : n * 1000);
  if (Number.isNaN(date.getTime())) return { error: '超出 Date 可表示的时间范围。' };

  return { date, isMs };
}

function clearTsResult() {
  tsUnit.textContent = '--';
  tsLocal.textContent = '--';
  tsUtc.textContent = '--';
  tsIso.textContent = '--';
  tsRel.textContent = '--';
}

function updateTs() {
  const raw = tsInput.value;
  if (!raw.trim()) {
    clearTsResult();
    setStatus(tsStatus, '输入秒或毫秒时间戳，自动按位数判断单位。');
    return;
  }

  const parsed = parseTimestamp(raw);
  if (!parsed) return;

  if (parsed.error) {
    clearTsResult();
    setStatus(tsStatus, parsed.error, 'error');
    return;
  }

  const { date, isMs } = parsed;
  tsUnit.textContent = isMs ? '按毫秒解析' : '按秒解析';
  tsLocal.textContent = fmtDate(date);
  tsUtc.textContent = fmtDate(date, true);
  tsIso.textContent = date.toISOString();
  tsRel.textContent = relativeTime(date);
  setStatus(tsStatus, isMs ? '识别为 13 位毫秒时间戳。' : '识别为 10 位秒级时间戳。');
}

tsInput.addEventListener('input', updateTs);

function toLocalInput(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function updateDt() {
  const value = dtInput.value;
  if (!value) {
    dtSec.textContent = '--';
    dtMs.textContent = '--';
    dtIso.textContent = '--';
    setStatus(tsStatus, '选择日期时间后按本地时区换算。');
    return;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    dtSec.textContent = '--';
    dtMs.textContent = '--';
    dtIso.textContent = '--';
    setStatus(tsStatus, '日期格式无效。', 'error');
    return;
  }
  dtSec.textContent = String(Math.floor(date.getTime() / 1000));
  dtMs.textContent = String(date.getTime());
  dtIso.textContent = date.toISOString();
  setStatus(tsStatus, '按本地时区解析，复制按钮在每行右侧。');
}

dtInput.addEventListener('input', updateDt);

$('#dt-now').addEventListener('click', () => {
  dtInput.value = toLocalInput(new Date());
  updateDt();
});

const start = new Date();
tsInput.value = String(Math.floor(start.getTime() / 1000));
dtInput.value = toLocalInput(start);
updateTs();
updateDt();
updateNow();

/* ---------- 03 JSON ---------- */

const jsonIn = $('#json-in');
const jsonOut = $('#json-out');
const jsonStatus = $('#json-status');
const jsonInMeta = $('#json-in-meta');
const jsonPane = jsonOut.closest('.pane');
let jsonIndent = 2;
let jsonMinify = false;
let jsonSort = false;

function countKeys(value) {
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countKeys(item), 0);
  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((sum, key) => sum + 1 + countKeys(value[key]), 0);
  }
  return 0;
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const sorted = {};
    Object.keys(value).sort().forEach((key) => { sorted[key] = sortKeys(value[key]); });
    return sorted;
  }
  return value;
}

function jsonErrorLocation(raw, error) {
  const lineCol = /line (\d+) column (\d+)/.exec(error.message);
  if (lineCol) return `第 ${lineCol[1]} 行第 ${lineCol[2]} 列`;
  const position = /position (\d+)/.exec(error.message);
  if (position) {
    const pos = Number(position[1]);
    const before = raw.slice(0, pos);
    const line = before.split('\n').length;
    const column = pos - before.lastIndexOf('\n');
    return `第 ${line} 行第 ${column} 列`;
  }
  return '';
}

function updateJson() {
  const raw = jsonIn.value;
  jsonInMeta.textContent = formatBytes(byteCount(raw));

  if (!raw.trim()) {
    jsonOut.value = '';
    jsonPane.classList.remove('has-error');
    setStatus(jsonStatus, '粘贴 JSON 后即时校验与格式化。');
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const prepared = jsonSort ? sortKeys(parsed) : parsed;
    const indent = jsonMinify ? 0 : (jsonIndent === 'tab' ? '\t' : jsonIndent);
    const out = JSON.stringify(prepared, null, indent);
    jsonOut.value = out;
    jsonPane.classList.remove('has-error');
    setStatus(
      jsonStatus,
      `合法 JSON · ${countKeys(parsed)} 个键 · 输出 ${formatBytes(byteCount(out))}`,
      'ok',
    );
  } catch (error) {
    const location = jsonErrorLocation(raw, error);
    let reason = error.message;
    if (/Unexpected end of JSON input/.test(reason)) {
      reason = 'JSON 意外结束，检查括号与引号是否闭合。';
    } else {
      const token = /Unexpected token (.+?)(?:,| is not valid JSON| in JSON|$)/.exec(reason);
      if (token) {
        reason = `意外的字符 ${token[1]}`;
      } else {
        reason = reason
          .replace(/,?\s*".*" is not valid JSON$/, '')
          .replace(/\s+in JSON at position \d+.*$/, '')
          .replace(/\s+at position \d+.*$/, '');
      }
    }
    jsonOut.value = '';
    jsonPane.classList.add('has-error');
    setStatus(jsonStatus, `${location ? `${location}：` : ''}${reason}`, 'error');
  }
}

jsonIn.addEventListener('input', updateJson);

$$('[data-indent]').forEach((btn) => {
  btn.addEventListener('click', () => {
    jsonIndent = btn.dataset.indent === 'tab' ? 'tab' : Number(btn.dataset.indent);
    $$('[data-indent]').forEach((b) => {
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
    updateJson();
  });
});

$('#json-minify').addEventListener('click', (event) => {
  jsonMinify = !jsonMinify;
  event.currentTarget.setAttribute('aria-pressed', String(jsonMinify));
  updateJson();
});

$('#json-sort').addEventListener('click', (event) => {
  jsonSort = !jsonSort;
  event.currentTarget.setAttribute('aria-pressed', String(jsonSort));
  updateJson();
});

$('#json-clear').addEventListener('click', () => {
  jsonIn.value = '';
  jsonOut.value = '';
  jsonPane.classList.remove('has-error');
  updateJson();
  jsonIn.focus();
});

$('#json-copy-in').addEventListener('click', () => {
  if (!jsonOut.value) return;
  jsonIn.value = jsonOut.value;
  updateJson();
  jsonIn.focus();
});

jsonIn.value = '{"project":"工具台","deploy":{"zone":"1475369.xyz","worker":"toolbox"},"tools":["url","time","json","unicode","base64"],"build":41.7,"ok":true}';
updateJson();

/* ---------- 04 Unicode ---------- */

const uniIn = $('#uni-in');
const uniOut = $('#uni-out');
const uniStatus = $('#uni-status');
const uniInMeta = $('#uni-in-meta');
let uniMode = 'nonascii';

function escapeUnicode(str, all) {
  let out = '';
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (!all && cp < 0x80) { out += ch; continue; }
    if (cp <= 0xFFFF) {
      out += `\\u${cp.toString(16).toUpperCase().padStart(4, '0')}`;
    } else {
      const v = cp - 0x10000;
      const high = 0xD800 + (v >> 10);
      const low = 0xDC00 + (v & 0x3FF);
      out += `\\u${high.toString(16).toUpperCase()}\\u${low.toString(16).toUpperCase()}`;
    }
  }
  return out;
}

function unescapeUnicode(str) {
  return str.replace(/\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})/g, (match, braced, four, hex) => {
    const cp = parseInt(braced || four || hex, 16);
    if (!Number.isFinite(cp) || cp > 0x10FFFF) return match;
    try { return String.fromCodePoint(cp); } catch { return match; }
  });
}

function toHtmlEntities(str) {
  let out = '';
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (ch === '&') out += '&amp;';
    else if (ch === '<') out += '&lt;';
    else if (ch === '>') out += '&gt;';
    else if (cp > 0x7E) out += `&#x${cp.toString(16).toUpperCase()};`;
    else out += ch;
  }
  return out;
}

const entityBox = document.createElement('textarea');
function fromHtmlEntities(str) {
  entityBox.innerHTML = str;
  return entityBox.value;
}

const UNI_MODES = {
  nonascii: (s) => escapeUnicode(s, false),
  all: (s) => escapeUnicode(s, true),
  unescape: unescapeUnicode,
  html: toHtmlEntities,
  'html-decode': fromHtmlEntities,
};

function syncUniModes() {
  $$('[data-uni-mode]').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.uniMode === uniMode ? 'true' : 'false');
  });
}

function updateUni() {
  const raw = uniIn.value;
  uniInMeta.textContent = `${charCount(raw)} 字符`;
  syncUniModes();

  if (!raw) {
    uniOut.value = '';
    setStatus(uniStatus, '输入文字或转义序列，即时互转。');
    return;
  }

  const out = UNI_MODES[uniMode](raw);
  uniOut.value = out;
  setStatus(uniStatus, `输入 ${charCount(raw)} 字符 → 输出 ${charCount(out)} 字符`, 'ok');
}

$$('[data-uni-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    uniMode = btn.dataset.uniMode;
    updateUni();
  });
});

uniIn.addEventListener('input', updateUni);

$('#uni-swap').addEventListener('click', () => {
  if (!uniOut.value) return;
  const reverse = {
    nonascii: 'unescape',
    all: 'unescape',
    unescape: 'nonascii',
    html: 'html-decode',
    'html-decode': 'html',
  };
  uniMode = reverse[uniMode];
  uniIn.value = uniOut.value;
  updateUni();
  uniIn.focus();
});

updateUni();

/* ---------- 05 Base64 ---------- */

const b64In = $('#b64-in');
const b64Out = $('#b64-out');
const b64Status = $('#b64-status');
const b64InMeta = $('#b64-in-meta');
const b64UrlSafe = $('#b64-urlsafe');
let b64Mode = 'encode';

function encodeBase64(str, urlSafe) {
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  let out = btoa(binary);
  if (urlSafe) out = out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return out;
}

function decodeBase64(str) {
  let cleaned = str.trim().replace(/\s+/g, '');
  if (!cleaned) return '';
  cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
  while (cleaned.length % 4 !== 0) cleaned += '=';
  const binary = atob(cleaned);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return decoder.decode(bytes);
}

function syncB64Modes() {
  $$('[data-b64-mode]').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.b64Mode === b64Mode ? 'true' : 'false');
  });
}

function updateB64() {
  const raw = b64In.value;
  b64InMeta.textContent = formatBytes(byteCount(raw));
  syncB64Modes();

  if (!raw) {
    b64Out.value = '';
    setStatus(b64Status, '输入文本或 Base64，按 UTF-8 处理。');
    return;
  }

  try {
    const out = b64Mode === 'encode'
      ? encodeBase64(raw, b64UrlSafe.checked)
      : decodeBase64(raw);
    b64Out.value = out;
    setStatus(b64Status, b64Mode === 'encode'
      ? `编码完成 · ${formatBytes(byteCount(raw))} → ${out.length} 字符`
      : `解码完成 · ${raw.length} 字符 → ${charCount(out)} 字符`, 'ok');
  } catch {
    b64Out.value = '';
    setStatus(b64Status, b64Mode === 'decode'
      ? '解码失败：不是合法的 Base64，或结果不是有效的 UTF-8 文本。'
      : '编码失败：输入无法按 UTF-8 处理。', 'error');
  }
}

$$('[data-b64-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    b64Mode = btn.dataset.b64Mode;
    updateB64();
  });
});

b64In.addEventListener('input', updateB64);
b64UrlSafe.addEventListener('change', updateB64);

$('#b64-swap').addEventListener('click', () => {
  if (!b64Out.value) return;
  b64Mode = b64Mode === 'encode' ? 'decode' : 'encode';
  b64In.value = b64Out.value;
  updateB64();
  b64In.focus();
});

updateB64();

/* ---------- init ---------- */

activate(location.hash.slice(1) || 'url', false);
