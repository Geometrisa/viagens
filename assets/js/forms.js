"use strict";

// ============================================================
// VIAGEM MODAL — Create / Edit
// ============================================================
let _currentViagemDraft = null;
let _originalViagemSnapshot = null;
let _viagemModalKeyHandler = null;

function _isViagemDirty() {
  if (!_originalViagemSnapshot) return true; // new viagem always dirty
  return JSON.stringify(_currentViagemDraft) !== _originalViagemSnapshot;
}

function openViagemModal(viagemId, prefillData) {
  const viagem = viagemId ? db.getViagem(viagemId) : null;

  if (viagem) {
    _currentViagemDraft = JSON.parse(JSON.stringify(viagem));
    _originalViagemSnapshot = JSON.stringify(viagem);
  } else {
    const newId = db.nextViagemId();
    _currentViagemDraft = {
      id: newId,
      nome: "",
      status: "Previsto",
      observacoes: "",
      paradas: [newParadaDraft(null, prefillData)],
    };
    // #7 — snapshot do estado inicial; só pergunta descarte se o usuário realmente editou algo
    _originalViagemSnapshot = JSON.stringify(_currentViagemDraft);
  }

  const overlay = document.getElementById("viagem-modal-overlay");
  const titleEl = overlay.querySelector(".modal-header h2");
  titleEl.textContent = viagem ? `Editar Viagem ${viagem.id}` : "Nova Viagem";

  renderViagemForm();
  overlay.classList.remove("hidden");

  // Keyboard: Enter = save, Esc = close
  if (_viagemModalKeyHandler)
    overlay.removeEventListener("keydown", _viagemModalKeyHandler);
  _viagemModalKeyHandler = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      e.target.tagName !== "TEXTAREA" &&
      e.target.tagName !== "SELECT" &&
      !e.target.closest(".colab-search-row")
    ) {
      e.preventDefault();
      saveViagemDraft();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      closeViagemModal();
    }
  };
  overlay.addEventListener("keydown", _viagemModalKeyHandler);
  // Focus first focusable element
  setTimeout(() => overlay.querySelector("select,input,textarea")?.focus(), 50);
}

function closeViagemModal(forceClose) {
  const overlay = document.getElementById("viagem-modal-overlay");
  if (_viagemModalKeyHandler) {
    overlay.removeEventListener("keydown", _viagemModalKeyHandler);
    _viagemModalKeyHandler = null;
  }
  if (!forceClose && _isViagemDirty()) {
    openConfirm(
      "Descartar alterações?",
      "As alterações não salvas serão perdidas.",
      () => {
        overlay.classList.add("hidden");
        _currentViagemDraft = null;
        _originalViagemSnapshot = null;
      },
      "Descartar",
      "Continuar editando",
    );
    return;
  }
  overlay.classList.add("hidden");
  _currentViagemDraft = null;
  _originalViagemSnapshot = null;
}

function newParadaDraft(prevParada, prefillData) {
  const id = "p_" + Date.now();
  if (prevParada) {
    return {
      id,
      empreendedorId: prevParada.empreendedorId,
      barragemId: prevParada.barragemId,
      dataInicio: addDays(prevParada.dataFim, 1),
      dataFim: addDays(prevParada.dataFim, 2),
      atividades: [...prevParada.atividades],
      colaboradores: prevParada.colaboradores.map((c) => ({
        ...c,
        dataInicio: addDays(prevParada.dataFim, 1),
        dataFim: addDays(prevParada.dataFim, 2),
        confirmado: false,
      })),
    };
  }
  const today = isoToday();
  const prefill = prefillData || {};
  return {
    id,
    empreendedorId: prefill.empreendedorId || "",
    barragemId: prefill.barragemId || "",
    dataInicio: prefill.dataInicio || today,
    dataFim: prefill.dataFim || addDays(today, 1),
    atividades: [],
    colaboradores: prefill.colaboradores
      ? prefill.colaboradores.map((cId) => ({
          colaboradorId: cId,
          dataInicio: prefill.dataInicio || today,
          dataFim: prefill.dataFim || addDays(today, 1),
          confirmado: false,
        }))
      : [],
  };
}

// ============================================================
// RENDER FORM
// ============================================================
function renderViagemForm() {
  const body = document.getElementById("viagem-modal-body");
  if (!body) return;
  const draft = _currentViagemDraft;

  body.innerHTML = "";

  // Status + Observações row
  const topRow = document.createElement("div");
  topRow.className = "form-row mb-16";

  const statusGroup = document.createElement("div");
  statusGroup.className = "form-group narrow";
  statusGroup.innerHTML = `<label class="form-label">Status</label>`;
  const statusSel = document.createElement("select");
  statusSel.className = "form-control";
  statusSel.id = "vf-status";
  ["Previsto", "Confirmado", "Em campo", "Concluído", "Cancelado"].forEach(
    (s) => {
      const o = document.createElement("option");
      o.value = s;
      o.textContent = s;
      if (s === draft.status) o.selected = true;
      statusSel.appendChild(o);
    },
  );
  statusSel.onchange = () => {
    draft.status = statusSel.value;
  };
  statusGroup.appendChild(statusSel);

  const obsGroup = document.createElement("div");
  obsGroup.className = "form-group";
  obsGroup.innerHTML = `<label class="form-label">Observações <span style="color:#aaa">(opcional)</span></label>`;
  const obsInput = document.createElement("textarea");
  obsInput.className = "form-control";
  obsInput.id = "vf-obs";
  obsInput.rows = 2;
  obsInput.maxLength = 500;
  obsInput.placeholder = "Observações sobre a viagem...";
  obsInput.value = draft.observacoes || "";
  obsInput.oninput = () => {
    draft.observacoes = obsInput.value;
  };
  obsGroup.appendChild(obsInput);

  topRow.append(statusGroup, obsGroup);
  body.appendChild(topRow);

  // Paradas
  for (let i = 0; i < draft.paradas.length; i++) {
    body.appendChild(buildParadaSection(draft.paradas[i], i));
  }

  // Add parada button
  if (draft.paradas.length < 5) {
    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-outline btn-sm mt-8";
    addBtn.textContent = "+ Adicionar parada";
    addBtn.onclick = () => {
      const prev = draft.paradas[draft.paradas.length - 1];
      draft.paradas.push(newParadaDraft(prev));
      renderViagemForm();
    };
    body.appendChild(addBtn);
  }

  // Period total
  const periodDiv = document.createElement("div");
  periodDiv.style.cssText =
    "margin-top:12px;font-size:12px;color:var(--c-secondary);font-weight:600";
  const period = calcDraftPeriod(draft);
  if (period) {
    periodDiv.textContent = `Período total: ${formatDate(period.inicio)} → ${formatDate(period.fim)}`;
  }
  body.appendChild(periodDiv);
}

function buildParadaSection(parada, index) {
  const section = document.createElement("div");
  section.className = "parada-section";
  section.dataset.paradaId = parada.id;

  const header = document.createElement("div");
  header.className = "parada-header";
  header.innerHTML = `<span>PARADA ${index + 1}</span>`;

  if (index > 0) {
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-ghost btn-xs";
    removeBtn.textContent = "✕ Remover";
    removeBtn.onclick = () => {
      _currentViagemDraft.paradas.splice(index, 1);
      renderViagemForm();
    };
    header.appendChild(removeBtn);
  }
  section.appendChild(header);

  const body = document.createElement("div");
  body.className = "parada-body";

  // Empreendedor + Barragem
  const row1 = document.createElement("div");
  row1.className = "form-row";

  const empGroup = document.createElement("div");
  empGroup.className = "form-group";
  empGroup.innerHTML = '<label class="form-label">Empreendedor *</label>';
  const empSel = document.createElement("select");
  empSel.className = "form-control";
  empSel.innerHTML = '<option value="">Selecione...</option>';
  db.data.empreendedores.forEach((e) => {
    const o = document.createElement("option");
    o.value = e.id;
    o.textContent = e.nome;
    if (e.id === parada.empreendedorId) o.selected = true;
    empSel.appendChild(o);
  });
  empSel.onchange = () => {
    parada.empreendedorId = empSel.value;
    parada.barragemId = "";
    renderViagemForm();
  };
  empGroup.appendChild(empSel);

  const barrGroup = document.createElement("div");
  barrGroup.className = "form-group";
  barrGroup.innerHTML = '<label class="form-label">Barragem *</label>';
  const barrSel = document.createElement("select");
  barrSel.className = "form-control";
  barrSel.innerHTML = '<option value="">Selecione...</option>';
  if (parada.empreendedorId) {
    const emp = db.getEmpreendedor(parada.empreendedorId);
    (emp?.barragens || [])
      .filter((b) => b.status === "Ativa")
      .forEach((b) => {
        const o = document.createElement("option");
        o.value = b.id;
        o.textContent = b.nome;
        if (b.id === parada.barragemId) o.selected = true;
        barrSel.appendChild(o);
      });
  }
  barrSel.onchange = () => {
    parada.barragemId = barrSel.value;
  };
  barrGroup.appendChild(barrSel);

  row1.append(empGroup, barrGroup);
  body.appendChild(row1);

  // Dates
  const row2 = document.createElement("div");
  row2.className = "form-row";

  const startGroup = document.createElement("div");
  startGroup.className = "form-group";
  startGroup.innerHTML = '<label class="form-label">Data início *</label>';
  const startInput = document.createElement("input");
  startInput.type = "date";
  startInput.className = "form-control";
  startInput.value = parada.dataInicio;
  startInput.onchange = () => {
    parada.dataInicio = startInput.value;
    if (parada.dataFim <= parada.dataInicio) {
      parada.dataFim = addDays(parada.dataInicio, 1);
      endInput.value = parada.dataFim;
    }
  };
  startGroup.appendChild(startInput);

  const endGroup = document.createElement("div");
  endGroup.className = "form-group";
  endGroup.innerHTML = '<label class="form-label">Data fim *</label>';
  const endInput = document.createElement("input");
  endInput.type = "date";
  endInput.className = "form-control";
  endInput.value = parada.dataFim;
  endInput.onchange = () => {
    if (endInput.value <= parada.dataInicio) {
      endInput.value = parada.dataFim;
      showInlineError(endInput, "Data fim deve ser após a data início.");
    } else {
      parada.dataFim = endInput.value;
      clearInlineError(endInput);
      // Ask to update colaboradores
      if (parada.colaboradores.length > 0) {
        openConfirm(
          "Atualizar datas dos colaboradores?",
          "Deseja atualizar as datas de todos os colaboradores desta parada?",
          () => {
            parada.colaboradores.forEach((c) => {
              c.dataInicio = parada.dataInicio;
              c.dataFim = parada.dataFim;
            });
            renderViagemForm();
          },
          "Atualizar",
          "Manter",
        );
      }
    }
  };
  endGroup.appendChild(endInput);

  row2.append(startGroup, endGroup);
  body.appendChild(row2);

  // Atividades
  body.appendChild(buildAtividadesSelector(parada));

  // Colaboradores
  body.appendChild(buildColaboradoresSection(parada));

  section.appendChild(body);
  return section;
}

// ============================================================
// ATIVIDADES SELECTOR
// ============================================================
function buildAtividadesSelector(parada) {
  const div = document.createElement("div");
  div.className = "atividades-section";

  const hint = document.createElement("p");
  hint.style.cssText = "font-size:11px;color:#888;margin-bottom:6px";
  const selCount = parada.atividades.length;
  hint.textContent =
    selCount === 0
      ? "Selecione uma ou mais atividades"
      : `${selCount} selecionada(s)`;
  div.appendChild(hint);

  const cols = document.createElement("div");
  cols.className = "atividades-cols";

  const segDiv = document.createElement("div");
  segDiv.innerHTML = "<h4>Segurança</h4>";
  const segBtns = document.createElement("div");
  segBtns.className = "atividade-btns";

  const emgDiv = document.createElement("div");
  emgDiv.innerHTML = "<h4>Emergência</h4>";
  const emgBtns = document.createElement("div");
  emgBtns.className = "atividade-btns";

  const atividades = db.data.atividades
    .filter((a) => a.status === "Ativa")
    .sort((a, b) => a.ordem - b.ordem);

  for (const a of atividades) {
    const btn = document.createElement("button");
    btn.className =
      "ativ-btn" + (parada.atividades.includes(a.id) ? " selected" : "");
    btn.innerHTML = `${a.icone} ${a.nome}`;
    btn.onclick = () => {
      const idx = parada.atividades.indexOf(a.id);
      if (idx >= 0) parada.atividades.splice(idx, 1);
      else parada.atividades.push(a.id);
      hint.textContent =
        parada.atividades.length === 0
          ? "Selecione uma ou mais atividades"
          : `${parada.atividades.length} selecionada(s)`;
      btn.classList.toggle("selected", parada.atividades.includes(a.id));
    };
    if (a.categoria === "Segurança") segBtns.appendChild(btn);
    else emgBtns.appendChild(btn);
  }

  segDiv.appendChild(segBtns);
  emgDiv.appendChild(emgBtns);
  cols.append(segDiv, emgDiv);
  div.appendChild(cols);
  return div;
}

// ============================================================
// COLABORADORES SECTION
// ============================================================
function buildColaboradoresSection(parada) {
  const div = document.createElement("div");

  const titleRow = document.createElement("div");
  titleRow.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;margin:10px 0 6px";
  const title = document.createElement("span");
  title.style.cssText =
    "font-size:11px;font-weight:700;color:var(--c-secondary);text-transform:uppercase;letter-spacing:.3px";
  title.textContent = "Colaboradores";
  titleRow.appendChild(title);

  const addAllBtn = document.createElement("button");
  addAllBtn.className = "btn btn-ghost btn-xs";
  addAllBtn.textContent = "+ Adicionar todos";
  addAllBtn.onclick = () => {
    const activeColabs = db.getActiveColaboradores();
    for (const c of activeColabs) {
      if (!parada.colaboradores.find((pc) => pc.colaboradorId === c.id)) {
        parada.colaboradores.push({
          colaboradorId: c.id,
          dataInicio: parada.dataInicio,
          dataFim: parada.dataFim,
          confirmado: false,
        });
      }
    }
    renderViagemForm();
  };
  titleRow.appendChild(addAllBtn);
  div.appendChild(titleRow);

  // Search + add
  const searchRow = document.createElement("div");
  searchRow.className = "colab-search-row";

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "form-control";
  searchInput.placeholder = "Buscar colaborador...";
  searchInput.style.flex = "1";

  const searchList = document.createElement("div");
  searchList.style.cssText =
    "position:absolute;background:#fff;border:1px solid var(--c-border);border-radius:4px;z-index:100;width:240px;max-height:180px;overflow-y:auto;box-shadow:var(--shadow);display:none";

  let searchWrap = document.createElement("div");
  searchWrap.style.position = "relative";
  searchWrap.appendChild(searchInput);
  searchWrap.appendChild(searchList);

  searchInput.oninput = debounce(() => {
    const q = searchInput.value.toLowerCase();
    const activeColabs = db.getActiveColaboradores();
    const results = q
      ? activeColabs.filter(
          (c) =>
            c.nome.toLowerCase().includes(q) ||
            c.sigla.toLowerCase().includes(q),
        )
      : activeColabs;
    searchList.innerHTML = "";
    if (!results.length) {
      searchList.style.display = "none";
      return;
    }
    searchList.style.display = "block";
    results.slice(0, 10).forEach((c) => {
      const item = document.createElement("div");
      item.style.cssText =
        "padding:6px 10px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:6px";
      item.innerHTML = `<span class="sigla-tag">${c.sigla}</span> ${escapeHtml(c.nome)}`;
      item.onmousedown = (e) => {
        e.preventDefault();
        addColaboradorToParada(parada, c.id);
        searchInput.value = "";
        searchList.style.display = "none";
        renderViagemForm();
      };
      item.onmouseover = () => (item.style.background = "var(--c-bg)");
      item.onmouseout = () => (item.style.background = "");
      searchList.appendChild(item);
    });
  }, 200);

  searchInput.onblur = () => {
    setTimeout(() => {
      searchList.style.display = "none";
    }, 200);
  };

  searchInput.addEventListener("keydown", (e) => {
    if (
      (e.key === "Tab" || e.key === "Enter") &&
      searchList.style.display !== "none"
    ) {
      const firstItem = searchList.querySelector("div");
      if (firstItem) {
        e.preventDefault();
        firstItem.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      }
    }
    if (e.key === "Escape") {
      searchList.style.display = "none";
    }
  });

  searchRow.appendChild(searchWrap);
  div.appendChild(searchRow);

  // List of added colaboradores
  const colabList = document.createElement("div");
  colabList.className = "colab-list";

  const allViagens = db.data.viagens;
  const conflicts = detectConflicts(allViagens);

  for (let ci = 0; ci < parada.colaboradores.length; ci++) {
    const ca = parada.colaboradores[ci];
    const col = db.getColaborador(ca.colaboradorId);
    if (!col) continue;

    const item = document.createElement("div");
    item.className = "colab-item";

    // Sigla
    const siglaChip = document.createElement("span");
    siglaChip.className = "sigla-chip";
    siglaChip.textContent = col.sigla;

    // Name
    const nameSpan = document.createElement("span");
    nameSpan.style.cssText = "font-size:12px;flex:1;min-width:60px";
    nameSpan.textContent = col.nome;

    // Dates — individual period for this colaborador (can be shorter than the parada)
    const datesDiv = document.createElement("div");
    datesDiv.className = "colab-dates";

    // Helper: highlight inputs in amber when dates differ from parada (= custom period)
    const isCustomDates = () =>
      ca.dataInicio !== parada.dataInicio || ca.dataFim !== parada.dataFim;
    const refreshHighlight = () => {
      const custom = isCustomDates();
      const color = custom ? "var(--c-alert)" : "";
      dStart.style.borderColor = color;
      dEnd.style.borderColor = color;
      customBadge.style.display = custom ? "inline" : "none";
    };

    const dStart = document.createElement("input");
    dStart.type = "date";
    dStart.value = ca.dataInicio;
    dStart.min = parada.dataInicio; // constrain to parada window
    dStart.max = parada.dataFim;
    dStart.title = `Período da parada: ${formatDate(parada.dataInicio)} → ${formatDate(parada.dataFim)}`;
    dStart.onchange = () => {
      if (dStart.value < parada.dataInicio) dStart.value = parada.dataInicio;
      if (dStart.value > parada.dataFim) dStart.value = parada.dataFim;
      ca.dataInicio = dStart.value;
      if (ca.dataFim < ca.dataInicio) {
        ca.dataFim = ca.dataInicio;
        dEnd.value = ca.dataFim;
      }
      refreshHighlight();
      checkColabConflicts(colabList);
    };

    const dArrow = document.createElement("span");
    dArrow.textContent = "→";
    dArrow.style.fontSize = "11px";

    const dEnd = document.createElement("input");
    dEnd.type = "date";
    dEnd.value = ca.dataFim;
    dEnd.min = parada.dataInicio;
    dEnd.max = parada.dataFim;
    dEnd.title = dStart.title;
    dEnd.onchange = () => {
      if (dEnd.value < parada.dataInicio) dEnd.value = parada.dataInicio;
      if (dEnd.value > parada.dataFim) dEnd.value = parada.dataFim;
      ca.dataFim = dEnd.value;
      if (ca.dataFim < ca.dataInicio) {
        ca.dataInicio = ca.dataFim;
        dStart.value = ca.dataInicio;
      }
      refreshHighlight();
      checkColabConflicts(colabList);
    };

    // Badge shown when this colaborador has a custom (shorter) period
    const customBadge = document.createElement("span");
    customBadge.textContent = "✂ personalizado";
    customBadge.style.cssText =
      "font-size:9px;color:var(--c-alert);font-weight:700;white-space:nowrap;display:none";

    // Button to reset to full parada period
    const resetBtn = document.createElement("button");
    resetBtn.className = "btn btn-ghost btn-xs";
    resetBtn.title = "Resetar para o período da parada";
    resetBtn.textContent = "↺";
    resetBtn.onclick = () => {
      ca.dataInicio = parada.dataInicio;
      dStart.value = ca.dataInicio;
      ca.dataFim = parada.dataFim;
      dEnd.value = ca.dataFim;
      refreshHighlight();
    };

    const extBtn = document.createElement("button");
    extBtn.className = "btn btn-ghost btn-xs";
    extBtn.title = "Estender até fim da viagem";
    extBtn.textContent = "→|";
    extBtn.onclick = () => {
      const period = calcDraftPeriod(_currentViagemDraft);
      if (period) {
        ca.dataFim = period.fim;
        dEnd.value = period.fim;
        refreshHighlight();
      }
    };

    // Apply initial highlight if already custom
    refreshHighlight();

    datesDiv.append(dStart, dArrow, dEnd, customBadge, resetBtn, extBtn);

    // Confirmado
    const confDiv = document.createElement("div");
    confDiv.className = "confirm-check";
    const confCheck = document.createElement("input");
    confCheck.type = "checkbox";
    confCheck.checked = ca.confirmado;
    confCheck.onchange = () => {
      ca.confirmado = confCheck.checked;
    };
    const confLabel = document.createElement("span");
    confLabel.textContent = ca.confirmado ? "✅" : "⏳";
    confCheck.onchange = () => {
      ca.confirmado = confCheck.checked;
      confLabel.textContent = ca.confirmado ? "✅" : "⏳";
    };
    confDiv.append(confCheck, confLabel);

    // Remove
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-icon";
    removeBtn.title = "Remover";
    removeBtn.innerHTML = "✕";
    removeBtn.onclick = () => {
      parada.colaboradores.splice(ci, 1);
      renderViagemForm();
    };

    item.append(siglaChip, nameSpan, datesDiv, confDiv, removeBtn);
    colabList.appendChild(item);

    // Conflict warning for this colaborador
    const confWarnings = conflicts.filter(
      (c) =>
        c.colaboradorId === ca.colaboradorId &&
        _currentViagemDraft &&
        (c.viagemId1 === _currentViagemDraft.id ||
          c.viagemId2 === _currentViagemDraft.id),
    );
    if (confWarnings.length > 0) {
      const warn = document.createElement("div");
      warn.className = "conflict-row";
      const otherId =
        confWarnings[0].viagemId1 === _currentViagemDraft?.id
          ? confWarnings[0].viagemId2
          : confWarnings[0].viagemId1;
      warn.textContent = `⚠️ ${col.sigla} — conflito com ${otherId}`;
      colabList.appendChild(warn);
    }
  }

  div.appendChild(colabList);
  return div;
}

function addColaboradorToParada(parada, colId) {
  // Check if already in same viagem
  const alreadyInViagem = _currentViagemDraft.paradas.some(
    (p, pi) =>
      p !== parada && p.colaboradores.some((c) => c.colaboradorId === colId),
  );
  if (alreadyInViagem) {
    // Show info but allow
  }
  if (parada.colaboradores.find((c) => c.colaboradorId === colId)) return;
  parada.colaboradores.push({
    colaboradorId: colId,
    dataInicio: parada.dataInicio,
    dataFim: parada.dataFim,
    confirmado: false,
  });
}

function checkColabConflicts(container) {
  // Re-run conflict check without full re-render
}

// ============================================================
// VALIDATION + SAVE
// ============================================================
function validateViagemDraft(draft) {
  const errors = [];
  if (!draft.status) errors.push("Status obrigatório.");
  if (!draft.paradas || draft.paradas.length === 0) {
    errors.push("Pelo menos 1 parada obrigatória.");
  }
  for (let i = 0; i < draft.paradas.length; i++) {
    const p = draft.paradas[i];
    const n = i + 1;
    if (!p.empreendedorId)
      errors.push(`Parada ${n}: Empreendedor obrigatório.`);
    if (!p.barragemId) errors.push(`Parada ${n}: Barragem obrigatória.`);
    if (!p.dataInicio) errors.push(`Parada ${n}: Data início obrigatória.`);
    if (!p.dataFim) errors.push(`Parada ${n}: Data fim obrigatória.`);
    if (p.dataFim && p.dataInicio && p.dataFim <= p.dataInicio) {
      errors.push(`Parada ${n}: Data fim deve ser após a data início.`);
    }
    if (p.atividades.length === 0)
      errors.push(`Parada ${n}: Mínimo 1 atividade.`);
    if (p.colaboradores.length === 0)
      errors.push(`Parada ${n}: Mínimo 1 colaborador.`);
    // Validate individual colaborador dates are within parada window
    for (const c of p.colaboradores) {
      const col = db.getColaborador(c.colaboradorId);
      const sig = col ? col.sigla : "?";
      if (c.dataInicio < p.dataInicio || c.dataInicio > p.dataFim)
        errors.push(
          `Parada ${n} — ${sig}: data início fora do período da parada.`,
        );
      if (c.dataFim < p.dataInicio || c.dataFim > p.dataFim)
        errors.push(
          `Parada ${n} — ${sig}: data fim fora do período da parada.`,
        );
      if (c.dataFim < c.dataInicio)
        errors.push(`Parada ${n} — ${sig}: data fim anterior à data início.`);
    }
  }
  // Check parada overlaps
  for (let i = 0; i < draft.paradas.length; i++) {
    for (let j = i + 1; j < draft.paradas.length; j++) {
      const a = draft.paradas[i],
        b = draft.paradas[j];
      if (datesOverlap(a.dataInicio, a.dataFim, b.dataInicio, b.dataFim)) {
        errors.push(`Paradas ${i + 1} e ${j + 1} têm datas sobrepostas.`);
      }
    }
  }
  return errors;
}

function saveViagemDraft() {
  const draft = _currentViagemDraft;
  if (!draft) return;

  const errors = validateViagemDraft(draft);
  if (errors.length > 0) {
    showToast(errors[0], "error");
    return;
  }

  // Ensure colorIndex for new viagens
  const existing = db.getViagem(draft.id);
  if (!existing) {
    draft.colorIndex = db.data.nextColorIndex || 0;
    db.data.nextColorIndex = draft.colorIndex + 1;
  }

  persistDb(db.saveViagem(draft), `Viagem ${draft.id} salva com sucesso!`).then(
    (ok) => {
      if (ok === false) return;
      document.getElementById("viagem-modal-overlay").classList.add("hidden");
      _currentViagemDraft = null;
      App.refresh();
    },
  );
}

// ============================================================
// CALC DRAFT PERIOD
// ============================================================
function calcDraftPeriod(draft) {
  if (!draft.paradas || !draft.paradas.length) return null;
  const starts = draft.paradas
    .map((p) => p.dataInicio)
    .filter(Boolean)
    .sort();
  const ends = draft.paradas
    .map((p) => p.dataFim)
    .filter(Boolean)
    .sort();
  if (!starts.length) return null;
  return { inicio: starts[0], fim: ends[ends.length - 1] };
}

// ============================================================
// AVAILABILITY MODAL
// ============================================================
function openAvailabilityModal() {
  const overlay = document.getElementById("availability-modal-overlay");
  overlay.classList.remove("hidden");
  document.getElementById("av-date-start").value = isoToday();
  document.getElementById("av-date-end").value = isoToday();
  document.getElementById("av-results").innerHTML = "";
}

function closeAvailabilityModal() {
  document.getElementById("availability-modal-overlay").classList.add("hidden");
}

function searchAvailability() {
  const start = document.getElementById("av-date-start").value;
  const end = document.getElementById("av-date-end").value;
  if (!start || !end) {
    showToast("Preencha as datas.", "error");
    return;
  }

  const results = document.getElementById("av-results");
  results.innerHTML = "";

  const activeColabs = db.getActiveColaboradores();
  const available = [],
    occupied = [];

  for (const c of activeColabs) {
    let busy = false;
    let busyViagem = null;
    for (const v of db.data.viagens) {
      if (v.status === "Cancelado") continue;
      for (const p of v.paradas || []) {
        const ca = p.colaboradores.find(
          (col) =>
            col.colaboradorId === c.id &&
            datesOverlap(col.dataInicio, col.dataFim, start, end),
        );
        if (ca) {
          busy = true;
          busyViagem = v;
          break;
        }
      }
      if (busy) break;
    }
    if (busy) occupied.push({ col: c, viagem: busyViagem });
    else available.push(c);
  }

  // Disponíveis
  const avTitle = document.createElement("h4");
  avTitle.style.cssText =
    "font-size:12px;font-weight:700;color:var(--c-success);margin-bottom:6px";
  avTitle.textContent = `✅ Disponíveis (${available.length})`;
  results.appendChild(avTitle);

  for (const c of available) {
    const item = document.createElement("div");
    item.style.cssText =
      "display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #eee;cursor:pointer;font-size:12px";
    item.innerHTML = `<span class="sigla-tag">${c.sigla}</span> ${escapeHtml(c.nome)}`;
    item.onclick = () => {
      closeAvailabilityModal();
      openViagemModal(null, {
        dataInicio: start,
        dataFim: end,
        colaboradores: [c.id],
      });
    };
    results.appendChild(item);
  }

  // Ocupados
  const ocTitle = document.createElement("h4");
  ocTitle.style.cssText =
    "font-size:12px;font-weight:700;color:var(--c-error);margin:12px 0 6px";
  ocTitle.textContent = `❌ Ocupados (${occupied.length})`;
  results.appendChild(ocTitle);

  for (const { col, viagem } of occupied) {
    const item = document.createElement("div");
    item.style.cssText =
      "display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #eee;font-size:12px";
    item.innerHTML = `<span class="sigla-tag">${col.sigla}</span> ${escapeHtml(col.nome)} <span style="color:#888;margin-left:auto">→ ${viagem.id}</span>`;
    results.appendChild(item);
  }
}

// ============================================================
// DUPLICATE VIAGEM
// ============================================================
function duplicateViagem(viagemId) {
  const v = db.getViagem(viagemId);
  if (!v) return;

  const newV = JSON.parse(JSON.stringify(v));
  newV.id = db.nextViagemId();
  newV.nome = v.nome + " (cópia)";
  newV.status = "Previsto";

  // Shift dates proportionally
  const period = db.getViagemPeriod(v);
  if (period) {
    const dias = daysBetween(period.inicio, period.fim) + 1;
    for (const p of newV.paradas) {
      p.id = "p_" + Date.now() + Math.random();
      p.dataInicio = addDays(p.dataInicio, dias + 1);
      p.dataFim = addDays(p.dataFim, dias + 1);
      for (const c of p.colaboradores) {
        c.dataInicio = addDays(c.dataInicio, dias + 1);
        c.dataFim = addDays(c.dataFim, dias + 1);
        c.confirmado = false;
      }
    }
  }

  _currentViagemDraft = newV;
  renderViagemForm();
  document.getElementById("viagem-modal-overlay").classList.remove("hidden");
  document.querySelector("#viagem-modal-overlay .modal-header h2").textContent =
    `Duplicar Viagem → ${newV.id}`;
}

// ============================================================
// INLINE HELPERS
// ============================================================
function showInlineError(input, msg) {
  input.classList.add("error");
  let err = input.parentElement.querySelector(".form-error");
  if (!err) {
    err = document.createElement("div");
    err.className = "form-error";
    input.parentElement.appendChild(err);
  }
  err.innerHTML = `⚠️ ${msg}`;
  err.classList.add("show");
}

function clearInlineError(input) {
  input.classList.remove("error");
  const err = input.parentElement.querySelector(".form-error");
  if (err) err.classList.remove("show");
}

function openNewViagemWithDate(dateStr) {
  openViagemModal(null, { dataInicio: dateStr, dataFim: addDays(dateStr, 1) });
}
