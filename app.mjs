import { generateRound } from './engine.mjs';

const translations = {
  ar: {
    brand: 'تدريب السوروبان', eyebrow: 'الحساب الذهني',
    intro: 'راقب الأعداد التي تظهر تباعًا، واحسب المجموع ذهنيًا، ثم اكشف الإجابة.',
    difficulty: 'مستوى الصعوبة', simple: 'بسيط', simpleDetail: 'حركات مباشرة للخرز',
    five: 'مركّب ٥', fiveDetail: 'مكمّلات الخمسة',
    ten: 'مركّب ١٠', tenDetail: 'الحمل والاستلاف',
    digits: 'خانات كل عدد', count: 'الأعداد في الجولة',
    visible: 'مدة ظهور العدد (مللي ثانية)', blank: 'الفاصل بين الأعداد (مللي ثانية)',
    subtraction: 'السماح بالطرح', start: 'ابدأ الجولة', back: 'الإعدادات',
    fullscreen: 'ملء الشاشة', exitFullscreen: 'إنهاء ملء الشاشة',
    reveal: 'اكشف الإجابة', pause: 'إيقاف مؤقت', resume: 'متابعة', again: 'جولة جديدة',
    keyboard: 'المسافة للإيقاف أو المتابعة · Esc للإعدادات',
    light: 'الوضع الفاتح', dark: 'الوضع الداكن', practice: 'جولة تدريب',
    language: 'اللغة', paused: 'توقفت الجولة مؤقتًا', ready: 'استعد',
    complete: 'ما المجموع؟', answer: 'الإجابة',
    failed: 'تعذّر توليد جولة بهذه الإعدادات. قلّل عدد الأعداد أو اسمح بالطرح.',
    counter: count => 'العمليات المكتملة: ' + count,
    progress: (index, count) => index + ' من ' + count,
  },
  en: {
    exitFullscreen: 'Exit fullscreen', light: 'Light mode', dark: 'Dark mode',
    practice: 'Practice round', language: 'Language', paused: 'Round paused',
    ready: 'Get ready', complete: 'What’s the total?', answer: 'Answer',
    failed: 'Couldn’t generate a round with these settings. Try fewer terms or enable subtraction.',
    counter: count => 'Operations completed: ' + count,
    progress: (index, count) => index + ' of ' + count,
  },
};

const byId = id => document.getElementById(id);
const form = byId('settings');
const fields = form.elements;
const setup = byId('setup');
const practice = byId('practice');
const error = byId('error');
const number = byId('number');
const status = byId('round-status');
const fullscreen = byId('fullscreen');
const reveal = byId('reveal');
const pauseButton = byId('pause');
const pausable = ['ready', 'number', 'blank'];
const resume = byId('resume');
const again = byId('again');
const back = byId('back');
const theme = byId('theme');
const language = byId('language');
const storageKey = 'flash-anzan-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? {};
  } catch {
    return {};
  }
}

const saved = load();
let locale = saved.locale === 'ar' ? 'ar' : 'en';
let dark = saved.dark === true;
let operations = Number.isSafeInteger(saved.operations) && saved.operations >= 0 ? saved.operations : 0;
let settings;
let round;
let index = 0;
let phase = 'setup';
let pausedPhase;
let remaining = 0;
let deadline = 0;
let timer;

function readSettings() {
  return {
    digits: fields.digits.valueAsNumber, count: fields.count.valueAsNumber,
    visible: fields.visible.valueAsNumber, blank: fields.blank.valueAsNumber,
    mode: fields.mode.value, subtraction: fields.subtraction.checked,
  };
}

for (const name of ['digits', 'count', 'visible', 'blank']) {
  const field = fields[name];
  const value = saved.settings?.[name];
  if (Number.isInteger(value) && value >= Number(field.min) && value <= Number(field.max)) {
    field.value = value;
  }
}
if (['simple', 'five', 'ten'].includes(saved.settings?.mode)) fields.mode.value = saved.settings.mode;
if (typeof saved.settings?.subtraction === 'boolean') fields.subtraction.checked = saved.settings.subtraction;
settings = readSettings();

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ locale, dark, settings, operations }));
  } catch {
    // Practice remains available when storage is blocked.
  }
}

const copyNodes = Array.from(document.querySelectorAll('[data-copy]'), node => [node, node.textContent]);
const t = key => translations[locale][key] ?? translations.en[key];
const format = value => new Intl.NumberFormat(locale, { useGrouping: false }).format(value);
const display = value => value < 0 ? '−' + format(-value) : format(value);

function render() {
  setup.hidden = phase !== 'setup';
  practice.hidden = phase === 'setup';
  byId('counter').textContent = t('counter')(format(operations));
  fullscreen.textContent = document.fullscreenElement === practice ? t('exitFullscreen') :
    translations[locale].fullscreen ?? 'Fullscreen';

  if (!round || phase === 'setup') return;

  const shown = phase === 'ready' || (phase === 'paused' && pausedPhase === 'ready') ? 0 : index + 1;
  byId('progress').textContent = t('progress')(format(shown), format(round.terms.length));
  const statusKey = { ready: 'ready', paused: 'paused', complete: 'complete', answer: 'answer' }[phase];
  status.textContent = statusKey ? t(statusKey) : '';
  number.textContent = phase === 'number' ? display(round.terms[index]) :
    phase === 'answer' ? display(round.total) : '';
  pauseButton.hidden = !pausable.includes(phase);
  reveal.hidden = phase !== 'complete';
  resume.hidden = phase !== 'paused';
  again.hidden = phase !== 'answer';
}

function applyPreferences() {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  language.value = locale;
  language.setAttribute('aria-label', t('language'));
  practice.setAttribute('aria-label', t('practice'));
  theme.textContent = t(dark ? 'light' : 'dark');
  theme.setAttribute('aria-pressed', String(dark));
  for (const [node, english] of copyNodes) {
    node.textContent = translations[locale][node.dataset.copy] ?? english;
  }
  if (!error.hidden) error.textContent = t('failed');
  render();
}

function schedule(duration) {
  deadline = performance.now() + duration;
  timer = setTimeout(advance, duration);
}

function advance() {
  const timeLeft = deadline - performance.now();
  if (timeLeft > 0) {
    timer = setTimeout(advance, timeLeft);
    return;
  }
  if (phase === 'ready' || phase === 'blank') {
    phase = 'number';
    render();
    schedule(settings.visible);
    return;
  }
  if (index === round.terms.length - 1) {
    phase = 'complete';
    operations += round.terms.length - 1;
    save();
    render();
    reveal.focus();
    return;
  }
  index++;
  if (settings.blank === 0) {
    render();
    schedule(settings.visible);
  } else {
    phase = 'blank';
    render();
    schedule(settings.blank);
  }
}

function start() {
  const next = generateRound(settings);
  if (!next) {
    showSetup();
    error.textContent = t('failed');
    error.hidden = false;
    return;
  }
  clearTimeout(timer);
  round = next;
  index = 0;
  phase = 'ready';
  error.hidden = true;
  render();
  back.focus();
  schedule(800);
}

function showSetup() {
  clearTimeout(timer);
  if (document.fullscreenElement === practice) void document.exitFullscreen().catch(() => {});
  phase = 'setup';
  render();
  form.querySelector('[type="submit"]').focus();
}

function pause() {
  if (!pausable.includes(phase)) return;
  clearTimeout(timer);
  remaining = Math.max(0, deadline - performance.now());
  pausedPhase = phase;
  phase = 'paused';
  render();
  if (!document.hidden) resume.focus();
}

function continueRound() {
  phase = pausedPhase;
  render();
  back.focus();
  schedule(remaining);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  settings = readSettings();
  save();
  start();
});
form.addEventListener('change', () => {
  error.hidden = true;
  if (form.checkValidity()) {
    settings = readSettings();
    save();
  }
});
back.addEventListener('click', showSetup);
pauseButton.addEventListener('click', pause);
resume.addEventListener('click', continueRound);
again.addEventListener('click', start);
reveal.addEventListener('click', () => {
  phase = 'answer';
  render();
  again.focus();
});
fullscreen.hidden = !document.fullscreenEnabled;
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await practice.requestFullscreen();
  } catch {
    fullscreen.hidden = true;
  }
});
document.addEventListener('fullscreenchange', render);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
document.addEventListener('keydown', event => {
  if (phase === 'setup' || event.repeat) return;
  if (event.key === 'Escape' && !document.fullscreenElement) showSetup();
  if (event.code !== 'Space' || (phase !== 'paused' && !pausable.includes(phase))) return;
  if (event.target.closest('button') && ![back, pauseButton, resume].includes(event.target)) return;
  event.preventDefault();
  if (phase === 'paused') continueRound();
  else pause();
});
theme.addEventListener('click', () => {
  dark = !dark;
  save();
  applyPreferences();
});
language.addEventListener('change', () => {
  locale = language.value;
  save();
  applyPreferences();
});

applyPreferences();
