// תרגול: ההגדרות (סוג תרגיל, אפשרויות, היפוכים) ושיתוף תרגיל בקישור.

function clearWrongButtons() {
  document.querySelectorAll('.opt-btn.wrong').forEach(btn => {
    btn.classList.remove('wrong');
  });
}

function closeSettings() {
  const settings = document.getElementById('settingsCollapse');
  settingsDirty = false;
  if (settings) settings.removeAttribute('open');
}

// שינוי בהגדרות נכנס לתוקף כשסוגרים אותן, בלי כפתור "תרגיל חדש"
let settingsDirty = false;
(function watchSettings() {
  const settings = document.getElementById('settingsCollapse');
  settings.addEventListener('change', e => { if (e.target.id !== 'instrumentSelect') settingsDirty = true; });
  settings.addEventListener('click', e => { if (e.target.closest('.tag-pill, .tag-selector-header button')) settingsDirty = true; });
  settings.addEventListener('toggle', () => {
    if (settings.open || !settingsDirty) return;
    settingsDirty = false;
    if (!isTrainMode()) goToNextExercise();
  });
})();

// הגדרות עם מעט אפשרויות: כפתורים במקום תפריט נפתח. ה-select נשאר מוסתר ומקור האמת
function buildSegmentedSettings() {
  document.querySelectorAll('#settingsCollapse .controls-grid select').forEach(sel => {
    if (sel.id === 'displayMode') return;
    const seg = document.createElement('div');
    seg.className = 'seg';
    Array.from(sel.options).forEach(opt => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = opt.textContent;
      b.dataset.value = opt.value;
      b.onclick = () => {
        if (sel.value === opt.value) return;
        sel.value = opt.value;
        seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      };
      b.classList.toggle('active', opt.value === sel.value);
      seg.appendChild(b);
    });
    sel.style.display = 'none';
    sel.after(seg);
  });
}
buildSegmentedSettings();

function setExType(type) {
  if (window.Rewards && document.body.classList.contains('in-rewards')) Rewards.close();
  document.getElementById('sharedNote').hidden = true;
  document.getElementById('exType').value = type;
  onExerciseTypeChange();
  closeSettings();
  goToNextExercise();
}

function changeTheme(themeClass) {
  document.body.className = themeClass;
}

function getStructureLabel(item, type) {
  if (!item) return '';
  const t = type || (currentExercise ? currentExercise.type : document.getElementById('exType').value);
  const isInterval = t === 'intervals';
  const format = document.getElementById('intervalFormatSelect').value;
  if (isInterval && format === 'abbr' && item.abbr) {
    return item.abbr;
  }
  return item.name;
}

function onExerciseTypeChange() {
  const type = document.getElementById('exType').value;
  const invGroup = document.getElementById('inversionsGroup');
  const playGroup = document.getElementById('playModeGroup');
  const accGroup = document.getElementById('accidentalGroup');
  const optGroup = document.getElementById('optionsGroup');
  const intervalFmtGroup = document.getElementById('intervalFormatGroup');

  document.querySelectorAll('.prog-setting').forEach(g => { g.style.display = type === 'progressions' ? 'flex' : 'none'; });
  if (type === 'progressions') {
    invGroup.style.display = 'none';
    playGroup.style.display = 'none';
    optGroup.style.display = 'none';
    accGroup.style.display = 'none';
    intervalFmtGroup.style.display = 'none';
  } else if (type === 'note_id') {
    invGroup.style.display = 'none';
    playGroup.style.display = 'none';
    optGroup.style.display = 'none';
    accGroup.style.display = 'flex';
    intervalFmtGroup.style.display = 'none';
  } else if (type === 'scales' || type === 'modes') {
    invGroup.style.display = 'none';
    playGroup.style.display = 'none';
    optGroup.style.display = 'flex';
    accGroup.style.display = 'none';
    intervalFmtGroup.style.display = 'none';
    updateOptionsList();
  } else if (type === 'chords' || type === 'septachords') {
    invGroup.style.display = 'flex';
    playGroup.style.display = 'flex';
    optGroup.style.display = 'flex';
    accGroup.style.display = 'none';
    intervalFmtGroup.style.display = 'none';
    updateInversionsList(type);
    updateOptionsList();
  } else {
    invGroup.style.display = 'none';
    playGroup.style.display = 'flex';
    optGroup.style.display = 'flex';
    accGroup.style.display = 'none';
    intervalFmtGroup.style.display = 'flex';
    updateOptionsList();
  }
  document.getElementById('scaleShowGroup').style.display = type === 'scales' ? 'flex' : 'none';
  updateScaleShow();
  document.querySelectorAll('#exTypeRow button').forEach(b => b.classList.toggle('active', b.dataset.type === type));
}

// סולמות בקריאה: אפשר לזהות רק לפי סימני המפתח, בלי תווי הסולם
function updateScaleShow() {
  const on = document.getElementById('exType').value === 'scales' && document.getElementById('scaleShowSelect').value === 'keysig';
  document.body.classList.toggle('scales-keysig', on);
}

function keySigMode() {
  return appMode === 'read' && document.body.classList.contains('scales-keysig');
}

function updateInversionsList(type) {
  const container = document.getElementById('inversionsTags');
  container.innerHTML = '';
  INVERSIONS_DATA[type].forEach(inv => {
    const pill = document.createElement('div');
    pill.className = 'tag-pill active';
    pill.dataset.value = inv.id;
    pill.innerText = inv.name;
    pill.onclick = () => pill.classList.toggle('active');
    container.appendChild(pill);
  });
}

function updateOptionsList() {
  const type = document.getElementById('exType').value;
  if (!BASE_STRUCTURES[type]) return;
  const container = document.getElementById('optionsTags');
  container.innerHTML = '';

  optionStructures(type).forEach(item => {
    const pill = document.createElement('div');
    pill.className = 'tag-pill active';
    pill.dataset.value = item.name;
    pill.innerText = getStructureLabel(item, type);
    pill.onclick = () => pill.classList.toggle('active');
    container.appendChild(pill);
  });
}

function selectAllOptions(status) {
  document.querySelectorAll('#optionsTags .tag-pill').forEach(el => {
    if (status) el.classList.add('active'); else el.classList.remove('active');
  });
}

function selectAllInversions(status) {
  document.querySelectorAll('#inversionsTags .tag-pill').forEach(el => {
    if (status) el.classList.add('active'); else el.classList.remove('active');
  });
}

// שליחת תרגיל לתלמיד: הקישור נושא את המצב, סוג התרגיל וההגדרות, והשאלות עצמן אקראיות אצל התלמיד
const MODE_LABELS = { read: 'קריאה', ear: 'שמיעה' };

function buildShareParams() {
  const type = document.getElementById('exType').value;
  const params = new URLSearchParams();
  params.set('mode', appMode);
  params.set('type', type);
  if (appMode === 'read') params.set('clef', document.getElementById('clefSelect').value);
  else {
    params.set('instr', document.getElementById('instrumentSelect').value);
    if (type === 'intervals' || type === 'chords' || type === 'septachords') params.set('play', document.getElementById('playMode').value);
  }
  if (type === 'note_id') params.set('acc', document.getElementById('accidentalSelect').value);
  if (type === 'progressions') {
    params.set('stage', document.getElementById('progStageSelect').value);
    params.set('pmode', document.getElementById('progModeSelect').value);
    params.set('ask', document.getElementById('progAskSelect').value);
    return params;
  }
  if (type === 'intervals') params.set('fmt', document.getElementById('intervalFormatSelect').value);
  if (keySigMode()) params.set('sig', 'keysig');
  if (type === 'chords' || type === 'septachords') {
    const pills = Array.from(document.querySelectorAll('#inversionsTags .tag-pill'));
    const on = pills.filter(el => el.classList.contains('active'));
    if (on.length && on.length < pills.length) params.set('inv', on.map(el => el.dataset.value).join(','));
  }
  if (type !== 'note_id' && !keySigMode()) {
    const pills = Array.from(document.querySelectorAll('#optionsTags .tag-pill'));
    const on = pills.filter(el => el.classList.contains('active'));
    if (on.length && on.length < pills.length) {
      const ids = on.map(el => (optionStructures(type).find(st => st.name === el.dataset.value) || {}).id).filter(Boolean);
      params.set('opts', ids.join(','));
    }
  }
  return params;
}

function shareSummary() {
  const type = document.getElementById('exType').value;
  const typeName = document.querySelector(`#exType option[value="${type}"]`).textContent;
  let text = `${MODE_LABELS[appMode] || ''} · ${typeName}`;
  if (keySigMode()) return text + ': לפי סימני מפתח';
  if (type === 'progressions') {
    const sel = document.getElementById('progStageSelect');
    return text + ': עד ' + sel.options[sel.selectedIndex].textContent;
  }
  if (type !== 'note_id') {
    const pills = Array.from(document.querySelectorAll('#optionsTags .tag-pill'));
    const on = pills.filter(el => el.classList.contains('active'));
    if (on.length < pills.length) text += ': ' + on.map(el => el.textContent).join(', ');
  }
  return text;
}

function shareCurrentExercise() {
  const type = document.getElementById('exType').value;
  if (type !== 'note_id' && type !== 'progressions' && !keySigMode() && !document.querySelector('#optionsTags .tag-pill.active')) {
    alert('יש לבחור לפחות אפשרות אחת לתרגול!');
    return;
  }
  const url = location.origin + location.pathname + '?' + buildShareParams().toString().replace(/%2C/g, ',');
  const summary = shareSummary();
  document.getElementById('shareSummary').textContent = summary;
  document.getElementById('shareLink').value = url;
  document.getElementById('shareWhatsapp').href = 'https://wa.me/?text=' + encodeURIComponent('תרגיל ' + summary + '\n' + url);
  document.getElementById('shareCopy').textContent = 'העתק קישור';
  document.getElementById('shareDialog').hidden = false;
}

function closeShareDialog() {
  document.getElementById('shareDialog').hidden = true;
}

function copyShareLink() {
  const input = document.getElementById('shareLink');
  const done = () => { document.getElementById('shareCopy').textContent = 'הועתק'; };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(input.value).then(done).catch(() => { input.select(); document.execCommand('copy'); done(); });
  } else {
    input.select();
    document.execCommand('copy');
    done();
  }
}

// עדכון כפתורי ההגדרה אחרי שינוי של ה-select המוסתר
function setSettingValue(id, value) {
  const sel = document.getElementById(id);
  if (!sel || !Array.from(sel.options).some(o => o.value === value)) return false;
  sel.value = value;
  const seg = sel.nextElementSibling;
  if (seg && seg.classList.contains('seg')) seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.value === value));
  return true;
}

// קישור שהמורה שלח: מחילים את ההגדרות שבו. מחזיר true אם היה בקישור תרגיל
function applySharedSettings() {
  const params = new URLSearchParams(location.search);
  const type = params.get('type');
  if (!type || !(BASE_STRUCTURES[type] || type === 'progressions') || isTrainMode()) return false;
  if (type === 'progressions' && isReadMode()) return false;
  if (type === 'note_id' && !isReadMode()) return false;
  document.getElementById('exType').value = type;
  if (params.has('fmt')) setSettingValue('intervalFormatSelect', params.get('fmt'));
  onExerciseTypeChange();
  ['clef:clefSelect', 'acc:accidentalSelect', 'play:playMode', 'sig:scaleShowSelect', 'stage:progStageSelect', 'pmode:progModeSelect', 'ask:progAskSelect'].forEach(pair => {
    const [key, id] = pair.split(':');
    if (params.has(key)) setSettingValue(id, params.get(key));
  });
  updateScaleShow();
  if (params.has('instr') && setSettingValue('instrumentSelect', params.get('instr'))) loadSamples(params.get('instr'));
  if (params.has('inv')) {
    const inv = params.get('inv').split(',');
    const pills = document.querySelectorAll('#inversionsTags .tag-pill');
    if (Array.from(pills).some(el => inv.includes(el.dataset.value))) pills.forEach(el => el.classList.toggle('active', inv.includes(el.dataset.value)));
  }
  if (params.has('opts')) {
    const ids = params.get('opts').split(',');
    const names = optionStructures(type).filter(st => ids.includes(st.id)).map(st => st.name);
    if (names.length) document.querySelectorAll('#optionsTags .tag-pill').forEach(el => el.classList.toggle('active', names.includes(el.dataset.value)));
  }
  const note = document.getElementById('sharedNote');
  note.textContent = 'תרגיל שנשלח אליך: ' + shareSummary();
  note.hidden = false;
  return true;
}

function loadExerciseFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const dataStr = params.get('exData');
  if (dataStr) {
    try {
      currentExercise = JSON.parse(dataStr);
      const typeSelect = document.getElementById('exType');
      if (Array.from(typeSelect.options).some(o => o.value === currentExercise.type)) {
        typeSelect.value = currentExercise.type;
        onExerciseTypeChange();
      }
      document.getElementById('practiceArea').style.display = 'flex';
      document.getElementById('feedback').innerText = 'תרגיל מקישור';
      document.getElementById('feedback').className = 'feedback info';
      renderStaff(currentExercise);
      setupAnswerUI();
      updateFirstNoteButtonUI();
      return true;
    } catch(e) { console.error("URL Load Error", e); }
  }
  return false;
}
