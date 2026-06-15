'use strict';

// ============================================================
// RESUMO VIEW
// ============================================================
function renderResumo() {
  autoUpdateViagemStatus();
  const container = document.getElementById('view-resumo');
  if (!container) return;
  container.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page-container';

  const today = isoToday();
  const todayObj = parseDate(today);

  const allViagens = db.data.viagens;
  const conflicts  = detectConflicts(allViagens);
  const cfg        = db.data.configuracoes;

  // Header
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `<h1 class="page-title">Resumo</h1>
    <span style="font-size:13px;color:#666">Hoje — ${formatDate(today)}</span>`;
  page.appendChild(header);

  // KPIs
  const ativos = allViagens.filter(v => v.status==='Previsto'||v.status==='Confirmado'||v.status==='Em campo');
  const emCampoHoje = allViagens.filter(v => {
    if (v.status==='Cancelado') return false;
    const p = db.getViagemPeriod(v);
    return p && today >= p.inicio && today <= p.fim;
  });
  const dispHoje = db.getActiveColaboradores().filter(c => {
    return !allViagens.some(v => {
      if (v.status==='Cancelado') return false;
      return v.paradas.some(p => p.colaboradores.some(ca =>
        ca.colaboradorId===c.id && today>=ca.dataInicio && today<=ca.dataFim
      ));
    });
  });

  const kpiRow = document.createElement('div');
  kpiRow.className = 'kpi-row';
  const kpis = [
    { label:'Viagens Ativas', value: ativos.length, sub:'Previstas + Em campo' },
    { label:'Em Campo Hoje',  value: emCampoHoje.length, sub:'viagens em andamento' },
    { label:'Conflitos Ativos',value:conflicts.length, sub:'requerem atenção', alert:conflicts.length>0 },
    { label:'Disponíveis Hoje',value:dispHoje.length, sub:`de ${db.getActiveColaboradores().length} total` },
  ];
  for (const k of kpis) {
    const card = document.createElement('div');
    card.className = 'kpi-card';
    if (k.alert) card.style.borderLeft = '4px solid var(--c-error)';
    card.innerHTML = `<div class="kpi-label">${k.label}</div>
      <div class="kpi-value" style="${k.alert?'color:var(--c-error)':''}">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>`;
    kpiRow.appendChild(card);
  }
  page.appendChild(kpiRow);

  // Alerts
  if (conflicts.length > 0 || ativos.some(v => {
    const p = db.getViagemPeriod(v);
    return p && daysBetween(today, p.inicio) <= cfg.alertaDias && daysBetween(today, p.inicio) >= 0;
  })) {
    const alertsDiv = document.createElement('div');
    alertsDiv.className = 'alerts-section';
    alertsDiv.innerHTML = '<div class="alerts-title">⚠️ Alertas</div>';

    // Conflict alerts
    for (const c of conflicts) {
      const col = db.getColaborador(c.colaboradorId);
      const item = document.createElement('div');
      item.className = 'alert-item';
      item.innerHTML = `<span>⚠️ Conflito: <b>${col?.sigla||'?'}</b> em <b>${c.viagemId1}</b> e <b>${c.viagemId2}</b></span>`;
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost btn-xs';
      btn.textContent = 'Ver viagem';
      btn.onclick = () => openDetailPanel('viagem', c.viagemId1);
      item.appendChild(btn);
      alertsDiv.appendChild(item);
    }

    // Upcoming alerts
    for (const v of ativos) {
      const p = db.getViagemPeriod(v);
      if (!p) continue;
      const dias = daysBetween(today, p.inicio);
      if (dias >= 0 && dias <= cfg.alertaDias) {
        const item = document.createElement('div');
        item.className = 'alert-item';
        item.innerHTML = `<span>🔔 <b>${v.id}</b> inicia em ${dias===0?'hoje':`${dias} dias`} (${formatDate(p.inicio)})</span>`;
        const btn = document.createElement('button');
        btn.className = 'btn btn-ghost btn-xs';
        btn.textContent = 'Ver viagem';
        btn.onclick = () => openDetailPanel('viagem', v.id);
        item.appendChild(btn);
        alertsDiv.appendChild(item);
      }
    }

    page.appendChild(alertsDiv);
  }

  // Two-column layout
  const twoCol = document.createElement('div');
  twoCol.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px';

  // Próximas viagens
  const upcoming = document.createElement('div');
  upcoming.className = 'content-card';
  upcoming.innerHTML = `<div class="content-card-header"><span style="font-weight:700;font-size:13px;color:var(--c-primary)">📅 Próximas Viagens</span></div>`;
  const upBody = document.createElement('div');
  upBody.className = 'content-card-body';
  const nextViagens = ativos
    .map(v => ({ v, p: db.getViagemPeriod(v) }))
    .filter(x => x.p && x.p.inicio >= today)
    .sort((a,b) => a.p.inicio.localeCompare(b.p.inicio))
    .slice(0,5);

  if (nextViagens.length === 0) {
    upBody.innerHTML = '<p style="color:#aaa;font-size:12px;text-align:center;padding:16px">Nenhuma viagem próxima.</p>';
  } else {
    for (const {v, p} of nextViagens) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;gap:8px;cursor:pointer';
      row.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:10px;height:10px;border-radius:50%;background:${db.getViagemColorRaw(v.id)};flex-shrink:0"></div>
          <span style="font-size:12px;font-weight:600">${v.id}</span>
          <span class="status-badge badge-${v.status.toLowerCase().replace(' ','-')}">${v.status}</span>
        </div>
        <span style="font-size:11px;color:#666">${formatDate(p.inicio)}</span>
      `;
      row.onclick = () => openDetailPanel('viagem', v.id);
      upBody.appendChild(row);
    }
    const seeAll = document.createElement('button');
    seeAll.className = 'btn btn-ghost btn-sm mt-8';
    seeAll.textContent = 'Ver todas';
    seeAll.onclick = () => App.navigate('viagens');
    upBody.appendChild(seeAll);
  }
  upcoming.appendChild(upBody);

  // Carga da equipe
  const loadCard = document.createElement('div');
  loadCard.className = 'content-card';
  loadCard.appendChild(buildWeekLoadCard());

  twoCol.append(upcoming, loadCard);
  page.appendChild(twoCol);

  // Heatmaps
  page.appendChild(buildHeatmapsSection());

  // Empty state
  if (ativos.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `<div class="icon">✈️</div><h3>Nenhuma viagem cadastrada</h3><p>Crie a primeira viagem para começar.</p>`;
    const newBtn = document.createElement('button');
    newBtn.className = 'btn btn-primary mt-8';
    newBtn.textContent = '+ Criar primeira viagem';
    newBtn.onclick = () => openViagemModal();
    empty.appendChild(newBtn);
    page.appendChild(empty);
  }

  container.appendChild(page);
}

function buildWeekLoadCard() {
  const card = document.createElement('div');
  card.innerHTML = '<div class="content-card-header"><span style="font-weight:700;font-size:13px;color:var(--c-primary)">👥 Carga da Equipe</span></div>';
  const body = document.createElement('div');
  body.className = 'content-card-body';
  body.id = 'load-card-body';
  refreshWeekLoad(body, 0);
  card.appendChild(body);
  return card;
}

function refreshWeekLoad(container, offset) {
  const week = getWeekRange(offset);
  const activeColabs = db.getActiveColaboradores();
  const total = activeColabs.length;
  let inField = 0;
  const inFieldList = [];
  for (const c of activeColabs) {
    let busy = false;
    for (const v of db.data.viagens) {
      if (v.status==='Cancelado') continue;
      for (const p of v.paradas||[]) {
        const found = p.colaboradores.find(col =>
          col.colaboradorId===c.id && datesOverlap(col.dataInicio,col.dataFim,week.start,week.end)
        );
        if (found) { busy=true; inFieldList.push({col:c,viagem:v}); break; }
      }
      if (busy) break;
    }
    if (busy) inField++;
  }
  const pct = total>0 ? Math.round(inField/total*100) : 0;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <button class="btn btn-ghost btn-xs" onclick="refreshWeekLoad(document.getElementById('load-card-body'),${offset-1})">◀</button>
      <span style="font-size:11px;color:#666">${formatDate(week.start)} — ${formatDate(week.end)}</span>
      <button class="btn btn-ghost btn-xs" onclick="refreshWeekLoad(document.getElementById('load-card-body'),${offset+1})">▶</button>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:22px;font-weight:800;color:var(--c-primary)">${inField}</span>
      <span style="font-size:13px;color:#666">/ ${total} em campo</span>
      <span style="font-size:11px;background:var(--c-bg);padding:2px 6px;border-radius:10px;margin-left:auto">${pct}%</span>
    </div>
    <div class="load-bar-wrap"><div class="load-bar-fill" style="width:${pct}%"></div></div>
    <div style="margin-top:8px;font-size:11px;color:var(--c-secondary);cursor:pointer" onclick="showInFieldModal('${week.start}','${week.end}')">
      ${inFieldList.slice(0,5).map(({col})=>`<span class="sigla-tag" style="margin-right:3px">${col.sigla}</span>`).join('')}
      ${inFieldList.length>5?`<span style="color:#888">+${inFieldList.length-5}</span>`:''}
      ${inFieldList.length===0?'<span style="color:#aaa">Nenhum em campo</span>':''}
    </div>
  `;
}

function buildHeatmapsSection() {
  const div = document.createElement('div');
  div.className = 'content-card';

  const header = document.createElement('div');
  header.className = 'content-card-header';
  header.innerHTML = '<span style="font-weight:700;font-size:13px;color:var(--c-primary)">🔥 Mapa de Calor</span>';
  div.appendChild(header);

  const body = document.createElement('div');
  body.className = 'content-card-body';

  const year = new Date().getFullYear();
  const maps = [
    { label:'Viagens por mês', getData: (m) => {
      const ms = `${year}-${String(m+1).padStart(2,'0')}`;
      return db.data.viagens.filter(v => {
        const p = db.getViagemPeriod(v);
        return p && (p.inicio.startsWith(ms) || p.fim.startsWith(ms) || (p.inicio<=ms+'-31'&&p.fim>=ms+'-01'));
      }).length;
    }},
    { label:'Colaboradores em campo por mês', getData: (m) => {
      const mStart = `${year}-${String(m+1).padStart(2,'0')}-01`;
      const mEnd   = `${year}-${String(m+1).padStart(2,'0')}-${String(new Date(year,m+1,0).getDate()).padStart(2,'0')}`;
      const cols = new Set();
      for (const v of db.data.viagens) {
        if (v.status==='Cancelado') continue;
        for (const p of v.paradas||[]) {
          for (const c of p.colaboradores||[]) {
            if (datesOverlap(c.dataInicio,c.dataFim,mStart,mEnd)) cols.add(c.colaboradorId);
          }
        }
      }
      return cols.size;
    }},
  ];

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:20px';

  for (const mapDef of maps) {
    const col = document.createElement('div');
    col.style.flex = '1';
    const lbl = document.createElement('p');
    lbl.style.cssText = 'font-size:11px;font-weight:700;color:var(--c-secondary);margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px';
    lbl.textContent = mapDef.label;
    col.appendChild(lbl);

    const values = Array.from({length:12},(_,m)=>mapDef.getData(m));
    const maxVal = Math.max(...values,1);

    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';
    values.forEach((v,m) => {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      const intensity = Math.ceil((v/maxVal)*5);
      cell.classList.add('heat-'+Math.min(intensity,5));
      cell.textContent = MONTHS_SHORT[m];
      cell.title = `${MONTHS_PT[m]}: ${v}`;
      cell.onclick = () => {
        CalState.year = year;
        App.navigate('calendar-viagens');
        setTimeout(()=>scrollToMonth(m),300);
      };
      grid.appendChild(cell);
    });
    col.appendChild(grid);
    row.appendChild(col);
  }

  body.appendChild(row);
  div.appendChild(body);
  return div;
}

// ============================================================
// AUTO-UPDATE VIAGEM STATUS
// ============================================================
async function autoUpdateViagemStatus(){
  const today=isoToday();
  let changed=false;
  for(const v of db.data.viagens){
    if(v.status==='Cancelado'||v.status==='Concluído') continue;
    const period=db.getViagemPeriod(v);
    if(!period) continue;
    if(today>period.fim){
      v.status='Concluído';changed=true;
    } else if(today>=period.inicio&&(v.status==='Previsto'||v.status==='Confirmado')){
      v.status='Em campo';changed=true;
    }
  }
  if(changed){
    await db.save().catch(() => {});
  }
}

// ============================================================
// VIAGENS LIST VIEW
// ============================================================
const ViagensState = {
  sort: { col:'id', dir:1 },
  filter: '',
  statusFilter: 'active',   // 'active' | 'historico'
  showHistorico: false,
};

function renderViagens() {
  autoUpdateViagemStatus();
  const container = document.getElementById('view-viagens');
  if (!container) return;
  container.innerHTML = '';

  const page = document.createElement('div');
  page.className = 'page-container';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'page-header';

  const title = document.createElement('h1');
  title.className = 'page-title';
  title.textContent = 'Viagens';

  const toolbar = document.createElement('div');
  toolbar.className = 'page-toolbar';

  const searchInput = document.createElement('input');
  searchInput.type='text'; searchInput.className='form-control';
  searchInput.placeholder='Buscar... (barragem, colaborador, empreendedor)';
  searchInput.style.width='260px';
  searchInput.value = ViagensState.filter;
  searchInput.oninput = debounce(()=>{ViagensState.filter=searchInput.value;renderViagensTable(page);},200);

  // Status filter
  const statusSel = document.createElement('select');
  statusSel.className = 'form-control';
  statusSel.style.width = '130px';
  [['active','Ativas'],['Previsto','Previsto'],['Confirmado','Confirmado'],['Em campo','Em campo'],['historico','Histórico']].forEach(([v,l])=>{
    const o=document.createElement('option');
    o.value=v;o.textContent=l;
    if(v===ViagensState.statusFilter)o.selected=true;
    statusSel.appendChild(o);
  });
  statusSel.onchange=()=>{ViagensState.statusFilter=statusSel.value;renderViagensTable(page);};

  const newBtn = document.createElement('button');
  newBtn.className='btn btn-primary';
  newBtn.textContent='+ Nova Viagem';
  newBtn.onclick=()=>openViagemModal();

  const exportBtn = document.createElement('button');
  exportBtn.className='btn btn-ghost btn-sm';
  exportBtn.textContent='⬇ Exportar';
  exportBtn.onclick=()=>exportViagensXLSX();

  toolbar.append(searchInput, statusSel, newBtn, exportBtn);
  hdr.append(title, toolbar);
  page.appendChild(hdr);

  // Conflicts panel
  const conflicts = detectConflicts(db.data.viagens);
  if (conflicts.length > 0) {
    const confPanel = document.createElement('div');
    confPanel.style.cssText='background:#fff8e1;border:1.5px solid #FFD54F;border-radius:var(--radius);padding:12px 16px;margin-bottom:16px';
    confPanel.innerHTML=`<div style="font-size:13px;font-weight:700;color:#E65100;margin-bottom:8px">⚠️ Conflitos Ativos (${conflicts.length})</div>`;
    for(const c of conflicts){
      const col=db.getColaborador(c.colaboradorId);
      const row=document.createElement('div');
      row.style.cssText='font-size:12px;padding:3px 0;display:flex;align-items:center;justify-content:space-between';
      row.innerHTML=`<span><b>${col?.sigla}</b> ${col?.nome}: conflito entre <b>${c.viagemId1}</b> e <b>${c.viagemId2}</b></span>`;
      const btn=document.createElement('button');btn.className='btn btn-ghost btn-xs';btn.textContent='Ver';
      btn.onclick=()=>openDetailPanel('viagem',c.viagemId1);
      row.appendChild(btn);
      confPanel.appendChild(row);
    }
    page.appendChild(confPanel);
  }

  // Table
  page.appendChild(buildViagensTable());

  container.appendChild(page);
}

function buildViagensTable() {
  const card = document.createElement('div');
  card.className = 'content-card';
  card.id = 'viagens-table-card';

  // Table
  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  const cols = [
    {key:'id',label:'ID'},{key:'barragem',label:'Barragem'},{key:'periodo',label:'Período'},
    {key:'atividades',label:'Tipo'},{key:'status',label:'Status'},{key:'equipe',label:'Equipe'},
    {key:'conflito',label:'Conflito'},{key:'acoes',label:'Ações'}
  ];
  for(const col of cols){
    const th=document.createElement('th');
    th.innerHTML=`${col.label}${col.key!=='acoes'&&col.key!=='conflito'?'<span class="sort-icon">↕</span>':''}`;
    if(col.key!=='acoes'&&col.key!=='conflito'){
      th.onclick=()=>{
        if(ViagensState.sort.col===col.key) ViagensState.sort.dir*=-1;
        else{ViagensState.sort.col=col.key;ViagensState.sort.dir=1;}
        document.getElementById('viagens-tbody').replaceWith(buildViagensTbody());
      };
    }
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = buildViagensTbody();
  tbody.id = 'viagens-tbody';
  table.appendChild(tbody);

  card.appendChild(table);
  return card;
}

function buildViagensTbody() {
  const tbody = document.createElement('tbody');
  tbody.id = 'viagens-tbody';

  const q = ViagensState.filter.toLowerCase();
  const sf = ViagensState.statusFilter;
  const conflicts = detectConflicts(db.data.viagens);

  let viagens = db.data.viagens.filter(v=>{
    if(sf==='active') return v.status==='Previsto'||v.status==='Confirmado'||v.status==='Em campo';
    if(sf==='historico') return v.status==='Concluído'||v.status==='Cancelado';
    return v.status===sf;
  });

  if(q){
    viagens=viagens.filter(v=>{
      const barr=v.paradas.map(p=>db.getBarragemNome(p.barragemId)).join(' ').toLowerCase();
      const empr=v.paradas.map(p=>db.getEmpreendedor(p.empreendedorId)?.nome||'').join(' ').toLowerCase();
      const team=v.paradas.flatMap(p=>p.colaboradores.map(c=>db.getColaborador(c.colaboradorId)?.nome||'')).join(' ').toLowerCase();
      return barr.includes(q)||empr.includes(q)||team.includes(q)||v.id.toLowerCase().includes(q)||v.nome.toLowerCase().includes(q);
    });
  }

  // Sort
  viagens.sort((a,b)=>{
    const col=ViagensState.sort.col;
    let av='',bv='';
    if(col==='id'){av=a.id;bv=b.id;}
    else if(col==='barragem'){av=db.getBarragemNome(a.paradas[0]?.barragemId||'');bv=db.getBarragemNome(b.paradas[0]?.barragemId||'');}
    else if(col==='periodo'){av=db.getViagemPeriod(a)?.inicio||'';bv=db.getViagemPeriod(b)?.inicio||'';}
    else if(col==='status'){av=a.status;bv=b.status;}
    return av.localeCompare(bv)*ViagensState.sort.dir;
  });

  if(viagens.length===0){
    const tr=document.createElement('tr');
    tr.innerHTML=`<td colspan="8" style="text-align:center;padding:32px;color:#aaa;font-size:13px">Nenhuma viagem encontrada.</td>`;
    tbody.appendChild(tr);
    return tbody;
  }

  const today=isoToday();
  for(const v of viagens){
    const period=db.getViagemPeriod(v);
    const barrSiglas=[...new Set(v.paradas.map(p=>db.getBarragemSigla(p.barragemId)))].join(' + ');
    const barr=barrSiglas||'-';
    const barrTip=v.paradas.map(p=>db.getBarragemNome(p.barragemId)).join(', ');
    const team=[...new Set(v.paradas.flatMap(p=>p.colaboradores.map(c=>db.getColaborador(c.colaboradorId)?.sigla||'').filter(Boolean)))];
    const teamStr=team.length<=3?team.join(' · '):`${team.slice(0,3).join(' · ')} +${team.length-3}`;
    const ativIds=[...new Set(v.paradas.flatMap(p=>p.atividades))];
    const ativs=ativIds.map(id=>db.getAtividade(id)?.icone||'').join('');
    const ativNames=ativIds.map(id=>{const a=db.getAtividade(id);return a?`${a.icone} ${a.nome}`:''}).filter(Boolean).join(', ');
    const hasConf=conflicts.some(c=>c.viagemId1===v.id||c.viagemId2===v.id);
    const statusBadge=`badge-${v.status.toLowerCase().replace(/ /g,'-')}`;
    const canStart = v.status==='Previsto' && period && today >= period.inicio;

    const tr=document.createElement('tr');
    tr.className='clickable';
    tr.style.cssText=`border-left:3px solid ${db.getViagemColorRaw(v.id)}`;
    tr.innerHTML=`
      <td><span style="font-family:var(--font-mono);font-weight:700">${v.id}</span></td>
      <td title="${escapeHtml(barrTip)}">${escapeHtml(barr)}</td>
      <td>${period?formatPeriod(period.inicio,period.fim):'-'}</td>
      <td><span title="${escapeHtml(ativNames)||'Sem atividades'}">${ativs||'-'}</span></td>
      <td><span class="status-badge ${statusBadge}">${v.status}</span></td>
      <td title="${team.join(', ')}">${escapeHtml(teamStr)||'-'}</td>
      <td>${hasConf?'<span class="conflict-badge">⚠️</span>':''}</td>
      <td></td>
    `;

    tr.onclick=()=>openDetailPanel('viagem',v.id);
    tr.ondblclick=(e)=>{e.stopPropagation();openViagemModal(v.id);};

    // Actions cell
    const actCell=tr.cells[7];
    if(canStart){
      const startBtn=document.createElement('button');
      startBtn.className='btn btn-sm btn-secondary';
      startBtn.textContent='▶ Iniciar';
      startBtn.style.marginRight='4px';
      startBtn.onclick=(e)=>{e.stopPropagation();startViagem(v.id);};
      actCell.appendChild(startBtn);
    }

    // ... menu
    const menuBtn=document.createElement('button');
    menuBtn.className='btn-icon';
    menuBtn.innerHTML='•••';
    menuBtn.title='Mais ações';
    menuBtn.onclick=(e)=>{e.stopPropagation();showViagemActionsMenu(e,v.id);};
    actCell.appendChild(menuBtn);

    tbody.appendChild(tr);
  }

  return tbody;
}

function startViagem(id){
  const v=db.getViagem(id);
  if(!v) return;
  v.status='Em campo';
  persistDb(db.saveViagem(v), `Viagem ${id} iniciada!`).then((ok)=>{
    if(ok!==false) App.refresh();
  });
}

function showViagemActionsMenu(e, id){
  // Remove existing
  document.querySelectorAll('.actions-menu').forEach(m=>m.remove());
  const menu=document.createElement('div');
  menu.className='actions-menu';
  menu.style.cssText=`position:fixed;background:#fff;border:1px solid var(--c-border);border-radius:var(--radius);box-shadow:var(--shadow-lg);z-index:2000;min-width:150px;overflow:hidden`;
  menu.style.left=(e.pageX-100)+'px';
  menu.style.top=(e.pageY+4)+'px';

  const v=db.getViagem(id);
  const actions=[
    {icon:'✏️',label:'Editar',fn:()=>openViagemModal(id)},
    {icon:'📋',label:'Duplicar',fn:()=>duplicateViagem(id)},
    {icon:'⏸️',label:'Cancelar',fn:()=>cancelViagem(id),disabled:v?.status==='Cancelado'},
    {icon:'🗑️',label:'Deletar',fn:()=>deleteViagemConfirm(id),danger:true},
  ];

  for(const a of actions){
    if(a.disabled) continue;
    const item=document.createElement('button');
    item.style.cssText=`display:flex;align-items:center;gap:6px;width:100%;padding:8px 12px;background:none;border:none;font-size:12px;cursor:pointer;text-align:left`;
    if(a.danger) item.style.color='var(--c-error)';
    item.innerHTML=`${a.icon} ${a.label}`;
    item.onclick=()=>{menu.remove();a.fn();};
    item.onmouseover=()=>item.style.background='var(--c-bg)';
    item.onmouseout=()=>item.style.background='';
    menu.appendChild(item);
  }

  document.body.appendChild(menu);
  setTimeout(()=>document.addEventListener('click',()=>menu.remove(),{once:true}),10);
}

function cancelViagem(id){
  openConfirm('Cancelar viagem?','Viagem será marcada como cancelada. Pode ser reativada.',()=>{
    const v=db.getViagem(id);
    if(v){
      v.status='Cancelado';
      persistDb(db.saveViagem(v), 'Viagem cancelada.').then((ok)=>{
        if(ok!==false) App.refresh();
      });
    }
  },'Cancelar viagem','Manter');
}

function deleteViagemConfirm(id){
  openConfirm('⚠️ Deletar viagem?','Esta viagem será removida permanentemente.',()=>{
    persistDb(db.deleteViagem(id), 'Viagem deletada.').then((ok)=>{
      if(ok!==false) App.refresh();
    });
  },'Deletar permanentemente','Cancelar');
}

function exportViagensXLSX(){
  showToast('Exportação disponível em breve.','success');
}

function renderViagensTable(page){
  const existing=document.getElementById('viagens-table-card');
  if(existing) existing.replaceWith(buildViagensTable());
}

// ============================================================
// EQUIPE VIEW
// ============================================================
const EquipeState = {
  sort: 'alfa',
  filterStatus: 'Ativo',
  search: '',
  editYear: new Date().getFullYear(),
};

function renderEquipe(){
  const container=document.getElementById('view-equipe');
  if(!container) return;
  container.innerHTML='';

  const page=document.createElement('div');
  page.className='page-container';

  const hdr=document.createElement('div');
  hdr.className='page-header';

  const title=document.createElement('h1');
  title.className='page-title';
  title.textContent='Equipe';

  const toolbar=document.createElement('div');
  toolbar.className='page-toolbar';

  const search=document.createElement('input');
  search.type='text';search.className='form-control';
  search.placeholder='Buscar por nome ou sigla...';search.style.width='200px';
  search.value=EquipeState.search;
  search.oninput=debounce(()=>{EquipeState.search=search.value;renderEquipeTable(page);},200);

  // Status filter tabs
  const tabs=document.createElement('div');
  tabs.style.cssText='display:flex;border:1px solid var(--c-border);border-radius:4px;overflow:hidden';
  [['Ativo','Ativos'],['Arquivado','Arquivados'],['','Todos']].forEach(([v,l])=>{
    const btn=document.createElement('button');
    btn.style.cssText='padding:5px 12px;background:none;border:none;font-size:11px;font-weight:600;cursor:pointer';
    btn.textContent=l;
    if(EquipeState.filterStatus===v) btn.style.cssText+=';background:var(--c-primary);color:#fff';
    btn.onclick=()=>{EquipeState.filterStatus=v;renderEquipe();};
    tabs.appendChild(btn);
  });

  const sortBtn=document.createElement('button');
  sortBtn.className='btn btn-ghost btn-sm';
  sortBtn.textContent=EquipeState.sort==='alfa'?'A→Z':'Dias ↓';
  sortBtn.onclick=()=>{EquipeState.sort=EquipeState.sort==='alfa'?'dias':'alfa';renderEquipe();};

  // Year selector for dias
  const ySel=document.createElement('select');
  ySel.className='form-control';ySel.style.width='80px';
  const cfg=db.data.configuracoes;
  for(let y=cfg.anoInicial||2024;y<=(cfg.anoFinal||2028);y++){
    const o=document.createElement('option');o.value=y;o.textContent=y;
    if(y===EquipeState.editYear)o.selected=true;
    ySel.appendChild(o);
  }
  ySel.onchange=()=>{EquipeState.editYear=+ySel.value;renderEquipe();};

  const addBtn=document.createElement('button');
  addBtn.className='btn btn-primary';addBtn.textContent='+ Adicionar';
  addBtn.onclick=()=>showAddColaboradorForm(page);

  const expBtn=document.createElement('button');
  expBtn.className='btn btn-ghost btn-sm';expBtn.textContent='⬇ Exportar';
  expBtn.onclick=()=>showToast('Exportação disponível em breve.','success');

  toolbar.append(search,tabs,sortBtn,ySel,addBtn,expBtn);
  hdr.append(title,toolbar);
  page.appendChild(hdr);

  // Add form placeholder
  const addFormHolder=document.createElement('div');
  addFormHolder.id='equipe-add-form';
  page.appendChild(addFormHolder);

  page.appendChild(buildEquipeTable());
  container.appendChild(page);
}

function buildEquipeTable(){
  const card=document.createElement('div');
  card.className='content-card';

  const table=document.createElement('table');
  table.className='data-table';
  table.innerHTML=`<thead><tr>
    <th>Nome Completo</th><th>Sigla</th><th>Dias em Campo (${EquipeState.editYear})</th><th>Status</th><th>Ações</th>
  </tr></thead>`;

  const tbody=document.createElement('tbody');

  let colabs=db.data.colaboradores;
  if(EquipeState.filterStatus) colabs=colabs.filter(c=>c.status===EquipeState.filterStatus);
  if(EquipeState.search){
    const q=EquipeState.search.toLowerCase();
    colabs=colabs.filter(c=>c.nome.toLowerCase().includes(q)||c.sigla.toLowerCase().includes(q));
  }
  if(EquipeState.sort==='alfa') colabs.sort((a,b)=>a.nome.localeCompare(b.nome));
  else colabs.sort((a,b)=>db.getDiasEmCampo(b.id,EquipeState.editYear)-db.getDiasEmCampo(a.id,EquipeState.editYear));

  if(colabs.length===0){
    tbody.innerHTML='<tr><td colspan="5" style="text-align:center;padding:32px;color:#aaa">Nenhum colaborador encontrado.</td></tr>';
  }else{
    for(const c of colabs){
      const dias=db.getDiasEmCampo(c.id,EquipeState.editYear);
      const maxDias=Math.max(...db.data.colaboradores.map(cc=>db.getDiasEmCampo(cc.id,EquipeState.editYear)),1);
      const pct=Math.round(dias/maxDias*100);

      const tr=document.createElement('tr');
      tr.className='clickable';
      tr.innerHTML=`
        <td class="editable-cell" data-field="nome" data-id="${c.id}">${escapeHtml(c.nome)}</td>
        <td class="editable-cell" data-field="sigla" data-id="${c.id}"><span class="sigla-tag">${c.sigla}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="min-width:24px;font-weight:700">${dias}</span>
            <div class="load-bar-wrap" style="max-width:80px"><div class="load-bar-fill" style="width:${pct}%"></div></div>
          </div>
        </td>
        <td><span class="status-badge ${c.status==='Ativo'?'badge-previsto':'badge-cancelado'}">${c.status}</span></td>
        <td></td>
      `;

      tr.onclick=()=>openDetailPanel('colaborador',c.id);
      tr.ondblclick=(e)=>{e.stopPropagation();startInlineEdit(tr,c);};

      // Actions
      const actCell=tr.cells[4];
      if(c.status==='Ativo'){
        const archBtn=document.createElement('button');
        archBtn.className='btn btn-ghost btn-xs';archBtn.textContent='Arquivar';
        archBtn.onclick=(e)=>{e.stopPropagation();archiveColaborador(c.id,true);};
        actCell.appendChild(archBtn);
      }else{
        const reactBtn=document.createElement('button');
        reactBtn.className='btn btn-ghost btn-xs';reactBtn.textContent='Reativar';
        reactBtn.onclick=(e)=>{e.stopPropagation();archiveColaborador(c.id,false);};
        actCell.appendChild(reactBtn);
      }
      tbody.appendChild(tr);
    }
  }

  table.appendChild(tbody);
  card.appendChild(table);
  return card;
}

function archiveColaborador(id, archive){
  const c=db.getColaborador(id);
  if(!c) return;
  c.status=archive?'Arquivado':'Ativo';
  persistDb(db.save(), archive?'Colaborador arquivado.':'Colaborador reativado.').then((ok)=>{
    if(ok!==false) App.refresh();
  });
}

function showAddColaboradorForm(page){
  const existing=document.getElementById('equipe-add-form');
  if(!existing) return;

  const existingSiglas=db.data.colaboradores.map(c=>c.sigla);
  existing.innerHTML=`
    <div class="content-card mb-16" style="padding:12px 16px">
      <div class="form-row" style="align-items:flex-end">
        <div class="form-group">
          <label class="form-label">Nome completo *</label>
          <input type="text" class="form-control" id="new-col-nome" maxlength="100" placeholder="Nome do colaborador">
        </div>
        <div class="form-group narrow">
          <label class="form-label">Sigla *</label>
          <input type="text" class="form-control" id="new-col-sigla" maxlength="3" placeholder="XXX" style="text-transform:uppercase;font-family:var(--font-mono)">
        </div>
        <div style="display:flex;gap:6px;margin-bottom:14px">
          <button class="btn btn-primary btn-sm" onclick="saveNewColaborador()">Salvar</button>
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('equipe-add-form').innerHTML=''">Cancelar</button>
        </div>
      </div>
    </div>
  `;

  const nomeInput=document.getElementById('new-col-nome');
  const siglaInput=document.getElementById('new-col-sigla');
  nomeInput.oninput=()=>{
    if(!siglaInput.value||siglaInput.dataset.auto){
      const sug=suggestSigla(nomeInput.value,existingSiglas);
      siglaInput.value=sug;siglaInput.dataset.auto='1';
    }
  };
  siglaInput.oninput=()=>{ siglaInput.dataset.auto=''; siglaInput.value=siglaInput.value.toUpperCase(); };
  nomeInput.focus();
}

function saveNewColaborador(){
  const nome=document.getElementById('new-col-nome')?.value?.trim();
  const sigla=document.getElementById('new-col-sigla')?.value?.trim().toUpperCase();
  if(!nome){showToast('Nome obrigatório.','error');return;}
  if(!sigla||sigla.length!==3){showToast('Sigla deve ter 3 letras.','error');return;}
  if(db.data.colaboradores.some(c=>c.sigla===sigla)){showToast(`Sigla ${sigla} já existe. Escolha outra.`,'error');return;}

  const newC={id:'c'+(Date.now()),nome,sigla,status:'Ativo'};
  db.data.colaboradores.push(newC);
  persistDb(db.save(), 'Colaborador adicionado.').then((ok)=>{
    if(ok!==false){
      document.getElementById('equipe-add-form').innerHTML='';
      App.refresh();
    }
  });
}

function startInlineEdit(tr,c){
  const nomeCell=tr.cells[0];
  const siglaCell=tr.cells[1];

  // Nome editable
  nomeCell.contentEditable='true';
  nomeCell.style.background='#fffde7';
  nomeCell.focus();

  // Sigla input
  siglaCell.innerHTML=`<input type="text" class="form-control" value="${c.sigla}" maxlength="3"
    style="width:60px;text-transform:uppercase;font-family:var(--font-mono);padding:2px 4px;font-size:12px" id="inline-sigla-${c.id}">`;
  const siglaInput=siglaCell.querySelector('input');
  siglaInput.oninput=()=>{siglaInput.value=siglaInput.value.toUpperCase();};

  const commitEdit=()=>{
    const newNome=nomeCell.textContent.trim();
    const newSigla=siglaInput.value.trim().toUpperCase();
    let changed=false;
    if(newNome&&newNome!==c.nome){c.nome=newNome;changed=true;}
    if(newSigla&&newSigla.length===3&&newSigla!==c.sigla){
      if(db.data.colaboradores.some(cc=>cc.id!==c.id&&cc.sigla===newSigla)){
        showToast(`Sigla ${newSigla} já existe.`,'error');
        siglaInput.value=c.sigla;
        return;
      }
      c.sigla=newSigla;changed=true;
    }
    if(changed){
      persistDb(db.save(), 'Colaborador atualizado.').then((ok)=>{
        if(ok!==false) App.refresh();
      });
    }
    nomeCell.contentEditable='false';
    nomeCell.style.background='';
    siglaCell.innerHTML=`<span class="sigla-tag">${c.sigla}</span>`;
  };

  const cancelEdit=()=>{
    nomeCell.textContent=c.nome;
    nomeCell.contentEditable='false';
    nomeCell.style.background='';
    siglaCell.innerHTML=`<span class="sigla-tag">${c.sigla}</span>`;
  };

  nomeCell.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'){e.preventDefault();commitEdit();}
    if(e.key==='Escape'){e.preventDefault();cancelEdit();}
  },{once:false});
  nomeCell.onblur=()=>{ setTimeout(()=>{ if(document.activeElement!==siglaInput)commitEdit(); },150); };

  siglaInput.addEventListener('keydown',(e)=>{
    if(e.key==='Enter'){e.preventDefault();commitEdit();}
    if(e.key==='Escape'){e.preventDefault();cancelEdit();}
  });
}

function renderEquipeTable(page){
  const existing=page.querySelector('.content-card:last-child');
  if(existing) existing.replaceWith(buildEquipeTable());
}

// ============================================================
// DETAIL PANEL
// ============================================================
function openDetailPanel(type, id){
  const panel=document.getElementById('detail-panel');
  const body=document.getElementById('detail-panel-body');
  if(!panel||!body) return;

  panel.classList.add('open');

  if(type==='viagem'){
    renderViagemDetail(id, panel, body);
  }else if(type==='colaborador'){
    renderColaboradorDetail(id, panel, body);
  }
}

function closeDetailPanel(){
  const panel=document.getElementById('detail-panel');
  if(panel) panel.classList.remove('open');
}

function renderViagemDetail(id, panel, body){
  const v=db.getViagem(id);
  if(!v){body.innerHTML='<p style="color:#aaa">Viagem não encontrada.</p>';return;}

  const period=db.getViagemPeriod(v);
  const conflicts=getConflictsForViagem(id,db.data.viagens);
  const color=db.getViagemColorRaw(id);

  // Tabs
  const tabs=panel.querySelector('.panel-tabs');
  if(tabs) tabs.innerHTML=`
    <button class="panel-tab active" onclick="switchDetailTab(this,'detail-resumo')">Resumo</button>
    <button class="panel-tab" onclick="switchDetailTab(this,'detail-detalhes')">Detalhes</button>
    <button class="panel-tab" onclick="switchDetailTab(this,'detail-historico')">Histórico</button>
  `;

  const titleEl=panel.querySelector('.panel-header h3');
  if(titleEl) titleEl.innerHTML=`<span style="font-family:var(--font-mono);background:${color};padding:1px 6px;border-radius:3px">${v.id}</span> ${escapeHtml(v.nome)}`;

  body.innerHTML='';

  const resumoDiv=document.createElement('div');
  resumoDiv.id='detail-resumo';
  resumoDiv.innerHTML=`
    <div style="margin-bottom:12px">
      <span class="status-badge badge-${v.status.toLowerCase().replace(/ /g,'-')}">${v.status}</span>
      ${conflicts.length>0?'<span class="conflict-badge" style="margin-left:8px">⚠️ '+conflicts.length+' conflito(s)</span>':''}
    </div>
    <div style="font-size:12px;display:flex;flex-direction:column;gap:6px">
      <div><b>Período:</b> ${period?formatPeriod(period.inicio,period.fim):'-'}</div>
      <div><b>Paradas:</b> ${v.paradas.length}</div>
      ${v.observacoes?`<div><b>Obs:</b> ${escapeHtml(v.observacoes)}</div>`:''}
    </div>
    <hr class="divider">
    <div style="font-size:11px;font-weight:700;color:var(--c-secondary);margin-bottom:6px">EQUIPE</div>
    ${v.paradas.flatMap(p=>p.colaboradores).map(ca=>{
      const col=db.getColaborador(ca.colaboradorId);
      return col?`<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px">
        <span class="sigla-tag">${col.sigla}</span>${escapeHtml(col.nome)}
        <span style="margin-left:auto;font-size:10px;color:#888">${formatDateShort(ca.dataInicio)}→${formatDateShort(ca.dataFim)}</span>
        ${ca.confirmado?'<span style="color:var(--c-success)">✅</span>':'<span style="color:#aaa">⏳</span>'}
      </div>`:''
    }).join('')}
  `;
  body.appendChild(resumoDiv);

  const detDiv=document.createElement('div');
  detDiv.id='detail-detalhes';
  detDiv.style.display='none';
  for(let i=0;i<v.paradas.length;i++){
    const p=v.paradas[i];
    const emp=db.getEmpreendedor(p.empreendedorId);
    const barr=db.getBarragem(p.barragemId);
    const ativs=p.atividades.map(aid=>{const a=db.getAtividade(aid);return a?`${a.icone} ${a.nome}`:''}).filter(Boolean);
    detDiv.innerHTML+=`
      <div style="margin-bottom:12px;padding:10px;background:#f8f9fa;border-radius:4px;font-size:12px">
        <div style="font-weight:700;color:var(--c-primary);margin-bottom:6px">Parada ${i+1}</div>
        <div><b>Empreendedor:</b> ${escapeHtml(emp?.nome||'-')}</div>
        <div><b>Barragem:</b> ${escapeHtml(barr?.nome||'-')} <span class="sigla-tag">${barr?.sigla||'-'}</span></div>
        <div><b>Período:</b> ${formatDate(p.dataInicio)} → ${formatDate(p.dataFim)}</div>
        <div><b>Atividades:</b> ${ativs.join(', ')||'-'}</div>
      </div>
    `;
  }
  body.appendChild(detDiv);

  const histDiv=document.createElement('div');
  histDiv.id='detail-historico';
  histDiv.style.display='none';
  histDiv.innerHTML='<p style="color:#aaa;font-size:12px">Histórico de alterações estará disponível em breve.</p>';
  body.appendChild(histDiv);

  // Edit button
  const editBtn=document.createElement('button');
  editBtn.className='btn btn-primary btn-sm';
  editBtn.style.cssText='position:absolute;bottom:16px;right:16px';
  editBtn.textContent='✏️ Editar';
  editBtn.onclick=()=>openViagemModal(id);
  body.appendChild(editBtn);
}

function renderColaboradorDetail(id, panel, body){
  const c=db.getColaborador(id);
  if(!c){body.innerHTML='<p style="color:#aaa">Colaborador não encontrado.</p>';return;}

  const titleEl=panel.querySelector('.panel-header h3');
  if(titleEl) titleEl.innerHTML=`<span class="sigla-tag">${c.sigla}</span> ${escapeHtml(c.nome)}`;

  const tabs=panel.querySelector('.panel-tabs');
  if(tabs) tabs.innerHTML='';

  const dias=db.getDiasEmCampo(c.id,new Date().getFullYear());
  const viagensDoColab=db.data.viagens.filter(v=>v.paradas.some(p=>p.colaboradores.some(ca=>ca.colaboradorId===c.id)));

  body.innerHTML=`
    <div style="font-size:12px;display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
      <div><b>Status:</b> <span class="status-badge ${c.status==='Ativo'?'badge-previsto':'badge-cancelado'}">${c.status}</span></div>
      <div><b>Dias em campo (${new Date().getFullYear()}):</b> ${dias}</div>
    </div>
    <hr class="divider">
    <div style="font-size:11px;font-weight:700;color:var(--c-secondary);margin-bottom:8px">VIAGENS (${viagensDoColab.length})</div>
    ${viagensDoColab.map(v=>{
      const p=db.getViagemPeriod(v);
      return `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #eee;font-size:12px;cursor:pointer" onclick="openDetailPanel('viagem','${v.id}')">
        <div style="width:10px;height:10px;border-radius:50%;background:${db.getViagemColorRaw(v.id)};flex-shrink:0"></div>
        <span style="font-family:var(--font-mono);font-weight:700">${v.id}</span>
        <span style="flex:1">${escapeHtml(v.nome)}</span>
        <span style="font-size:10px;color:#888">${p?formatDateShort(p.inicio):''}</span>
      </div>`;
    }).join('')||'<p style="color:#aaa;font-size:12px">Sem viagens cadastradas.</p>'}
  `;
}

function switchDetailTab(btn, tabId){
  const panel=document.getElementById('detail-panel');
  if(!panel) return;
  panel.querySelectorAll('.panel-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  panel.querySelectorAll('#detail-panel-body > div[id^="detail-"]').forEach(d=>d.style.display='none');
  const tab=document.getElementById(tabId);
  if(tab) tab.style.display='block';
}

// ============================================================
// CADASTROS — EMPREENDEDORES
// ============================================================
function renderEmpreendedores(){
  const container=document.getElementById('view-empreendedores');
  if(!container) return;
  container.innerHTML='';

  const page=document.createElement('div');
  page.className='page-container';

  const hdr=document.createElement('div');
  hdr.className='page-header';
  hdr.innerHTML='<h1 class="page-title">Empreendedores</h1>';
  const toolbar=document.createElement('div');
  toolbar.className='page-toolbar';

  const search=document.createElement('input');
  search.type='text';search.className='form-control';
  search.placeholder='Buscar empreendedor ou barragem...';search.style.width='240px';
  search.oninput=debounce(()=>renderEmprList(listDiv,search.value),200);

  const addBtn=document.createElement('button');
  addBtn.className='btn btn-primary';addBtn.textContent='+ Empreendedor';
  addBtn.onclick=()=>showAddEmpreendedorForm(listDiv);

  const expBtn=document.createElement('button');
  expBtn.className='btn btn-ghost btn-sm';expBtn.textContent='⬇ Exportar';
  expBtn.onclick=()=>showToast('Exportação disponível em breve.','success');

  toolbar.append(search,addBtn,expBtn);
  hdr.appendChild(toolbar);
  page.appendChild(hdr);

  const listDiv=document.createElement('div');
  renderEmprList(listDiv,'');
  page.appendChild(listDiv);
  container.appendChild(page);
}

function renderEmprList(container, q){
  container.innerHTML='';
  let emprs=db.data.empreendedores;
  if(q){
    const qL=q.toLowerCase();
    emprs=emprs.filter(e=>e.nome.toLowerCase().includes(qL)||e.barragens.some(b=>b.nome.toLowerCase().includes(qL)||b.sigla.toLowerCase().includes(qL)));
  }

  for(const e of emprs){
    const item=document.createElement('div');
    item.className='empr-item';

    const hdr=document.createElement('div');
    hdr.className='empr-header';
    hdr.innerHTML=`<div style="display:flex;align-items:center;gap:8px">
      <span style="font-weight:700">${escapeHtml(e.nome)}</span>
      <span style="font-size:11px;color:#888">${e.barragens.length} barragens</span>
    </div>
    <span style="font-size:16px;color:#888">▼</span>`;
    hdr.onclick=()=>{
      body.classList.toggle('open');
      hdr.classList.toggle('expanded');
    };

    const body=document.createElement('div');
    body.className='empr-body';

    // Barragens list
    const activeBs=e.barragens.filter(b=>b.status==='Ativa');
    for(const b of activeBs){
      const row=document.createElement('div');
      row.className='barr-row';
      row.innerHTML=`
        <span class="sigla-tag">${b.sigla}</span>
        <span style="flex:1">${escapeHtml(b.nome)}</span>
        <button class="btn btn-ghost btn-xs" onclick="editBarragemInline(event,'${e.id}','${b.id}')">✏️</button>
        <button class="btn btn-ghost btn-xs" onclick="archiveBarragem(event,'${e.id}','${b.id}')">Arquivar</button>
      `;
      body.appendChild(row);
    }

    // Add barragem
    const addBRow=document.createElement('div');
    addBRow.style.cssText='margin-top:8px';
    const addBBtn=document.createElement('button');
    addBBtn.className='btn btn-ghost btn-sm';
    addBBtn.textContent='+ Barragem';
    addBBtn.onclick=(ev)=>{ev.stopPropagation();showAddBarragemForm(addBRow,e.id);};
    addBRow.appendChild(addBBtn);
    body.appendChild(addBRow);

    item.append(hdr,body);
    container.appendChild(item);
  }

  if(emprs.length===0){
    container.innerHTML='<div class="empty-state"><div class="icon">🏗️</div><h3>Nenhum empreendedor.</h3></div>';
  }
}

function showAddEmpreendedorForm(listDiv){
  const formDiv=document.createElement('div');
  formDiv.style.cssText='background:#fff;border:1px solid var(--c-border);border-radius:var(--radius);padding:12px 16px;margin-bottom:8px';
  formDiv.innerHTML=`
    <div class="form-row" style="align-items:flex-end">
      <div class="form-group"><label class="form-label">Nome *</label><input type="text" class="form-control" id="new-empr-nome" maxlength="100" placeholder="Nome do empreendedor"></div>
      <div style="display:flex;gap:6px;margin-bottom:14px">
        <button class="btn btn-primary btn-sm" onclick="saveNewEmpreendedor()">Salvar</button>
        <button class="btn btn-ghost btn-sm" onclick="this.closest('div[style]').remove()">Cancelar</button>
      </div>
    </div>
  `;
  listDiv.prepend(formDiv);
  document.getElementById('new-empr-nome')?.focus();
}

function saveNewEmpreendedor(){
  const nome=document.getElementById('new-empr-nome')?.value?.trim();
  if(!nome){showToast('Nome obrigatório.','error');return;}
  db.data.empreendedores.push({id:'e'+(Date.now()),nome,barragens:[]});
  persistDb(db.save(), 'Empreendedor adicionado.').then((ok)=>{
    if(ok!==false) App.refresh();
  });
}

function showAddBarragemForm(container, emprId){
  const existing=db.data.empreendedores.find(e=>e.id===emprId);
  const existingSiglas=existing?.barragens.map(b=>b.sigla)||[];

  container.innerHTML=`
    <div style="display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap;margin-top:6px">
      <input type="text" class="form-control" id="new-barr-nome-${emprId}" maxlength="100" placeholder="Nome da barragem" style="flex:1;min-width:140px">
      <input type="text" class="form-control" id="new-barr-sigla-${emprId}" maxlength="3" placeholder="SIG" style="width:70px;text-transform:uppercase;font-family:var(--font-mono)">
      <button class="btn btn-primary btn-sm" onclick="saveNewBarragem('${emprId}')">Salvar</button>
      <button class="btn btn-ghost btn-sm" onclick="this.parentElement.replaceWith(createAddBarrBtn('${emprId}'))">Cancelar</button>
    </div>
  `;
  const nInput=document.getElementById('new-barr-nome-'+emprId);
  const sInput=document.getElementById('new-barr-sigla-'+emprId);
  nInput.oninput=()=>{if(!sInput.value||sInput.dataset.auto){sInput.value=suggestSigla(nInput.value,existingSiglas);sInput.dataset.auto='1';}};
  sInput.oninput=()=>{sInput.dataset.auto='';sInput.value=sInput.value.toUpperCase();};
  nInput.focus();
}

function createAddBarrBtn(emprId){
  const btn=document.createElement('div');
  btn.style.marginTop='8px';
  btn.innerHTML=`<button class="btn btn-ghost btn-sm">+ Barragem</button>`;
  btn.querySelector('button').onclick=(ev)=>{ev.stopPropagation();showAddBarragemForm(btn,emprId);};
  return btn;
}

function saveNewBarragem(emprId){
  const nome=document.getElementById('new-barr-nome-'+emprId)?.value?.trim();
  const sigla=document.getElementById('new-barr-sigla-'+emprId)?.value?.trim().toUpperCase();
  if(!nome){showToast('Nome obrigatório.','error');return;}
  if(!sigla||sigla.length!==3){showToast('Sigla deve ter 3 letras.','error');return;}

  const emp=db.getEmpreendedor(emprId);
  if(!emp) return;
  if(emp.barragens.some(b=>b.sigla===sigla)){showToast(`Sigla ${sigla} já existe neste empreendedor.`,'error');return;}
  emp.barragens.push({id:'b'+(Date.now()),nome,sigla,status:'Ativa'});
  persistDb(db.save(), 'Barragem adicionada.').then((ok)=>{
    if(ok!==false) App.refresh();
  });
}

function archiveBarragem(ev,emprId,barrId){
  ev.stopPropagation();
  const emp=db.getEmpreendedor(emprId);
  if(!emp) return;
  const b=emp.barragens.find(b=>b.id===barrId);
  if(!b) return;
  // Check if used in active viagens
  const usedIn=db.data.viagens.filter(v=>v.status!=='Cancelado'&&v.paradas.some(p=>p.barragemId===barrId));
  if(usedIn.length>0){showToast(`Barragem usada em ${usedIn.length} viagem(ns) ativa(s). Cancele as viagens primeiro.`,'error');return;}
  b.status='Arquivada';
  persistDb(db.save(), 'Barragem arquivada.').then((ok)=>{
    if(ok!==false) App.refresh();
  });
}

function editBarragemInline(ev, emprId, barrId){
  ev.stopPropagation();
  const emp=db.getEmpreendedor(emprId);
  if(!emp) return;
  const b=emp.barragens.find(b=>b.id===barrId);
  if(!b) return;
  const row=ev.target.closest('.barr-row');
  if(!row) return;

  // Replace row content with inline edit form
  const prevHTML=row.innerHTML;
  row.innerHTML='';
  row.style.flexWrap='wrap';

  const nomeIn=document.createElement('input');
  nomeIn.type='text';nomeIn.className='form-control';nomeIn.value=b.nome;
  nomeIn.style.cssText='flex:1;min-width:120px;padding:3px 6px;font-size:12px';

  const siglaIn=document.createElement('input');
  siglaIn.type='text';siglaIn.className='form-control';siglaIn.value=b.sigla;
  siglaIn.maxLength=3;siglaIn.style.cssText='width:60px;text-transform:uppercase;font-family:var(--font-mono);padding:3px 6px;font-size:12px';
  siglaIn.oninput=()=>{siglaIn.value=siglaIn.value.toUpperCase();};

  const saveBtn=document.createElement('button');
  saveBtn.className='btn btn-primary btn-xs';saveBtn.textContent='✓';
  const cancelBtn=document.createElement('button');
  cancelBtn.className='btn btn-ghost btn-xs';cancelBtn.textContent='✕';

  row.append(nomeIn,siglaIn,saveBtn,cancelBtn);
  nomeIn.focus();

  const save=()=>{
    const newNome=nomeIn.value.trim();
    const newSigla=siglaIn.value.trim().toUpperCase();
    if(!newNome){showToast('Nome obrigatório.','error');return;}
    if(!newSigla||newSigla.length!==3){showToast('Sigla deve ter 3 letras.','error');return;}
    if(newSigla!==b.sigla&&emp.barragens.some(bb=>bb.id!==barrId&&bb.sigla===newSigla)){
      showToast(`Sigla ${newSigla} já existe neste empreendedor.`,'error');return;
    }
    b.nome=newNome;b.sigla=newSigla;
    persistDb(db.save(), 'Barragem atualizada.').then((ok)=>{
      if(ok!==false) App.refresh();
    });
  };
  const cancel=()=>{ row.innerHTML=prevHTML; };

  saveBtn.onclick=save;
  cancelBtn.onclick=cancel;
  [nomeIn,siglaIn].forEach(inp=>{
    inp.addEventListener('keydown',(e)=>{
      if(e.key==='Enter'){e.preventDefault();save();}
      if(e.key==='Escape'){e.preventDefault();cancel();}
    });
  });
}

// ============================================================
// CADASTROS — ATIVIDADES
// ============================================================
function renderAtividades(){
  const container=document.getElementById('view-atividades');
  if(!container) return;
  container.innerHTML='';

  const page=document.createElement('div');
  page.className='page-container';

  const hdr=document.createElement('div');
  hdr.className='page-header';
  hdr.innerHTML='<h1 class="page-title">Atividades</h1>';
  const toolbar=document.createElement('div');
  toolbar.className='page-toolbar';

  const addBtn=document.createElement('button');
  addBtn.className='btn btn-primary';addBtn.textContent='+ Atividade';
  addBtn.onclick=()=>showAddAtividadeForm(cols);
  toolbar.appendChild(addBtn);
  hdr.appendChild(toolbar);
  page.appendChild(hdr);

  const cols=document.createElement('div');
  cols.style.cssText='display:flex;gap:16px';

  for(const cat of ['Segurança','Emergência']){
    const col=document.createElement('div');
    col.style.flex='1';
    col.innerHTML=`<div class="content-card-header" style="border-radius:var(--radius) var(--radius) 0 0"><span style="font-weight:700;font-size:13px;color:var(--c-primary)">${cat}</span></div>`;

    const list=document.createElement('div');
    list.className='content-card';
    list.style.borderRadius='0 0 var(--radius) var(--radius)';
    list.id='ativ-list-'+cat;

    const ativs=db.data.atividades.filter(a=>a.categoria===cat).sort((a,b)=>a.ordem-b.ordem);
    for(const a of ativs){
      list.appendChild(buildAtividadeRow(a));
    }
    col.appendChild(list);
    cols.appendChild(col);
  }

  page.appendChild(cols);
  container.appendChild(page);
}

function buildAtividadeRow(a){
  const row=document.createElement('div');
  row.className='barr-row draggable-item';
  row.dataset.id=a.id;
  row.innerHTML=`
    <span style="cursor:grab;color:#ccc">⠿</span>
    <span style="font-size:14px">${a.icone}</span>
    <span style="flex:1;font-size:12px;font-weight:600">${escapeHtml(a.nome)}</span>
    <span class="status-badge ${a.status==='Ativa'?'badge-previsto':'badge-cancelado'}" style="font-size:10px">${a.status}</span>
    <button class="btn btn-ghost btn-xs" onclick="toggleAtividade('${a.id}')">
      ${a.status==='Ativa'?'Desativar':'Ativar'}
    </button>
  `;
  return row;
}

function toggleAtividade(id){
  const a=db.getAtividade(id);
  if(!a) return;
  if(a.status==='Ativa'){
    // Check if used in active viagens
    const usedIn=db.data.viagens.filter(v=>v.status!=='Cancelado'&&v.paradas.some(p=>p.atividades.includes(id)));
    if(usedIn.length>0){showToast(`Atividade usada em ${usedIn.length} viagem(ns) ativa(s).`,'error');return;}
    a.status='Desativada';
  }else{
    a.status='Ativa';
  }
  persistDb(db.save(), 'Atividade atualizada.').then((ok)=>{
    if(ok!==false) App.refresh();
  });
}

function showAddAtividadeForm(cols){
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:1500;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML=`
    <div style="background:#fff;border-radius:var(--radius);padding:20px;width:360px;box-shadow:var(--shadow-lg)">
      <h3 style="font-size:14px;font-weight:700;color:var(--c-primary);margin-bottom:14px">Nova Atividade</h3>
      <div class="form-group"><label class="form-label">Nome *</label><input type="text" class="form-control" id="new-ativ-nome" maxlength="50"></div>
      <div class="form-group"><label class="form-label">Categoria *</label>
        <select class="form-control" id="new-ativ-cat">
          <option value="Segurança">Segurança</option>
          <option value="Emergência">Emergência</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Ícone</label><input type="text" class="form-control" id="new-ativ-icon" placeholder="Emoji" maxlength="2" style="width:60px"></div>
      <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:12px">
        <button class="btn btn-ghost btn-sm" onclick="this.closest('div[style]').remove()">Cancelar</button>
        <button class="btn btn-primary btn-sm" onclick="saveNewAtividade()">Salvar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.onclick=(e)=>{if(e.target===overlay)overlay.remove();};
  document.getElementById('new-ativ-nome').focus();
}

function saveNewAtividade(){
  const nome=document.getElementById('new-ativ-nome')?.value?.trim();
  const cat=document.getElementById('new-ativ-cat')?.value;
  const icon=document.getElementById('new-ativ-icon')?.value||'📌';
  if(!nome){showToast('Nome obrigatório.','error');return;}
  const maxOrdem=Math.max(...db.data.atividades.map(a=>a.ordem),0);
  db.data.atividades.push({id:'a'+(Date.now()),nome,categoria:cat,icone:icon,status:'Ativa',ordem:maxOrdem+1});
  persistDb(db.save(), 'Atividade adicionada.').then((ok)=>{
    if(ok!==false){
      document.querySelector('div[style*="position:fixed"][style*="inset:0"]')?.remove();
      App.refresh();
    }
  });
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================
let _settingsDirty = false;

function renderConfiguracoes(){
  const container=document.getElementById('view-configuracoes');
  if(!container) return;
  container.innerHTML='';
  _settingsDirty=false;

  const page=document.createElement('div');
  page.className='page-container';
  page.style.maxWidth='700px';

  const hdr=document.createElement('div');
  hdr.className='page-header';
  hdr.innerHTML='<h1 class="page-title">Configurações</h1>';
  page.appendChild(hdr);

  const cfg=db.data.configuracoes;

  // Section: Alertas
  page.appendChild(buildSettingsSection('Alertas',[
    { label:'Prazo de alerta antes do início da viagem (dias)',
      el: buildNumberInput('cfg-alert-days', cfg.alertaDias, 1, 60,
        v=>{db.data.configuracoes.alertaDias=v;markSettingsDirty();}) },
    { label:'Limite de dias para filtro "sobrecarregados" no Gantt',
      el: buildNumberInput('cfg-gantt-limit', cfg.limiteGantt, 0, 365,
        v=>{db.data.configuracoes.limiteGantt=v;markSettingsDirty();}) },
  ]));

  // Section: Período
  const minY=cfg.anoInicial||2024, maxY=cfg.anoFinal||2028;
  page.appendChild(buildSettingsSection('Período',[
    { label:'Ano inicial do calendário',
      el: buildSelectInput([2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030], cfg.anoInicial||2024,
        v=>{db.data.configuracoes.anoInicial=v;markSettingsDirty();}) },
    { label:'Ano final do calendário',
      el: buildSelectInput([2024,2025,2026,2027,2028,2029,2030,2031,2032], cfg.anoFinal||2028,
        v=>{db.data.configuracoes.anoFinal=v;markSettingsDirty();}) },
  ]));

  // Section: Feriados
  page.appendChild(buildSettingsSection('Feriados',[
    { label:'Feriados Nacionais',
      el: buildToggle('cfg-feriados-nac', cfg.feriados.nacionais!==false,
        v=>{db.data.configuracoes.feriados.nacionais=v;markSettingsDirty();}) },
  ], '<p style="font-size:11px;color:#888;margin-top:4px">Feriados estaduais: fora do escopo v01.</p>'));

  // Section: Authentication
  const authSection=buildSettingsSection('Autenticação',[]);
  authSection.innerHTML+=`<p style="font-size:12px;color:#666">Acesso protegido pelo Supabase Auth. Use o botão "Sair" no cabeçalho para encerrar a sessão.</p>`;
  page.appendChild(authSection);

  // Section: Backup
  page.appendChild(buildBackupSection());

  // Sticky footer
  const footer=document.createElement('div');
  footer.className='settings-footer';
  footer.id='settings-footer';
  const saveBtn=document.createElement('button');
  saveBtn.className='btn btn-primary';saveBtn.textContent='Salvar alterações';
  saveBtn.onclick=()=>saveSettings();
  const cancelBtn=document.createElement('button');
  cancelBtn.className='btn btn-ghost';cancelBtn.textContent='Cancelar';
  cancelBtn.onclick=()=>{renderConfiguracoes();};
  footer.append(cancelBtn,saveBtn);
  document.body.appendChild(footer);

  container.appendChild(page);
}

function buildSettingsSection(title, rows, extra=''){
  const sec=document.createElement('div');
  sec.className='settings-section';
  sec.innerHTML=`<h3>${title}</h3>${extra}`;
  for(const row of rows){
    const div=document.createElement('div');
    div.className='settings-row';
    const lbl=document.createElement('label');lbl.textContent=row.label;
    div.append(lbl,row.el);
    sec.appendChild(div);
  }
  return sec;
}

function buildNumberInput(id, val, min, max, onChange){
  const wrap=document.createElement('div');
  wrap.className='number-input-group';
  const minBtn=document.createElement('button');minBtn.textContent='−';
  const input=document.createElement('input');input.type='number';input.value=val;input.min=min;input.max=max;input.id=id;
  const plusBtn=document.createElement('button');plusBtn.textContent='+';
  input.onchange=()=>onChange(+input.value);
  minBtn.onclick=()=>{if(+input.value>min){input.value=+input.value-1;onChange(+input.value);}};
  plusBtn.onclick=()=>{if(+input.value<max){input.value=+input.value+1;onChange(+input.value);}};
  wrap.append(minBtn,input,plusBtn);
  return wrap;
}

function buildSelectInput(options, val, onChange){
  const sel=document.createElement('select');
  sel.className='form-control';sel.style.width='90px';
  options.forEach(o=>{
    const opt=document.createElement('option');
    opt.value=o;opt.textContent=o;
    if(o===val)opt.selected=true;
    sel.appendChild(opt);
  });
  sel.onchange=()=>onChange(+sel.value);
  return sel;
}

function buildToggle(id, checked, onChange){
  const lbl=document.createElement('label');
  lbl.className='toggle-switch';
  const input=document.createElement('input');input.type='checkbox';input.checked=checked;input.id=id;
  input.onchange=()=>onChange(input.checked);
  const slider=document.createElement('span');slider.className='toggle-slider';
  lbl.append(input,slider);
  return lbl;
}

function buildBackupSection(){
  const sec=document.createElement('div');
  sec.className='settings-section';
  sec.innerHTML='<h3>Backup</h3>';

  const row1=document.createElement('div');
  row1.className='settings-row';
  row1.innerHTML='<label>Backup local (localStorage)</label>';
  const btnGroup=document.createElement('div');
  btnGroup.style.cssText='display:flex;gap:6px';

  const backupNow=document.createElement('button');
  backupNow.className='btn btn-outline btn-sm';backupNow.textContent='Fazer Backup Agora';
  backupNow.onclick=()=>{db._autoBackup();showToast('Backup salvo!','success');renderConfiguracoes();};

  const restoreBtn=document.createElement('button');
  restoreBtn.className='btn btn-ghost btn-sm';restoreBtn.textContent='Restaurar do Backup';
  restoreBtn.onclick=()=>showRestoreModal();

  const exportBtn=document.createElement('button');
  exportBtn.className='btn btn-ghost btn-sm';exportBtn.textContent='⬇ Exportar JSON';
  exportBtn.onclick=()=>db.exportJSON();

  const importBtn=document.createElement('button');
  importBtn.className='btn btn-ghost btn-sm';importBtn.textContent='⬆ Importar JSON';
  importBtn.onclick=()=>importJSON();

  btnGroup.append(backupNow,restoreBtn,exportBtn,importBtn);
  row1.appendChild(btnGroup);
  sec.appendChild(row1);

  // Backup history
  const backups=db.getBackups();
  if(backups.length>0){
    const hist=document.createElement('div');
    hist.className='backup-history';
    hist.style.marginTop='12px';
    for(let i=0;i<backups.length;i++){
      const b=backups[i];
      const dt=new Date(b.timestamp);
      const item=document.createElement('div');
      item.className='backup-item';
      item.innerHTML=`
        <span style="font-size:11px">${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR')}</span>
        <span style="font-size:11px;color:#888">${b.numViagens} viagens</span>
      `;
      const restBtn=document.createElement('button');
      restBtn.className='btn btn-ghost btn-xs';restBtn.textContent='Restaurar';
      restBtn.onclick=(ev)=>{ev.stopPropagation();restoreBackupConfirm(i);};
      item.appendChild(restBtn);
      hist.appendChild(item);
    }
    sec.appendChild(hist);
  }

  return sec;
}

function showRestoreModal(){
  // Handled inline via backup history list
  showToast('Use o botão "Restaurar" na lista de backups abaixo.','success');
}

function restoreBackupConfirm(index){
  openConfirm('Restaurar backup?','⚠️ Todos os dados atuais serão substituídos. Tem certeza?',
    ()=>{
      persistDb(db.restoreBackup(index), 'Backup restaurado com sucesso!').then((ok)=>{
        if(ok!==false) App.refresh();
      });
    },'Restaurar','Cancelar'
  );
}

function importJSON(){
  const input=document.createElement('input');
  input.type='file';input.accept='.json';
  input.onchange=(e)=>{
    const file=e.target.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=(evt)=>{
      openConfirm('Importar dados?','⚠️ Os dados atuais serão substituídos pelos do arquivo.',
        ()=>{
          persistDb(db.importJSON(evt.target.result), 'Dados importados e sincronizados!').then((ok)=>{
            if(ok!==false) App.refresh();
          });
        },'Importar','Cancelar'
      );
    };
    reader.readAsText(file);
  };
  input.click();
}

function markSettingsDirty(){
  _settingsDirty=true;
  const footer=document.getElementById('settings-footer');
  if(footer) footer.classList.add('visible');
}

function saveSettings(){
  persistDb(db.save(), 'Configurações salvas!').then((ok)=>{
    if(ok!==false){
      _settingsDirty=false;
      const footer=document.getElementById('settings-footer');
      if(footer) footer.classList.remove('visible');
    }
  });
}
