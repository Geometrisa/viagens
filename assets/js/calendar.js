"use strict";

// ============================================================
// GLOBAL ZOOM — shared across viagens, equipe and timeline
// ============================================================
const GlobalCalZoom = { value: 1 };

// ============================================================
// CALENDAR STATE
// ============================================================
const CalState = {
  year: new Date().getFullYear(),
  mode: "viagens", // 'viagens' | 'equipe'
  filters: { viagens: [], colaboradores: [] },
  weekOffset: 0,
  showArchived: false,
};

// ============================================================
// CALENDAR INIT
// ============================================================
function initCalendar(mode) {
  CalState.mode = mode || "viagens";
  CalState.year = new Date().getFullYear();
  CalState.filters = { viagens: [], colaboradores: [] };
  renderCalendarPage();
}

function renderCalendarPage() {
  const container = document.getElementById("view-calendar-" + CalState.mode);
  if (!container) return;
  container.innerHTML = "";

  const page = document.createElement("div");
  page.className = "calendar-page";

  // Sidebar
  page.appendChild(buildCalSidebar());

  // Main area
  const main = document.createElement("div");
  main.className = "cal-content";
  main.id = "cal-content-" + CalState.mode;

  // Header bar (filters + zoom + export)
  main.appendChild(buildCalHeaderBar());

  // Months — hide past months for current year
  const todayNow = new Date();
  const currentM =
    CalState.year === todayNow.getFullYear() ? todayNow.getMonth() : 0;
  const isPastYear = CalState.year < todayNow.getFullYear();

  if (currentM > 0 && !isPastYear) {
    const pastSec = document.createElement("div");
    pastSec.className = "past-months-section";
    const pastBtn = document.createElement("button");
    pastBtn.className = "past-months-toggle";
    pastBtn.textContent = `▼ Ver ${currentM} ${currentM === 1 ? "mês anterior" : "meses anteriores"} (${MONTHS_PT[0]} – ${MONTHS_PT[currentM - 1]})`;
    const pastContainer = document.createElement("div");
    pastContainer.style.display = "none";
    for (let m = 0; m < currentM; m++)
      pastContainer.appendChild(buildMonthBlock(CalState.year, m));
    pastBtn.onclick = () => {
      const open = pastContainer.style.display !== "none";
      pastContainer.style.display = open ? "none" : "block";
      pastBtn.textContent = open
        ? `▼ Ver ${currentM} ${currentM === 1 ? "mês anterior" : "meses anteriores"} (${MONTHS_PT[0]} – ${MONTHS_PT[currentM - 1]})`
        : `▲ Ocultar meses anteriores`;
    };
    pastSec.append(pastBtn, pastContainer);
    main.appendChild(pastSec);
  }

  for (let m = isPastYear ? 0 : currentM; m < 12; m++) {
    main.appendChild(buildMonthBlock(CalState.year, m));
  }

  page.appendChild(main);
  container.appendChild(page);

  // Scroll to current month
  scrollToCurrentMonth();
}

// ============================================================
// SIDEBAR
// ============================================================
function buildCalSidebar() {
  const sidebar = document.createElement("div");
  sidebar.className = "cal-sidebar";

  // Year selector
  const yearRow = document.createElement("div");
  yearRow.className = "cal-sidebar-year";

  const cfg = db.data.configuracoes;
  const minYear = cfg.anoInicial || 2024;
  const maxYear = cfg.anoFinal || 2028;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "◀";
  prevBtn.onclick = () => {
    if (CalState.year > minYear) {
      CalState.year--;
      renderCalendarPage();
    }
  };

  const sel = document.createElement("select");
  for (let y = minYear; y <= maxYear; y++) {
    const o = document.createElement("option");
    o.value = y;
    o.textContent = y;
    if (y === CalState.year) o.selected = true;
    sel.appendChild(o);
  }
  sel.onchange = () => {
    CalState.year = +sel.value;
    renderCalendarPage();
  };

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "▶";
  nextBtn.onclick = () => {
    if (CalState.year < maxYear) {
      CalState.year++;
      renderCalendarPage();
    }
  };

  yearRow.append(prevBtn, sel, nextBtn);
  sidebar.appendChild(yearRow);

  // Zoom
  const zoomRow = document.createElement("div");
  zoomRow.style.cssText =
    "display:flex;align-items:center;gap:4px;padding:6px 10px;border-bottom:1px solid var(--c-border)";
  const zm = document.createElement("span");
  zm.style.cssText = "font-size:10px;color:#888;flex:1";
  zm.textContent = "Zoom";
  const zIn = document.createElement("button");
  zIn.className = "cal-zoom-btn";
  zIn.textContent = "+";
  zIn.onclick = () => {
    GlobalCalZoom.value = Math.min(1.5, GlobalCalZoom.value + 0.15);
    applyZoom();
  };
  const zOut = document.createElement("button");
  zOut.className = "cal-zoom-btn";
  zOut.textContent = "−";
  zOut.onclick = () => {
    GlobalCalZoom.value = Math.max(0.6, GlobalCalZoom.value - 0.15);
    applyZoom();
  };
  zoomRow.append(zm, zOut, zIn);
  sidebar.appendChild(zoomRow);

  // Today button
  const todayBtn = document.createElement("button");
  todayBtn.className = "cal-sidebar-today";
  todayBtn.textContent = "📅 Ir para Hoje";
  todayBtn.onclick = () => {
    CalState.year = new Date().getFullYear();
    renderCalendarPage();
    setTimeout(scrollToCurrentMonth, 50);
  };
  sidebar.appendChild(todayBtn);

  // Month links
  const today = new Date();
  for (let m = 0; m < 12; m++) {
    const link = document.createElement("div");
    link.className = "cal-month-link";
    if (CalState.year === today.getFullYear() && m === today.getMonth()) {
      link.classList.add("current-month");
    }
    link.textContent = MONTHS_PT[m];
    link.dataset.month = m;
    link.onclick = () => scrollToMonth(m);
    sidebar.appendChild(link);
  }

  // Legend
  sidebar.appendChild(buildLegend());

  return sidebar;
}

function buildLegend() {
  const leg = document.createElement("div");
  leg.className = "cal-legend";
  leg.innerHTML = '<div class="cal-legend-title">Legenda</div>';

  const viagens = db.data.viagens.filter((v) => v.status !== "Cancelado");
  for (const v of viagens) {
    const period = db.getViagemPeriod(v);
    if (!period) continue;
    const item = document.createElement("div");
    item.className = "cal-legend-item";
    const swatch = document.createElement("div");
    swatch.className = "cal-legend-color";
    swatch.style.background = db.getViagemColorRaw(v.id);
    const label = document.createElement("span");
    const allSiglas = [
      ...new Set(
        v.paradas.map((p) => db.getBarragemSigla(p.barragemId)).filter(Boolean),
      ),
    ].join(" + ");
    label.textContent = `${v.id} · ${allSiglas || "?"}`;
    label.title = `${v.nome} · ${formatDate(period.inicio)} → ${formatDate(period.fim)}`;
    item.append(swatch, label);
    leg.appendChild(item);
  }

  // Pattern legend
  const patterns = [
    { cls: "", color: "#B8D4E8", label: "Confirmado (sólida)" },
    { cls: "dashed", color: "#B8D4E8", label: "Pendente (tracejada)" },
    { cls: "", color: "#CCCCCC", label: "Concluído/Passado" },
    { cls: "", color: "#ffcdd2", label: "Conflito ⚠️" },
  ];
  const sep = document.createElement("hr");
  sep.style.cssText = "border:none;border-top:1px solid #ddd;margin:6px 0";
  leg.appendChild(sep);
  for (const p of patterns) {
    const item = document.createElement("div");
    item.className = "cal-legend-item" + (p.cls ? " " + p.cls : "");
    const sw = document.createElement("div");
    sw.className = "cal-legend-color";
    sw.style.background = p.color;
    if (p.cls === "dashed") {
      sw.style.background =
        "repeating-linear-gradient(90deg,#888 0,#888 4px,transparent 4px,transparent 8px)";
      sw.style.border = "1px solid #aaa";
    }
    const lbl = document.createElement("span");
    lbl.textContent = p.label;
    item.append(sw, lbl);
    leg.appendChild(item);
  }
  return leg;
}

// ============================================================
// HEADER BAR (filters)
// ============================================================
function buildCalHeaderBar() {
  const bar = document.createElement("div");
  bar.className = "cal-header-bar";
  bar.id = "cal-header-bar-" + CalState.mode;

  // Filters
  const filtersDiv = document.createElement("div");
  filtersDiv.className = "cal-filters";
  filtersDiv.style.cssText =
    "position:relative;z-index:auto;padding:0;flex:1;flex-wrap:wrap";

  const label = document.createElement("span");
  label.className = "cal-filters-label";
  label.textContent = "FILTRAR POR:";
  filtersDiv.appendChild(label);

  // Viagem filters — show barragem siglas instead of V01/V02
  const viagens = db.data.viagens.filter((v) => v.status !== "Cancelado");
  for (const v of viagens) {
    const btn = document.createElement("button");
    btn.className =
      "filter-btn" + (CalState.filters.viagens.includes(v.id) ? " active" : "");
    const tripSiglas = [
      ...new Set(v.paradas.map((p) => db.getBarragemSigla(p.barragemId))),
    ].join(" + ");
    btn.textContent = tripSiglas || v.id;
    btn.style.borderColor = db.getViagemColorRaw(v.id);
    if (CalState.filters.viagens.includes(v.id))
      btn.style.background = db.getViagemColorRaw(v.id);
    btn.title = `${v.id} — ${v.nome}`;
    btn.onclick = () => toggleFilterViagem(v.id);
    filtersDiv.appendChild(btn);
  }

  // Separator
  const sep = document.createElement("span");
  sep.style.cssText =
    "width:1px;height:16px;background:var(--c-border);margin:0 4px";
  filtersDiv.appendChild(sep);

  // Colaborador filters (only those with trips)
  const colsWithTrips = getColaboradoresComViagens();
  for (const c of colsWithTrips) {
    const btn = document.createElement("button");
    btn.className =
      "filter-btn" +
      (CalState.filters.colaboradores.includes(c.id) ? " active" : "");
    btn.textContent = c.sigla;
    btn.title = c.nome;
    btn.onclick = () => toggleFilterColaborador(c.id);
    filtersDiv.appendChild(btn);
  }

  // Clear button
  const clearBtn = document.createElement("button");
  clearBtn.className = "filter-clear" + (hasActiveFilters() ? " visible" : "");
  clearBtn.id = "filter-clear-" + CalState.mode;
  clearBtn.textContent = "✕ Limpar filtros";
  clearBtn.onclick = clearFilters;
  filtersDiv.appendChild(clearBtn);

  bar.appendChild(filtersDiv);

  // Right side buttons
  const rightBtns = document.createElement("div");
  rightBtns.style.cssText =
    "display:flex;gap:6px;flex-shrink:0;align-items:center";

  const exportBtn = document.createElement("button");
  exportBtn.className = "btn btn-outline btn-sm";
  exportBtn.textContent = "⬇ Exportar PDF";
  exportBtn.onclick = () => openExportModal();

  const presentBtn = document.createElement("button");
  presentBtn.className = "btn btn-ghost btn-sm";
  presentBtn.textContent = "▶ Apresentar";
  presentBtn.onclick = () => enterPresentationMode();

  rightBtns.append(exportBtn, presentBtn);
  bar.appendChild(rightBtns);

  return bar;
}

// ============================================================
// MONTH BLOCK
// ============================================================
function buildMonthBlock(year, month) {
  const block = document.createElement("div");
  block.className = "month-block";
  block.id = `month-${year}-${month}`;

  // Header
  const header = document.createElement("div");
  header.className = "month-header";
  header.innerHTML = `<span>${MONTHS_PT[month]} ${year}</span>`;
  block.appendChild(header);

  // Week day headers
  const wh = document.createElement("div");
  wh.className = "week-header";
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  for (let i = 0; i < 7; i++) {
    const d = document.createElement("div");
    d.className = "week-header-day" + (i === 0 || i === 6 ? " weekend" : "");
    d.textContent = dayNames[i];
    wh.appendChild(d);
  }
  block.appendChild(wh);

  // Get data
  const viagens = db.data.viagens;
  const conflicts = detectConflicts(viagens);
  const holidays = db.data.configuracoes.feriados.nacionais
    ? getHolidaysCached(year)
    : {};
  const laneMap = assignLanes(viagens, year, month);
  const today = isoToday();

  // Count max lanes needed (for row heights)
  const weeks = getMonthWeeks(year, month);

  for (const week of weeks) {
    const weekRow = buildWeekRow(
      week,
      year,
      month,
      viagens,
      laneMap,
      conflicts,
      holidays,
      today,
    );
    block.appendChild(weekRow);
  }

  return block;
}

// ============================================================
// WEEK ROW
// ============================================================
function buildWeekRow(
  week,
  year,
  month,
  viagens,
  laneMap,
  conflicts,
  holidays,
  today,
) {
  const weekRow = document.createElement("div");
  weekRow.className = "week-row";
  weekRow.style.position = "relative";

  const weekStart = week[0],
    weekEnd = week[6];
  const zoom = GlobalCalZoom.value;

  // Determine active trips in this week
  const activeViagens = viagens
    .filter((v) => v.status !== "Cancelado")
    .filter((v) => {
      const p = db.getViagemPeriod(v);
      return p && datesOverlap(p.inicio, p.fim, weekStart, weekEnd);
    });

  const maxLane = activeViagens.reduce(
    (mx, v) => Math.max(mx, laneMap[v.id] || 0),
    -1,
  );
  const rowHeight = Math.max(52, 20 + (maxLane + 1) * 24 + 4) * zoom;

  // Build 7 day cells
  for (let di = 0; di < 7; di++) {
    const dateStr = week[di];
    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.dataset.date = dateStr;

    const dObj = parseDate(dateStr);
    const cellMonth = dObj.getMonth();
    const isWeekendDay = di === 0 || di === 6;
    const isToday = dateStr === today;
    const isHol = !!holidays[dateStr];

    if (isWeekendDay) cell.classList.add("weekend");
    if (isToday) cell.classList.add("today");
    if (cellMonth !== month) cell.classList.add("other-month");

    const dayNum = document.createElement("span");
    dayNum.className = "day-num" + (isHol ? " holiday" : "");
    dayNum.textContent = dObj.getDate();
    if (isHol) dayNum.title = holidays[dateStr];
    cell.appendChild(dayNum);

    cell.style.height = rowHeight + "px";
    cell.onclick = (e) => {
      if (e.target === cell || e.target === dayNum) {
        openNewViagemWithDate(dateStr);
      }
    };

    weekRow.appendChild(cell);
  }

  // Bar layer
  const barsLayer = document.createElement("div");
  barsLayer.className = "week-bars-layer";
  barsLayer.style.top = 18 * zoom + "px";

  // Sort by lane
  const sortedViagens = [...activeViagens].sort(
    (a, b) => (laneMap[a.id] || 0) - (laneMap[b.id] || 0),
  );

  for (const v of sortedViagens) {
    const lane = laneMap[v.id] || 0;
    const period = db.getViagemPeriod(v);
    if (!period) continue;

    // Clamp to week
    const barStart = period.inicio < weekStart ? weekStart : period.inicio;
    const barEnd = period.fim > weekEnd ? weekEnd : period.fim;

    const startDow = parseDate(barStart).getDay();
    const endDow = parseDate(barEnd).getDay();

    const isStart = period.inicio >= weekStart;
    const isEnd = period.fim <= weekEnd;

    // Check filters
    const filtered = isFiltered(v.id);

    // Check conflicts
    const hasConf = conflicts.some(
      (c) => c.viagemId1 === v.id || c.viagemId2 === v.id,
    );

    // Build bar row placeholder at correct lane position
    while (barsLayer.children.length <= lane) {
      const emptyRow = document.createElement("div");
      emptyRow.className = "week-bar-row";
      emptyRow.style.height = 22 * zoom + "px";
      barsLayer.appendChild(emptyRow);
    }
    const barRow = barsLayer.children[lane];

    const bar = buildTripBar(
      v,
      startDow,
      endDow,
      isStart,
      isEnd,
      filtered,
      hasConf,
      zoom,
      weekStart,
      weekEnd,
    );
    barRow.appendChild(bar);
  }

  weekRow.appendChild(barsLayer);
  return weekRow;
}

function buildTripBar(
  viagem,
  startDow,
  endDow,
  isStart,
  isEnd,
  filtered,
  hasConflict,
  zoom,
  weekStart,
  weekEnd,
) {
  const bar = document.createElement("div");
  bar.className = "trip-bar";
  if (filtered) bar.classList.add("filtered-out");

  const color = db.getViagemColor(viagem.id);
  const barColor = hasConflict ? "#ffcdd2" : color;
  bar.style.setProperty("--bar-color", color);
  bar.style.background = barColor;
  if (hasConflict) bar.classList.add("conflict");

  // Position
  const cellW = 100 / 7;
  const left = startDow * cellW;
  const width = (endDow - startDow + 1) * cellW;
  bar.style.left = `${left}%`;
  bar.style.width = `${width}%`;
  bar.style.height = 20 * zoom + "px";
  bar.style.fontSize = 10 * zoom + "px";

  // Corner rounding
  if (!isStart) bar.classList.add("no-left");
  if (!isEnd) bar.classList.add("no-right");

  // #3/#4 — Dashed = Previsto (sempre); Sólida = Confirmado | Em campo | Concluído (cinza via getViagemColor)
  if (viagem.status === "Previsto") bar.classList.add("dashed");

  // Resize handles (for drag-to-resize)
  const lh = document.createElement("div");
  lh.className = "bar-resize-handle bar-resize-left";
  const rh = document.createElement("div");
  rh.className = "bar-resize-handle bar-resize-right";
  bar.appendChild(lh);

  // Content
  const content = document.createElement("span");
  content.style.cssText =
    "display:flex;align-items:center;gap:2px;overflow:hidden;min-width:0";

  // Conflict icon
  if (hasConflict) {
    const ci = document.createElement("span");
    ci.className = "conflict-icon";
    ci.textContent = "⚠";
    ci.style.cssText =
      "color:#E24B4A;font-size:" + 10 * zoom + "px;flex-shrink:0";
    content.appendChild(ci);
  }

  // Siglas de TODAS as barragens ativas nesta semana
  const activeParadas = weekStart
    ? getActiveParadasOnWeek(viagem, weekStart, weekEnd)
    : viagem.paradas;
  const siglaSet = [
    ...new Set(
      activeParadas
        .map((p) => db.getBarragemSigla(p.barragemId))
        .filter(Boolean),
    ),
  ];
  const sigla = siglaSet.length
    ? siglaSet.join(" + ")
    : viagem.paradas[0]
      ? db.getBarragemSigla(viagem.paradas[0].barragemId)
      : "";
  const siglaSpan = document.createElement("span");
  siglaSpan.className = "bar-sigla";
  siglaSpan.textContent = sigla;
  content.appendChild(siglaSpan);

  // Atividade icons — de todas as paradas ativas
  const allAtivIds = [...new Set(activeParadas.flatMap((p) => p.atividades))];
  if (allAtivIds.length) {
    const icoSpan = document.createElement("span");
    icoSpan.textContent = allAtivIds
      .map((aid) => {
        const a = db.getAtividade(aid);
        return a ? a.icone : "";
      })
      .join("");
    icoSpan.style.fontSize = 9 * zoom + "px";
    content.appendChild(icoSpan);
  }

  // Colaboradores — TODOS de TODAS as paradas da viagem
  const teamStr = getBarTeamString(viagem);
  if (teamStr) {
    const teamSpan = document.createElement("span");
    teamSpan.className = "bar-team";
    teamSpan.textContent = " · " + teamStr;
    teamSpan.style.fontSize = 9 * zoom + "px";
    content.appendChild(teamSpan);
  }

  bar.appendChild(content);
  bar.appendChild(rh);

  // Tooltip
  bar.title = buildBarTooltip(viagem, hasConflict);

  // Events
  bar.onclick = (e) => {
    e.stopPropagation();
    openDetailPanel("viagem", viagem.id);
  };
  bar.ondblclick = (e) => {
    e.stopPropagation();
    openViagemModal(viagem.id);
  };

  // Drag behavior
  addBarDragBehavior(bar, lh, rh, viagem);

  return bar;
}

function getActiveParadasOnWeek(viagem, weekStart, weekEnd) {
  if (!viagem.paradas || !viagem.paradas.length) return [];
  const active = viagem.paradas.filter((p) =>
    datesOverlap(p.dataInicio, p.dataFim, weekStart, weekEnd),
  );
  return active.length ? active : [viagem.paradas[0]]; // fallback to first parada
}

function getBarTeamString(viagem) {
  // Collect siglas from ALL collaborators in ALL paradas, deduplicated
  const seen = new Set();
  const siglas = [];
  for (const p of viagem.paradas) {
    for (const c of p.colaboradores || []) {
      if (!seen.has(c.colaboradorId)) {
        seen.add(c.colaboradorId);
        const col = db.getColaborador(c.colaboradorId);
        if (col) siglas.push(col.sigla);
      }
    }
  }
  if (siglas.length <= 3) return siglas.join("·");
  return siglas.slice(0, 3).join("·") + `+${siglas.length - 3}`;
}

function buildBarTooltip(viagem, hasConflict) {
  const period = db.getViagemPeriod(viagem);
  const barragens = [
    ...new Set(viagem.paradas.map((p) => db.getBarragemNome(p.barragemId))),
  ].join(", ");
  const team = viagem.paradas
    .flatMap((p) =>
      p.colaboradores.map(
        (c) => db.getColaborador(c.colaboradorId)?.sigla || "",
      ),
    )
    .filter(Boolean);
  const uniqueTeam = [...new Set(team)];
  let tip = `${viagem.id} — ${viagem.nome}\n${barragens}\n${formatDate(period?.inicio)} → ${formatDate(period?.fim)}\nEquipe: ${uniqueTeam.join(", ")}\nStatus: ${viagem.status}`;
  if (hasConflict) tip += "\n⚠ CONFLITO";
  return tip;
}

// ============================================================
// FILTER LOGIC
// ============================================================
function toggleFilterViagem(id) {
  const idx = CalState.filters.viagens.indexOf(id);
  if (idx >= 0) {
    CalState.filters.viagens.splice(idx, 1);
  } else {
    CalState.filters.viagens.push(id);
    // Auto-add colaboradores from this viagem
    const v = db.getViagem(id);
    if (v) {
      const colIds = v.paradas.flatMap((p) =>
        p.colaboradores.map((c) => c.colaboradorId),
      );
      for (const cid of [...new Set(colIds)]) {
        if (!CalState.filters.colaboradores.includes(cid))
          CalState.filters.colaboradores.push(cid);
      }
    }
  }
  renderCalendarPage();
}

function toggleFilterColaborador(id) {
  const idx = CalState.filters.colaboradores.indexOf(id);
  if (idx >= 0) CalState.filters.colaboradores.splice(idx, 1);
  else CalState.filters.colaboradores.push(id);
  renderCalendarPage();
}

function clearFilters() {
  CalState.filters = { viagens: [], colaboradores: [] };
  renderCalendarPage();
}

function hasActiveFilters() {
  return (
    CalState.filters.viagens.length > 0 ||
    CalState.filters.colaboradores.length > 0
  );
}

function isFiltered(viagemId) {
  if (!hasActiveFilters()) return false;
  const vMatch =
    CalState.filters.viagens.length === 0 ||
    CalState.filters.viagens.includes(viagemId);
  const cMatch = (() => {
    if (CalState.filters.colaboradores.length === 0) return true;
    const v = db.getViagem(viagemId);
    if (!v) return false;
    const vCols = v.paradas.flatMap((p) =>
      p.colaboradores.map((c) => c.colaboradorId),
    );
    return CalState.filters.colaboradores.some((cid) => vCols.includes(cid));
  })();
  return !(vMatch && cMatch);
}

function getColaboradoresComViagens() {
  const colIds = new Set();
  for (const v of db.data.viagens) {
    if (v.status === "Cancelado") continue;
    for (const p of v.paradas || []) {
      for (const c of p.colaboradores || []) colIds.add(c.colaboradorId);
    }
  }
  return db.data.colaboradores.filter((c) => colIds.has(c.id));
}

// ============================================================
// SCROLL HELPERS
// ============================================================
function scrollToCurrentMonth() {
  const m = new Date().getMonth();
  scrollToMonth(m);
}

function scrollToMonth(m) {
  const prefix = CalState.mode === "equipe" ? "month-equipe" : "month";
  const el = document.getElementById(`${prefix}-${CalState.year}-${m}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyZoom() {
  if (CalState.mode === "equipe") {
    renderTeamCalendarPage();
  } else {
    renderCalendarPage();
  }
  // Sync timeline if it's currently visible
  if (typeof renderTimeline === "function") {
    const tlView = document.getElementById("view-timeline");
    if (tlView && tlView.classList.contains("active")) renderTimeline();
  }
}

// ============================================================
// TEAM CALENDAR (Calendário de Equipe)
// ============================================================
function renderTeamCalendarPage() {
  const container = document.getElementById("view-calendar-equipe");
  if (!container) return;
  container.innerHTML = "";

  const page = document.createElement("div");
  page.className = "calendar-page";
  page.appendChild(buildCalSidebar());

  const main = document.createElement("div");
  main.className = "cal-content";
  main.id = "cal-content-equipe";

  // Capacity bar
  main.appendChild(buildCapacityBar());

  // Header bar
  main.appendChild(buildCalHeaderBar());

  // Months — hide past months for current year
  const todayTeam = new Date();
  const currentMTeam =
    CalState.year === todayTeam.getFullYear() ? todayTeam.getMonth() : 0;
  const isPastYearTeam = CalState.year < todayTeam.getFullYear();

  if (currentMTeam > 0 && !isPastYearTeam) {
    const pastSec = document.createElement("div");
    pastSec.className = "past-months-section";
    const pastBtn = document.createElement("button");
    pastBtn.className = "past-months-toggle";
    pastBtn.textContent = `▼ Ver ${currentMTeam} ${currentMTeam === 1 ? "mês anterior" : "meses anteriores"} (${MONTHS_PT[0]} – ${MONTHS_PT[currentMTeam - 1]})`;
    const pastContainer = document.createElement("div");
    pastContainer.style.display = "none";
    for (let m = 0; m < currentMTeam; m++)
      pastContainer.appendChild(buildTeamMonthBlock(CalState.year, m));
    pastBtn.onclick = () => {
      const open = pastContainer.style.display !== "none";
      pastContainer.style.display = open ? "none" : "block";
      pastBtn.textContent = open
        ? `▼ Ver ${currentMTeam} ${currentMTeam === 1 ? "mês anterior" : "meses anteriores"} (${MONTHS_PT[0]} – ${MONTHS_PT[currentMTeam - 1]})`
        : `▲ Ocultar meses anteriores`;
    };
    pastSec.append(pastBtn, pastContainer);
    main.appendChild(pastSec);
  }

  for (let m = isPastYearTeam ? 0 : currentMTeam; m < 12; m++) {
    main.appendChild(buildTeamMonthBlock(CalState.year, m));
  }

  page.appendChild(main);
  container.appendChild(page);
  scrollToCurrentMonth();
}

function buildCapacityBar() {
  const week = getCurrentWeekRange();
  const activeColabs = db.data.colaboradores.filter(
    (c) => c.status === "Ativo",
  );
  const total = activeColabs.length;

  let inField = 0;
  for (const c of activeColabs) {
    for (const v of db.data.viagens) {
      if (v.status === "Cancelado") continue;
      for (const p of v.paradas || []) {
        const found = (p.colaboradores || []).find(
          (col) =>
            col.colaboradorId === c.id &&
            datesOverlap(col.dataInicio, col.dataFim, week.start, week.end),
        );
        if (found) {
          inField++;
          break;
        }
      }
      // Break outer loop if already counted
    }
  }

  const pct = total > 0 ? Math.round((inField / total) * 100) : 0;

  const bar = document.createElement("div");
  bar.className = "team-capacity";
  bar.innerHTML = `
    <span class="cap-label">${inField}/${total}</span>
    <span style="font-size:12px;color:#666">colaboradores em campo esta semana</span>
    <div class="load-bar-wrap" style="max-width:120px">
      <div class="load-bar-fill" style="width:${pct}%"></div>
    </div>
    <span style="font-size:11px;color:var(--c-secondary)">${pct}%</span>
  `;
  bar.onclick = () => showInFieldModal(week.start, week.end);
  return bar;
}

function buildTeamMonthBlock(year, month) {
  const block = document.createElement("div");
  block.className = "month-block";
  block.id = `month-equipe-${year}-${month}`;

  const header = document.createElement("div");
  header.className = "month-header";
  header.textContent = `${MONTHS_PT[month]} ${year}`;
  block.appendChild(header);

  const conflicts = detectConflicts(db.data.viagens);
  const today = isoToday();
  const holidays = db.data.configuracoes.feriados.nacionais
    ? getHolidaysCached(year)
    : {};

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // For each active colaborador, show their bars
  const colaboradores = db.data.colaboradores.filter(
    (c) => c.status === "Ativo" || CalState.showArchived,
  );

  // Week day headers
  const wh = document.createElement("div");
  wh.className = "week-header";
  ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((d, i) => {
    const el = document.createElement("div");
    el.className = "week-header-day" + (i === 0 || i === 6 ? " weekend" : "");
    el.textContent = d;
    wh.appendChild(el);
  });
  block.appendChild(wh);

  const weeks = getMonthWeeks(year, month);

  for (const c of colaboradores) {
    // Row per colaborador
    const colHeader = document.createElement("div");
    colHeader.style.cssText =
      "padding:4px 8px;background:#f0f4f8;border-top:2px solid var(--c-border);font-size:11px;font-weight:700;color:var(--c-primary);display:flex;align-items:center;gap:6px";
    const siglaEl = document.createElement("span");
    siglaEl.className = "sigla-tag";
    siglaEl.textContent = c.sigla;
    colHeader.append(siglaEl, document.createTextNode(c.nome));
    block.appendChild(colHeader);

    for (const week of weeks) {
      const weekRow = buildTeamWeekRow(
        week,
        year,
        month,
        c,
        conflicts,
        holidays,
        today,
      );
      block.appendChild(weekRow);
    }
  }

  return block;
}

function buildTeamWeekRow(
  week,
  year,
  month,
  colaborador,
  conflicts,
  holidays,
  today,
) {
  const weekStart = week[0],
    weekEnd = week[6];
  const weekRow = document.createElement("div");
  weekRow.className = "week-row";
  weekRow.style.minHeight = "40px";

  for (let di = 0; di < 7; di++) {
    const dateStr = week[di];
    const dObj = parseDate(dateStr);
    const cell = document.createElement("div");
    cell.className = "day-cell";
    const isWeekendDay = di === 0 || di === 6;
    if (isWeekendDay) cell.classList.add("weekend");
    if (dateStr === today) cell.classList.add("today");
    if (dObj.getMonth() !== month) cell.classList.add("other-month");

    const dayNum = document.createElement("span");
    dayNum.className = "day-num" + (holidays[dateStr] ? " holiday" : "");
    if (holidays[dateStr]) dayNum.title = holidays[dateStr];
    dayNum.textContent = dObj.getDate();
    cell.appendChild(dayNum);
    weekRow.appendChild(cell);
  }

  // Bars for this colaborador in this week
  const barsLayer = document.createElement("div");
  barsLayer.className = "week-bars-layer";
  barsLayer.style.top = "18px";

  // Find all assignments for this colaborador in this week (using INDIVIDUAL dates)
  const assignments = [];
  for (const v of db.data.viagens) {
    if (v.status === "Cancelado") continue;
    for (const p of v.paradas || []) {
      for (const c of p.colaboradores || []) {
        if (c.colaboradorId !== colaborador.id) continue;
        // #17 — use individual colAssign dates, NOT parada/viagem period
        if (datesOverlap(c.dataInicio, c.dataFim, weekStart, weekEnd)) {
          assignments.push({ viagem: v, parada: p, colAssign: c });
        }
      }
    }
  }

  // #17 — assign lanes properly: non-overlapping assignments share lane 0 (appear as
  // separate bars with a gap); only genuine overlaps (conflicts) go to lane 1+
  const laneSlots = []; // laneSlots[lane] = [{inicio, fim}]
  const laneAssignments = assignments.map((asgn) => {
    const { colAssign } = asgn;
    for (let lane = 0; lane < laneSlots.length; lane++) {
      const blocked = laneSlots[lane].some((slot) =>
        datesOverlap(
          slot.inicio,
          slot.fim,
          colAssign.dataInicio,
          colAssign.dataFim,
        ),
      );
      if (!blocked) {
        laneSlots[lane].push({
          inicio: colAssign.dataInicio,
          fim: colAssign.dataFim,
        });
        return { ...asgn, lane };
      }
    }
    // No free lane found — open a new one
    laneSlots.push([{ inicio: colAssign.dataInicio, fim: colAssign.dataFim }]);
    return { ...asgn, lane: laneSlots.length - 1 };
  });

  for (const { viagem, parada, colAssign, lane } of laneAssignments) {
    const barStart =
      colAssign.dataInicio < weekStart ? weekStart : colAssign.dataInicio;
    const barEnd = colAssign.dataFim > weekEnd ? weekEnd : colAssign.dataFim;
    const startDow = parseDate(barStart).getDay();
    const endDow = parseDate(barEnd).getDay();
    const isStart = colAssign.dataInicio >= weekStart;
    const isEnd = colAssign.dataFim <= weekEnd;

    const hasConf = conflicts.some(
      (c) =>
        c.colaboradorId === colaborador.id &&
        (c.viagemId1 === viagem.id || c.viagemId2 === viagem.id),
    );

    while (barsLayer.children.length <= lane) {
      const r = document.createElement("div");
      r.className = "week-bar-row";
      r.style.height = 22 * GlobalCalZoom.value + "px";
      barsLayer.appendChild(r);
    }

    const barRow = barsLayer.children[lane];
    const color = db.getViagemColor(viagem.id);
    const bar = document.createElement("div");
    // #3 — Dashed = Previsto; Sólida = demais status
    const colDashed = viagem.status === "Previsto";
    bar.className =
      "trip-bar" + (colDashed ? " dashed" : "") + (hasConf ? " conflict" : "");
    bar.style.background = hasConf ? "#ffcdd2" : color;
    bar.style.setProperty("--bar-color", color);
    if (!isStart) bar.classList.add("no-left");
    if (!isEnd) bar.classList.add("no-right");

    const cellW = 100 / 7;
    const teamZoom = GlobalCalZoom.value;
    bar.style.left = `${startDow * cellW}%`;
    bar.style.width = `${(endDow - startDow + 1) * cellW}%`;
    bar.style.height = 20 * teamZoom + "px";
    bar.style.fontSize = 10 * teamZoom + "px";

    const bSigla = db.getBarragemSigla(parada.barragemId);
    bar.innerHTML = `<span class="bar-sigla" style="font-family:var(--font-mono);font-weight:700">${bSigla}</span>`;
    // Tooltip: personal period + viagem info
    const personalPeriod = `${formatDate(colAssign.dataInicio)} → ${formatDate(colAssign.dataFim)}`;
    const baseTooltip = buildBarTooltip(viagem, hasConf);
    bar.title = hasConf
      ? `${colaborador.sigla} — conflito com ${viagem.id}\n${personalPeriod}`
      : `${baseTooltip}\n${colaborador.sigla}: ${personalPeriod}`;

    bar.onclick = (e) => {
      e.stopPropagation();
      openDetailPanel("viagem", viagem.id);
    };
    barRow.appendChild(bar);
  }

  weekRow.appendChild(barsLayer);
  return weekRow;
}

function showInFieldModal(start, end) {
  const activeColabs = db.data.colaboradores.filter(
    (c) => c.status === "Ativo",
  );
  const inField = [];
  for (const c of activeColabs) {
    for (const v of db.data.viagens) {
      if (v.status === "Cancelado") continue;
      for (const p of v.paradas || []) {
        const found = (p.colaboradores || []).find(
          (col) =>
            col.colaboradorId === c.id &&
            datesOverlap(col.dataInicio, col.dataFim, start, end),
        );
        if (found) {
          inField.push({ col: c, viagem: v });
          break;
        }
      }
    }
  }
  const html = inField.length
    ? inField
        .map(
          ({ col, viagem }) =>
            `<div style="padding:5px 0;border-bottom:1px solid #eee;font-size:12px"><span class="sigla-tag">${col.sigla}</span> ${col.nome} — ${viagem.id}</div>`,
        )
        .join("")
    : '<p style="color:#888;font-size:12px">Nenhum colaborador em campo nesta semana.</p>';
  openConfirm(
    `Em campo (${formatDate(start)} → ${formatDate(end)})`,
    html,
    null,
    "Fechar",
    null,
  );
}

// ============================================================
// EXPORT / PRESENTATION
// ============================================================
function openExportModal() {
  const body = `
    <div class="form-row" style="margin-bottom:4px">
      <div class="form-group narrow">
        <label class="form-label">Formato</label>
        <select class="form-control" id="exp-format">
          <option value="A4">A4</option>
          <option value="A3">A3</option>
        </select>
      </div>
    </div>
    <div class="form-row" style="margin-bottom:4px">
      <div class="form-group">
        <label class="form-label">De (mês/ano)</label>
        <input type="month" class="form-control" id="exp-from" value="${CalState.year}-01">
      </div>
      <div class="form-group">
        <label class="form-label">Até (mês/ano)</label>
        <input type="month" class="form-control" id="exp-to" value="${CalState.year}-12">
      </div>
    </div>
    <div class="settings-row" style="padding:8px 0">
      <label style="font-size:13px;color:var(--c-text)">Incluir alertas de conflito</label>
      <label class="toggle-switch"><input type="checkbox" id="exp-conflicts" checked><span class="toggle-slider"></span></label>
    </div>
  `;
  openConfirm(
    "📄 Exportar Calendário PDF",
    body,
    () => {
      const fmt = document.getElementById("exp-format")?.value || "A4";
      const fromVal = document.getElementById("exp-from")?.value; // 'YYYY-MM'
      const toVal = document.getElementById("exp-to")?.value; // 'YYYY-MM'

      // 1. Apply selected paper format
      let styleEl = document.getElementById("print-page-style");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "print-page-style";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `@media print { @page { size: ${fmt} landscape; margin: 8mm; } }`;

      // 2. Force-show past-months containers so all months are in the DOM
      const forcedContainers = [];
      document.querySelectorAll(".past-months-section > div").forEach((el) => {
        if (el.style.display === "none" || el.style.display === "") {
          forcedContainers.push({ el, prev: el.style.display });
          el.style.display = "block";
        }
      });

      // 3. Period filter: mark month blocks outside De/Até as excluded
      const excludedBlocks = [];
      if (fromVal && toVal) {
        const [fromY, fromM] = fromVal.split("-").map(Number);
        const [toY, toM] = toVal.split("-").map(Number);
        document.querySelectorAll(".month-block").forEach((el) => {
          // IDs: month-YYYY-M  or  month-equipe-YYYY-M  (month index is 0-based)
          const match = el.id.match(/month(?:-equipe)?-(\d{4})-(\d+)/);
          if (!match) return;
          const bDate = +match[1] * 100 + (+match[2] + 1); // 1-based month
          const fDate = fromY * 100 + fromM;
          const tDate = toY * 100 + toM;
          if (bDate < fDate || bDate > tDate) {
            el.classList.add("print-exclude");
            excludedBlocks.push(el);
          }
        });
      }

      // 4. Mark first non-excluded month to suppress the page-break-before
      document
        .querySelectorAll(".print-first-month")
        .forEach((el) => el.classList.remove("print-first-month"));
      const firstVisible = document.querySelector(
        ".month-block:not(.print-exclude)",
      );
      if (firstVisible) firstVisible.classList.add("print-first-month");

      // 5. Print; clean up after the dialog closes
      const cleanup = () => {
        forcedContainers.forEach(({ el, prev }) => {
          el.style.display = prev;
        });
        excludedBlocks.forEach((el) => el.classList.remove("print-exclude"));
        document
          .querySelectorAll(".print-first-month")
          .forEach((el) => el.classList.remove("print-first-month"));
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      setTimeout(() => window.print(), 80);
    },
    "Imprimir",
    "Cancelar",
  );
}

function enterPresentationMode() {
  document.body.classList.add("presentation-mode");
}

function exitPresentationMode() {
  document.body.classList.remove("presentation-mode");
}

// ============================================================
// DRAG & RESIZE — Trip bars in calendar
// ============================================================
function addBarDragBehavior(bar, lh, rh, viagem) {
  const doStartDrag = (e, type) => {
    if (viagem.status === "Concluído" || viagem.status === "Cancelado") return;
    e.preventDefault();
    e.stopPropagation();

    const weekRow = bar.closest(".week-row");
    const dayPx = weekRow ? weekRow.offsetWidth / 7 : 100;
    let deltaDays = 0;
    const startX = e.clientX;

    bar.classList.add("dragging");
    document.body.style.userSelect = "none";
    document.body.style.cursor = type === "move" ? "grabbing" : "ew-resize";

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      deltaDays = Math.round(dx / dayPx);
      if (type === "move") {
        bar.style.transform = `translateX(${deltaDays * dayPx}px)`;
      }
    };

    const onUp = () => {
      bar.classList.remove("dragging");
      bar.style.transform = "";
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      if (deltaDays !== 0) {
        if (type === "move") applyViagemDateShift(viagem.id, deltaDays);
        else if (type === "resize-left")
          applyViagemStartShift(viagem.id, deltaDays);
        else if (type === "resize-right")
          applyViagemEndShift(viagem.id, deltaDays);
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  bar.addEventListener("mousedown", (e) => {
    if (e.target === lh || e.target === rh) return;
    doStartDrag(e, "move");
  });
  lh.addEventListener("mousedown", (e) => doStartDrag(e, "resize-left"));
  rh.addEventListener("mousedown", (e) => doStartDrag(e, "resize-right"));
}

function applyViagemDateShift(viagemId, deltaDays) {
  if (!deltaDays) return;
  const v = db.getViagem(viagemId);
  if (!v) return;
  for (const p of v.paradas) {
    p.dataInicio = addDays(p.dataInicio, deltaDays);
    p.dataFim = addDays(p.dataFim, deltaDays);
    for (const c of p.colaboradores) {
      c.dataInicio = addDays(c.dataInicio, deltaDays);
      c.dataFim = addDays(c.dataFim, deltaDays);
    }
  }
  db.saveViagem(v);
  renderCalendarPage();
  showToast(
    `${v.id} movida ${deltaDays > 0 ? "+" : ""}${deltaDays} dia(s)`,
    "success",
  );
}

function applyViagemStartShift(viagemId, deltaDays) {
  if (!deltaDays) return;
  const v = db.getViagem(viagemId);
  if (!v || !v.paradas.length) return;
  const p = v.paradas[0];
  const newStart = addDays(p.dataInicio, deltaDays);
  if (newStart >= p.dataFim) return;
  const oldStart = p.dataInicio;
  p.dataInicio = newStart;
  for (const c of p.colaboradores) {
    if (c.dataInicio === oldStart) c.dataInicio = newStart;
  }
  db.saveViagem(v);
  renderCalendarPage();
  showToast(`${v.id}: início ajustado`, "success");
}

function applyViagemEndShift(viagemId, deltaDays) {
  if (!deltaDays) return;
  const v = db.getViagem(viagemId);
  if (!v || !v.paradas.length) return;
  const p = v.paradas[v.paradas.length - 1];
  const newEnd = addDays(p.dataFim, deltaDays);
  if (newEnd <= p.dataInicio) return;
  const oldEnd = p.dataFim;
  p.dataFim = newEnd;
  for (const c of p.colaboradores) {
    if (c.dataFim === oldEnd) c.dataFim = newEnd;
  }
  db.saveViagem(v);
  renderCalendarPage();
  showToast(`${v.id}: fim ajustado`, "success");
}
