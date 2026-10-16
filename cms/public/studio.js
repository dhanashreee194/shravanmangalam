// Voice Studio: record every line, title, meaning and app message in the owner's voice.
const $ = (s) => document.querySelector(s);
const adminKey = sessionStorage.getItem('adminKey') || '';
if (!adminKey) location.href = './';

let lang = 'hi';
let slots = [];
let voice = {};
let currentKey = null;
let pending = null; // { blob, url } — a recording waiting to be saved
let rec = null; // active recorder

// ---------- helpers ----------
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'x-admin-key': adminKey, ...(opts.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) location.href = './';
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}
function toast(msg, isErr = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (isErr ? ' err' : '');
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), 2800);
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- recorder with a live level meter ----------
async function startRecorder(onDone) {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch {
    toast('Microphone not available — please allow microphone access', true);
    return null;
  }
  const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) => window.MediaRecorder?.isTypeSupported(t)) || '';
  const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  // Level meter so the owner can see the mic is hearing them.
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  const canvas = $('#meter');
  const g = canvas.getContext('2d');
  let raf;
  const draw = () => {
    analyser.getByteTimeDomainData(data);
    g.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 48;
    const w = canvas.width / bars;
    for (let i = 0; i < bars; i++) {
      const v = Math.abs(data[Math.floor((i / bars) * data.length)] - 128) / 128;
      const h = Math.max(3, v * canvas.height * 2.2);
      const grad = g.createLinearGradient(0, canvas.height, 0, 0);
      grad.addColorStop(0, '#2dd4bf');
      grad.addColorStop(1, '#facc15');
      g.fillStyle = grad;
      g.fillRect(i * w + 2, (canvas.height - h) / 2, w - 4, h);
    }
    raf = requestAnimationFrame(draw);
  };
  draw();

  const started = Date.now();
  mr.onstop = () => {
    cancelAnimationFrame(raf);
    g.clearRect(0, 0, canvas.width, canvas.height);
    ctx.close();
    stream.getTracks().forEach((t) => t.stop());
    const type = (mr.mimeType || mime || 'audio/webm').split(';')[0];
    if (chunks.length) onDone(new Blob(chunks, { type }), (Date.now() - started) / 1000);
  };
  mr.start();
  return { stop: () => mr.state !== 'inactive' && mr.stop(), started };
}
const extFor = (type) => (type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm');

// ---------- data ----------
async function load(keepKey = currentKey) {
  const data = await api(`/api/admin/studio?lang=${lang}`);
  slots = data.slots;
  voice = data.voice;
  $('#passage').innerHTML = data.samplePassage.map((p) => `<p>${esc(p)}</p>`).join('');
  currentKey = keepKey && slots.some((s) => s.key === keepKey) ? keepKey : (slots.find((s) => !s.url) || slots[0])?.key;
  renderProgress();
  renderJump();
  renderSlot();
  renderVoice();
  renderIndian();
}

const visible = () => ($('#onlyMissing').checked ? slots.filter((s) => !s.url || s.key === currentKey) : slots);
const currentIndex = () => visible().findIndex((s) => s.key === currentKey);
const current = () => slots.find((s) => s.key === currentKey);

function renderProgress() {
  const you = slots.filter((s) => s.url && !s.ai).length;
  const clone = slots.filter((s) => s.url && s.ai).length;
  const total = slots.length || 1;
  $('#progressText').textContent = `${you} recorded by you · ${clone} by AI voice · ${slots.length - you - clone} still to do (of ${slots.length})`;
  $('#barYou').style.width = `${(you / total) * 100}%`;
  $('#barClone').style.width = `${(clone / total) * 100}%`;
}

function renderJump() {
  const seen = new Map();
  for (const s of slots) if (!seen.has(s.group)) seen.set(s.group, s.key);
  $('#jump').innerHTML = [...seen].map(([group, key]) => {
    const inGroup = slots.filter((s) => s.group === group);
    const done = inGroup.filter((s) => s.url).length;
    return `<option value="${esc(key)}">${done === inGroup.length ? '✓ ' : ''}${esc(group)} (${done}/${inGroup.length})</option>`;
  }).join('');
  const cur = current();
  if (cur) $('#jump').value = seen.get(cur.group);
}

function renderSlot(animate = false) {
  const s = current();
  const list = visible();
  const i = currentIndex();
  if (!s) {
    $('#slotText').textContent = 'Everything is recorded. राधे राधे 🙏';
    return;
  }
  $('#where').textContent = `${i + 1} / ${list.length} · ${s.group}`;
  $('#slotLabel').textContent = s.label;
  $('#slotText').textContent = s.text;
  $('#slotTranslit').textContent = s.transliteration || '';
  $('#slotHint').textContent =
    s.mode === 'chant'
      ? lang === 'hi' ? 'धीरे और स्पष्ट जप करें — जैसे आप सिखा रहे हों।' : 'Chant slowly and clearly — the way you would teach it.'
      : lang === 'hi' ? 'स्वाभाविक, प्रेम भरी आवाज़ में बोलें।' : 'Speak naturally and warmly.';
  const chip = $('#slotStatus');
  chip.className = 'status-chip ' + (s.url ? (s.ai ? 'clone' : 'you') : 'none');
  chip.textContent = s.url ? (s.ai ? '✨ AI voice' : '🎤 your recording') : '○ not recorded yet';
  const audio = $('#current');
  audio.hidden = !s.url;
  if (s.url) audio.src = s.url;
  $('#deleteBtn').hidden = !s.url;
  $('#prevBtn').disabled = i <= 0;
  $('#nextBtn').disabled = i >= list.length - 1;
  clearPending();
  if (animate) {
    const p = $('#prompter');
    p.classList.remove('swap');
    void p.offsetWidth;
    p.classList.add('swap');
  }
}

function move(delta) {
  if (rec) return;
  const list = visible();
  const i = currentIndex();
  const next = list[Math.min(list.length - 1, Math.max(0, i + delta))];
  if (next && next.key !== currentKey) {
    currentKey = next.key;
    renderJump();
    renderSlot(true);
  }
}

// ---------- record → preview → save ----------
function clearPending() {
  if (pending) URL.revokeObjectURL(pending.url);
  pending = null;
  $('#after').hidden = true;
}

async function toggleRecord() {
  if (rec) {
    rec.stop();
    return;
  }
  clearPending();
  $('#current').pause();
  rec = await startRecorder((blob) => {
    rec = null;
    setRecUi(false);
    pending = { blob, url: URL.createObjectURL(blob) };
    const pv = $('#preview');
    pv.src = pending.url;
    $('#after').hidden = false;
    pv.play().catch(() => {});
  });
  if (rec) setRecUi(true);
}
function setRecUi(on) {
  $('#recBtn').classList.toggle('on', on);
  $('#recLabel').textContent = on ? 'Stop' : 'Record';
  $('#prompter').classList.toggle('recording', on);
}

async function save() {
  if (!pending) return;
  const s = current();
  const fd = new FormData();
  fd.append('key', s.key); // key must come before the file
  fd.append('audio', new File([pending.blob], `studio.${extFor(pending.blob.type)}`, { type: pending.blob.type }));
  $('#saveBtn').disabled = true;
  try {
    const saved = await api('/api/admin/studio/record', { method: 'POST', body: fd });
    Object.assign(s, { url: saved.url, ai: saved.ai });
    toast('Saved in your voice ✓');
    renderProgress();
    renderJump();
    if ($('#autoNext').checked && currentIndex() < visible().length - 1) move(1);
    else renderSlot();
  } catch (err) {
    toast(err.message, true);
  } finally {
    $('#saveBtn').disabled = false;
  }
}

async function removeRecording() {
  const s = current();
  if (!s?.url || !confirm('Delete this recording?')) return;
  try {
    const r = await api(`/api/admin/studio/record?key=${encodeURIComponent(s.key)}`, { method: 'DELETE' });
    Object.assign(s, { url: r.url, ai: r.ai });
    renderProgress();
    renderJump();
    renderSlot();
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- voice clone ----------
let sampleRec = null;
function renderVoice() {
  $('#samples').innerHTML = voice.samples
    .map((u, i) => `<li><span>Sample ${i + 1}</span><audio controls preload="none" src="${esc(u)}"></audio><button class="btn ghost danger" data-del="${esc(u)}">Remove</button></li>`)
    .join('');
  const n = $('#cloneNotice');
  if (!voice.cloneService) {
    n.innerHTML = '🔑 To create a voice clone, add your ElevenLabs API key on the server: <code>ELEVENLABS_API_KEY=…</code>, then restart the CMS. You can still record everything yourself above — that needs no key.';
  } else if (voice.voiceId) {
    n.innerHTML = `✅ Your voice clone is ready (created ${new Date(voice.clonedAt).toLocaleString()}). Press “Fill everything missing” to have it speak the parts you haven't recorded.`;
  } else {
    n.innerHTML = 'Record 1–2 minutes in total (you can record the passage in parts), tick the consent box, then create your clone.';
  }
  $('#cloneBtn').disabled = !(voice.cloneService && voice.samples.length && $('#consent').checked);
  $('#cloneBtn').textContent = voice.voiceId ? 'Re-create my voice clone' : 'Create my voice clone';
  $('#fillBtn').disabled = !(voice.cloneService && voice.voiceId);
}

$('#samples').addEventListener('click', async (e) => {
  const url = e.target.dataset?.del;
  if (!url || !confirm('Remove this sample?')) return;
  voice = await api(`/api/admin/voice/sample?url=${encodeURIComponent(url)}`, { method: 'DELETE' });
  renderVoice();
});

$('#sampleBtn').addEventListener('click', async () => {
  if (sampleRec) {
    sampleRec.stop();
    return;
  }
  const timer = setInterval(() => {
    if (!sampleRec) return;
    const sec = Math.round((Date.now() - sampleRec.started) / 1000);
    $('#sampleTimer').textContent = `Recording… ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }, 250);
  sampleRec = await startRecorder(async (blob, seconds) => {
    clearInterval(timer);
    sampleRec = null;
    $('#sampleBtn').textContent = '🎤 Record another sample';
    $('#sampleTimer').textContent = seconds < 20 ? 'Tip: longer samples (30 s+) make a better clone.' : '';
    const fd = new FormData();
    fd.append('audio', new File([blob], `sample.${extFor(blob.type)}`, { type: blob.type }));
    try {
      voice = await api('/api/admin/voice/sample', { method: 'POST', body: fd });
      renderVoice();
      toast('Sample saved ✓');
    } catch (err) {
      toast(err.message, true);
    }
  });
  if (!sampleRec) return clearInterval(timer);
  $('#sampleBtn').textContent = '⏹ Stop sample';
});

$('#consent').addEventListener('change', renderVoice);

$('#cloneBtn').addEventListener('click', async () => {
  const btn = $('#cloneBtn');
  btn.disabled = true;
  btn.textContent = 'Creating your voice…';
  try {
    voice = await api('/api/admin/voice/clone', { method: 'POST' });
    toast('Your voice clone is ready ✓');
  } catch (err) {
    toast(err.message, true);
  }
  renderVoice();
});

$('#fillBtn').addEventListener('click', async () => {
  if (!confirm('Fill every part you have not recorded with your voice clone? Your own recordings stay as they are.')) return;
  const btn = $('#fillBtn');
  btn.disabled = true;
  let made = 0;
  try {
    for (;;) {
      const r = await api('/api/admin/voice/fill', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang, max: 6, engine: 'clone' }),
      });
      made += r.made;
      $('#fillStatus').textContent = `✨ ${made} done · ${r.remaining} left — keep this page open`;
      if (!r.remaining || !r.made) break;
    }
    $('#fillStatus').textContent = `✨ Done — ${made} parts now speak in your voice.`;
    await load();
  } catch (err) {
    $('#fillStatus').textContent = '';
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// ---------- Indian AI voice ----------
function renderIndian() {
  const fill = (sel, list, chosen) => {
    sel.innerHTML = list.map((v) => `<option value="${esc(v.id)}"${v.id === chosen ? ' selected' : ''}>${esc(v.name)}</option>`).join('');
  };
  fill($('#indianHi'), voice.indianVoices?.hi || [], voice.indianVoice?.hi);
  fill($('#indianEn'), voice.indianVoices?.en || [], voice.indianVoice?.en);
  const on = Boolean(voice.indianService);
  $('#indianNotice').innerHTML = on
    ? '✅ Indian voice service connected. Listen to a few voices, save your choice, then fill.'
    : '🔑 To use the Indian voice, add your Sarvam AI key on the server: <code>SARVAM_API_KEY=…</code>, then restart the CMS. (Sign up at sarvam.ai — it gives free credits to start.)';
  for (const id of ['#previewHi', '#previewEn', '#saveIndianBtn', '#fillIndianBtn']) $(id).disabled = !on;
}

async function preview(langCode, sel, btn) {
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = '… loading';
  try {
    const res = await fetch('/api/admin/voice/preview', {
      method: 'POST',
      headers: { 'x-admin-key': adminKey, 'content-type': 'application/json' },
      body: JSON.stringify({ lang: langCode, speaker: $(sel).value }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Preview failed (${res.status})`);
    const a = $('#previewAudio');
    a.src = URL.createObjectURL(await res.blob());
    await a.play();
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}
$('#previewHi').addEventListener('click', () => preview('hi', '#indianHi', $('#previewHi')));
$('#previewEn').addEventListener('click', () => preview('en', '#indianEn', $('#previewEn')));

async function saveIndian() {
  voice = await api('/api/admin/voice/indian', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hi: $('#indianHi').value, en: $('#indianEn').value }),
  });
  renderIndian();
}
$('#saveIndianBtn').addEventListener('click', async () => {
  try {
    await saveIndian();
    toast('Voice choice saved ✓');
  } catch (err) {
    toast(err.message, true);
  }
});

$('#fillIndianBtn').addEventListener('click', async () => {
  if (!confirm('Fill every part you have not recorded with the chosen Indian voice? Your own recordings stay as they are.')) return;
  const btn = $('#fillIndianBtn');
  btn.disabled = true;
  let made = 0;
  try {
    await saveIndian();
    for (;;) {
      const r = await api('/api/admin/voice/fill', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang, max: 6, engine: 'indian' }),
      });
      made += r.made;
      $('#indianStatus').textContent = `🇮🇳 ${made} done · ${r.remaining} left — keep this page open`;
      if (!r.remaining || !r.made) break;
    }
    $('#indianStatus').textContent = `🇮🇳 Done — ${made} parts now speak in the Indian voice (${lang === 'hi' ? 'हिंदी' : 'English'}). Switch language at the top to fill the other one.`;
    await load();
  } catch (err) {
    $('#indianStatus').textContent = '';
    toast(err.message, true);
  } finally {
    btn.disabled = false;
  }
});

// ---------- wiring ----------
$('#recBtn').addEventListener('click', toggleRecord);
$('#saveBtn').addEventListener('click', save);
$('#redoBtn').addEventListener('click', toggleRecord);
$('#discardBtn').addEventListener('click', clearPending);
$('#deleteBtn').addEventListener('click', removeRecording);
$('#prevBtn').addEventListener('click', () => move(-1));
$('#nextBtn').addEventListener('click', () => move(1));
$('#jump').addEventListener('change', (e) => {
  currentKey = e.target.value;
  renderSlot(true);
});
$('#onlyMissing').addEventListener('change', () => {
  renderSlot();
});
document.querySelectorAll('.lang button').forEach((b) =>
  b.addEventListener('click', async () => {
    if (rec) return;
    lang = b.dataset.lang;
    document.querySelectorAll('.lang button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    await load(null);
  }),
);
document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, select, textarea') || e.metaKey || e.ctrlKey) return;
  if (e.code === 'Space') {
    e.preventDefault();
    toggleRecord();
  } else if (e.key === 'Enter' && pending) {
    e.preventDefault();
    save();
  } else if (e.key.toLowerCase() === 'r' && pending) toggleRecord();
  else if (e.key === 'ArrowRight') move(1);
  else if (e.key === 'ArrowLeft') move(-1);
});

load().catch((err) => toast(err.message, true));
