// Shloka CMS admin panel (vanilla JS, no build step).
const LANGS = ['en', 'hi'];
const TYPE_ICONS = { shloka: '📜', mantra: '🕉️', stotra: '🙏', gita: '📖', bhajan: '🎵', aarti: '🪔' };
const $ = (s) => document.querySelector(s);

let adminKey = sessionStorage.getItem('adminKey') || '';
let meta = { types: [], levels: [] };
let allItems = [];
let caps = { aiVoice: false, ffmpeg: false };
let recorder = null; // the MediaRecorder currently recording, if any
let editing = null; // { id?, lines: [...], files: {key: File}, removed: Set, urls: {key: url} }

// ---------- helpers ----------
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'x-admin-key': adminKey, ...(opts.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `Request failed (${res.status})`), { status: res.status });
  return body;
}
function toast(msg, isErr = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 3000);
}
function show(view) {
  for (const v of ['loginView', 'listView', 'editView']) $('#' + v).hidden = v !== view;
  $('#topbarActions').hidden = view === 'loginView';
  window.scrollTo(0, 0);
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const titleOf = (i) => i.title.en || i.title.hi || 'Untitled';

// ---------- login ----------
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  adminKey = $('#password').value;
  try {
    await api('/api/admin/login');
    sessionStorage.setItem('adminKey', adminKey);
    $('#loginError').hidden = true;
    await openList();
  } catch (err) {
    $('#loginError').textContent = err.message;
    $('#loginError').hidden = false;
  }
});
$('#logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('adminKey');
  adminKey = '';
  $('#password').value = '';
  show('loginView');
});

// ---------- list ----------
async function openList() {
  allItems = await api('/api/admin/items');
  caps = await api('/api/admin/capabilities').catch(() => caps);
  const notice = $('#voiceNotice');
  notice.hidden = false;
  notice.innerHTML = '🎙️ <strong>The whole app speaks in your voice.</strong> Open the <a href="studio.html">Voice Studio</a> to record every line, meaning and message — or let your voice clone fill the gaps.';
  renderList();
  show('listView');
}
function renderList() {
  const q = $('#search').value.trim().toLowerCase();
  const type = $('#typeFilter').value;
  const status = $('#statusFilter').value;
  const items = allItems.filter(
    (i) =>
      (!type || i.type === type) &&
      (!status || (status === 'published' ? i.published : !i.published)) &&
      (!q || JSON.stringify([i.title, i.deity, i.tags]).toLowerCase().includes(q)),
  );
  $('#countLabel').textContent = `${allItems.length} items · ${allItems.filter((i) => i.published).length} published`;
  const list = $('#itemList');
  if (!items.length) {
    list.innerHTML = `<div class="empty">Nothing here yet. Click “+ Add new” to upload your first shloka.</div>`;
    return;
  }
  list.innerHTML = items
    .map((i) => {
      const human = i.fullAudioUrl || i.lines.some((l) => l.audioUrl && !l.audioAi);
      const ai = i.lines.some((l) => l.audioAi);
      const thumb = i.imageUrl ? `<img src="${esc(i.imageUrl)}" alt="">` : TYPE_ICONS[i.type] || '📜';
      return `<button class="item-row" data-id="${esc(i.id)}">
        <div class="thumb">${thumb}</div>
        <div>
          <div class="item-title">${esc(titleOf(i))}${i.title.hi && i.title.en ? ` · <span class="deva">${esc(i.title.hi)}</span>` : ''}</div>
          <div class="item-sub">${esc(i.type)} · ${esc(i.level)}${i.deity ? ' · ' + esc(i.deity) : ''} · ${i.lines.length} lines${i.source ? ' · ' + esc(i.source) : ''}</div>
        </div>
        <div class="badges">
          ${human ? '<span class="badge audio">🎤 recorded</span>' : ai ? '<span class="badge ai">✨ voice clone</span>' : '<span class="badge">not recorded</span>'}
          ${i.published ? '' : '<span class="badge draft">draft</span>'}
        </div>
      </button>`;
    })
    .join('');
}
$('#itemList').addEventListener('click', (e) => {
  const row = e.target.closest('.item-row');
  if (row) openEditor(allItems.find((i) => i.id === row.dataset.id));
});
['#search', '#typeFilter', '#statusFilter'].forEach((s) => $(s).addEventListener('input', renderList));
$('#newBtn').addEventListener('click', () => openEditor(null));

// ---------- editor ----------
function openEditor(item) {
  const form = $('#editForm');
  form.reset();
  editing = {
    id: item?.id,
    lines: item ? structuredClone(item.lines) : [{ text: '', transliteration: '', meaning: {} }],
    files: {},
    removed: new Set(),
    urls: {
      fullAudio: item?.fullAudioUrl,
      image: item?.imageUrl,
      ...Object.fromEntries(LANGS.map((l) => [`meaningAudio_${l}`, item?.meaningAudio?.[l]])),
    },
    ai: Object.fromEntries(LANGS.map((l) => [`meaningAudio_${l}`, Boolean(item?.meaningAudioAi?.[l])])),
  };
  $('#editTitle').textContent = item ? `Edit: ${titleOf(item)}` : 'New item';
  $('#deleteBtn').hidden = !item;
  if (item) {
    for (const l of LANGS) {
      form[`title_${l}`].value = item.title[l] || '';
      form[`summary_${l}`].value = item.summary?.[l] || '';
      form[`whenToChant_${l}`].value = item.whenToChant?.[l] || '';
    }
    form.type.value = item.type;
    form.level.value = item.level;
    form.deity.value = item.deity || '';
    form.source.value = item.source || '';
    form.tags.value = (item.tags || []).join(', ');
    form.order.value = item.order ?? 100;
    form.published.checked = item.published;
  }
  $('#pasteBox').hidden = true;
  renderLines();
  document.querySelectorAll('#editForm > section .file-field[data-key]').forEach(renderFileField);
  show('editView');
}

function audioOrImage(url, isImage) {
  return isImage ? `<img src="${esc(url)}" alt="">` : `<audio controls preload="none" src="${esc(url)}"></audio>`;
}

function renderFileField(field) {
  const key = field.dataset.key;
  const url = editing.removed.has(key) ? null : editing.urls[key];
  const pending = editing.files[key];
  const cur = field.querySelector('.current');
  const isImage = key === 'image';
  if (pending) {
    cur.innerHTML = `${audioOrImage(URL.createObjectURL(pending), isImage)} <span class="muted">new: ${esc(pending.name)}</span> <button type="button" class="btn ghost small" data-clear>Undo</button>`;
  } else if (url) {
    cur.innerHTML = `${audioOrImage(url, isImage)} ${editing.ai[key] ? '<span class="badge ai">✨ voice clone</span>' : ''} <button type="button" class="btn ghost small danger-text" data-remove>Remove</button>`;
  } else cur.innerHTML = '<span class="muted">None</span>';
  const input = field.querySelector('input[type=file]');
  input.value = '';
  input.onchange = () => {
    if (input.files[0]) {
      editing.files[key] = input.files[0];
      editing.removed.delete(key);
    }
    renderFileField(field);
  };
  cur.querySelector('[data-clear]')?.addEventListener('click', () => {
    delete editing.files[key];
    renderFileField(field);
  });
  cur.querySelector('[data-remove]')?.addEventListener('click', () => {
    editing.removed.add(key);
    renderFileField(field);
  });
}

function renderLines() {
  const wrap = $('#lines');
  wrap.innerHTML = '';
  editing.lines.forEach((line, idx) => {
    const node = $('#lineTpl').content.firstElementChild.cloneNode(true);
    node.querySelector('.line-no').textContent = `Line ${idx + 1}`;
    const get = (f) => (f.startsWith('meaning_') ? line.meaning?.[f.slice(8)] : line[f]) || '';
    node.querySelectorAll('[data-f]').forEach((el) => {
      const f = el.dataset.f;
      el.value = get(f);
      el.addEventListener('input', () => {
        if (f.startsWith('meaning_')) (line.meaning ||= {})[f.slice(8)] = el.value;
        else line[f] = el.value;
      });
    });
    node.querySelector('[data-act=up]').disabled = idx === 0;
    node.querySelector('[data-act=down]').disabled = idx === editing.lines.length - 1;
    node.addEventListener('click', (e) => {
      const act = e.target.dataset?.act;
      if (!act) return;
      if (act === 'remove') editing.lines.splice(idx, 1);
      if (act === 'up') [editing.lines[idx - 1], editing.lines[idx]] = [editing.lines[idx], editing.lines[idx - 1]];
      if (act === 'down') [editing.lines[idx + 1], editing.lines[idx]] = [editing.lines[idx], editing.lines[idx + 1]];
      if (!editing.lines.length) editing.lines.push({ text: '', transliteration: '', meaning: {} });
      renderLines();
    });
    // Per-line audio lives on the line object itself so it follows reordering.
    const field = node.querySelector('.line-audio');
    const cur = field.querySelector('.current');
    const input = field.querySelector('input');
    const draw = () => {
      if (line._file) {
        cur.innerHTML = `<audio controls src="${URL.createObjectURL(line._file)}"></audio> <span class="muted">new: ${esc(line._file.name)}</span> <button type="button" class="btn ghost small" data-clear>Undo</button>`;
      } else if (line.audioUrl) {
        cur.innerHTML = `<audio controls preload="none" src="${esc(line.audioUrl)}"></audio> ${line.audioAi ? '<span class="badge ai">✨ your voice clone</span>' : '<span class="badge audio">🎤 recorded</span>'} <button type="button" class="btn ghost small danger-text" data-rm>Remove</button>`;
      } else cur.innerHTML = `<span class="muted">None — the app will use ${caps.aiVoice ? 'your voice clone, or ' : ''}the phone voice until you record it</span>`;
      cur.querySelector('[data-clear]')?.addEventListener('click', () => { delete line._file; draw(); });
      cur.querySelector('[data-rm]')?.addEventListener('click', () => { delete line.audioUrl; delete line.audioAi; draw(); });
    };
    const recBtn = field.querySelector('[data-rec]');
    recBtn.addEventListener('click', () => toggleRecording(line, recBtn, draw));
    input.onchange = () => { if (input.files[0]) line._file = input.files[0]; input.value = ''; draw(); };
    draw();
    wrap.appendChild(node);
  });
}

$('#addLineBtn').addEventListener('click', () => {
  editing.lines.push({ text: '', transliteration: '', meaning: {} });
  renderLines();
});
$('#pasteBtn').addEventListener('click', () => { $('#pasteBox').hidden = false; $('#pasteText').focus(); });
$('#pasteCancel').addEventListener('click', () => ($('#pasteBox').hidden = true));
$('#pasteApply').addEventListener('click', () => {
  const rows = $('#pasteText').value.split('\n').map((s) => s.trim()).filter(Boolean);
  if (!rows.length) return;
  editing.lines = rows.map((text) => ({ text, transliteration: '', meaning: {} }));
  $('#pasteBox').hidden = true;
  $('#pasteText').value = '';
  renderLines();
});
$('#backBtn').addEventListener('click', openList);

/** Saves the form; returns the saved item, or null if saving failed. */
async function save() {
  if (recorder) recorder.stop();
  const form = $('#editForm');
  const pick = (prefix) => Object.fromEntries(LANGS.map((l) => [l, form[`${prefix}_${l}`].value]));
  const keep = (key) => (editing.removed.has(key) ? undefined : editing.urls[key]);
  const data = {
    title: pick('title'),
    summary: pick('summary'),
    whenToChant: pick('whenToChant'),
    type: form.type.value,
    level: form.level.value,
    deity: form.deity.value,
    source: form.source.value,
    tags: form.tags.value.split(',').map((t) => t.trim()).filter(Boolean),
    order: Number(form.order.value || 100),
    published: form.published.checked,
    fullAudioUrl: keep('fullAudio'),
    imageUrl: keep('image'),
    meaningAudio: Object.fromEntries(LANGS.map((l) => [l, keep(`meaningAudio_${l}`)]).filter(([, v]) => v)),
    meaningAudioAi: Object.fromEntries(LANGS.map((l) => [l, editing.ai[`meaningAudio_${l}`] && !editing.files[`meaningAudio_${l}`]])),
  };
  // Drop empty lines but keep file indexes aligned with what the server receives.
  const kept = editing.lines.map((l, i) => ({ l, i })).filter(({ l }) => (l.text || '').trim());
  data.lines = kept.map(({ l }) => { const { _file, ...rest } = l; return rest; });

  const fd = new FormData();
  fd.append('data', JSON.stringify(data));
  for (const [key, file] of Object.entries(editing.files)) fd.append(key, file);
  kept.forEach(({ l }, newIdx) => l._file && fd.append(`lineAudio_${newIdx}`, l._file));

  const btn = $('#saveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const saved = await api(editing.id ? `/api/admin/items/${editing.id}` : '/api/admin/items', {
      method: editing.id ? 'PUT' : 'POST',
      body: fd,
    });
    toast('Saved ✓');
    allItems = await api('/api/admin/items');
    openEditor(saved);
    return saved;
  } catch (err) {
    if (err.status === 401) show('loginView');
    else toast(err.message, true);
    return null;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}
$('#saveBtn').addEventListener('click', save);

// ---------- recording (the most human voice is a real one) ----------
async function toggleRecording(line, btn, draw) {
  if (recorder) {
    recorder.stop();
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    toast('Microphone not available — allow microphone access in the browser', true);
    return;
  }
  const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) => window.MediaRecorder?.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  const started = Date.now();
  const timer = setInterval(() => {
    const sec = Math.round((Date.now() - started) / 1000);
    btn.textContent = `⏹ Stop (${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')})`;
  }, 250);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop());
    recorder = null;
    btn.classList.remove('recording');
    btn.textContent = '🎤 Record again';
    const type = (rec.mimeType || mime || 'audio/webm').split(';')[0];
    const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
    if (!chunks.length) return;
    line._file = new File(chunks, `recording-${Date.now()}.${ext}`, { type });
    draw();
    if (ext !== 'm4a' && !caps.ffmpeg) toast('Recorded. Note: install ffmpeg on the server so iPhones can play browser recordings.');
    else toast('Recorded — press Save to upload');
  };
  rec.start();
  recorder = rec;
  btn.classList.add('recording');
  btn.textContent = '⏹ Stop (0:00)';
}

// ---------- boot ----------
(async function init() {
  meta = await fetch('/api/meta').then((r) => r.json());
  const opts = (arr) => arr.map((v) => `<option value="${v}">${v[0].toUpperCase() + v.slice(1)}</option>`).join('');
  $('#typeSelect').innerHTML = opts(meta.types);
  $('#levelSelect').innerHTML = opts(meta.levels);
  $('#levelSelect').value = 'easy';
  $('#typeFilter').innerHTML += opts(meta.types);
  if (adminKey) {
    try {
      await openList();
      return;
    } catch {
      sessionStorage.removeItem('adminKey');
    }
  }
  show('loginView');
})();
