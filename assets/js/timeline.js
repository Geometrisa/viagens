'use strict';

// ============================================================
// TIMELINE (Gantt)
// ============================================================
const TLState = {
  year: new Date().getFullYear(),
  sort: 'dias',         // 'dias' | 'alfa'
  filterMinDays: 0,
  showArchived: false,
  // zoom is now GlobalCalZoom.value (shared with calendar and equipe views)
};

function initTimeline() {
  TLState.year = new Date().getFullYear();
  renderTimeline();
}

function renderTimeline() {
  const container = document.getElementById('view-timeline');
  if (!container) return;
  container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'timeline-page';

  // Toolbar
  page.appendChild(buildTLToolbar());

  // Table
  page.appendChild(buildTLTable());

  container.appendChild(page);
}

// ============================================================
// TOOLBAR
// ============================================================
function buildTLToolbar() {
  const bar = document.createElement('div');
  bar.className = 'page-header';

  const left = document.createElement('div');
  left.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap';

  // Year selector
  const cfg = db.data.configuracoes;
  const minY = cfg.anoInicial||2024, maxY = cfg.anoFinal||2028;
  const prevY = document.createElement('button');
  prevY.className = 'btn btn-ghost btn-sm';
  prevY.textContent = '◀';
  prevY.onclick = () => { if(TLState.year>minY){TLState.year--;renderTimeline();} };

  const ySel = document.createElement('select');
  ySel.className = 'form-control';
  ySel.style.width = '90px';
  for(let y=minY;y<=maxY;y++){
    const o = document.createElement('option');
    o.value=y; o.textContent=y;
    if(y===TLState.year) o.selected=true;
    ySel.appendChild(o);
  }
  ySel.onchange = () => { TLState.year=+ySel.value; renderTimeline(); };

  const nextY = document.createElement('button');
  nextY.className = 'btn btn-ghost btn-sm';
  nextY.textContent = '▶';
  nextY.onclick = () => { if(TLState.year<maxY){TLState.year++;renderTimeline();} };

  // Sort toggle
  const sortBtn = document.createElement('button');
  sortBtn.className = 'btn btn-ghost btn-sm';
  sortBtn.textContent = TLState.sort==='dias' ? 'Dias ↓' : 'A→Z';
  sortBtn.onclick = () => {
    TLState.sort = TLState.sort==='dias' ? 'alfa' : 'dias';
    renderTimeline();
  };

  // Min days slider
  const sliderLbl = document.createElement('span');
  sliderLbl.style.cssText = 'font-size:11px;color:#666;white-space:nowrap';
  sliderLbl.textContent = `Mín. ${TLState.filterMinDays} dias`;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0; slider.max = 30; slider.step = 1;
  slider.value = TLState.filterMinDays;
  slider.style.width = '100px';
  slider.oninput = () => {
    TLState.filterMinDays = +slider.value;
    sliderLbl.textContent = `Mín. ${TLState.filterMinDays} dias`;
    renderTimeline();
  };

  // Show archived toggle
  const archBtn = document.createElement('button');
  archBtn.className = 'btn btn-ghost btn-sm';
  archBtn.textContent = TLState.showArchived ? '👁 Ocultar arquivados' : '👁 Mostrar arquivados';
  archBtn.onclick = () => { TLState.showArchived = !TLState.showArchived; renderTimeline(); };

  // Zoom
  const zmIn = document.createElement('button');
  zmIn.className = 'cal-zoom-btn';
  zmIn.textContent = '+';
  zmIn.onclick = () => { GlobalCalZoom.value = Math.min(2, GlobalCalZoom.value+.2); renderTimeline(); };
  const zmOut = document.createElement('button');
  zmOut.className = 'cal-zoom-btn';
  zmOut.textContent = '−';
  zmOut.onclick = () => { GlobalCalZoom.value = Math.max(.4, GlobalCalZoom.value-.2); renderTimeline(); };

  left.append(prevY, ySel, nextY, sortBtn, sliderLbl, slider, archBtn, zmOut, zmIn);
  bar.appendChild(left);

  // Export PDF
  const right = document.createElement('div');
  right.style.cssText = 'display:flex;gap:6px';
  const expBtn = document.createElement('button');
  expBtn.className = 'btn btn-outline btn-sm';
  expBtn.textContent = '⬇ Exportar PDF';
  expBtn.onclick = () => window.print();
  right.appendChild(expBtn);
  bar.appendChild(right);

  return bar;
}

// ============================================================
// TABLE
// ============================================================
function buildTLTable() {
  const year = TLState.year;
  const months = 12;

  // Days in year
  const yearStart = `${year}-01-01`;
  const yearEnd   = `${year}-12-31`;
  const totalDays = daysBetween(yearStart, yearEnd) + 1;

  let colaboradores = db.data.colaboradores.filter(c =>
    c.status === 'Ativo' || (TLState.showArchived && c.status === 'Arquivado')
  );

  // Sort
  if (TLState.sort === 'alfa') {
    colaboradores.sort((a,b) => a.nome.localeCompare(b.nome));
  } else {
    colaboradores.sort((a,b) => db.getDiasEmCampo(b.id, year) - db.getDiasEmCampo(a.id, year));
  }

  // Filter by min days
  if (TLState.filterMinDays > 0) {
    colaboradores = colaboradores.filter(c => db.getDiasEmCampo(c.id, year) >= TLState.filterMinDays);
  }

  const container = document.createElement('div');
  container.className = 'timeline-container';

  // Header row with month names
  const headerRow = document.createElement('div');
  headerRow.className = 'timeline-header-row';

  const nameHdr = document.createElement('div');
  nameHdr.className = 'tl-name-col';
  nameHdr.style.cssText += ';display:flex;align-items:center;gap:6px';
  nameHdr.innerHTML = '<span>Colaborador</span>';
  headerRow.appendChild(nameHdr);

  const monthsDiv = document.createElement('div');
  monthsDiv.className = 'tl-months-row';
  monthsDiv.style.cssText = 'display:flex;flex:1;min-width:0';

  for (let m = 0; m < 12; m++) {
    const mh = document.createElement('div');
    mh.className = 'tl-month-header';
    mh.textContent = MONTHS_SHORT[m];
    mh.style.minWidth = (50 * GlobalCalZoom.value) + 'px';
    monthsDiv.appendChild(mh);
  }
  headerRow.appendChild(monthsDiv);
  container.appendChild(headerRow);

  // Today line calculation
  const todayStr = isoToday();
  let todayPct = 0;
  if (todayStr >= yearStart && todayStr <= yearEnd) {
    const daysIn = daysBetween(yearStart, todayStr);
    todayPct = (daysIn / totalDays) * 100;
  }

  // Rows
  const conflicts = detectConflicts(db.data.viagens);

  for (const c of colaboradores) {
    const dias = db.getDiasEmCampo(c.id, year);
    const row = document.createElement('div');
    row.className = 'timeline-row';
    row.onclick = () => openDetailPanel('colaborador', c.id);

    const nameCell = document.createElement('div');
    nameCell.className = 'tl-name-cell';
    nameCell.innerHTML = `<span class="sigla-tag">${c.sigla}</span><div style="min-width:0"><div style="font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(c.nome)}</div><div style="font-size:10px;color:#888">${dias} dias</div></div>`;
    if (c.status === 'Arquivado') nameCell.style.opacity = '.6';
    row.appendChild(nameCell);

    const barsCell = document.createElement('div');
    barsCell.className = 'tl-bars-cell';
    barsCell.style.position = 'relative';
    barsCell.style.minWidth = (600 * GlobalCalZoom.value) + 'px';

    // Today line
    if (todayPct > 0) {
      const tl = document.createElement('div');
      tl.className = 'tl-today-line';
      tl.style.left = todayPct + '%';
      barsCell.appendChild(tl);
    }

    // Month grid lines
    for (let m = 1; m < 12; m++) {
      const mStart = `${year}-${String(m+1).padStart(2,'0')}-01`;
      const mPct = (daysBetween(yearStart, mStart) / totalDays) * 100;
      const line = document.createElement('div');
      line.style.cssText = `position:absolute;top:0;bottom:0;left:${mPct}%;width:1px;background:#eee;pointer-events:none`;
      barsCell.appendChild(line);
    }

    // Trip bars for this colaborador
    let laneCount = 0;
    const barsByViagem = {};

    for (const v of db.data.viagens) {
      if (v.status === 'Cancelado') continue;
      for (const p of v.paradas||[]) {
        for (const col of p.colaboradores||[]) {
          if (col.colaboradorId !== c.id) continue;
          // Clamp to year
          const s = col.dataInicio < yearStart ? yearStart : col.dataInicio;
          const e = col.dataFim   > yearEnd   ? yearEnd   : col.dataFim;
          if (s > yearEnd || e < yearStart) continue;

          const hasConf = conflicts.some(cf =>
            cf.colaboradorId === c.id &&
            (cf.viagemId1===v.id||cf.viagemId2===v.id)
          );

          const startPct = (daysBetween(yearStart, s) / totalDays) * 100;
          const widthPct = ((daysBetween(s, e)+1) / totalDays) * 100;

          const bar = document.createElement('div');
          bar.className = 'tl-bar' + (hasConf ? ' conflict' : '');
          const color = db.getViagemColor(v.id);
          bar.style.background = hasConf ? '#ffcdd2' : color;
          bar.style.left   = startPct + '%';
          bar.style.width  = Math.max(widthPct, .5) + '%';
          bar.style.top    = (laneCount * 26 + 4) + 'px';
          bar.style.borderColor = hasConf ? 'var(--c-error)' : 'rgba(0,0,0,.12)';

          const sigla = db.getBarragemSigla(p.barragemId);
          bar.innerHTML = `<span style="font-family:var(--font-mono);font-size:9px;font-weight:700">${sigla}</span>`;
          bar.title = buildBarTooltip(v, hasConf);
          bar.onclick = (e) => { e.stopPropagation(); openDetailPanel('viagem', v.id); };
          bar.ondblclick = (e) => { e.stopPropagation(); openViagemModal(v.id); };

          barsCell.appendChild(bar);
          laneCount++;
        }
      }
    }

    const rowH = Math.max(32, laneCount * 26 + 8);
    row.style.minHeight = rowH + 'px';
    barsCell.style.minHeight = rowH + 'px';

    row.appendChild(barsCell);
    container.appendChild(row);
  }

  if (colaboradores.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<div class="icon">📅</div><h3>Nenhum colaborador encontrado</h3><p>Ajuste o filtro de dias mínimos ou adicione colaboradores.</p>';
    container.appendChild(empty);
  }

  return container;
}
