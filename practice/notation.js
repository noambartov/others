// תרגול: ציור התרגיל על החמשה.

function renderStaff(ex) {
  const container = document.getElementById('staffContainer');
  const dispMode = document.getElementById('displayMode').value;

  // במצב מושמע בלבד: כפתור השמעה גדול במקום החמשה
  document.getElementById('bigPlayWrap').style.display = dispMode === 'audio_only' ? 'flex' : 'none';
  // בשמיעה יש כפתור גדול, אז הכפתור הקטן בשורה נחוץ רק בקריאה
  // בסימני מפתח בלבד אין מה להשמיע: זה היה מסגיר אם זה מז׳ור או מינור
  document.getElementById('playAudioBtn').style.display = dispMode === 'audio_only' || ex.keySig ? 'none' : '';
  if (dispMode === 'audio_only') {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';

  const svg = document.getElementById('staffSvg');
  
  let svgContent = '';

  const isScaleOrMode = (ex.type === 'scales' || ex.type === 'modes');
  // במסך צר חמשה קצרה לצליל/מרווח/אקורד, כדי שהתווים לא יתכווצו
  const width = ex.keySig || (!isScaleOrMode && container.clientWidth < 560) ? 240 : 520;
  svg.setAttribute('viewBox', `0 0 ${width} 110`);
  const startX = isScaleOrMode ? 85 : (width === 520 ? 260 : 140);
  const spacing = isScaleOrMode ? 48 : 0;

  for (let i = 0; i < 5; i++) {
    let y = 66 - i * 8;
    svgContent += `<line x1="20" y1="${y}" x2="${width - 20}" y2="${y}" class="staff-line" stroke-width="1.2"/>`;
  }
  svgContent += `<line x1="20" y1="34" x2="20" y2="66" class="staff-line strong" stroke-width="1.5"/>`;

  svgContent += T.svg.clef(ex.clef === 'fa' ? 'fa' : 'sol', 35, STAFF);

  if (ex.keySig) {
    T.keySignatureLines(ex.clef, ex.keySig.accType, ex.keySig.accCount).forEach((line, i) => {
      svgContent += T.svg.accidental(ex.keySig.accType, 70 + i * 11, 66 - line * 4, STAFF.space);
    });
  }

  const layout = isScaleOrMode ? null : T.chordLayout(ex.notes);

  ex.notes.forEach((n, idx) => {
    let y = 66 - n.absLine * 4;
    let baseX = startX + (idx * spacing);
    let noteX = baseX;

    if (layout && layout[idx].shifted) noteX += 10;
    // פרימה: סימן ההיתק של התו הימני בין שני ראשי התווים
    const accBeside = layout && layout[idx].accBeside;
    if (accBeside) noteX += T.svg.accidentalWidth(n.acc, STAFF.space) + 4;

    svgContent += T.svg.ledgerLines(noteX, n.absLine, STAFF, 8);

    if (n.acc !== 0) {
      let accRightX = accBeside ? noteX - 7 : baseX - 7 - (layout ? layout[idx].accColumn * 11 : 0);
      svgContent += T.svg.accidental(n.acc, accRightX, y, STAFF.space);
    }

    svgContent += T.svg.notehead(noteX, y, STAFF.space);
  });

  svg.innerHTML = svgContent;
}

window.addEventListener('resize', () => { if (currentExercise) renderStaff(currentExercise); });

function updateFirstNoteButtonUI() {
  const btn = document.getElementById('playFirstNoteBtn');
  if (!currentExercise || currentExercise.type === 'note_id' || currentExercise.keySig) {
    btn.style.display = 'none';
    return;
  }
  btn.style.display = 'inline-flex';

  if (currentPlayDirection === 'descending') {
    btn.innerText = 'צליל ראשון (סופרן)';
  } else {
    btn.innerText = 'צליל ראשון (בס)';
  }
}
