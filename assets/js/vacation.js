"use strict";

// ============================================================
// VACATION CALENDAR STATE
// ============================================================
const VacState = {
  year: new Date().getFullYear(),
  filters: { colaboradores: [] },
};

// ============================================================
// VACATION PAGE
// ============================================================
function renderVacationPage() {
  const container = document.getElementById("view-ferias");
  if (!container) return;
  container.innerHTML = "";

  const page = document.createElement("div");
  page.className = "calendar-page vacation-page";

  page.appendChild(buildVacationSidebar());

  const main = document.createElement("div");
  main.className = "cal-content";
  main.id = "cal-content-ferias";

  const header = document.createElement("div");
  header.className = "vacation-header-bar";
  header.innerHTML = `
    <div>
      <h2 class="vacation-title">Férias da Equipe</h2>
      <p class="vacation-subtitle">Visão mensal — estilo calendário de equipe</p>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button class="btn btn-outline btn-sm" id="vac-export-btn">⬇ Exportar PDF</button>
      <button class="btn btn-primary btn-sm" id="vac-add-btn">+ Registrar férias</button>
    </div>
  `;
  header.querySelector("#vac-add-btn").onclick = () => openFeriasModal();
  header.querySelector("#vac-export-btn").onclick = () => openExportModal();

  const stickyTop = document.createElement("div");
  stickyTop.className = "cal-sticky-top";
  stickyTop.appendChild(header);
  stickyTop.appendChild(buildVacationFilterBar());
  main.appendChild(stickyTop);

  appendCalendarMonths(main, VacState.year, buildVacationMonthBlock);

  page.appendChild(main);
  container.appendChild(page);
  scrollToCurrentMonth();
}

function buildVacationSidebar() {
  const sidebar = document.createElement("div");
  sidebar.className = "cal-sidebar";

  const yearRow = document.createElement("div");
  yearRow.className = "cal-sidebar-year";

  const cfg = db.data.configuracoes;
  const minYear = cfg.anoInicial || 2024;
  const maxYear = cfg.anoFinal || 2028;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "◀";
  prevBtn.onclick = () => {
    if (VacState.year > minYear) {
      VacState.year--;
      renderVacationPage();
    }
  };

  const sel = document.createElement("select");
  for (let y = minYear; y <= maxYear; y++) {
    const o = document.createElement("option");
    o.value = y;
    o.textContent = y;
    if (y === VacState.year) o.selected = true;
    sel.appendChild(o);
  }
  sel.onchange = () => {
    VacState.year = +sel.value;
    renderVacationPage();
  };

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "▶";
  nextBtn.onclick = () => {
    if (VacState.year < maxYear) {
      VacState.year++;
      renderVacationPage();
    }
  };

  yearRow.append(prevBtn, sel, nextBtn);
  sidebar.appendChild(yearRow);

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

  const todayBtn = document.createElement("button");
  todayBtn.className = "cal-sidebar-today";
  todayBtn.textContent = "📅 Ir para Hoje";
  todayBtn.onclick = () => {
    VacState.year = new Date().getFullYear();
    renderVacationPage();
    setTimeout(scrollToCurrentMonth, 50);
  };
  sidebar.appendChild(todayBtn);

  const today = new Date();
  for (let m = 0; m < 12; m++) {
    const link = document.createElement("div");
    link.className = "cal-month-link";
    if (VacState.year === today.getFullYear() && m === today.getMonth()) {
      link.classList.add("current-month");
    }
    link.textContent = MONTHS_PT[m];
    link.dataset.month = m;
    link.onclick = () => scrollToMonth(m);
    sidebar.appendChild(link);
  }

  sidebar.appendChild(buildVacationLegend());
  return sidebar;
}

function buildVacationFilterBar() {
  const bar = document.createElement("div");
  bar.className = "cal-header-bar vacation-filter-bar";

  const filtersDiv = document.createElement("div");
  filtersDiv.className = "cal-filters";

  const label = document.createElement("span");
  label.className = "cal-filters-label";
  label.textContent = "FILTRAR POR:";
  filtersDiv.appendChild(label);

  const colaboradores = db.getActiveColaboradores();
  for (const c of colaboradores) {
    const btn = document.createElement("button");
    const active = VacState.filters.colaboradores.includes(c.id);
    btn.className = "filter-btn" + (active ? " active" : "");
    btn.textContent = c.sigla;
    btn.title = c.nome;
    btn.style.borderColor = db.getColaboradorColor(c.id);
    if (active) btn.style.background = db.getColaboradorColor(c.id);
    btn.onclick = () => toggleVacationFilterColaborador(c.id);
    filtersDiv.appendChild(btn);
  }

  const clearBtn = document.createElement("button");
  clearBtn.className =
    "filter-clear" +
    (VacState.filters.colaboradores.length > 0 ? " visible" : "");
  clearBtn.textContent = "✕ Limpar filtros";
  clearBtn.onclick = clearVacationFilters;
  filtersDiv.appendChild(clearBtn);

  bar.appendChild(filtersDiv);
  return bar;
}

function toggleVacationFilterColaborador(id) {
  const idx = VacState.filters.colaboradores.indexOf(id);
  if (idx >= 0) VacState.filters.colaboradores.splice(idx, 1);
  else VacState.filters.colaboradores.push(id);
  renderVacationPage();
}

function clearVacationFilters() {
  VacState.filters.colaboradores = [];
  renderVacationPage();
}

function getFilteredVacationColaboradores() {
  const colaboradores = db.getActiveColaboradores();
  if (VacState.filters.colaboradores.length === 0) return colaboradores;
  return colaboradores.filter((c) =>
    VacState.filters.colaboradores.includes(c.id),
  );
}

function buildVacationLegend() {
  const leg = document.createElement("div");
  leg.className = "cal-legend";
  leg.innerHTML = '<div class="cal-legend-title">Colaboradores</div>';

  const colaboradores = db.getActiveColaboradores();
  for (const c of colaboradores) {
    const item = document.createElement("div");
    item.className = "cal-legend-item";
    const swatch = document.createElement("div");
    swatch.className = "cal-legend-color";
    swatch.style.background = db.getColaboradorColor(c.id);
    const lbl = document.createElement("span");
    lbl.textContent = `${c.sigla} · ${c.nome}`;
    item.append(swatch, lbl);
    leg.appendChild(item);
  }
  return leg;
}

function buildVacationMonthBlock(year, month) {
  const block = document.createElement("div");
  block.className = "month-block vacation-month-block";
  block.id = `month-ferias-${year}-${month}`;

  const header = document.createElement("div");
  header.className = "month-header";
  header.textContent = `${MONTHS_PT[month]} ${year}`;
  block.appendChild(header);

  const holidays = db.data.configuracoes.feriados.nacionais
    ? getHolidaysCached(year)
    : {};
  const today = isoToday();
  const colaboradores = getFilteredVacationColaboradores();

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

  if (!colaboradores.length) {
    const empty = document.createElement("p");
    empty.style.cssText = "padding:16px;color:#888;font-size:13px";
    empty.textContent = VacState.filters.colaboradores.length
      ? "Nenhum colaborador corresponde ao filtro selecionado."
      : "Nenhum colaborador ativo cadastrado.";
    block.appendChild(empty);
    return block;
  }

  for (const c of colaboradores) {
    const colHeader = document.createElement("div");
    colHeader.className = "vacation-person-header";
    const colorDot = document.createElement("span");
    colorDot.className = "vacation-color-dot";
    colorDot.style.background = db.getColaboradorColor(c.id);
    const siglaEl = document.createElement("span");
    siglaEl.className = "sigla-tag";
    siglaEl.textContent = c.sigla;
    colHeader.append(colorDot, siglaEl, document.createTextNode(c.nome));
    block.appendChild(colHeader);

    for (const week of weeks) {
      block.appendChild(
        buildVacationWeekRow(week, year, month, c, holidays, today),
      );
    }
  }

  return block;
}

function buildVacationWeekRow(week, year, month, colaborador, holidays, today) {
  const weekStart = week[0];
  const weekEnd = week[6];
  const weekRow = document.createElement("div");
  weekRow.className = "week-row vacation-week-row";
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

    cell.ondblclick = () => {
      openFeriasModal(null, {
        colaboradorId: colaborador.id,
        dataInicio: dateStr,
        dataFim: dateStr,
      });
    };
    weekRow.appendChild(cell);
  }

  const barsLayer = document.createElement("div");
  barsLayer.className = "week-bars-layer";
  barsLayer.style.top = "18px";

  const entries = db
    .getFerias(colaborador.id)
    .filter((f) => datesOverlap(f.dataInicio, f.dataFim, weekStart, weekEnd));

  for (const entry of entries) {
    const barStart =
      entry.dataInicio < weekStart ? weekStart : entry.dataInicio;
    const barEnd = entry.dataFim > weekEnd ? weekEnd : entry.dataFim;
    const startDow = parseDate(barStart).getDay();
    const endDow = parseDate(barEnd).getDay();
    const isStart = entry.dataInicio >= weekStart;
    const isEnd = entry.dataFim <= weekEnd;
    const color = db.getColaboradorColor(colaborador.id);

    const barRow = document.createElement("div");
    barRow.className = "week-bar-row";
    barRow.style.height = 22 * GlobalCalZoom.value + "px";

    const bar = document.createElement("div");
    bar.className = "trip-bar vacation-bar";
    bar.style.background = color;
    bar.style.setProperty("--bar-color", color);
    if (!isStart) bar.classList.add("no-left");
    if (!isEnd) bar.classList.add("no-right");

    const cellW = 100 / 7;
    bar.style.left = `${startDow * cellW}%`;
    bar.style.width = `${(endDow - startDow + 1) * cellW}%`;
    bar.style.height = 20 * GlobalCalZoom.value + "px";
    bar.style.fontSize = 10 * GlobalCalZoom.value + "px";
    bar.innerHTML = `<span class="bar-sigla">Férias</span>`;
    bar.title = `${colaborador.sigla} — Férias\n${formatDate(entry.dataInicio)} → ${formatDate(entry.dataFim)}${entry.observacao ? "\n" + entry.observacao : ""}`;

    bar.onclick = (e) => {
      e.stopPropagation();
      openFeriasModal(entry.id);
    };

    barRow.appendChild(bar);
    barsLayer.appendChild(barRow);
  }

  weekRow.appendChild(barsLayer);
  return weekRow;
}

// ============================================================
// VACATION MODAL
// ============================================================
function openFeriasModal(feriasId, prefill) {
  const existing = feriasId ? db.getFeriasEntry(feriasId) : null;
  const colaboradores = db.getActiveColaboradores();

  const body = `
    <div class="form-group">
      <label class="form-label">Colaborador</label>
      <select class="form-control" id="ferias-colab">
        ${colaboradores
          .map(
            (c) =>
              `<option value="${c.id}" ${(existing?.colaboradorId || prefill?.colaboradorId) === c.id ? "selected" : ""}>${c.sigla} — ${escapeHtml(c.nome)}</option>`,
          )
          .join("")}
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data início</label>
        <input type="date" class="form-control" id="ferias-inicio" value="${existing?.dataInicio || prefill?.dataInicio || isoToday()}">
      </div>
      <div class="form-group">
        <label class="form-label">Data fim</label>
        <input type="date" class="form-control" id="ferias-fim" value="${existing?.dataFim || prefill?.dataFim || isoToday()}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Observação (opcional)</label>
      <input type="text" class="form-control" id="ferias-obs" value="${escapeHtml(existing?.observacao || "")}" placeholder="Ex: férias programadas">
    </div>
    ${
      existing
        ? '<div style="margin-top:12px"><button type="button" class="btn btn-ghost btn-sm" id="ferias-delete-btn" style="color:var(--c-error)">🗑 Excluir férias</button></div>'
        : ""
    }
  `;

  const title = existing ? "Editar férias" : "Registrar férias";
  const okLabel = existing ? "Salvar" : "Registrar";

  openConfirm(
    `🏖️ ${title}`,
    body,
    () => {
      const colaboradorId = document.getElementById("ferias-colab")?.value;
      const dataInicio = document.getElementById("ferias-inicio")?.value;
      const dataFim = document.getElementById("ferias-fim")?.value;
      const observacao =
        document.getElementById("ferias-obs")?.value?.trim() || "";

      if (!colaboradorId || !dataInicio || !dataFim) {
        showToast("Preencha colaborador e datas.", "error");
        return;
      }
      if (dataFim < dataInicio) {
        showToast("Data fim deve ser igual ou posterior à data início.", "error");
        return;
      }

      const entry = {
        id: existing?.id || db.nextFeriasId(),
        colaboradorId,
        dataInicio,
        dataFim,
        observacao,
      };

      persistDb(db.saveFerias(entry), "Férias salvas").then((ok) => {
        if (ok !== false && App.currentView === "ferias") renderVacationPage();
      });
    },
    okLabel,
    "Cancelar",
  );

  if (existing) {
    setTimeout(() => {
      const delBtn = document.getElementById("ferias-delete-btn");
      if (!delBtn) return;
      delBtn.onclick = () => {
        document.getElementById("confirm-overlay")?.classList.add("hidden");
        openConfirm(
          "Excluir férias?",
          "Esta ação não pode ser desfeita.",
          () => {
            persistDb(db.deleteFerias(existing.id), "Férias removidas").then(
              (ok) => {
                if (ok !== false && App.currentView === "ferias")
                  renderVacationPage();
              },
            );
          },
          "Excluir",
          "Cancelar",
        );
      };
    }, 0);
  }
}
